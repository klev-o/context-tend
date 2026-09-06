export const CODEX_HOOK_SCRIPT = String.raw`import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { lstat, mkdir, readFile, readdir, readlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const statePath = path.join(root, ".contexttend", "state.json");
const ignored = new Set([
  ".git",
  ".contexttend",
  "node_modules",
  "dist",
  "coverage",
  ".next",
  ".turbo",
  "build",
]);
const execFileAsync = promisify(execFile);
const mode = process.argv[2] ?? "recover";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function registryPath(value) {
  return value.replaceAll("\\", "/").replace(/^\.\//, "");
}

async function hashPath(target) {
  let stats;
  try {
    stats = await lstat(target);
  } catch (error) {
    if (error && error.code === "ENOENT") return null;
    throw error;
  }
  if (stats.isSymbolicLink()) {
    return sha256("symlink\0" + await readlink(target));
  }
  if (stats.isFile()) return sha256(await readFile(target));
  if (!stats.isDirectory()) {
    return sha256("other\0" + stats.mode + "\0" + stats.size);
  }
  const entries = [];
  async function collect(base, current) {
    const children = await readdir(current, { withFileTypes: true });
    children.sort((left, right) => left.name.localeCompare(right.name, "en"));
    for (const child of children) {
      if (child.isDirectory() && ignored.has(child.name)) continue;
      const absolute = path.join(current, child.name);
      const relative = registryPath(path.relative(base, absolute));
      if (child.isDirectory()) {
        entries.push("directory\0" + relative);
        await collect(base, absolute);
      } else if (child.isSymbolicLink()) {
        entries.push("symlink\0" + relative + "\0" + await readlink(absolute));
      } else if (child.isFile()) {
        entries.push("file\0" + relative + "\0" + await hashPath(absolute));
      }
    }
  }
  await collect(target, target);
  return sha256(entries.join("\n"));
}

async function gitOutput(args) {
  const result = await execFileAsync(
    "git",
    ["-c", "safe.directory=" + root, ...args],
    {
      cwd: root,
      encoding: "utf8",
      timeout: 10000,
      windowsHide: true,
      maxBuffer: 16 * 1024 * 1024,
    },
  );
  return result.stdout;
}

function parsePorcelain(raw) {
  const fields = raw.split("\0");
  const result = [];
  for (let index = 0; index < fields.length; index += 1) {
    const field = fields[index];
    if (!field || field.length < 4) continue;
    const status = field.slice(0, 2);
    const currentPath = registryPath(field.slice(3));
    const renamed = status.includes("R") || status.includes("C");
    const previous = renamed ? fields[index + 1] : undefined;
    if (renamed) index += 1;
    if (currentPath === ".contexttend" || currentPath.startsWith(".contexttend/")) {
      continue;
    }
    result.push({
      status,
      path: currentPath,
      ...(previous ? { previousPath: registryPath(previous) } : {}),
    });
  }
  return result.sort((left, right) =>
    (left.path + "\0" + left.status).localeCompare(
      right.path + "\0" + right.status,
      "en",
    ),
  );
}

async function buildRecovery(workId) {
  const capturedAt = new Date().toISOString();
  try {
    const entries = parsePorcelain(
      await gitOutput(["status", "--porcelain=v1", "-z", "--untracked-files=all"]),
    );
    let gitHead = null;
    try {
      gitHead = (await gitOutput(["rev-parse", "HEAD"])).trim() || null;
    } catch {
      // Repositories without a first commit have no HEAD.
    }
    const changedFiles = [];
    for (const entry of entries) {
      let hash = null;
      try {
        hash = await hashPath(path.resolve(root, ...entry.path.split("/")));
      } catch {
        hash = null;
      }
      changedFiles.push({ ...entry, hash });
    }
    return {
      version: 1,
      workId,
      capturedAt,
      source: "git",
      gitHead,
      fingerprint: sha256(JSON.stringify({
        source: "git",
        gitHead,
        changedFiles,
      })),
      totalChangedFiles: changedFiles.length,
      truncated: changedFiles.length > 250,
      changedFiles: changedFiles.slice(0, 250),
    };
  } catch {
    const treeHash = await hashPath(root);
    return {
      version: 1,
      workId,
      capturedAt,
      source: "filesystem",
      gitHead: null,
      fingerprint: sha256(JSON.stringify({ source: "filesystem", treeHash })),
      totalChangedFiles: 0,
      truncated: false,
      changedFiles: [],
    };
  }
}

async function input() {
  let raw = "";
  for await (const chunk of process.stdin) raw += chunk;
  if (!raw.trim()) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function writeRecovery(activeWork, recovery) {
  const target = path.resolve(root, ...activeWork.recoveryPath.split("/"));
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, JSON.stringify(recovery, null, 2) + "\n", "utf8");
}

async function main() {
  let state;
  try {
    state = JSON.parse(await readFile(statePath, "utf8"));
  } catch {
    if (mode === "stop") process.stdout.write("{}\n");
    return;
  }
  const activeWork = state.activeWork;
  if (!activeWork) {
    if (mode === "stop") process.stdout.write("{}\n");
    return;
  }
  if (mode === "session-start") {
    const message =
      "ContextTend active work exists: " + activeWork.title +
      ". Before new substantive work, use $context-work resume, read " +
      activeWork.path + ", and verify it against Git/repository evidence.";
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "SessionStart",
        additionalContext: message,
      },
    }) + "\n");
    return;
  }
  const recovery = await buildRecovery(activeWork.id);
  await writeRecovery(activeWork, recovery);
  if (mode !== "stop") return;
  const event = await input();
  if (event.stop_hook_active === true) {
    process.stdout.write("{}\n");
    return;
  }
  let currentHash = null;
  try {
    currentHash = sha256(
      await readFile(path.resolve(root, ...activeWork.path.split("/"))),
    );
  } catch {
    // Missing current work is stale and should request one recovery pass.
  }
  const stale =
    recovery.fingerprint !== activeWork.checkpointFingerprint ||
    currentHash !== activeWork.checkpointHash;
  if (!stale) {
    process.stdout.write("{}\n");
    return;
  }
  process.stdout.write(JSON.stringify({
    decision: "block",
    reason:
      "ContextTend detected changes after the last active-work checkpoint. " +
      "Use $context-work checkpoint now: reconcile .contexttend/work/current.md " +
      "with the actual repository and tests, run contexttend work checkpoint, " +
      "then finish the response. Keep the checkpoint concise and do not store a transcript.",
  }) + "\n");
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  if (mode === "stop") {
    process.stdout.write(JSON.stringify({
      systemMessage: "ContextTend recovery hook failed: " + message,
    }) + "\n");
  } else {
    process.stderr.write("ContextTend recovery hook failed: " + message + "\n");
    process.exitCode = 1;
  }
});
`;
