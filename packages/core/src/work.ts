import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import {
  type ActiveWorkState,
  type ActiveWorkStatus,
  type State,
  type WorkRecovery,
  type WorkRecoveryFile,
} from "./domain.js";
import { hashPath, sha256 } from "./hashing.js";
import { resolveRegistryPath, toRegistryPath } from "./paths.js";
import { parseWorkRecovery } from "./schemas.js";
import {
  loadState,
  serializeJson,
  writeProjectFile,
} from "./storage.js";

export const CURRENT_WORK_PATH = ".contexttend/work/current.md";
export const WORK_RECOVERY_PATH = ".contexttend/work/recovery.json";
export const WORK_DOCUMENT_MAX_BYTES = 8 * 1024;
export const WORK_METADATA_START = "<!-- contexttend:work:start -->";
export const WORK_METADATA_END = "<!-- contexttend:work:end -->";

const MAX_RECORDED_FILES = 250;
const REQUIRED_WORK_SECTIONS = [
  "Objective",
  "Definition of done",
  "Constraints",
  "Decisions",
  "Completed",
  "In progress",
  "Next steps",
  "Changed files",
  "Verification",
  "Blockers",
  "Resume instructions",
] as const;
const execFileAsync = promisify(execFile);

interface GitEntry {
  status: string;
  path: string;
  previousPath?: string;
}

export interface WorkStatusResult {
  active: boolean;
  stale: boolean;
  reasons: string[];
  work: ActiveWorkState | null;
  currentExists: boolean;
  currentBytes: number | null;
  savedRecovery: WorkRecovery | null;
  liveRecovery: WorkRecovery | null;
}

export interface StartWorkOptions {
  title: string;
  objective?: string;
  now?: Date;
}

export interface CheckpointWorkOptions {
  status?: ActiveWorkStatus;
  now?: Date;
}

function oneLine(value: string, label: string, max: number): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length === 0) throw new Error(`${label} must not be empty`);
  if (normalized.length > max) {
    throw new Error(`${label} must be at most ${max} characters`);
  }
  return normalized;
}

function workId(title: string, now: Date): string {
  const timestamp = now.toISOString().replace(/[-:.]/g, "").replace("Z", "z");
  return `work-${timestamp}-${sha256(title).slice(0, 10)}`;
}

function metadata(
  id: string,
  status: ActiveWorkStatus | "completed",
  startedAt: string,
  checkpointedAt: string,
): string {
  return [
    WORK_METADATA_START,
    `Work ID: ${id}`,
    `Status: ${status}`,
    `Started: ${startedAt}`,
    `Checkpointed: ${checkpointedAt}`,
    WORK_METADATA_END,
  ].join("\n");
}

function replaceMetadata(
  content: string,
  id: string,
  status: ActiveWorkStatus | "completed",
  startedAt: string,
  checkpointedAt: string,
): string {
  const start = content.indexOf(WORK_METADATA_START);
  const end = content.indexOf(WORK_METADATA_END, Math.max(0, start));
  if (start < 0 || end < 0) {
    throw new Error("Current work document is missing its ContextTend metadata block");
  }
  if (content.indexOf(WORK_METADATA_START, start + WORK_METADATA_START.length) >= 0) {
    throw new Error("Current work document contains multiple metadata blocks");
  }
  const newline = content.includes("\r\n") ? "\r\n" : "\n";
  return (
    content.slice(0, start) +
    metadata(id, status, startedAt, checkpointedAt).replaceAll("\n", newline) +
    content.slice(end + WORK_METADATA_END.length)
  );
}

export function validateWorkDocument(content: string): string[] {
  const issues: string[] = [];
  const bytes = Buffer.byteLength(content, "utf8");
  if (bytes > WORK_DOCUMENT_MAX_BYTES) {
    issues.push(
      `current work is ${bytes} bytes; maximum is ${WORK_DOCUMENT_MAX_BYTES}`,
    );
  }
  const starts = content.split(WORK_METADATA_START).length - 1;
  const ends = content.split(WORK_METADATA_END).length - 1;
  if (starts !== 1 || ends !== 1) {
    issues.push("current work must contain exactly one complete metadata block");
  }
  for (const section of REQUIRED_WORK_SECTIONS) {
    if (!content.includes(`## ${section}\n`) && !content.includes(`## ${section}\r\n`)) {
      issues.push(`missing required section: ${section}`);
    }
  }
  return issues;
}

