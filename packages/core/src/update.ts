import { readFile } from "node:fs/promises";

import { activeAdapterIds, discoverWithAdapters } from "./adapters/index.js";
import {
  CONTEXTTEND_META,
  SYSTEM_ASSET_CONTENTS,
  SYSTEM_ASSET_HASHES,
} from "./assets.js";
import {
  CONTEXTTEND_VERSION,
  type ChangePlan,
  type Finding,
  type PlannedChange,
  type State,
} from "./domain.js";
import { hashPath, sha256 } from "./hashing.js";
import {
  AGENTS_MANAGED_BLOCK,
  managedBlockHash,
  upsertManagedBlock,
} from "./managed-block.js";
import { resolveRegistryPath } from "./paths.js";
import { scanProject } from "./scanner.js";
import {
  loadRegistry,
  loadState,
  serializeJson,
  writeProjectFile,
} from "./storage.js";

async function readOptional(target: string): Promise<string | null> {
  try {
    return await readFile(target, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

function plannedFile(
  path: string,
  content: string,
  current: string | null,
  reason: string,
): PlannedChange {
  if (current === content) {
    return { path, kind: "skip", reason: "already current", owner: "system" };
  }
  return {
    path,
    kind: current === null ? "create" : "update",
    reason,
    owner: "system",
    content,
    beforeHash: current === null ? null : sha256(current),
  };
}

export async function buildUpdatePlan(projectRoot: string): Promise<ChangePlan> {
  const snapshot = await scanProject(projectRoot);
  const registry = await loadRegistry(snapshot.root);
  const state = await loadState(snapshot.root);
  const discovery = discoverWithAdapters(snapshot);
  const changes: PlannedChange[] = [];
  const findings: Finding[] = [];

  for (const [assetPath, desired] of Object.entries(SYSTEM_ASSET_CONTENTS)) {
    const current = await readOptional(resolveRegistryPath(snapshot.root, assetPath));
    const actualHash = current === null ? null : sha256(current);
    const recordedHash = state.managedAssets[assetPath]?.hash;
    if (
      current !== null &&
      actualHash !== SYSTEM_ASSET_HASHES[assetPath] &&
      actualHash !== recordedHash
    ) {
      changes.push({
        path: assetPath,
        kind: "skip",
        reason: "locally modified managed asset is preserved",
        owner: "system",
      });
      findings.push({
        code: "CT301",
        level: "warning",
        severity: "P2",
        message: "Update preserved a locally modified managed asset",
        path: assetPath,
        remediation: "Review and merge the installed version manually if desired.",
      });
      continue;
    }
    changes.push(plannedFile(assetPath, desired, current, "update managed asset"));
  }

  const metadataPath = "docs/_meta/contexttend.md";
  changes.push(
    plannedFile(
      metadataPath,
      CONTEXTTEND_META,
      await readOptional(resolveRegistryPath(snapshot.root, metadataPath)),
      "regenerate ContextTend installation metadata",
    ),
  );

  const agents = await readOptional(resolveRegistryPath(snapshot.root, "AGENTS.md"));
  const original = agents ?? "";
  try {
    const desired = upsertManagedBlock(original, AGENTS_MANAGED_BLOCK);
    const currentBlockHash = managedBlockHash(original);
    const recordedBlockHash = state.managedBlocks["AGENTS.md"]?.hash;
    if (
      currentBlockHash !== null &&
      currentBlockHash !== recordedBlockHash &&
      desired.changed
    ) {
      changes.push({
        path: "AGENTS.md",
        kind: "skip",
        reason: "locally modified managed block is preserved",
        owner: "shared",
      });
      findings.push({
        code: "CT302",
        level: "warning",
        severity: "P2",
        message: "Update preserved a locally modified AGENTS.md managed block",
        path: "AGENTS.md",
        remediation: "Review and merge the current managed block manually.",
      });
    } else {
      const change = plannedFile(
        "AGENTS.md",
        desired.content,
        agents,
        "update marker-bounded ContextTend integration",
      );
      changes.push({ ...change, owner: "shared" });
    }
  } catch (error) {
    findings.push({
      code: "CT303",
      level: "error",
      severity: "P1",
      message: error instanceof Error ? error.message : String(error),
      path: "AGENTS.md",
      remediation: "Repair duplicate or unmatched markers before updating.",
    });
  }

  changes.push({
    path: ".contexttend/state.json",
    kind: "update",
    reason: "record updated managed asset hashes",
    owner: "system",
    beforeHash: await hashPath(
      resolveRegistryPath(snapshot.root, ".contexttend/state.json"),
    ),
  });
  return {
    root: snapshot.root,
    changes,
    adapters: discovery.statuses,
    registry,
    findings,
  };
}

async function assertNoConflict(root: string, change: PlannedChange): Promise<void> {
  if (change.beforeHash === undefined) return;
  const current = await hashPath(resolveRegistryPath(root, change.path));
  if (current !== change.beforeHash) {
    throw new Error(`Refusing to write ${change.path}: it changed after planning`);
  }
}

export async function applyUpdatePlan(
  plan: ChangePlan,
  now = new Date(),
): Promise<State> {
  const errors = plan.findings.filter((finding) => finding.level === "error");
  if (errors.length > 0) {
    throw new Error(`Cannot apply update with ${errors.length} blocking finding(s)`);
  }
  const stateChange = plan.changes.find(
    (change) => change.path === ".contexttend/state.json",
  );
  if (stateChange) await assertNoConflict(plan.root, stateChange);

  for (const change of plan.changes) {
    if (
      change.kind === "skip" ||
      change.path === ".contexttend/state.json" ||
      change.content === undefined
    ) {
      continue;
    }
    await assertNoConflict(plan.root, change);
    await writeProjectFile(plan.root, change.path, change.content);
  }

  const previous = await loadState(plan.root);
  const timestamp = now.toISOString();
  const managedAssets = { ...previous.managedAssets };
  for (const assetPath of Object.keys(SYSTEM_ASSET_CONTENTS)) {
    const actual = await hashPath(resolveRegistryPath(plan.root, assetPath));
    if (actual === SYSTEM_ASSET_HASHES[assetPath]) {
      managedAssets[assetPath] = { hash: actual, version: CONTEXTTEND_VERSION };
    }
  }
  const agents = await readFile(resolveRegistryPath(plan.root, "AGENTS.md"), "utf8");
  const blockHash = managedBlockHash(agents);
  const managedBlocks = { ...previous.managedBlocks };
  if (blockHash === managedBlockHash(AGENTS_MANAGED_BLOCK) && blockHash !== null) {
    managedBlocks["AGENTS.md"] = {
      hash: blockHash,
      version: CONTEXTTEND_VERSION,
    };
  }
  const state: State = {
    ...previous,
    contextTendVersion: CONTEXTTEND_VERSION,
    updatedAt: timestamp,
    detectedAdapters: Array.from(
      new Set([...activeAdapterIds(plan.adapters), "native"]),
    ),
    managedAssets,
    managedBlocks,
  };
  await writeProjectFile(plan.root, ".contexttend/state.json", serializeJson(state));
  return state;
}
