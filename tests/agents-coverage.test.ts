import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  AGENTS_COVERAGE_PATH,
  applyInitPlan,
  buildAgentCoverageSnapshotFromText,
  buildAgentCoverageSnapshot,
  buildInitPlan,
  checkAgentCoverage,
  loadAgentCoverageSnapshot,
  recordEvent,
  writeAgentCoverageSnapshot,
} from "@contexttend/core";
import { afterEach, describe, expect, it } from "vitest";

import { cleanupProjects, emptyProject } from "./helpers.js";

afterEach(cleanupProjects);
const now = new Date("2026-09-05T10:00:00.000Z");

function managedBlock(content: string): string {
  const start = content.indexOf("<!-- contexttend:start -->");
  if (start < 0) throw new Error("Managed block missing in test fixture");
  return content.slice(start);
}

describe("AGENTS migration coverage", () => {
  it("extracts durable anchors while excluding the managed ContextTend block", () => {
    const snapshot = buildAgentCoverageSnapshotFromText(
      "AGENTS.md",
      [
        "# Runtime rules",
        "Use `automatic_retry_by_label`, `RETRY_LIMIT`, and `fleet_bot/app.py`.",
        "Keep FleetMonitor isolated.",
        "<!-- contexttend:start -->",
        "Read `.contexttend/state.json`.",
        "<!-- contexttend:end -->",
      ].join("\n"),
    );
    const values = snapshot.anchors.map((anchor) => anchor.value);
    expect(values).toEqual(expect.arrayContaining([
      "automatic_retry_by_label",
      "RETRY_LIMIT",
      "fleet_bot/app.py",
      "FleetMonitor",
    ]));
    expect(values).not.toContain(".contexttend/state.json");
    expect(snapshot.sections).toEqual([
      expect.objectContaining({ heading: "Runtime rules", startLine: 1 }),
    ]);
  });

  it("blocks onboarding until anchors live in documentation rather than code alone", async () => {
    const root = await emptyProject();
    const agentsPath = path.join(root, "AGENTS.md");
    await writeFile(
      agentsPath,
      "# Runtime rules\n\nUse automatic_retry_by_label, RETRY_LIMIT, fleet_bot/app.py, and FleetMonitor.\n",
      "utf8",
    );
    await applyInitPlan(await buildInitPlan(root, { now }), now);

    const installedAgents = await readFile(agentsPath, "utf8");
    await writeFile(
      agentsPath,
      `# Agent map\n\n${managedBlock(installedAgents)}`,
      "utf8",
    );
    await mkdir(path.join(root, "fleet_bot"), { recursive: true });
    await writeFile(
      path.join(root, "fleet_bot", "app.py"),
      "automatic_retry_by_label = True\nRETRY_LIMIT = 3\nclass FleetMonitor: pass\n",
      "utf8",
    );

    const incomplete = await checkAgentCoverage(root);
    expect(incomplete.valid).toBe(false);
    expect(incomplete.anchors.missing.map((anchor) => anchor.value)).toEqual(
      expect.arrayContaining(["automatic_retry_by_label", "RETRY_LIMIT", "FleetMonitor"]),
    );
    await expect(recordEvent(root, "onboarding", { now })).rejects.toThrow(
      /Cannot record onboarding/,
    );

    await writeFile(
      path.join(root, "docs", "context", "runtime.md"),
      [
        "# Runtime rules",
        "",
        "`automatic_retry_by_label` uses `RETRY_LIMIT` in `fleet_bot/app.py`.",
        "`FleetMonitor` owns this lifecycle.",
      ].join("\n"),
      "utf8",
    );
    const complete = await checkAgentCoverage(root);
    expect(complete.valid).toBe(true);
    expect(complete.anchors.preserved).toBe(complete.anchors.total);
    expect((await recordEvent(root, "onboarding", { now })).lastOnboarding).toBe(
      now.toISOString(),
    );
  });

  it("creates the pre-migration baseline during first init", async () => {
    const root = await emptyProject();
    await writeFile(path.join(root, "AGENTS.md"), "# Rules\nUse REQUEST_TIMEOUT.\n", "utf8");
    await applyInitPlan(await buildInitPlan(root, { now }), now);
    const baseline = await loadAgentCoverageSnapshot(root);
    expect(baseline.source.path).toBe("AGENTS.md");
    expect(baseline.anchors).toEqual(
      expect.arrayContaining([expect.objectContaining({ value: "REQUEST_TIMEOUT" })]),
    );
    expect(await readFile(path.join(root, ...AGENTS_COVERAGE_PATH.split("/")), "utf8"))
      .toContain("REQUEST_TIMEOUT");
  });

  it("detects large-scale anchor loss instead of accepting code as documentation", async () => {
    const root = await emptyProject();
    const rules = Array.from(
      { length: 201 },
      (_, index) =>
        `- FEATURE_RULE_${index} uses feature_rule_${index} in services/rule_${index}.py.`,
    );
    await writeFile(path.join(root, "AGENTS.md"), `# Detailed rules\n\n${rules.join("\n")}\n`, "utf8");
    await applyInitPlan(await buildInitPlan(root, { now }), now);
    const installedAgents = await readFile(path.join(root, "AGENTS.md"), "utf8");
    await writeFile(
      path.join(root, "AGENTS.md"),
      `# Agent map\n\n${managedBlock(installedAgents)}`,
      "utf8",
    );
    await mkdir(path.join(root, "services"), { recursive: true });
    await writeFile(
      path.join(root, "services", "rules.py"),
      rules.join("\n"),
      "utf8",
    );

    const result = await checkAgentCoverage(root);
    expect(result.valid).toBe(false);
    expect(result.anchors.missing.length).toBeGreaterThanOrEqual(201);
    expect(result.scannedFiles.some((file) => file.startsWith("services/"))).toBe(false);
  });

  it("does not count an uncommitted source copy as a migration destination", async () => {
    const root = await emptyProject();
    await applyInitPlan(await buildInitPlan(root, { now }), now);
    const sourcePath = "docs/original-agents-source.md";
    await writeFile(
      path.join(root, ...sourcePath.split("/")),
      "# Original\nUse ORIGINAL_RETRY_LIMIT.\n",
      "utf8",
    );
    await writeAgentCoverageSnapshot(
      root,
      await buildAgentCoverageSnapshot(root, { sourcePath }),
    );

    const result = await checkAgentCoverage(root);
    expect(result.valid).toBe(false);
    expect(result.scannedFiles).not.toContain(sourcePath);
    expect(result.anchors.missing).toEqual(
      expect.arrayContaining([expect.objectContaining({ value: "ORIGINAL_RETRY_LIMIT" })]),
    );
  });
});
