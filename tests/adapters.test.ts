import {
  buildInitPlan,
  discoverWithAdapters,
  scanProject,
} from "@contexttend/core";
import { afterEach, describe, expect, it } from "vitest";

import { cleanupProjects, copyFixture } from "./helpers.js";

afterEach(cleanupProjects);

describe("adapter discovery", () => {
  it.each([
    ["spec-kit", "spec-kit", "requirements"],
    ["openspec", "openspec", "requirements"],
    ["agent-os", "agent-os", "product"],
    ["gsd", "gsd", "current-state"],
  ])("detects %s and maps its existing knowledge", async (
    fixture,
    adapterId,
    expectedRole,
  ) => {
    const root = await copyFixture(fixture);
    const discovery = discoverWithAdapters(await scanProject(root));
    expect(
      discovery.statuses.find((status) => status.id === adapterId)?.detection.detected,
    ).toBe(true);
    expect(
      Object.values(discovery.registry.sources).some(
        (source) => source.adapter === adapterId && source.role === expectedRole,
      ),
    ).toBe(true);
  });

  it("detects language, package manager, framework and monorepo facts", async () => {
    const root = await copyFixture("plain-node");
    const snapshot = await scanProject(root);
    expect(snapshot.languages).toContain("JavaScript");
    expect(snapshot.frameworks).toContain("Express");
    expect(snapshot.gitStatus).toBe("not-repository");
  });

  it("uses Spec Kit specs as canonical requirements without a duplicate", async () => {
    const root = await copyFixture("spec-kit");
    const before = await scanProject(root);
    const plan = await buildInitPlan(root, {
      now: new Date("2026-09-04T00:00:00.000Z"),
    });
    const requirementSources = Object.values(plan.registry.sources).filter(
      (source) => source.role === "requirements" && source.authority === "canonical",
    );
    expect(requirementSources).toHaveLength(1);
    expect(requirementSources[0]).toMatchObject({
      path: "specs/",
      adapter: "spec-kit",
      owner: "external",
    });
    expect(plan.changes.some((change) => /product-spec/i.test(change.path))).toBe(false);
    expect(await scanProject(root)).toEqual(before);
  });

  it("adopts conventional architecture and ADR sources", async () => {
    const root = await copyFixture("existing-docs");
    const registry = discoverWithAdapters(await scanProject(root)).registry;
    expect(
      Object.values(registry.sources).some(
        (source) => source.role === "architecture" && source.path === "ARCHITECTURE.md",
      ),
    ).toBe(true);
    expect(
      Object.values(registry.sources).some(
        (source) => source.role === "decisions" && source.path === "docs/adr",
      ),
    ).toBe(true);
  });

  it("adopts existing plans and research as supporting knowledge", async () => {
    const root = await copyFixture("mixed-conventions");
    const registry = discoverWithAdapters(await scanProject(root)).registry;
    expect(
      Object.values(registry.sources).some(
        (source) =>
          source.role === "execution-plan" &&
          source.authority === "supporting" &&
          source.path === "plans",
      ),
    ).toBe(true);
  });
});
