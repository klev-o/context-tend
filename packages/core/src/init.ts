import { readFile } from "node:fs/promises";

import {
  CONTEXTTEND_META,
  DEFAULT_CONFIG,
  NATIVE_SOURCE_TEMPLATES,
  SYSTEM_ASSET_CONTENTS,
  SYSTEM_ASSET_HASHES,
  defaultExternalSourceRegistry,
} from "./assets.js";
import {
  AGENTS_COVERAGE_PATH,
  buildAgentCoverageSnapshotFromText,
} from "./agents-coverage.js";
import {
  activeAdapterIds,
  discoverWithAdapters,
} from "./adapters/index.js";
import {
  CONTEXTTEND_VERSION,
  type ChangePlan,
  type Config,
  type ExternalSourceRegistry,
  type Finding,
  type KnowledgeSource,
  type PlannedChange,
  type Registry,
  type State,
  sourcePaths,
} from "./domain.js";
import { hashPath, sha256 } from "./hashing.js";
import {
  managedBlockHash,
  upsertManagedBlock,
} from "./managed-block.js";
import { assertSafeProjectWritePath, resolveRegistryPath, toRegistryPath } from "./paths.js";
import { validateCanonicalRoles } from "./registry-validation.js";
import { scanProject } from "./scanner.js";
import {
  loadConfig,
  loadExternalSourceRegistry,
  loadRegistry,
  loadState,
  serializeJson,
  serializeYaml,
  writeProjectFile,
} from "./storage.js";

export interface InitOptions {
  mode?: "adaptive" | "native";
  now?: Date;
}

