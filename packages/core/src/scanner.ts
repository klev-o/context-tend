import { execFile } from "node:child_process";
import { lstat, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import type { ProjectSnapshot } from "./domain.js";
import { toRegistryPath } from "./paths.js";

const IGNORED_DIRECTORIES = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".next",
  ".nuxt",
  ".turbo",
  ".cache",
  ".venv",
  "venv",
  "target",
  "vendor",
]);

const MAX_ENTRIES = 75_000;
const MAX_DEPTH = 16;
const execFileAsync = promisify(execFile);

async function detectGitStatus(
  root: string,
  isGitRepository: boolean,
): Promise<ProjectSnapshot["gitStatus"]> {
  if (!isGitRepository) return "not-repository";
  try {
    const { stdout } = await execFileAsync(
      "git",
      [
        "-c",
        `safe.directory=${root}`,
        "status",
        "--porcelain",
        "--untracked-files=normal",
      ],
      { cwd: root, encoding: "utf8", timeout: 5_000, windowsHide: true },
    );
    return stdout.trim().length === 0 ? "clean" : "dirty";
  } catch {
    return "unknown";
  }
}

async function walk(
  root: string,
  current: string,
  files: Set<string>,
  directories: Set<string>,
  depth: number,
): Promise<void> {
  if (depth > MAX_DEPTH || files.size + directories.size >= MAX_ENTRIES) {
    return;
  }
  const entries = await readdir(current, { withFileTypes: true });
  entries.sort((left, right) => left.name.localeCompare(right.name, "en"));
  for (const entry of entries) {
    if (files.size + directories.size >= MAX_ENTRIES) {
      return;
    }
    const absolute = path.join(current, entry.name);
    const relative = toRegistryPath(path.relative(root, absolute));
    if (entry.isDirectory()) {
      if (IGNORED_DIRECTORIES.has(entry.name)) {
        continue;
      }
      directories.add(relative);
      await walk(root, absolute, files, directories, depth + 1);
    } else if (entry.isFile() || entry.isSymbolicLink()) {
      files.add(relative);
    }
  }
}

async function readPackageJson(
  root: string,
  files: ReadonlySet<string>,
): Promise<Record<string, unknown> | null> {
  if (!files.has("package.json")) {
    return null;
  }
  try {
    return JSON.parse(await readFile(path.join(root, "package.json"), "utf8")) as Record<
      string,
      unknown
    >;
  } catch {
    return null;
  }
}

function dependencyNames(packageJson: Record<string, unknown> | null): Set<string> {
  const names = new Set<string>();
  for (const key of ["dependencies", "devDependencies", "peerDependencies"]) {
    const value = packageJson?.[key];
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      for (const name of Object.keys(value)) {
        names.add(name);
      }
    }
  }
  return names;
}

function detectFrameworks(dependencies: ReadonlySet<string>): string[] {
  const candidates: Array<[string, string[]]> = [
    ["Next.js", ["next"]],
    ["React", ["react"]],
    ["Vue", ["vue"]],
    ["Nuxt", ["nuxt"]],
    ["Svelte", ["svelte", "@sveltejs/kit"]],
    ["Angular", ["@angular/core"]],
    ["Express", ["express"]],
    ["Fastify", ["fastify"]],
    ["NestJS", ["@nestjs/core"]],
  ];
  return candidates
    .filter(([, packages]) => packages.some((name) => dependencies.has(name)))
    .map(([name]) => name);
}

export async function scanProject(projectRoot: string): Promise<ProjectSnapshot> {
  const root = path.resolve(projectRoot);
  const rootStats = await lstat(root);
  if (!rootStats.isDirectory()) {
    throw new Error(`Project root is not a directory: ${root}`);
  }

  const files = new Set<string>();
  const directories = new Set<string>();
  await walk(root, root, files, directories, 0);

  const packageJson = await readPackageJson(root, files);
  const dependencies = dependencyNames(packageJson);
  const packageManagers: string[] = [];
  if (files.has("pnpm-lock.yaml")) packageManagers.push("pnpm");
  if (files.has("yarn.lock")) packageManagers.push("yarn");
  if (files.has("package-lock.json")) packageManagers.push("npm");
  if (files.has("bun.lock") || files.has("bun.lockb")) packageManagers.push("bun");
  if (files.has("uv.lock") || files.has("pyproject.toml")) packageManagers.push("uv/pip");
  if (files.has("Cargo.lock") || files.has("Cargo.toml")) packageManagers.push("cargo");
  if (files.has("go.mod")) packageManagers.push("go modules");

  const languageExtensions: Array<[string, string[]]> = [
    ["TypeScript", [".ts", ".tsx", ".mts", ".cts"]],
    ["JavaScript", [".js", ".jsx", ".mjs", ".cjs"]],
    ["Python", [".py"]],
    ["Rust", [".rs"]],
    ["Go", [".go"]],
    ["Java", [".java"]],
    ["C#", [".cs"]],
    ["Ruby", [".rb"]],
  ];
  const languages = languageExtensions
    .filter(([, extensions]) =>
      [...files].some((file) => extensions.some((extension) => file.endsWith(extension))),
    )
    .map(([name]) => name);

  const gitEntry = await statIfExists(path.join(root, ".git"));
  const isGitRepository = Boolean(gitEntry?.isDirectory() || gitEntry?.isFile());
  const workspaces = packageJson?.["workspaces"];
  const monorepo =
    files.has("pnpm-workspace.yaml") ||
    files.has("lerna.json") ||
    files.has("nx.json") ||
    files.has("turbo.json") ||
    Array.isArray(workspaces) ||
    (workspaces !== null && typeof workspaces === "object");

  return {
    root,
    files,
    directories,
    isGitRepository,
    gitStatus: await detectGitStatus(root, isGitRepository),
    packageManagers,
    languages,
    frameworks: detectFrameworks(dependencies),
    monorepo,
  };
}

async function statIfExists(target: string): Promise<import("node:fs").Stats | undefined> {
  try {
    return await lstat(target);
  } catch {
    return undefined;
  }
}

export function snapshotHasPath(
  snapshot: ProjectSnapshot,
  registryPath: string,
): boolean {
  const normalized = toRegistryPath(registryPath).replace(/\/$/, "");
  return snapshot.files.has(normalized) || snapshot.directories.has(normalized);
}

export function firstExistingPath(
  snapshot: ProjectSnapshot,
  candidates: string[],
): string | null {
  return candidates.find((candidate) => snapshotHasPath(snapshot, candidate)) ?? null;
}

export function filesUnder(
  snapshot: ProjectSnapshot,
  directory: string,
  predicate: (file: string) => boolean = () => true,
): string[] {
  const prefix = `${toRegistryPath(directory).replace(/\/$/, "")}/`;
  return [...snapshot.files]
    .filter((file) => file.startsWith(prefix) && predicate(file))
    .sort((left, right) => left.localeCompare(right, "en"));
}