export function renderWorkDocument(
  id: string,
  title: string,
  objective: string,
  now: Date,
): string {
  const timestamp = now.toISOString();
  return [
    `# Current work: ${title}`,
    "",
    metadata(id, "active", timestamp, timestamp),
    "",
    "This is a compact handoff snapshot, not a transcript or activity log.",
    "",
    "## Objective",
    "",
    objective,
    "",
    "## Definition of done",
    "",
    "- Define observable acceptance criteria before the first implementation phase.",
    "",
    "## Constraints",
    "",
    "- Preserve user changes and repository-specific instructions.",
    "",
    "## Decisions",
    "",
    "- No durable implementation decision has been recorded yet.",
    "",
    "## Completed",
    "",
    "- Active work checkpoint created.",
    "",
    "## In progress",
    "",
    "- Inspect the repository and establish the first verified implementation step.",
    "",
    "## Next steps",
    "",
    "1. Read relevant canonical knowledge and inspect repository evidence.",
    "2. Replace this template detail with exact executable next steps.",
    "",
    "## Changed files",
    "",
    "- None recorded yet.",
    "",
    "## Verification",
    "",
    "- Not run yet.",
    "",
    "## Blockers",
    "",
    "- None known.",
    "",
    "## Resume instructions",
    "",
    "Read this file, run `contexttend work status`, inspect Git status/diff and",
    "relevant tests, then continue from the first unfinished verified step.",
    "",
  ].join("\n");
}

function parsePorcelain(raw: string): GitEntry[] {
  const fields = raw.split("\0");
  const result: GitEntry[] = [];
  for (let index = 0; index < fields.length; index += 1) {
    const field = fields[index];
    if (!field || field.length < 4) continue;
    const status = field.slice(0, 2);
    const currentPath = toRegistryPath(field.slice(3));
    const renamed = status.includes("R") || status.includes("C");
    const previous = renamed ? fields[index + 1] : undefined;
    if (renamed) index += 1;
    if (
      currentPath === ".contexttend" ||
      currentPath.startsWith(".contexttend/")
    ) {
      continue;
    }
    result.push({
      status,
      path: currentPath,
      ...(previous ? { previousPath: toRegistryPath(previous) } : {}),
    });
  }
  return result.sort((left, right) =>
    `${left.path}\0${left.status}`.localeCompare(
      `${right.path}\0${right.status}`,
      "en",
    ),
  );
}

async function gitOutput(root: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync(
    "git",
    ["-c", `safe.directory=${root}`, ...args],
    {
      cwd: root,
      encoding: "utf8",
      timeout: 10_000,
      windowsHide: true,
      maxBuffer: 16 * 1024 * 1024,
    },
  );
  return stdout;
}

async function hashGitEntries(
  root: string,
  entries: GitEntry[],
): Promise<WorkRecoveryFile[]> {
  const result: WorkRecoveryFile[] = [];
  for (const entry of entries) {
    let hash: string | null = null;
    try {
      hash = await hashPath(resolveRegistryPath(root, entry.path));
    } catch {
      hash = null;
    }
    result.push({ ...entry, hash });
  }
  return result;
}

async function gitRecovery(
  root: string,
  workIdValue: string,
  capturedAt: string,
): Promise<WorkRecovery | null> {
  try {
    const status = parsePorcelain(
      await gitOutput(root, [
        "status",
        "--porcelain=v1",
        "-z",
        "--untracked-files=all",
      ]),
    );
    let head: string | null = null;
    try {
      head = (await gitOutput(root, ["rev-parse", "HEAD"])).trim() || null;
    } catch {
      // An initialized repository can have no first commit yet.
    }
    const allFiles = await hashGitEntries(root, status);
    const fingerprint = sha256(
      JSON.stringify({ source: "git", gitHead: head, changedFiles: allFiles }),
    );
    return {
      version: 1,
      workId: workIdValue,
      capturedAt,
      source: "git",
      gitHead: head,
      fingerprint,
      totalChangedFiles: allFiles.length,
      truncated: allFiles.length > MAX_RECORDED_FILES,
      changedFiles: allFiles.slice(0, MAX_RECORDED_FILES),
    };
  } catch {
    return null;
  }
}