async function readFileIfPresent(
  root: string,
  relativePath: string,
): Promise<string | null> {
  try {
    return await readFile(resolveRegistryPath(root, relativePath), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

function cloneRegistry(registry: Registry): Registry {
  return {
    version: 1,
    sources: Object.fromEntries(
      Object.entries(registry.sources).map(([id, source]) => [
        id,
        {
          ...source,
          path: Array.isArray(source.path) ? [...source.path] : source.path,
          ...(source.tags === undefined ? {} : { tags: [...source.tags] }),
        },
      ]),
    ),
  };
}

function normalizedSourcePaths(source: KnowledgeSource): string[] {
  return sourcePaths(source)
    .map((item) => toRegistryPath(item).replace(/\/$/, ""))
    .sort();
}

function sameKnowledgeLocation(
  left: KnowledgeSource,
  right: KnowledgeSource,
): boolean {
  return (
    left.role === right.role &&
    JSON.stringify(normalizedSourcePaths(left)) ===
      JSON.stringify(normalizedSourcePaths(right))
  );
}

function addDiscoveredSources(target: Registry, discovered: Registry): void {
  for (const [requestedId, discoveredSource] of Object.entries(discovered.sources)) {
    if (
      Object.values(target.sources).some((item) =>
        sameKnowledgeLocation(item, discoveredSource),
      )
    ) {
      continue;
    }
    if (
      discoveredSource.authority === "canonical" &&
      hasCanonicalRole(target, discoveredSource.role)
    ) {
      continue;
    }
    let id = requestedId;
    let counter = 2;
    while (target.sources[id] !== undefined) {
      id = `${requestedId}-${counter}`;
      counter += 1;
    }
    target.sources[id] = discoveredSource;
  }
}

function hasCanonicalRole(registry: Registry, role: string): boolean {
  return Object.values(registry.sources).some(
    (source) => source.role === role && source.authority === "canonical",
  );
}

function addNativeSource(
  registry: Registry,
  id: string,
  source: KnowledgeSource,
): void {
  if (hasCanonicalRole(registry, source.role)) return;
  let candidate = id;
  let counter = 2;
  while (registry.sources[candidate] !== undefined) {
    candidate = `${id}-${counter}`;
    counter += 1;
  }
  registry.sources[candidate] = source;
}

async function planFile(
  root: string,
  relativePath: string,
  content: string,
  reason: string,
  owner: PlannedChange["owner"],
): Promise<PlannedChange> {
  const existing = await readFileIfPresent(root, relativePath);
  if (existing === null) {
    return {
      path: relativePath,
      kind: "create",
      reason,
      owner,
      content,
      beforeHash: null,
    };
  }
  if (existing === content) {
    return {
      path: relativePath,
      kind: "skip",
      reason: "already up to date",
      owner,
    };
  }
  return {
    path: relativePath,
    kind: "update",
    reason,
    owner,
    content,
    beforeHash: sha256(existing),
  };
}

function nativeSourceForPath(relativePath: string): KnowledgeSource {
  switch (relativePath) {
    case "SPEC.md":
      return {
        path: relativePath,
        role: "requirements",
        authority: "canonical",
        owner: "human",
        adapter: "native",
        description: "Requirements, constraints, and acceptance expectations; human intent only",
      };
    case "docs/GOALS.md":
      return {
        path: relativePath,
        role: "goals",
        authority: "canonical",
        owner: "human",
        adapter: "native",
        description: "Project goals; unknowns require human confirmation",
      };
    case "docs/PRODUCT.md":
      return {
        path: relativePath,
        role: "product",
        authority: "canonical",
        owner: "human",
        adapter: "native",
        description: "Product intent; code is evidence rather than authority",
      };
    case "docs/PLANS.md":
      return {
        path: relativePath,
        role: "roadmap",
        authority: "canonical",
        owner: "shared",
        adapter: "native",
        description: "Active and completed durable plans",
      };
    case "docs/decisions/README.md":
      return {
        path: "docs/decisions/",
        role: "decisions",
        authority: "canonical",
        owner: "shared",
        adapter: "native",
        description: "Durable architectural decisions",
      };
    case "docs/context/README.md":
      return {
        path: "docs/context/",
        role: "implementation-context",
        authority: "canonical",
        owner: "agent",
        adapter: "native",
        description: "Evidence-backed implementation context",
      };
    default:
      throw new Error(`No native source mapping for ${relativePath}`);
  }
}

function nativeIdForPath(relativePath: string): string {
  if (relativePath === "SPEC.md") return "requirements";
  if (relativePath.includes("GOALS")) return "goals";
  if (relativePath.includes("PRODUCT")) return "product";
  if (relativePath.includes("PLANS")) return "roadmap";
  if (relativePath.includes("decisions")) return "decisions";
  return "implementation-context";
}

async function loadExistingConfig(root: string): Promise<Config | null> {
  return (await readFileIfPresent(root, ".contexttend/config.yaml")) === null
    ? null
    : loadConfig(root);
}

async function loadExistingRegistry(root: string): Promise<Registry | null> {
  return (await readFileIfPresent(root, ".contexttend/registry.yaml")) === null
    ? null
    : loadRegistry(root);
}

async function loadExistingExternalRegistry(
  root: string,
): Promise<ExternalSourceRegistry | null> {
  return (await readFileIfPresent(root, ".contexttend/source-registry.yaml")) === null
    ? null
    : loadExternalSourceRegistry(root);
}

function mergeExternalRegistry(
  existing: ExternalSourceRegistry | null,
  defaults: ExternalSourceRegistry,
): ExternalSourceRegistry {
  if (existing === null) return defaults;
  return {
    version: 1,
    sources: {
      ...defaults.sources,
      ...existing.sources,
    },
  };
}

export async function buildInitPlan(
  projectRoot: string,
  options: InitOptions = {},
): Promise<ChangePlan> {
  const project = await scanProject(projectRoot);
  const root = project.root;
  const discovery = discoverWithAdapters(project);
  const existingRegistry = await loadExistingRegistry(root);
  const registry = existingRegistry === null
    ? cloneRegistry(discovery.registry)
    : cloneRegistry(existingRegistry);
  addDiscoveredSources(registry, discovery.registry);

  const existingConfig = await loadExistingConfig(root);
  const existingStateDocument = await readFileIfPresent(
    root,
    ".contexttend/state.json",
  );
  const config: Config = {
    ...(existingConfig ?? DEFAULT_CONFIG),
    mode: options.mode ?? existingConfig?.mode ?? "adaptive",
  };
  const findings: Finding[] = validateCanonicalRoles(registry);
  const changes: PlannedChange[] = [];

  for (const [relativePath, content] of Object.entries(NATIVE_SOURCE_TEMPLATES)) {
    if (!config.createMissingNativeSources) continue;
    const mappedSource = nativeSourceForPath(relativePath);
    if (mappedSource.role === "requirements" &&
      !hasCanonicalRole(registry, "requirements") &&
      (discovery.statuses.some((status) =>
        status.detection.detected && !["native", "generic"].includes(status.id)) ||
        Object.values(registry.sources).some((source) =>
          source.role === "requirements" && source.owner === "external" &&
          source.authority !== "historical"))) {
      findings.push({
        code: "CT204", level: "warning", severity: "P2",
        message: "External specification owner detected without canonical requirements",
        remediation: "Use its workflow to establish requirements, then explicitly adopt them; no native SPEC was created.",
      });
      continue;
    }
    if (!hasCanonicalRole(registry, mappedSource.role)) {
      addNativeSource(registry, nativeIdForPath(relativePath), mappedSource);
      const existing = await readFileIfPresent(root, relativePath);
      changes.push(
        existing === null
          ? await planFile(
              root,
              relativePath,
              content,
              `create missing native ${mappedSource.role} source`,
              mappedSource.owner,
            )
          : {
              path: relativePath,
              kind: "skip",
              reason: "existing project knowledge is preserved",
              owner: mappedSource.owner,
            },
      );
    }
  }

  const agentsOriginal = await readFileIfPresent(root, "AGENTS.md") ?? "";
  let agentsResult;
  try {
    agentsResult = upsertManagedBlock(agentsOriginal);
  } catch (error) {
    findings.push({
      code: "CT201",
      level: "error",
      severity: "P1",
      message: error instanceof Error ? error.message : String(error),
      path: "AGENTS.md",
      remediation: "Repair duplicate or unmatched ContextTend markers before applying init.",
    });
    agentsResult = { content: agentsOriginal, changed: false, existingBlocks: 0 };
  }
  changes.push(
    agentsResult.changed
      ? await planFile(
          root,
          "AGENTS.md",
          agentsResult.content,
          agentsOriginal.length === 0
            ? "create minimal Codex instruction map"
            : "upsert marker-bounded ContextTend integration",
          "shared",
        )
      : {
          path: "AGENTS.md",
          kind: "skip",
          reason: "managed integration is already current",
          owner: "shared",
        },
  );

  const existingCoverage = await readFileIfPresent(root, AGENTS_COVERAGE_PATH);
  if (existingCoverage === null && existingStateDocument === null) {
    changes.push(
      await planFile(
        root,
        AGENTS_COVERAGE_PATH,
        serializeJson(
          buildAgentCoverageSnapshotFromText("AGENTS.md", agentsOriginal),
        ),
        "capture pre-onboarding AGENTS coverage baseline",
        "system",
      ),
    );
  } else if (existingCoverage === null) {
    findings.push({
      code: "CT203",
      level: "warning",
      severity: "P1",
      message: "Existing installation has no pre-onboarding AGENTS coverage baseline",
      path: AGENTS_COVERAGE_PATH,
      remediation:
        "Before re-onboarding, run contexttend agents-coverage snapshot with a known pre-migration file or Git ref.",
    });
  }

  if (!hasCanonicalRole(registry, "instructions")) {
    addNativeSource(registry, "agent-instructions", {
      path: "AGENTS.md",
      role: "instructions",
      authority: "canonical",
      owner: "shared",
      adapter: "native",
      description: "Repository agent instruction map",
    });
  } else if (
    !Object.values(registry.sources).some((item) =>
      sourcePaths(item).includes("AGENTS.md"),
    )
  ) {
    registry.sources["contexttend-agent-map"] = {
      path: "AGENTS.md",
      role: "instructions",
      authority: "supporting",
      owner: "shared",
      adapter: "native",
      description: "ContextTend routing integration in repository instructions",
    };
  }

  registry.sources["contexttend-installation"] ??= {
    path: "docs/_meta/contexttend.md",
    role: "generated",
    authority: "generated",
    owner: "system",
    adapter: "native",
    description: "ContextTend installation metadata",
  };

  changes.push(
    await planFile(
      root,
      "docs/_meta/contexttend.md",
      CONTEXTTEND_META,
      "install generated ContextTend metadata",
      "system",
    ),
  );

  for (const [assetPath, content] of Object.entries(SYSTEM_ASSET_CONTENTS)) {
    const existing = await readFileIfPresent(root, assetPath);
    if (existing !== null && existing !== content) {
      changes.push({
        path: assetPath,
        kind: "skip",
        reason: "locally modified system asset was preserved",
        owner: "system",
      });
      findings.push({
        code: "CT202",
        level: "warning",
        severity: "P2",
        message: "Locally modified ContextTend asset was not overwritten",
        path: assetPath,
        evidence: [`expected ${SYSTEM_ASSET_HASHES[assetPath]}`, `actual ${sha256(existing)}`],
        remediation: "Review the local change, then use contexttend update --apply.",
      });
    } else {
      changes.push(
        await planFile(
          root,
          assetPath,
          content,
          "install current managed ContextTend asset",
          "system",
        ),
      );
    }
  }

  const externalRegistry = mergeExternalRegistry(
    await loadExistingExternalRegistry(root),
    defaultExternalSourceRegistry(),
  );
  changes.push(
    await planFile(
      root,
      ".contexttend/config.yaml",
      serializeYaml(config),
      "write validated ContextTend configuration",
      "system",
    ),
    await planFile(
      root,
      ".contexttend/source-registry.yaml",
      serializeYaml(externalRegistry),
      "write external source authority and freshness metadata",
      "system",
    ),
    await planFile(
      root,
      ".contexttend/registry.yaml",
      serializeYaml(registry),
      "write adopted Knowledge Registry",
      "system",
    ),
  );

  changes.push({
    path: ".contexttend/state.json",
    kind: existingStateDocument === null ? "create" : "update",
    reason: "record managed hashes and deterministic baseline",
    owner: "system",
    beforeHash:
      existingStateDocument === null ? null : sha256(existingStateDocument),
  });

  return { root, changes, adapters: discovery.statuses, registry, findings };
}

export async function hashRegisteredSources(
  root: string,
  registry: Registry,
): Promise<Record<string, string | null>> {
  const result: Record<string, string | null> = {};
  for (const [id, source] of Object.entries(registry.sources)) {
    const hashes: Array<[string, string | null]> = [];
    for (const sourcePath of sourcePaths(source)) {
      hashes.push([
        sourcePath,
        await hashPath(resolveRegistryPath(root, sourcePath)),
      ]);
    }
    result[id] =
      hashes.length === 1
        ? hashes[0]?.[1] ?? null
        : sha256(JSON.stringify(hashes));
  }
  return result;
}

async function assertNoWriteConflict(
  root: string,
  change: PlannedChange,
): Promise<void> {
  if (change.beforeHash === undefined) return;
  const currentHash = await hashPath(resolveRegistryPath(root, change.path));
  if (currentHash !== change.beforeHash) {
    throw new Error(
      `Refusing to write ${change.path}: it changed after the plan was created`,
    );
  }
}

export async function applyInitPlan(
  plan: ChangePlan,
  now = new Date(),
): Promise<State> {
  const blocking = plan.findings.filter((finding) => finding.level === "error");
  if (blocking.length > 0) {
    throw new Error(
      `Cannot apply init plan with ${blocking.length} blocking finding(s)`,
    );
  }

  const stateChange = plan.changes.find(
    (change) => change.path === ".contexttend/state.json",
  );
  if (stateChange !== undefined) {
    await assertNoWriteConflict(plan.root, stateChange);
  }

  for (const change of plan.changes) {
    if (change.kind === "skip") continue;
    await assertNoWriteConflict(plan.root, change);
    await assertSafeProjectWritePath(plan.root, change.path);
  }

  for (const change of plan.changes) {
    if (
      change.kind === "skip" ||
      change.path === ".contexttend/state.json" ||
      change.content === undefined
    ) {
      continue;
    }
    await assertNoWriteConflict(plan.root, change);
    await writeProjectFile(plan.root, change.path, change.content);
  }

  let previous: State | null = null;
  if ((await readFileIfPresent(plan.root, ".contexttend/state.json")) !== null) {
    previous = await loadState(plan.root);
  }
  const timestamp = now.toISOString();
  const detectedAdapters = Array.from(
    new Set([...activeAdapterIds(plan.adapters), "native"]),
  );
  const managedAssets = Object.fromEntries(
    Object.entries(SYSTEM_ASSET_HASHES).map(([assetPath, hash]) => [
      assetPath,
      { hash, version: CONTEXTTEND_VERSION },
    ]),
  );
  const agentsContent = await readFile(resolveRegistryPath(plan.root, "AGENTS.md"), "utf8");
  const blockHash = managedBlockHash(agentsContent);
  if (blockHash === null) {
    throw new Error("AGENTS.md managed block is missing after apply");
  }
  const state: State = {
    schemaVersion: 2,
    contextTendVersion: CONTEXTTEND_VERSION,
    installedAt: previous?.installedAt ?? timestamp,
    updatedAt: timestamp,
    lastOnboarding: previous?.lastOnboarding ?? null,
    lastSync: previous?.lastSync ?? null,
    lastMemoryAudit: previous?.lastMemoryAudit ?? null,
    lastHarnessAudit: previous?.lastHarnessAudit ?? null,
    detectedAdapters,
    registeredHashes: await hashRegisteredSources(plan.root, plan.registry),
    managedAssets,
    managedBlocks: {
      "AGENTS.md": { hash: blockHash, version: CONTEXTTEND_VERSION },
    },
    activeWork: previous?.activeWork ?? null,
    lastCompletedWork: previous?.lastCompletedWork ?? null,
  };
  await writeProjectFile(
    plan.root,
    ".contexttend/state.json",
    serializeJson(state),
  );
  return state;
}

export function summarizeInitPlan(plan: ChangePlan): {
  creates: number;
  updates: number;
  skips: number;
} {
  return {
    creates: plan.changes.filter((change) => change.kind === "create").length,
    updates: plan.changes.filter((change) => change.kind === "update").length,
    skips: plan.changes.filter((change) => change.kind === "skip").length,
  };
}

export function projectAlreadyInitialized(snapshot: {
  files: ReadonlySet<string>;
}): boolean {
  return snapshot.files.has(".contexttend/state.json");
}
