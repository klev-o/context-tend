import { lstat, readFile } from "node:fs/promises";
import path from "node:path";

import { adapters } from "./adapters/index.js";
import {
  AGENTS_COVERAGE_PATH,
  loadAgentCoverageSnapshot,
} from "./agents-coverage.js";
import { SYSTEM_ASSET_HASHES } from "./assets.js";
import type {
  Finding,
  ProjectSnapshot,
  Registry,
  State,
  ValidationResult,
} from "./domain.js";
import { sourcePaths } from "./domain.js";
import { hashPath } from "./hashing.js";
import {
  AGENTS_MANAGED_BLOCK,
  countManagedBlocks,
  managedBlockHash,
} from "./managed-block.js";
import {
  realPathIsInsideRoot,
  resolveRegistryPath,
  toRegistryPath,
} from "./paths.js";
import { scanProject } from "./scanner.js";
import {
  ContextTendFileError,
  loadConfig,
  loadExternalSourceRegistry,
  loadRegistry,
  loadState,
} from "./storage.js";

function fileFinding(error: unknown, code: string, relativePath: string): Finding {
  return {
    code,
    level: "error",
    severity: "P1",
    message: error instanceof Error ? error.message : String(error),
    path: relativePath,
    evidence:
      error instanceof ContextTendFileError && error.issues.length > 0
        ? error.issues
        : undefined,
    remediation: "Repair or recreate this ContextTend control file.",
  };
}

