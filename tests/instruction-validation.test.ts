import {
  applyInitPlan, buildInitPlan, validateProject, writeProjectFile,
} from "@contexttend/core";
import { afterEach, describe, expect, it } from "vitest";
import { cleanupProjects, emptyProject } from "./helpers.js";
afterEach(cleanupProjects);

describe("instruction routing diagnostics", () => {
  it("detects root override shadowing without rewriting the override", async () => {
    const root = await emptyProject();
    await writeProjectFile(root, "AGENTS.override.md", "# Local rules\n");
    const plan = await buildInitPlan(root);
    expect(plan.changes.some((change) => change.path === "AGENTS.override.md")).toBe(false);
    await applyInitPlan(plan);
    expect((await validateProject(root)).findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "CT160", path: "AGENTS.override.md" }),
    ]));
  });

  it("measures selected ancestor chains, ignores sibling scope, and detects exact repetition", async () => {
    const root = await emptyProject();
    await applyInitPlan(await buildInitPlan(root));
    const instruction = "# Rules\n\n" + "Keep explicit canonical pointers.\n".repeat(270);
    await writeProjectFile(root, "a/AGENTS.md", instruction);
    await writeProjectFile(root, "a/nested/AGENTS.md", instruction);
    await writeProjectFile(root, "b/AGENTS.md", instruction);
    let findings = (await validateProject(root)).findings;
    expect(findings.filter((finding) => finding.code === "CT161").map((f) => f.path))
      .toEqual(["a/nested/AGENTS.md"]);
    expect(findings.filter((finding) => finding.code === "CT162").map((f) => f.path))
      .toEqual(["a/nested/AGENTS.md"]);
    await writeProjectFile(root, "a/nested/AGENTS.override.md", "# Short override\n");
    findings = (await validateProject(root)).findings;
    expect(findings.some((finding) => finding.code === "CT161")).toBe(false);
    expect(findings.some((finding) => finding.code === "CT160")).toBe(true);
  });
});
