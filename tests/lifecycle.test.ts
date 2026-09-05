import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  SYSTEM_ASSET_CONTENTS,
  applyInitPlan,
  applyUpdatePlan,
  buildInitPlan,
  buildUpdatePlan,
  diffProject,
  migrateStateDocument,
  recordEvent,
  validateProject,
} from "@contexttend/core";
import { afterEach, describe, expect, it } from "vitest";

import { cleanupProjects, emptyProject } from "./helpers.js";

afterEach(cleanupProjects);
const now = new Date("2026-09-04T10:00:00.000Z");

async function initialized(): Promise<string> {
  const root = await emptyProject();
  await applyInitPlan(await buildInitPlan(root, { now }), now);
  return root;
}

describe("state lifecycle", () => {
  it("diffs source hashes and record sync accepts a new baseline", async () => {
    const root = await initialized();
    await writeFile(path.join(root, "docs", "GOALS.md"), "# Changed goals\n", "utf8");
    expect((await diffProject(root)).sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: "goals", status: "changed" }),
      ]),
    );
    await recordEvent(root, "sync", {
      now: new Date("2026-09-04T11:00:00.000Z"),
    });
    expect(
      (await diffProject(root)).sources.find((source) => source.role === "goals")?.status,
    ).toBe("unchanged");
  });

  it("preserves a locally modified managed asset during update", async () => {
    const root = await initialized();
    const relative = ".agents/skills/context-sync/SKILL.md";
    const target = path.join(root, ...relative.split("/"));
    await writeFile(target, "local custom workflow\n", "utf8");
    const plan = await buildUpdatePlan(root);
    expect(plan.changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: relative, kind: "skip" }),
      ]),
    );
    await applyUpdatePlan(plan, new Date("2026-09-04T12:00:00.000Z"));
    expect(await readFile(target, "utf8")).toBe("local custom workflow\n");
    const validation = await validateProject(root);
    expect(validation.valid).toBe(true);
    expect(validation.findings.some((finding) => finding.code === "CT109")).toBe(true);
  });

  it("restores a missing managed asset through update", async () => {
    const root = await initialized();
    const relative = ".agents/skills/harness-audit/SKILL.md";
    const target = path.join(root, ...relative.split("/"));
    await import("node:fs/promises").then(({ rm }) => rm(target));
    await applyUpdatePlan(
      await buildUpdatePlan(root),
      new Date("2026-09-04T12:00:00.000Z"),
    );
    expect(await readFile(target, "utf8")).toBe(SYSTEM_ASSET_CONTENTS[relative]);
  });

  it("migrates legacy schema zero and rejects future schemas", () => {
    const result = migrateStateDocument(
      {
        contextTendVersion: "0.0.1",
        installedAt: "2026-01-01T00:00:00.000Z",
        registeredHashes: {},
      },
      now,
    );
    expect(result).toMatchObject({
      changed: true,
      migratedFrom: 0,
      migratedTo: 1,
      state: {
        schemaVersion: 1,
        installedAt: "2026-01-01T00:00:00.000Z",
      },
    });
    expect(() => migrateStateDocument({ schemaVersion: 99 }, now)).toThrow(
      /newer than supported/,
    );
  });

  it("records semantic audit timestamps without changing project knowledge", async () => {
    const root = await initialized();
    const before = await readFile(path.join(root, "docs", "PRODUCT.md"), "utf8");
    const state = await recordEvent(root, "memory-audit", {
      now: new Date("2026-09-04T13:00:00.000Z"),
    });
    expect(state.lastMemoryAudit).toBe("2026-09-04T13:00:00.000Z");
    expect(await readFile(path.join(root, "docs", "PRODUCT.md"), "utf8")).toBe(before);
  });

  it("records completed semantic onboarding without changing project knowledge", async () => {
    const root = await initialized();
    const before = await readFile(path.join(root, "docs", "PRODUCT.md"), "utf8");
    const state = await recordEvent(root, "onboarding", {
      now: new Date("2026-09-04T14:00:00.000Z"),
    });
    expect(state.lastOnboarding).toBe("2026-09-04T14:00:00.000Z");
    expect(await readFile(path.join(root, "docs", "PRODUCT.md"), "utf8")).toBe(before);
  });
});
