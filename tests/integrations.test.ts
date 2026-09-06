import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  applyInitPlan,
  applyIntegrationPlan,
  buildClaudeBridgePlan,
  buildCodexHooksPlan,
  buildInitPlan,
  countManagedBlocks,
  startWork,
} from "@contexttend/core";
import { afterEach, describe, expect, it } from "vitest";

import { cleanupProjects, emptyProject } from "./helpers.js";

afterEach(cleanupProjects);
const now = new Date("2026-09-05T12:00:00.000Z");

async function initialized(): Promise<string> {
  const root = await emptyProject();
  await applyInitPlan(await buildInitPlan(root, { now }), now);
  return root;
}

function runHook(
  script: string,
  mode: string,
  input: Record<string, unknown> = {},
): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, mode], {
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stdout, stderr }));
    child.stdin.end(JSON.stringify(input));
  });
}

describe("agent continuity integrations", () => {
  it("merges Codex hooks without replacing existing handlers", async () => {
    const root = await initialized();
    await mkdir(path.join(root, ".git"));
    await mkdir(path.join(root, ".codex"));
    await writeFile(
      path.join(root, ".codex", "hooks.json"),
      JSON.stringify({
        hooks: {
          Stop: [{ hooks: [{ type: "command", command: "node custom-stop.mjs" }] }],
        },
      }),
      "utf8",
    );

    const plan = await buildCodexHooksPlan(root);
    expect(plan.change.kind).toBe("update");
    await applyIntegrationPlan(plan);
    const installed = JSON.parse(
      await readFile(path.join(root, ".codex", "hooks.json"), "utf8"),
    ) as { hooks: Record<string, unknown[]> };
    expect(JSON.stringify(installed)).toContain("custom-stop.mjs");
    expect(JSON.stringify(installed)).toContain(".contexttend/hooks/codex.mjs");
    expect(JSON.stringify(installed)).toContain("commandWindows");
    expect(Object.keys(installed.hooks)).toEqual(
      expect.arrayContaining([
        "SessionStart",
        "PostToolUse",
        "Stop",
        "Interrupt",
        "SessionEnd",
      ]),
    );
    expect((await buildCodexHooksPlan(root)).change.kind).toBe("skip");
  });

  it("adds an idempotent no-hooks Claude bridge and preserves existing content", async () => {
    const root = await initialized();
    await writeFile(path.join(root, "CLAUDE.md"), "# Local Claude rules\n", "utf8");
    await applyIntegrationPlan(await buildClaudeBridgePlan(root));
    const first = await readFile(path.join(root, "CLAUDE.md"), "utf8");
    expect(first).toContain("# Local Claude rules");
    expect(first).toContain(".agents/skills/context-work/SKILL.md");
    expect(countManagedBlocks(first)).toBe(1);
    expect((await buildClaudeBridgePlan(root)).change.kind).toBe("skip");
  });

  it("runs recovery silently and asks for at most one stale Stop pass", async () => {
    const root = await initialized();
    await startWork(root, { title: "Hook recovery", now });
    const script = path.join(root, ".contexttend", "hooks", "codex.mjs");

    const session = await runHook(script, "session-start");
    expect(session).toMatchObject({ code: 0, stderr: "" });
    const sessionOutput = JSON.parse(session.stdout) as {
      hookSpecificOutput: { additionalContext: string };
    };
    expect(sessionOutput.hookSpecificOutput.additionalContext).toContain(
      "$context-work resume",
    );
    expect(sessionOutput.hookSpecificOutput.additionalContext.length).toBeLessThan(400);

    await writeFile(path.join(root, "feature.txt"), "changed\n", "utf8");
    const recovery = await runHook(script, "recover");
    expect(recovery).toMatchObject({ code: 0, stdout: "", stderr: "" });

    const stop = await runHook(script, "stop", { stop_hook_active: false });
    expect(JSON.parse(stop.stdout)).toMatchObject({ decision: "block" });
    const repeated = await runHook(script, "stop", { stop_hook_active: true });
    expect(JSON.parse(repeated.stdout)).toEqual({});
  });
});