async function exists(target: string): Promise<boolean> {
  try {
    await lstat(target);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

function validateCanonicalRoles(registry: Registry): Finding[] {
  const byRole = new Map<string, string[]>();
  for (const [id, source] of Object.entries(registry.sources)) {
    if (source.authority !== "canonical") continue;
    const ids = byRole.get(source.role) ?? [];
    ids.push(id);
    byRole.set(source.role, ids);
  }
  return [...byRole.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([role, ids]) => ({
      code: "CT103",
      level: "error" as const,
      severity: "P1" as const,
      message: `Multiple canonical sources are registered for role "${role}"`,
      evidence: ids,
      remediation: "Choose one canonical source and mark the others supporting or historical.",
    }));
}

async function validateSourcePaths(root: string, registry: Registry): Promise<Finding[]> {
  const findings: Finding[] = [];
  for (const [id, source] of Object.entries(registry.sources)) {
    for (const sourcePath of sourcePaths(source)) {
      try {
        const absolute = resolveRegistryPath(root, sourcePath);
        if (!(await exists(absolute))) {
          findings.push({
            code: "CT104",
            level: "error",
            severity: "P1",
            message: `Registered source "${id}" does not exist`,
            path: sourcePath,
            remediation: "Restore the source or remove/update its registry entry.",
          });
        } else if (!(await realPathIsInsideRoot(root, absolute))) {
          findings.push({
            code: "CT105",
            level: "error",
            severity: "P0",
            message: `Registered source "${id}" resolves outside the project root`,
            path: sourcePath,
            remediation: "Replace the external symlink with an in-repository source.",
          });
        }
      } catch (error) {
        findings.push({
          code: "CT105",
          level: "error",
          severity: "P0",
          message: `Registered source "${id}" escapes the project root`,
          path: sourcePath,
          evidence: [error instanceof Error ? error.message : String(error)],
          remediation: "Use a normalized project-relative path.",
        });
      }
    }
  }
  return findings;
}

function registeredMarkdownFiles(
  snapshot: ProjectSnapshot,
  registry: Registry,
): string[] {
  const files = new Set<string>();
  for (const source of Object.values(registry.sources)) {
    for (const item of sourcePaths(source)) {
      const normalized = toRegistryPath(item).replace(/\/$/, "");
      if (snapshot.files.has(normalized) && normalized.toLowerCase().endsWith(".md")) {
        files.add(normalized);
      }
      if (snapshot.directories.has(normalized)) {
        const prefix = `${normalized}/`;
        for (const candidate of snapshot.files) {
          if (candidate.startsWith(prefix) && candidate.toLowerCase().endsWith(".md")) {
            files.add(candidate);
          }
        }
      }
    }
  }
  return [...files].sort();
}

function localMarkdownTargets(content: string): string[] {
  const targets: string[] = [];
  const expression = /!?\[[^\]]*\]\(([^)]+)\)/g;
  for (const match of content.matchAll(expression)) {
    const raw = match[1]?.trim() ?? "";
    const enclosed = raw.match(/^<([^>]+)>/u)?.[1];
    const target = enclosed ?? raw.split(/\s+["']/u)[0] ?? "";
    if (
      target.length === 0 ||
      target.startsWith("#") ||
      target.startsWith("/") ||
      /^(?:https?:|mailto:|data:|javascript:)/iu.test(target)
    ) {
      continue;
    }
    const withoutFragment = target.split("#", 1)[0]?.split("?", 1)[0] ?? "";
    if (withoutFragment.length > 0) targets.push(withoutFragment);
  }
  return targets;
}

async function validateMarkdownLinks(
  root: string,
  snapshot: ProjectSnapshot,
  registry: Registry,
): Promise<Finding[]> {
  const findings: Finding[] = [];
  for (const markdownPath of registeredMarkdownFiles(snapshot, registry)) {
    const absolute = resolveRegistryPath(root, markdownPath);
    if (!(await realPathIsInsideRoot(root, absolute))) {
      findings.push({
        code: "CT114",
        level: "error",
        severity: "P0",
        message: "Registered Markdown resolves outside the project root",
        path: markdownPath,
        remediation: "Remove the external symlink or register an in-repository source.",
      });
      continue;
    }
    const content = await readFile(absolute, "utf8");
    for (const encodedTarget of localMarkdownTargets(content)) {
      let target = encodedTarget;
      try {
        target = decodeURIComponent(encodedTarget);
      } catch {
        // Preserve the malformed path so the finding remains actionable.
      }
      const resolved = path.resolve(path.dirname(absolute), target);
      try {
        const relative = toRegistryPath(path.relative(root, resolved));
        resolveRegistryPath(root, relative);
        if (!(await exists(resolved))) {
          findings.push({
            code: "CT106",
            level: "warning",
            severity: "P2",
            message: `Broken local Markdown link: ${encodedTarget}`,
            path: markdownPath,
            remediation: "Fix the link or restore its target.",
          });
        } else if (!(await realPathIsInsideRoot(root, resolved))) {
          findings.push({
            code: "CT107",
            level: "warning",
            severity: "P1",
            message: `Local Markdown link resolves outside the project: ${encodedTarget}`,
            path: markdownPath,
            remediation: "Use an in-repository target or an explicit external URL.",
          });
        }
      } catch {
        findings.push({
          code: "CT107",
          level: "warning",
          severity: "P1",
          message: `Local Markdown link escapes the project: ${encodedTarget}`,
          path: markdownPath,
          remediation: "Use an in-repository relative link or an explicit external URL.",
        });
      }
    }
  }
  return findings;
}

async function validateManagedAssets(root: string, state: State | null): Promise<Finding[]> {
  const findings: Finding[] = [];
  for (const [assetPath, expectedHash] of Object.entries(SYSTEM_ASSET_HASHES)) {
    const actualHash = await hashPath(resolveRegistryPath(root, assetPath));
    if (actualHash === null) {
      findings.push({
        code: "CT108",
        level: "error",
        severity: "P1",
        message: "Required ContextTend asset is missing",
        path: assetPath,
        remediation: "Run contexttend update --apply.",
      });
    } else if (actualHash !== expectedHash) {
      findings.push({
        code: "CT109",
        level: "warning",
        severity: "P2",
        message: "Managed ContextTend asset differs from this installed version",
        path: assetPath,
        evidence: [
          `expected ${expectedHash}`,
          `actual ${actualHash}`,
          ...(state?.managedAssets[assetPath]
            ? [`recorded ${state.managedAssets[assetPath]?.hash}`]
            : []),
        ],
        remediation: "Review the local edit; update preserves it unless it matches the prior managed hash.",
      });
    }
  }

  let agents = "";
  try {
    agents = await readFile(resolveRegistryPath(root, "AGENTS.md"), "utf8");
  } catch {
    findings.push({
      code: "CT110",
      level: "error",
      severity: "P1",
      message: "AGENTS.md is missing",
      path: "AGENTS.md",
      remediation: "Run contexttend update --apply.",
    });
    return findings;
  }
  if (countManagedBlocks(agents) !== 1 || managedBlockHash(agents) === null) {
    findings.push({
      code: "CT111",
      level: "error",
      severity: "P1",
      message: "AGENTS.md must contain exactly one complete ContextTend managed block",
      path: "AGENTS.md",
      remediation: "Repair duplicate/unmatched markers, then run contexttend update --apply.",
    });
  } else if (managedBlockHash(agents) !== managedBlockHash(AGENTS_MANAGED_BLOCK)) {
    findings.push({
      code: "CT112",
      level: "warning",
      severity: "P2",
      message: "The ContextTend block in AGENTS.md has local changes",
      path: "AGENTS.md",
      remediation: "Review it before accepting a managed update.",
    });
  }
  return findings;
}

async function validateAgentCoverageBaseline(
  root: string,
  state: State | null,
): Promise<Finding[]> {
  const baseline = resolveRegistryPath(root, AGENTS_COVERAGE_PATH);
  if (!(await exists(baseline))) {
    return state?.lastOnboarding == null
      ? [{
          code: "CT115",
          level: "warning",
          severity: "P1",
          message: "Pre-onboarding AGENTS coverage baseline is missing",
          path: AGENTS_COVERAGE_PATH,
          remediation:
            "Capture the original AGENTS source before semantic onboarding.",
        }]
      : [];
  }
  try {
    await loadAgentCoverageSnapshot(root);
    return [];
  } catch (error) {
    return [{
      code: "CT116",
      level: "error",
      severity: "P1",
      message: error instanceof Error ? error.message : String(error),
      path: AGENTS_COVERAGE_PATH,
      remediation: "Re-capture the AGENTS coverage baseline from a trusted source.",
    }];
  }
}

async function validateGeneratedMarkers(
  root: string,
  registry: Registry,
): Promise<Finding[]> {
  const findings: Finding[] = [];
  for (const [id, source] of Object.entries(registry.sources)) {
    if (
      source.authority !== "generated" ||
      source.owner !== "system" ||
      source.adapter !== "native"
    ) {
      continue;
    }
    for (const sourcePath of sourcePaths(source)) {
      try {
        const stats = await lstat(resolveRegistryPath(root, sourcePath));
        if (!stats.isFile()) continue;
        const content = await readFile(resolveRegistryPath(root, sourcePath), "utf8");
        if (!content.includes("<!-- contexttend:generated -->")) {
          findings.push({
            code: "CT113",
            level: "error",
            severity: "P1",
            message: `Generated source "${id}" is missing its managed marker`,
            path: sourcePath,
            remediation: "Restore the generated marker or change its authority/ownership classification.",
          });
        }
      } catch {
        // Missing registered paths are reported by CT104.
      }
    }
  }
  return findings;
}

function deduplicate(findings: Finding[]): Finding[] {
  const seen = new Set<string>();
  return findings.filter((finding) => {
    const key = [finding.code, finding.path ?? "", finding.message].join("\u0000");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function validateProject(projectRoot: string): Promise<ValidationResult> {
  const snapshot = await scanProject(projectRoot);
  const findings: Finding[] = [];
  let registry: Registry | null = null;
  let state: State | null = null;

  try {
    registry = await loadRegistry(snapshot.root);
  } catch (error) {
    findings.push(fileFinding(error, "CT001", ".contexttend/registry.yaml"));
  }
  try {
    await loadConfig(snapshot.root);
  } catch (error) {
    findings.push(fileFinding(error, "CT002", ".contexttend/config.yaml"));
  }
  try {
    state = await loadState(snapshot.root);
  } catch (error) {
    findings.push(fileFinding(error, "CT003", ".contexttend/state.json"));
  }
  try {
    await loadExternalSourceRegistry(snapshot.root);
  } catch (error) {
    findings.push(fileFinding(error, "CT004", ".contexttend/source-registry.yaml"));
  }

  if (registry !== null) {
    findings.push(...validateCanonicalRoles(registry));
    findings.push(...(await validateSourcePaths(snapshot.root, registry)));
    findings.push(...(await validateGeneratedMarkers(snapshot.root, registry)));
    findings.push(...(await validateMarkdownLinks(snapshot.root, snapshot, registry)));
    for (const adapter of adapters) {
      if (adapter.detect(snapshot).detected && adapter.validate) {
        findings.push(...adapter.validate(snapshot, registry));
      }
    }
  }
  findings.push(...(await validateManagedAssets(snapshot.root, state)));
  findings.push(...(await validateAgentCoverageBaseline(snapshot.root, state)));

  const unique = deduplicate(findings);
  const errors = unique.filter((finding) => finding.level === "error").length;
  const warnings = unique.filter((finding) => finding.level === "warning").length;
  return { findings: unique, errors, warnings, valid: errors === 0 };
}
