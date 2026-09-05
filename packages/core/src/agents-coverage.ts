import { execFile } from "node:child_process";
import { lstat, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { z } from "zod";

import type { Registry } from "./domain.js";
import { sourcePaths } from "./domain.js";
import { sha256 } from "./hashing.js";
import {
  realPathIsInsideRoot,
  resolveRegistryPath,
  toRegistryPath,
} from "./paths.js";
import { loadRegistry, serializeJson, writeProjectFile } from "./storage.js";

export const AGENTS_COVERAGE_PATH = ".contexttend/agents-coverage.json";

const anchorKinds = [
  "env-or-constant",
  "snake-identifier",
  "camel-identifier",
  "path",
  "flag",
] as const;

export type AgentCoverageAnchorKind = (typeof anchorKinds)[number];

export interface AgentCoverageAnchor {
  kind: AgentCoverageAnchorKind;
  value: string;
  lines: number[];
}

export interface AgentCoverageSection {
  heading: string;
  startLine: number;
  endLine: number;
}

export interface AgentCoverageSnapshot {
  version: 1;
  source: {
    path: string;
    gitRef?: string;
    hash: string;
    lineCount: number;
  };
  anchors: AgentCoverageAnchor[];
  sections: AgentCoverageSection[];
}

export interface AgentCoverageCheck {
  valid: boolean;
  baselinePath: string;
  source: AgentCoverageSnapshot["source"];
  targets: string[];
  scannedFiles: string[];
  anchors: {
    total: number;
    preserved: number;
    missing: AgentCoverageAnchor[];
  };
  sections: {
    total: number;
    headingsFound: number;
    missingHeadings: AgentCoverageSection[];
  };
}

const anchorSchema = z.object({
  kind: z.enum(anchorKinds),
  value: z.string().min(1),
  lines: z.array(z.number().int().positive()).min(1),
}).strict();

const coverageSnapshotSchema = z.object({
  version: z.literal(1),
  source: z.object({
    path: z.string().min(1),
    gitRef: z.string().min(1).optional(),
    hash: z.string().regex(/^[a-f0-9]{64}$/),
    lineCount: z.number().int().nonnegative(),
  }).strict(),
  anchors: z.array(anchorSchema),
  sections: z.array(z.object({
    heading: z.string().min(1),
    startLine: z.number().int().positive(),
    endLine: z.number().int().positive(),
  }).strict()),
}).strict();

const textExtensions = new Set([
  ".md",
  ".mdx",
  ".txt",
  ".yaml",
  ".yml",
  ".json",
  ".toml",
  ".ini",
  ".cfg",
]);
const textNames = new Set(["AGENTS.md", "README", "Dockerfile"]);
const ignoredDirectories = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".venv",
  "venv",
]);
const execFileAsync = promisify(execFile);

function normalizeText(content: string): string {
  return content.replaceAll("\r\n", "\n").replaceAll("\r", "\n");
}

export function userAuthoredAgentsContent(content: string): string {
  return normalizeText(content).replace(
    /<!-- contexttend:start -->[\s\S]*?<!-- contexttend:end -->/gu,
    (managed) => managed.replace(/[^\n]/gu, " "),
  );
}

function addAnchor(
  anchors: Map<string, AgentCoverageAnchor>,
  kind: AgentCoverageAnchorKind,
  value: string,
  line: number,
): void {
  const cleaned = value.replace(/[),.;:]+$/u, "");
  if (cleaned.length < 3 || cleaned.length > 160) return;
  const key = `${kind}\u0000${cleaned}`;
  const existing = anchors.get(key);
  if (existing) {
    if (!existing.lines.includes(line)) existing.lines.push(line);
    return;
  }
  anchors.set(key, { kind, value: cleaned, lines: [line] });
}

