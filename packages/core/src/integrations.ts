import { lstat, readFile } from "node:fs/promises";
import path from "node:path";

import type { PlannedChange } from "./domain.js";
import { sha256 } from "./hashing.js";
import {
  CLAUDE_MANAGED_BLOCK,
  upsertManagedBlock,
} from "./managed-block.js";
import { resolveRegistryPath } from "./paths.js";
import { serializeJson, writeProjectFile } from "./storage.js";

export const CODEX_HOOKS_PATH = ".codex/hooks.json";
export const CLAUDE_BRIDGE_PATH = "CLAUDE.md";

export interface IntegrationPlan {
  root: string;
  integration: "codex-hooks" | "claude-bridge";
  change: PlannedChange;
}

async function readOptional(root: string, relativePath: string): Promise<string | null> {
  try {
    return await readFile(resolveRegistryPath(root, relativePath), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hookCommand(mode: string): {
  command: string;
  commandWindows: string;
} {
  return {
    command:
      'node "$(git rev-parse --show-toplevel)/.contexttend/hooks/codex.mjs" ' +
      mode,
    commandWindows:
      'powershell.exe -NoProfile -Command "$r = (git rev-parse --show-toplevel); ' +
      "node (Join-Path $r '.contexttend/hooks/codex.mjs') " +
      mode +
      '"',
  };
}

function handler(mode: string, timeout: number): Record<string, unknown> {
  return {
    type: "command",
    ...hookCommand(mode),
    timeout,
  };
}

export function desiredCodexHooks(): Record<string, unknown[]> {
  return {
    SessionStart: [
      {
        matcher: "startup|resume|compact",
        hooks: [
          {
            ...handler("session-start", 10),
            additionalContextLimit: 200,
          },
        ],
      },
    ],
    PostToolUse: [
      {
        matcher: "Bash|apply_patch|Edit|Write",
        hooks: [handler("recover", 10)],
      },
    ],
    Stop: [{ hooks: [handler("stop", 10)] }],
    Interrupt: [{ hooks: [handler("recover", 3)] }],
    SessionEnd: [{ hooks: [handler("recover", 10)] }],
  };
}

function isContextTendHandler(value: unknown): boolean {
  if (!isRecord(value) || value["type"] !== "command") return false;
  return ["session-start", "recover", "stop"].some((mode) => {
    const expected = hookCommand(mode);
    // A path mentioned in arbitrary metadata is not proof of ownership.
    // Preserve customized commands, including a different platform variant.
    return (value["command"] === expected.command || value["commandWindows"] === expected.commandWindows) &&
      (value["command"] === undefined || value["command"] === expected.command) &&
      (value["commandWindows"] === undefined || value["commandWindows"] === expected.commandWindows);
  });
}

function preserveOtherHandlers(group: unknown): unknown[] {
  if (!isRecord(group) || !Array.isArray(group["hooks"])) return [group];
  const original = group["hooks"];
  const remaining = original.filter((hook) => !isContextTendHandler(hook));
  if (remaining.length === original.length) return [group];
  return remaining.length === 0 ? [] : [{ ...group, hooks: remaining }];
}

function mergeCodexHooks(current: string | null): string {
  let root: Record<string, unknown> = {};
  if (current !== null) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(current) as unknown;
    } catch (error) {
      throw new Error(
        `Cannot parse ${CODEX_HOOKS_PATH}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    if (!isRecord(parsed)) {
      throw new Error(`${CODEX_HOOKS_PATH} must contain a JSON object`);
    }
    root = structuredClone(parsed);
  }
  const currentHooks = root["hooks"];
  if (currentHooks !== undefined && !isRecord(currentHooks)) {
    throw new Error(`${CODEX_HOOKS_PATH} hooks must be a JSON object`);
  }
  const hooks: Record<string, unknown> = isRecord(currentHooks)
    ? { ...currentHooks }
    : {};
  for (const [event, desiredGroups] of Object.entries(desiredCodexHooks())) {
    const existing = hooks[event];
    if (existing !== undefined && !Array.isArray(existing)) {
      throw new Error(`${CODEX_HOOKS_PATH} hooks.${event} must be an array`);
    }
    hooks[event] = [
      ...(existing ?? []).flatMap(preserveOtherHandlers),
      ...desiredGroups,
    ];
  }
  root["hooks"] = hooks;
  return serializeJson(root);
}

async function hasGitMarker(root: string): Promise<boolean> {
  try {
    const stats = await lstat(path.join(root, ".git"));
    return stats.isDirectory() || stats.isFile();
  } catch {
    return false;
  }
}

export async function buildCodexHooksPlan(
  projectRoot: string,
): Promise<IntegrationPlan> {
  const root = path.resolve(projectRoot);
  if (!(await hasGitMarker(root))) {
    throw new Error(
      "Codex hooks require a Git repository so their command can resolve the repository root. The portable ContextTend work flow remains available without hooks.",
    );
  }
  if ((await readOptional(root, ".contexttend/hooks/codex.mjs")) === null) {
    throw new Error(
      "ContextTend hook runtime is missing. Run contexttend init --apply or contexttend update --apply first.",
    );
  }
  const current = await readOptional(root, CODEX_HOOKS_PATH);
  const desired = mergeCodexHooks(current);
  return {
    root,
    integration: "codex-hooks",
    change:
      current === desired
        ? {
            path: CODEX_HOOKS_PATH,
            kind: "skip",
            reason: "ContextTend Codex hooks are already current",
            owner: "shared",
          }
        : {
            path: CODEX_HOOKS_PATH,
            kind: current === null ? "create" : "update",
            reason: "merge optional ContextTend lifecycle hooks",
            owner: "shared",
            content: desired,
            beforeHash: current === null ? null : sha256(current),
          },
  };
}

export async function buildClaudeBridgePlan(
  projectRoot: string,
): Promise<IntegrationPlan> {
  const root = path.resolve(projectRoot);
  const current = await readOptional(root, CLAUDE_BRIDGE_PATH);
  const original = current ?? "";
  const result = upsertManagedBlock(original, CLAUDE_MANAGED_BLOCK);
  return {
    root,
    integration: "claude-bridge",
    change: result.changed
      ? {
          path: CLAUDE_BRIDGE_PATH,
          kind: current === null ? "create" : "update",
          reason: "upsert marker-bounded ContextTend bridge for Claude",
          owner: "shared",
          content: result.content,
          beforeHash: current === null ? null : sha256(current),
        }
      : {
          path: CLAUDE_BRIDGE_PATH,
          kind: "skip",
          reason: "ContextTend Claude bridge is already current",
          owner: "shared",
        },
  };
}

export async function applyIntegrationPlan(
  plan: IntegrationPlan,
): Promise<PlannedChange> {
  const change = plan.change;
  if (change.kind === "skip") return change;
  if (change.content === undefined) {
    throw new Error(`Integration plan for ${change.path} has no content`);
  }
  const current = await readOptional(plan.root, change.path);
  const actualHash = current === null ? null : sha256(current);
  if (actualHash !== change.beforeHash) {
    throw new Error(`Refusing to write ${change.path}: it changed after planning`);
  }
  await writeProjectFile(plan.root, change.path, change.content);
  return change;
}
