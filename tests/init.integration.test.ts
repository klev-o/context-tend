import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  AGENTS_COVERAGE_PATH,
  applyInitPlan,
  buildInitPlan,
  countManagedBlocks,
  loadRegistry,
  validateProject,
} from "@contexttend/core";
import { afterEach, describe, expect, it } from "vitest";

import { cleanupProjects, copyFixture, emptyProject } from "./helpers.js";

afterEach(cleanupProjects);
const now = new Date("2026-09-04T10:00:00.000Z");

describe("safe initialization", () => {
  it("creates only missing native knowledge and a healthy installation", async () => {
    const root = await emptyProject();
    const plan = await buildInitPlan(root, { now });
    expect(plan.changes.some((change) => change.path === "docs/GOALS.md")).toBe(true);
    expect(plan.changes.some((change) => change.path === "docs/PRODUCT.md")).toBe(true);
    expect(plan.changes.some((change) => change.path === "docs/PLANS.md")).toBe(true);
    const state = await applyInitPlan(plan, now);

    const registry = await loadRegistry(root);
    expect(Object.values(registry.sources).some((source) => source.role === "goals")).toBe(true);
    expect(Object.values(registry.sources).some((source) => source.role === "product")).toBe(true);
    expect(Object.values(registry.sources).some((source) => source.role === "roadmap")).toBe(true);
    expect(state.lastOnboarding).toBeNull();
    expect(
      JSON.parse(
        await readFile(path.join(root, ...AGENTS_COVERAGE_PATH.split("/")), "utf8"),
      ),
    ).toMatchObject({ version: 1, source: { path: "AGENTS.md" } });
    expect(
      await readFile(
        path.join(root, ".agents", "skills", "context-onboard", "SKILL.md"),
        "utf8",
      ),
    ).toContain("ONBOARDING PLAN");
    expect(
      await readFile(
        path.join(root, ".agents", "skills", "context-work", "SKILL.md"),
        "utf8",
      ),
    ).toContain("contexttend work status");
    expect(await readFile(path.join(root, "AGENTS.md"), "utf8")).toContain(
      "use `$context-onboard` first",
    );
    expect(await validateProject(root)).toMatchObject({ valid: true, errors: 0 });
  });

  it("preserves all existing AGENTS content and remains idempotent", async () => {
    const root = await copyFixture("existing-agents");
    const original = await readFile(path.join(root, "AGENTS.md"), "utf8");
    await applyInitPlan(await buildInitPlan(root, { now }), now);
    const first = await readFile(path.join(root, "AGENTS.md"), "utf8");
    expect(first).toContain(original.trim());
    expect(countManagedBlocks(first)).toBe(1);
    const firstCoverage = await readFile(
      path.join(root, ...AGENTS_COVERAGE_PATH.split("/")),
      "utf8",
    );

    const secondPlan = await buildInitPlan(root, { now });
    await applyInitPlan(secondPlan, now);
    expect(await readFile(path.join(root, "AGENTS.md"), "utf8")).toBe(first);
    expect(
      await readFile(path.join(root, ...AGENTS_COVERAGE_PATH.split("/")), "utf8"),
    ).toBe(firstCoverage);
    expect(countManagedBlocks(first)).toBe(1);
  });

  it("preserves Spec Kit files end-to-end", async () => {
    const root = await copyFixture("spec-kit");
    const specPath = path.join(root, "specs", "001-search", "spec.md");
    const before = await readFile(specPath, "utf8");
    await applyInitPlan(await buildInitPlan(root, { now }), now);
    expect(await readFile(specPath, "utf8")).toBe(before);
    const registry = await loadRegistry(root);
    expect(registry.sources["spec-kit-requirements"]).toMatchObject({
      path: "specs/",
      authority: "canonical",
      owner: "external",
    });
    expect(await validateProject(root)).toMatchObject({ valid: true, errors: 0 });
  });

  it("refuses apply when a planned target changes before writing", async () => {
    const root = await copyFixture("existing-agents");
    const plan = await buildInitPlan(root, { now });
    await writeFile(path.join(root, "AGENTS.md"), "# Changed after preview\n", "utf8");
    await expect(applyInitPlan(plan, now)).rejects.toThrow(/changed after the plan/);
  });
});