function extractAnchors(content: string): AgentCoverageAnchor[] {
  const anchors = new Map<string, AgentCoverageAnchor>();
  const patterns: Array<[AgentCoverageAnchorKind, RegExp]> = [
    ["env-or-constant", /\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b/gu],
    ["snake-identifier", /\b[A-Za-z][A-Za-z0-9]*(?:_[A-Za-z0-9]+)+\b/gu],
    ["camel-identifier", /\b[A-Z][a-z0-9]+(?:[A-Z][A-Za-z0-9]*)+\b/gu],
    [
      "path",
      /(?:\.{0,2}[\\/])?(?:[A-Za-z0-9_.-]+[\\/])+(?:[A-Za-z0-9_.-]+)?|\b[A-Za-z0-9_-]+\.(?:cfg|env|ini|js|json|md|mdx|mjs|ps1|py|sh|sql|toml|ts|txt|ya?ml)\b/gu,
    ],
    ["flag", /--[a-z][a-z0-9-]*/gu],
  ];
  for (const [index, line] of content.split("\n").entries()) {
    for (const [kind, pattern] of patterns) {
      pattern.lastIndex = 0;
      for (const match of line.matchAll(pattern)) {
        const value = match[0];
        const prefix = line.slice(0, match.index ?? 0).trimEnd();
        if (["=", ":"].includes(prefix.at(-1) ?? "")) continue;
        if (kind === "snake-identifier" && value === value.toUpperCase()) continue;
        addAnchor(anchors, kind, value, index + 1);
      }
    }
  }
  return [...anchors.values()]
    .map((anchor) => ({ ...anchor, lines: anchor.lines.sort((left, right) => left - right) }))
    .sort((left, right) =>
      left.kind.localeCompare(right.kind, "en") ||
      left.value.localeCompare(right.value, "en"),
    );
}

function extractSections(content: string): AgentCoverageSection[] {
  const lines = content.split("\n");
  const headings: Array<{ heading: string; line: number }> = [];
  for (const [index, line] of lines.entries()) {
    const match = line.match(/^#{1,6}\s+(.+?)\s*$/u);
    if (match?.[1]) headings.push({ heading: match[1], line: index + 1 });
  }
  return headings.map((heading, index) => ({
    heading: heading.heading,
    startLine: heading.line,
    endLine: Math.max(heading.line, (headings[index + 1]?.line ?? lines.length + 1) - 1),
  }));
}

export function buildAgentCoverageSnapshotFromText(
  sourcePath: string,
  content: string,
  gitRef?: string,
): AgentCoverageSnapshot {
  const source = userAuthoredAgentsContent(content);
  const normalizedPath = toRegistryPath(sourcePath);
  return {
    version: 1,
    source: {
      path: normalizedPath,
      ...(gitRef === undefined ? {} : { gitRef }),
      hash: sha256(source),
      lineCount: source.length === 0 ? 0 : source.split("\n").length,
    },
    anchors: extractAnchors(source),
    sections: extractSections(source),
  };
}

function validateGitRef(gitRef: string): void {
  if (!/^(?!-)[A-Za-z0-9][A-Za-z0-9._/@{}~^+\-]*$/u.test(gitRef)) {
    throw new Error(`Unsafe or invalid Git ref: ${gitRef}`);
  }
}

export async function buildAgentCoverageSnapshot(
  projectRoot: string,
  options: { sourcePath?: string; gitRef?: string } = {},
): Promise<AgentCoverageSnapshot> {
  const root = path.resolve(projectRoot);
  const sourcePath = toRegistryPath(options.sourcePath ?? "AGENTS.md");
  let content: string;
  if (options.gitRef) {
    validateGitRef(options.gitRef);
    const { stdout } = await execFileAsync(
      "git",
      ["-c", `safe.directory=${root}`, "-C", root, "show", `${options.gitRef}:${sourcePath}`],
      { encoding: "utf8", timeout: 15_000, windowsHide: true, maxBuffer: 16 * 1024 * 1024 },
    );
    content = stdout;
  } else {
    content = await readFile(resolveRegistryPath(root, sourcePath), "utf8");
  }
  return buildAgentCoverageSnapshotFromText(sourcePath, content, options.gitRef);
}

export async function writeAgentCoverageSnapshot(
  projectRoot: string,
  snapshot: AgentCoverageSnapshot,
  baselinePath = AGENTS_COVERAGE_PATH,
): Promise<void> {
  await writeProjectFile(projectRoot, baselinePath, serializeJson(snapshot));
}

export async function loadAgentCoverageSnapshot(
  projectRoot: string,
  baselinePath = AGENTS_COVERAGE_PATH,
): Promise<AgentCoverageSnapshot> {
  const absolute = resolveRegistryPath(projectRoot, baselinePath);
  const parsed: unknown = JSON.parse(await readFile(absolute, "utf8"));
  return coverageSnapshotSchema.parse(parsed);
}

function defaultTargetPaths(registry: Registry): string[] {
  const targets = new Set<string>([
    "AGENTS.md",
    "README.md",
    "ARCHITECTURE.md",
    "SECURITY.md",
    "docs",
    "instructions",
    ".contexttend/candidates",
  ]);
  for (const source of Object.values(registry.sources)) {
    if (source.authority === "evidence" || source.authority === "generated") continue;
    for (const sourcePath of sourcePaths(source)) {
      targets.add(toRegistryPath(sourcePath).replace(/\/$/u, ""));
    }
  }
  return [...targets].filter(Boolean).sort((left, right) => left.localeCompare(right, "en"));
}

function excludedDefaultPaths(registry: Registry): string[] {
  return Object.values(registry.sources)
    .filter((source) => source.authority === "evidence" || source.authority === "generated")
    .flatMap((source) => sourcePaths(source))
    .map((item) => toRegistryPath(item).replace(/\/$/u, ""))
    .filter(Boolean);
}

function isAtOrUnder(candidate: string, parent: string): boolean {
  return candidate === parent || candidate.startsWith(`${parent}/`);
}

function isTextFile(filePath: string): boolean {
  return textNames.has(path.basename(filePath)) || textExtensions.has(path.extname(filePath).toLowerCase());
}

async function collectTargetFiles(
  root: string,
  relativeTarget: string,
  baselinePath: string,
  collected: Set<string>,
): Promise<void> {
  const normalized = toRegistryPath(relativeTarget).replace(/\/$/u, "");
  if (!normalized || normalized === toRegistryPath(baselinePath)) return;
  const absolute = resolveRegistryPath(root, normalized);
  let stats;
  try {
    stats = await lstat(absolute);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
    throw error;
  }
  if (stats.isSymbolicLink()) return;
  if (!(await realPathIsInsideRoot(root, absolute))) {
    throw new Error(`Coverage target resolves outside the project: ${normalized}`);
  }
  if (stats.isFile()) {
    if (isTextFile(absolute)) collected.add(normalized);
    return;
  }
  if (!stats.isDirectory()) return;
  const entries = await readdir(absolute, { withFileTypes: true });
  entries.sort((left, right) => left.name.localeCompare(right.name, "en"));
  for (const entry of entries) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const child = toRegistryPath(path.posix.join(normalized, entry.name));
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) {
      await collectTargetFiles(root, child, baselinePath, collected);
    } else if (entry.isFile() && isTextFile(entry.name) && child !== toRegistryPath(baselinePath)) {
      collected.add(child);
    }
  }
}