export async function buildWorkRecovery(
  projectRoot: string,
  workIdValue: string,
  now = new Date(),
): Promise<WorkRecovery> {
  const root = path.resolve(projectRoot);
  const capturedAt = now.toISOString();
  const git = await gitRecovery(root, workIdValue, capturedAt);
  if (git !== null) return git;
  const treeHash = await hashPath(root);
  if (treeHash === null) {
    throw new Error(`Project root does not exist: ${root}`);
  }
  return {
    version: 1,
    workId: workIdValue,
    capturedAt,
    source: "filesystem",
    gitHead: null,
    fingerprint: sha256(
      JSON.stringify({ source: "filesystem", treeHash }),
    ),
    totalChangedFiles: 0,
    truncated: false,
    changedFiles: [],
  };
}

async function readOptional(root: string, relativePath: string): Promise<string | null> {
  try {
    return await readFile(resolveRegistryPath(root, relativePath), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

async function loadSavedRecovery(
  root: string,
  relativePath: string,
): Promise<WorkRecovery | null> {
  const content = await readOptional(root, relativePath);
  if (content === null) return null;
  return parseWorkRecovery(JSON.parse(content) as unknown);
}

async function writeState(root: string, state: State): Promise<void> {
  await writeProjectFile(root, ".contexttend/state.json", serializeJson(state));
}

export async function startWork(
  projectRoot: string,
  options: StartWorkOptions,
): Promise<WorkStatusResult> {
  const root = path.resolve(projectRoot);
  const previous = await loadState(root);
  if (previous.activeWork !== null) {
    throw new Error(
      `Active work already exists: ${previous.activeWork.title}. Complete it before starting another task.`,
    );
  }
  const now = options.now ?? new Date();
  const title = oneLine(options.title, "title", 240);
  const objective = oneLine(options.objective ?? title, "objective", 1000);
  const id = workId(title, now);
  const current = renderWorkDocument(id, title, objective, now);
  const issues = validateWorkDocument(current);
  if (issues.length > 0) throw new Error(issues.join("; "));
  const recovery = await buildWorkRecovery(root, id, now);
  const timestamp = now.toISOString();
  const activeWork: ActiveWorkState = {
    id,
    title,
    status: "active",
    path: CURRENT_WORK_PATH,
    recoveryPath: WORK_RECOVERY_PATH,
    startedAt: timestamp,
    checkpointedAt: timestamp,
    checkpointHash: sha256(current),
    checkpointFingerprint: recovery.fingerprint,
  };
  await writeProjectFile(root, CURRENT_WORK_PATH, current);
  await writeProjectFile(root, WORK_RECOVERY_PATH, serializeJson(recovery));
  await writeState(root, {
    ...previous,
    updatedAt: timestamp,
    activeWork,
  });
  return getWorkStatus(root, now);
}

export async function getWorkStatus(
  projectRoot: string,
  now = new Date(),
): Promise<WorkStatusResult> {
  const root = path.resolve(projectRoot);
  const state = await loadState(root);
  if (state.activeWork === null) {
    return {
      active: false,
      stale: false,
      reasons: [],
      work: null,
      currentExists: (await readOptional(root, CURRENT_WORK_PATH)) !== null,
      currentBytes: null,
      savedRecovery: null,
      liveRecovery: null,
    };
  }
  const current = await readOptional(root, state.activeWork.path);
  let savedRecovery: WorkRecovery | null = null;
  let savedRecoveryError: string | null = null;
  try {
    savedRecovery = await loadSavedRecovery(root, state.activeWork.recoveryPath);
  } catch (error) {
    savedRecoveryError = error instanceof Error ? error.message : String(error);
  }
  const liveRecovery = await buildWorkRecovery(root, state.activeWork.id, now);
  const reasons: string[] = [];
  if (current === null) {
    reasons.push("current work document is missing");
  } else {
    const issues = validateWorkDocument(current);
    reasons.push(...issues);
    if (sha256(current) !== state.activeWork.checkpointHash) {
      reasons.push("current work document changed after the recorded checkpoint");
    }
  }
  if (savedRecovery === null) {
    reasons.push(
      savedRecoveryError === null
        ? "recovery snapshot is missing"
        : `recovery snapshot is invalid: ${savedRecoveryError}`,
    );
  } else if (savedRecovery.workId !== state.activeWork.id) {
    reasons.push("recovery snapshot belongs to another work item");
  }
  if (liveRecovery.fingerprint !== state.activeWork.checkpointFingerprint) {
    reasons.push("repository state changed after the recorded checkpoint");
  }
  return {
    active: true,
    stale: reasons.length > 0,
    reasons,
    work: state.activeWork,
    currentExists: current !== null,
    currentBytes: current === null ? null : Buffer.byteLength(current, "utf8"),
    savedRecovery,
    liveRecovery,
  };
}

export async function captureWorkRecovery(
  projectRoot: string,
  now = new Date(),
): Promise<WorkRecovery | null> {
  const root = path.resolve(projectRoot);
  const state = await loadState(root);
  if (state.activeWork === null) return null;
  const recovery = await buildWorkRecovery(root, state.activeWork.id, now);
  await writeProjectFile(
    root,
    state.activeWork.recoveryPath,
    serializeJson(recovery),
  );
  return recovery;
}

export async function checkpointWork(
  projectRoot: string,
  options: CheckpointWorkOptions = {},
): Promise<WorkStatusResult> {
  const root = path.resolve(projectRoot);
  const previous = await loadState(root);
  if (previous.activeWork === null) {
    throw new Error("No active work exists");
  }
  const now = options.now ?? new Date();
  const timestamp = now.toISOString();
  const existing = await readOptional(root, previous.activeWork.path);
  if (existing === null) throw new Error("Current work document is missing");
  const status = options.status ?? previous.activeWork.status;
  const current = replaceMetadata(
    existing,
    previous.activeWork.id,
    status,
    previous.activeWork.startedAt,
    timestamp,
  );
  const issues = validateWorkDocument(current);
  if (issues.length > 0) {
    throw new Error(`Invalid current work document: ${issues.join("; ")}`);
  }
  const recovery = await buildWorkRecovery(root, previous.activeWork.id, now);
  const activeWork: ActiveWorkState = {
    ...previous.activeWork,
    status,
    checkpointedAt: timestamp,
    checkpointHash: sha256(current),
    checkpointFingerprint: recovery.fingerprint,
  };
  await writeProjectFile(root, previous.activeWork.path, current);
  await writeProjectFile(
    root,
    previous.activeWork.recoveryPath,
    serializeJson(recovery),
  );
  await writeState(root, {
    ...previous,
    updatedAt: timestamp,
    activeWork,
  });
  return getWorkStatus(root, now);
}

export async function completeWork(
  projectRoot: string,
  now = new Date(),
): Promise<State> {
  const root = path.resolve(projectRoot);
  const status = await getWorkStatus(root, now);
  if (status.work === null) throw new Error("No active work exists");
  if (status.stale) {
    throw new Error(
      `Cannot complete stale active work: ${status.reasons.join("; ")}. Update current.md and run work checkpoint first.`,
    );
  }
  const previous = await loadState(root);
  const current = await readFile(
    resolveRegistryPath(root, status.work.path),
    "utf8",
  );
  const timestamp = now.toISOString();
  const completed = replaceMetadata(
    current,
    status.work.id,
    "completed",
    status.work.startedAt,
    timestamp,
  );
  await writeProjectFile(root, status.work.path, completed);
  const next: State = {
    ...previous,
    updatedAt: timestamp,
    activeWork: null,
    lastCompletedWork: {
      id: status.work.id,
      title: status.work.title,
      completedAt: timestamp,
    },
  };
  await writeState(root, next);
  return next;
}
