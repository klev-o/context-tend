import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  CONTEXTTEND_META,
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

  it("regenerates stale installation metadata during update", async () => {
    const root = await initialized();
    const target = path.join(root, "docs", "_meta", "contexttend.md");
    await writeFile(
      target,
      "<!-- contexttend:generated -->\n# ContextTend installation\n\nManaged by ContextTend 0.1.0.\n",
      "utf8",
    );
    expect((await validateProject(root)).findings).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "CT119" })]),
    );
    await applyUpdatePlan(
      await buildUpdatePlan(root),
      new Date("2026-09-05T12:30:00.000Z"),
    );
    expect(await readFile(target, "utf8")).toBe(CONTEXTTEND_META);
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
      migratedTo: 2,
      state: {
        schemaVersion: 2,
        installedAt: "2026-01-01T00:00:00.000Z",
        activeWork: null,
      },
    });
    expect(() => migrateStateDocument({ schemaVersion: 99 }, now)).toThrow(
      /newer than supported/,
    );
  });

  it("migrates schema one without inventing active work", () => {
    const result = migrateStateDocument(
      {
        schemaVersion: 1,
        contextTendVersion: "0.1.0",
        installedAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-02T00:00:00.000Z",
        lastOnboarding: null,
        lastSync: null,
        lastMemoryAudit: null,
        lastHarnessAudit: null,
        detectedAdapters: ["native"],
        registeredHashes: {},
        managedAssets: {},
        managedBlocks: {},
      },
      now,
    );
    expect(result).toMatchObject({
      changed: true,
      migratedFrom: 1,
      migratedTo: 2,
      state: { schemaVersion: 2, activeWork: null, lastCompletedWork: null },
    });
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

describe("managed asset newline compatibility", () => {
  const relative = ".agents/skills/context-sync/SKILL.md";
  const hash = (s: string) => createHash("sha256").update(s).digest("hex");

  it("validates all current CRLF assets without drift warnings", async () => {
    const root = await initialized();
    for (const [name, content] of Object.entries(SYSTEM_ASSET_CONTENTS)) {
      await writeFile(path.join(root, name), content.replaceAll("\n", "\r\n"));
    }
    await writeFile(path.join(root, "docs/_meta/contexttend.md"), CONTEXTTEND_META.replaceAll("\n", "\r\n"));
    expect((await validateProject(root)).findings.filter(f => ["CT109", "CT119"].includes(f.code))).toEqual([]);
    const plan = await buildUpdatePlan(root);
    expect(plan.findings.filter(f => f.code === "CT301")).toEqual([]);
    await applyUpdatePlan(plan, now);
    expect((await buildUpdatePlan(root)).changes.filter(c => c.path === relative)[0]?.kind).toBe("skip");
  });

  it.each(["lf", "crlf"])("upgrades old %s baselines after Git newline conversion", async (baseline) => {
    const root = await initialized();
    const old = "# Previous shipped template\n\nOld managed instructions.\n";
    const previous = baseline === "lf" ? old : old.replaceAll("\n", "\r\n");
    const current = baseline === "lf" ? old.replaceAll("\n", "\r\n") : old;
    const statePath = path.join(root, ".contexttend/state.json");
    const state = JSON.parse(await readFile(statePath, "utf8"));
    state.managedAssets[relative] = { hash: hash(previous), version: "0.2.0" };
    await writeFile(statePath, JSON.stringify(state));
    await writeFile(path.join(root, relative), current);
    const plan = await buildUpdatePlan(root);
    expect(plan.findings.filter(f => f.code === "CT301")).toEqual([]);
    await applyUpdatePlan(plan, now);
    expect(await readFile(path.join(root, relative), "utf8")).toBe(SYSTEM_ASSET_CONTENTS[relative]);
    const updated = JSON.parse(await readFile(statePath, "utf8"));
    expect(updated.managedAssets[relative].hash).toBe(hash(SYSTEM_ASSET_CONTENTS[relative]!));
  });

  it("preserves substantive edits and their recorded baseline with CRLF", async () => {
    const root = await initialized();
    const statePath = path.join(root, ".contexttend/state.json");
    const before = JSON.parse(await readFile(statePath, "utf8")).managedAssets[relative];
    const edited = (SYSTEM_ASSET_CONTENTS[relative] + "\nKeep this local rule.\n").replaceAll("\n", "\r\n");
    await writeFile(path.join(root, relative), edited);
    const plan = await buildUpdatePlan(root);
    expect(plan.findings.some(f => f.code === "CT301" && f.path === relative)).toBe(true);
    await applyUpdatePlan(plan, now);
    expect(await readFile(path.join(root, relative), "utf8")).toBe(edited);
    expect(JSON.parse(await readFile(statePath, "utf8")).managedAssets[relative]).toEqual(before);
    expect((await validateProject(root)).findings.some(f => f.code === "CT109" && f.path === relative)).toBe(true);
  });

  it("rejects even newline-only changes made after preview", async () => {
    const root = await initialized();
    const target = path.join(root, relative);
    await writeFile(target, SYSTEM_ASSET_CONTENTS[relative]!.replaceAll("\n", "\r\n"));
    const plan = await buildUpdatePlan(root);
    await writeFile(target, SYSTEM_ASSET_CONTENTS[relative]!);
    await expect(applyUpdatePlan(plan, now)).rejects.toThrow("changed after planning");
  });
});