function normalizedHeading(value: string): string {
  return value.toLowerCase().replace(/[`*_#]/gu, "").replace(/\s+/gu, " ").trim();
}

export async function checkAgentCoverage(
  projectRoot: string,
  options: { baselinePath?: string; targetPaths?: string[] } = {},
): Promise<AgentCoverageCheck> {
  const root = path.resolve(projectRoot);
  const baselinePath = toRegistryPath(options.baselinePath ?? AGENTS_COVERAGE_PATH);
  const snapshot = await loadAgentCoverageSnapshot(root, baselinePath);
  const registry = await loadRegistry(root);
  const targets = options.targetPaths?.map((item) => toRegistryPath(item)) ??
    defaultTargetPaths(registry);
  const files = new Set<string>();
  for (const target of targets) {
    await collectTargetFiles(root, target, baselinePath, files);
  }
  const excluded = options.targetPaths === undefined ? excludedDefaultPaths(registry) : [];
  const sourceCopy =
    snapshot.source.gitRef === undefined && snapshot.source.path !== "AGENTS.md"
      ? toRegistryPath(snapshot.source.path)
      : null;
  const scannedFiles = [...files]
    .filter((file) => file !== sourceCopy)
    .filter((file) => !excluded.some((item) => isAtOrUnder(file, item)))
    .sort((left, right) => left.localeCompare(right, "en"));
  const contents = await Promise.all(
    scannedFiles.map((file) => readFile(resolveRegistryPath(root, file), "utf8")),
  );
  const corpus = normalizeText(contents.join("\n")).replaceAll("\\", "/");
  const missing = snapshot.anchors.filter((anchor) => {
    const value = anchor.kind === "path" ? anchor.value.replaceAll("\\", "/") : anchor.value;
    return !corpus.includes(value);
  });
  const normalizedCorpus = normalizedHeading(corpus);
  const missingHeadings = snapshot.sections.filter(
    (section) => !normalizedCorpus.includes(normalizedHeading(section.heading)),
  );
  return {
    valid: missing.length === 0,
    baselinePath,
    source: snapshot.source,
    targets,
    scannedFiles,
    anchors: {
      total: snapshot.anchors.length,
      preserved: snapshot.anchors.length - missing.length,
      missing,
    },
    sections: {
      total: snapshot.sections.length,
      headingsFound: snapshot.sections.length - missingHeadings.length,
      missingHeadings,
    },
  };
}
