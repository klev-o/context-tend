import { spawn } from "node:child_process";
import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { CONTEXTTEND_BANNER } from "../packages/cli/src/banner.js";
import { cleanupProjects, copyFixture } from "./helpers.js";

const workspaceRoot = fileURLToPath(new URL("..", import.meta.url));
const cli = path.join(workspaceRoot, "packages", "cli", "dist", "index.js");

interface ProcessResult {
  code: number | null;
  stdout: string;
  stderr: string;
}

function runCli(args: string[]): Promise<ProcessResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cli, ...args], {
      cwd: workspaceRoot,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
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
  });
}

afterEach(cleanupProjects);

describe("CLI process", () => {
  it("shows the banner for human output without contaminating JSON", async () => {
    const help = await runCli(["--help"]);
    expect(help).toMatchObject({ code: 0, stderr: "" });
    expect(help.stdout.startsWith(CONTEXTTEND_BANNER)).toBe(true);

    const root = await copyFixture("existing-agents");
    expect((await runCli(["init", root, "--apply", "--json"])).code).toBe(0);

    const human = await runCli(["status", root]);
    expect(human).toMatchObject({ code: 0, stderr: "" });
    expect(human.stdout.startsWith(CONTEXTTEND_BANNER)).toBe(true);

    const machine = await runCli(["status", root, "--json"]);
    expect(machine).toMatchObject({ code: 0, stderr: "" });
    expect(machine.stdout).not.toContain(CONTEXTTEND_BANNER);
    expect(JSON.parse(machine.stdout)).toMatchObject({ root });

    const invalid = await runCli(["unknown-command"]);
    expect(invalid.code).toBe(1);
    expect(invalid.stderr).not.toContain(CONTEXTTEND_BANNER);
  });

  it("previews without writes, applies idempotently, validates and diffs", async () => {
    const root = await copyFixture("existing-agents");
    const agentsPath = path.join(root, "AGENTS.md");
    const original = await readFile(agentsPath, "utf8");

    const preview = await runCli(["init", root, "--dry-run", "--json"]);
    expect(preview).toMatchObject({ code: 0, stderr: "" });
    expect(JSON.parse(preview.stdout)).toMatchObject({ applied: false });
    expect(await readFile(agentsPath, "utf8")).toBe(original);
    await expect(access(path.join(root, ".contexttend"))).rejects.toThrow();

    const apply = await runCli(["init", root, "--apply", "--json"]);
    expect(apply.code).toBe(0);
    expect(JSON.parse(apply.stdout)).toMatchObject({
      applied: true,
      validation: { valid: true },
    });
    expect(await readFile(agentsPath, "utf8")).toContain(original.trim());

    const onboarding = await runCli(["record", "onboarding", root, "--json"]);
    expect(onboarding.code).toBe(0);
    expect(JSON.parse(onboarding.stdout).lastOnboarding).toMatch(
      /^\d{4}-\d{2}-\d{2}T/,
    );

    const coverage = await runCli(["agents-coverage", "check", root, "--json"]);
    expect(coverage.code).toBe(0);
    expect(JSON.parse(coverage.stdout)).toMatchObject({ valid: true });

    const repeat = await runCli(["init", root, "--apply", "--json"]);
    expect(repeat.code).toBe(0);
    const validate = await runCli(["validate", root, "--json"]);
    expect(validate.code).toBe(0);
    expect(JSON.parse(validate.stdout)).toMatchObject({ valid: true });

    await writeFile(path.join(root, "docs", "PRODUCT.md"), "# Product changed\n", "utf8");
    const diff = await runCli(["diff", root, "--json"]);
    expect(diff.code).toBe(0);
    expect(JSON.parse(diff.stdout).sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: "product", status: "changed" }),
      ]),
    );

    await rm(path.join(root, "docs", "GOALS.md"));
    const invalid = await runCli(["validate", root, "--json"]);
    expect(invalid.code).toBe(1);
    expect(JSON.parse(invalid.stdout).findings).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "CT104" })]),
    );
  });

  it("runs the portable work lifecycle and optional integrations end to end", async () => {
    const root = await copyFixture("existing-agents");
    expect((await runCli(["init", root, "--apply", "--json"])).code).toBe(0);

    const started = await runCli([
      "work",
      "start",
      root,
      "--title",
      "Resume across sessions",
      "--objective",
      "Verify the portable CLI lifecycle.",
      "--json",
    ]);
    expect(started.code).toBe(0);
    expect(JSON.parse(started.stdout)).toMatchObject({
      active: true,
      stale: false,
      work: { title: "Resume across sessions" },
    });

    await writeFile(path.join(root, "feature.txt"), "changed\n", "utf8");
    const stale = await runCli(["work", "status", root, "--json"]);
    expect(stale.code).toBe(0);
    const staleJson = JSON.parse(stale.stdout) as Record<string, unknown>;
    expect(staleJson).toMatchObject({
      active: true,
      stale: true,
    });
    expect(staleJson).not.toHaveProperty("savedRecovery");
    expect(stale.stdout).not.toContain('"hash"');

    const quietRecovery = await runCli([
      "work",
      "recover",
      root,
      "--quiet",
    ]);
    expect(quietRecovery).toMatchObject({ code: 0, stdout: "", stderr: "" });

    const checkpoint = await runCli(["work", "checkpoint", root, "--json"]);
    expect(checkpoint.code).toBe(0);
    expect(JSON.parse(checkpoint.stdout)).toMatchObject({ stale: false });
    const completed = await runCli(["work", "complete", root, "--json"]);
    expect(completed.code).toBe(0);
    expect(JSON.parse(completed.stdout)).toMatchObject({
      activeWork: null,
      lastCompletedWork: { title: "Resume across sessions" },
    });

    const claude = await runCli([
      "work",
      "install-claude-bridge",
      root,
      "--apply",
      "--json",
    ]);
    expect(claude.code).toBe(0);
    expect(await readFile(path.join(root, "CLAUDE.md"), "utf8")).toContain(
      ".contexttend/work/current.md",
    );

    await mkdir(path.join(root, ".git"));
    const hooks = await runCli([
      "work",
      "install-codex-hooks",
      root,
      "--apply",
      "--json",
    ]);
    expect(hooks.code).toBe(0);
    expect(await readFile(path.join(root, ".codex", "hooks.json"), "utf8")).toContain(
      ".contexttend/hooks/codex.mjs",
    );
  });
});
