import { spawn } from "node:child_process";
import { access, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

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
});
