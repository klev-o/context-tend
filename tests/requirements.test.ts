import { readFile, rm, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  applyInitPlan, applyUpdatePlan, buildInitPlan, buildUpdatePlan, diffProject,
  loadRegistry, loadState, parseRegistry, recordEvent, scanProject,
  serializeJson, serializeYaml, sourcePaths, validateProject, writeProjectFile,
} from "@contexttend/core";
import { afterEach, describe, expect, it } from "vitest";
import { cleanupProjects, copyFixture, emptyProject } from "./helpers.js";

afterEach(cleanupProjects);
const now = new Date("2026-09-08T00:00:00.000Z");
const canonicalRequirements = (registry: Awaited<ReturnType<typeof loadRegistry>>) =>
  Object.values(registry.sources).filter((source) =>
    source.role === "requirements" && source.authority === "canonical");
async function initialize(root: string) {
  await applyInitPlan(await buildInitPlan(root, { now }), now);
}
async function saveRegistry(root: string, registry: Awaited<ReturnType<typeof loadRegistry>>) {
  await writeProjectFile(root, ".contexttend/registry.yaml", serializeYaml(registry));
}

describe("first-class requirements lifecycle", () => {
  it("previews reproducibly, creates native SPEC without invented intent, and is idempotent", async () => {
    const root = await emptyProject();
    const before = await scanProject(root);
    const first = await buildInitPlan(root, { now });
    expect(await buildInitPlan(root, { now })).toEqual(first);
    expect(await scanProject(root)).toEqual(before);
    expect(canonicalRequirements(first.registry)).toEqual([
      expect.objectContaining({ path: "SPEC.md", owner: "human", adapter: "native" }),
    ]);
    await applyInitPlan(first, now);
    const spec = await readFile(path.join(root, "SPEC.md"), "utf8");
    expect(spec).toContain("Unknown - human confirmation required");
    expect(await validateProject(root)).toMatchObject({ valid: true, warnings: 0 });
    await initialize(root);
    expect(await readFile(path.join(root, "SPEC.md"), "utf8")).toBe(spec);
    expect(canonicalRequirements(await loadRegistry(root))).toHaveLength(1);
  });

  it.each(["SPEC.md", "SPECIFICATION.md", "REQUIREMENTS.md", "docs/REQUIREMENTS.md"])(
    "adopts existing %s without replacing human-authored bytes", async (file) => {
      const root = await emptyProject();
      const spec = "# Требования\r\n\r\nREQ-1: Retain data for exactly 37 days; except user deletion.\r\n";
      await writeProjectFile(root, file, spec);
      const plan = await buildInitPlan(root, { now });
      expect(plan.changes.some((change) => change.path === "SPEC.md")).toBe(false);
      expect(canonicalRequirements(plan.registry)).toEqual([
        expect.objectContaining({ path: file, owner: "human" }),
      ]);
      await applyInitPlan(plan, now);
      await writeProjectFile(root, "src/example.ts", "export const retentionDays = 12;\n");
      await applyUpdatePlan(await buildUpdatePlan(root), now);
      await recordEvent(root, "sync", { now });
      expect(await readFile(path.join(root, file))).toEqual(Buffer.from(spec));
    },
  );

  it.each(["requirements", "docs/requirements", "specs", "docs/spec"])(
    "adopts the existing %s directory without a competing native SPEC", async (directory) => {
      const root = await emptyProject();
      await writeProjectFile(root, directory + "/baseline.md", "# Confirmed requirements\n");
      const plan = await buildInitPlan(root, { now });
      expect(canonicalRequirements(plan.registry)[0]?.path).toBe(directory);
      expect(plan.changes.some((change) => change.path === "SPEC.md")).toBe(false);
      await applyInitPlan(plan, now);
      expect(await validateProject(root)).toMatchObject({ valid: true });
    },
  );

  it.each(["spec-kit", "openspec", "agent-os", "gsd"])(
    "preserves %s ownership with and without a root SPEC", async (fixture) => {
      const root = await copyFixture(fixture);
      // Some fixtures model early frameworks; supply their normal requirements artifact.
      if (fixture === "agent-os") await writeProjectFile(root, "agent-os/specs/feature/spec.md", "# Feature\n");
      if (fixture === "gsd") await writeProjectFile(root, ".planning/REQUIREMENTS.md", "# Requirements\n");
      let plan = await buildInitPlan(root, { now });
      expect(plan.changes.some((change) => change.path === "SPEC.md")).toBe(false);
      expect(canonicalRequirements(plan.registry)).toEqual([
        expect.objectContaining({ owner: "external", adapter: fixture }),
      ]);
      await writeProjectFile(root, "SPEC.md", "# Existing overview\n");
      plan = await buildInitPlan(root, { now });
      expect(canonicalRequirements(plan.registry)).toEqual([
        expect.objectContaining({ owner: "external", adapter: fixture }),
      ]);
      await applyInitPlan(plan, now);
      expect(await readFile(path.join(root, "SPEC.md"), "utf8")).toBe("# Existing overview\n");
      expect(await validateProject(root)).toMatchObject({ valid: true });
    },
  );

  it.each([
    ".specify/config.yaml", "openspec/config.yaml", "agent-os/product/mission.md",
    ".planning/PROJECT.md",
  ])("does not create competing requirements while %s owner is still bootstrapping", async (marker) => {
    const root = await emptyProject();
    await writeProjectFile(root, marker, "# Framework marker\n");
    if (marker.startsWith(".planning")) await writeProjectFile(root, ".planning/ROADMAP.md", "# Roadmap\n");
    const plan = await buildInitPlan(root, { now });
    expect(plan.changes.some((change) => change.path === "SPEC.md")).toBe(false);
    expect(plan.findings).toEqual(expect.arrayContaining([expect.objectContaining({ code: "CT204" })]));
    await applyInitPlan(plan, now);
  });

  it("honors disabled native creation while still adopting existing requirements", async () => {
    const root = await emptyProject();
    await writeProjectFile(root, ".contexttend/config.yaml", serializeYaml({
      version: 1, mode: "adaptive", agentIntegration: true, createMissingNativeSources: false,
    }));
    let plan = await buildInitPlan(root, { now });
    expect(canonicalRequirements(plan.registry)).toHaveLength(0);
    expect(plan.changes.some((change) => ["SPEC.md", "docs/PRODUCT.md"].includes(change.path))).toBe(false);
    await writeProjectFile(root, "SPEC.md", "# Human requirements\n");
    plan = await buildInitPlan(root, { now });
    expect(canonicalRequirements(plan.registry)).toHaveLength(1);
    await applyInitPlan(plan, now);
    expect(await validateProject(root)).toMatchObject({ valid: true });
  });

  it("does not promote arbitrary nested spec documents", async () => {
    const root = await emptyProject();
    await writeProjectFile(root, "docs/research/SPEC.md", "# Experiment\n");
    await writeProjectFile(root, "src/spec.md", "# Implementation notes\n");
    const plan = await buildInitPlan(root, { now });
    expect(canonicalRequirements(plan.registry)[0]).toMatchObject({ path: "SPEC.md", adapter: "native" });
  });

  it("reports competing conventions before creating any infrastructure", async () => {
    const root = await emptyProject();
    await writeProjectFile(root, "SPEC.md", "# One\n");
    await writeProjectFile(root, "requirements/README.md", "# Two\n");
    const before = await scanProject(root);
    const plan = await buildInitPlan(root, { now });
    expect(plan.findings).toEqual(expect.arrayContaining([expect.objectContaining({ code: "CT103" })]));
    await expect(applyInitPlan(plan, now)).rejects.toThrow(/blocking/);
    expect(await scanProject(root)).toEqual(before);
  });

  it("validates a second canonical requirements source as an error", async () => {
    const root = await emptyProject();
    await initialize(root);
    const registry = await loadRegistry(root);
    registry.sources["duplicate-requirements"] = {
      path: "OTHER.md", role: "requirements", authority: "canonical", owner: "human",
    };
    await writeProjectFile(root, "OTHER.md", "# Other\n");
    await saveRegistry(root, registry);
    expect((await validateProject(root)).findings).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "CT103", level: "error" })]),
    );
  });

  it("updates a legacy installation without creating SPEC or rewriting its registry", async () => {
    const root = await emptyProject();
    await initialize(root);
    const registry = await loadRegistry(root);
    delete registry.sources["requirements"];
    await saveRegistry(root, registry);
    await rm(path.join(root, "SPEC.md"));
    const state = await loadState(root);
    state.contextTendVersion = "0.2.0";
    delete state.registeredHashes["requirements"];
    await writeProjectFile(root, ".contexttend/state.json", serializeJson(state));
    const before = await readFile(path.join(root, ".contexttend/registry.yaml"));
    const plan = await buildUpdatePlan(root);
    expect(plan.changes.some((change) => ["SPEC.md", ".contexttend/registry.yaml"].includes(change.path))).toBe(false);
    await applyUpdatePlan(plan, now);
    expect(await readFile(path.join(root, ".contexttend/registry.yaml"))).toEqual(before);
    expect((await scanProject(root)).files.has("SPEC.md")).toBe(false);
    expect(await validateProject(root)).toMatchObject({ valid: true });
    // Explicit init is the opt-in addition, in contrast to update.
    expect((await buildInitPlan(root, { now })).changes).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: "SPEC.md", kind: "create" })]),
    );
  });

  it("refuses late-target init conflicts before earlier files are written", async () => {
    const root = await emptyProject();
    const plan = await buildInitPlan(root, { now });
    await writeProjectFile(root, "docs/_meta/contexttend.md", "Concurrent author\n");
    const before = await scanProject(root);
    await expect(applyInitPlan(plan, now)).rejects.toThrow(/changed after/);
    expect(await scanProject(root)).toEqual(before);
    expect(await readFile(path.join(root, "docs/_meta/contexttend.md"), "utf8")).toBe("Concurrent author\n");
  });

  it("refuses late-target update conflicts without partial managed asset updates", async () => {
    const root = await emptyProject();
    await initialize(root);
    const missing = ".contexttend/guides/requirements.md";
    await rm(path.join(root, missing));
    await writeProjectFile(root, "docs/_meta/contexttend.md", "Old generated metadata\n");
    const plan = await buildUpdatePlan(root);
    await writeFile(path.join(root, "docs/_meta/contexttend.md"), "# Concurrent author\n");
    await expect(applyUpdatePlan(plan, now)).rejects.toThrow(/changed after/);
    expect((await scanProject(root)).files.has(missing)).toBe(false);
  });
});

describe("modular requirements", () => {
  async function modularProject() {
    const root = await emptyProject();
    await writeProjectFile(root, "SPEC.md", "# Specification\n\n[Topics](docs/spec/README.md)\n");
    await writeProjectFile(root, "docs/spec/README.md", "# Topics\n\n[Auth][auth]\n\n[auth]: <auth.md>\n");
    await writeProjectFile(root, "docs/spec/auth.md", "# Authentication\n\nRequire user consent.\n\n[Index](../../SPEC.md)\n");
    await initialize(root);
    return root;
  }

  it("adopts root and tree as one source on registry v1 and tracks child drift", async () => {
    const root = await modularProject();
    const registry = await loadRegistry(root);
    expect(parseRegistry(registry).version).toBe(1);
    expect(canonicalRequirements(registry)).toHaveLength(1);
    expect(sourcePaths(canonicalRequirements(registry)[0]!)).toEqual(["SPEC.md", "docs/spec/"]);
    expect(await validateProject(root)).toMatchObject({ valid: true, warnings: 0 });
    await writeProjectFile(root, "docs/spec/auth.md", "# Authentication\n\nRequire explicit user consent.\n");
    expect((await diffProject(root)).sources).toEqual(
      expect.arrayContaining([expect.objectContaining({ role: "requirements", status: "changed" })]),
    );
    await initialize(root);
    expect(canonicalRequirements(await loadRegistry(root))).toHaveLength(1);
  });

  it("finds a missing tree mapping and repairs it under the same source", async () => {
    const root = await modularProject();
    const registry = await loadRegistry(root);
    const source = canonicalRequirements(registry)[0]!;
    source.path = "SPEC.md";
    await saveRegistry(root, registry);
    expect((await validateProject(root)).findings).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "CT151", level: "error" })]),
    );
    source.path = ["SPEC.md", "docs/spec/"];
    await saveRegistry(root, registry);
    expect(await validateProject(root)).toMatchObject({ valid: true, warnings: 0 });
  });

  it("finds orphan cycles, reference links and missing targets without counting code examples", async () => {
    const root = await modularProject();
    await writeProjectFile(root, "docs/spec/orphan.md", "# Orphan\n\n[Other](other.md)\n");
    await writeProjectFile(root, "docs/spec/other.md", "# Other\n\n[Orphan](orphan.md)\n");
    await writeProjectFile(root, "SPEC.md",
      "# Specification\n\n[Topics](docs/spec/)\n[Missing][missing]\n\n[missing]: docs/spec/missing.md\n\n~~~md\n[Example](example.md)\n~~~\n");
    const result = await validateProject(root);
    expect(result.findings.filter((finding) => finding.code === "CT152").map((f) => f.path))
      .toEqual(["docs/spec/orphan.md", "docs/spec/other.md"]);
    expect(result.findings.filter((finding) => finding.code === "CT106")).toEqual([
      expect.objectContaining({ path: "SPEC.md", message: expect.stringContaining("missing.md") }),
    ]);
  });

  it("accepts encoded and repository-relative links and reports escaping targets", async () => {
    const root = await modularProject();
    await writeProjectFile(root, "docs/spec/with space.md", "# Space\n");
    await writeProjectFile(root, "SPEC.md",
      "# Specification\n\n[Topics](/docs/spec/README.md)\n[Space](docs/spec/with%20space.md)\n[Escape](../outside.md)\n");
    const result = await validateProject(root);
    expect(result.findings.filter((finding) => finding.code === "CT152")).toEqual([]);
    expect(result.findings).toEqual(expect.arrayContaining([expect.objectContaining({ code: "CT107" })]));
  });

  it("only advises review of a large spec and never rewrites or splits it", async () => {
    const root = await emptyProject();
    const spec = "# Requirements\n\n" + "Confirmed human constraint.\n".repeat(1000);
    await writeProjectFile(root, "SPEC.md", spec);
    await initialize(root);
    expect((await validateProject(root)).findings).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "CT154", level: "warning" })]),
    );
    expect(await readFile(path.join(root, "SPEC.md"), "utf8")).toBe(spec);
    expect((await scanProject(root)).directories.has("docs/spec")).toBe(false);
  });
});

describe("requirements safety regressions", () => {
  it("checks a registered framework contract even after its detection marker disappears", async () => {
    const root = await copyFixture("spec-kit");
    await initialize(root);
    await rm(path.join(root, ".specify"), { recursive: true });
    expect((await validateProject(root)).findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ message: expect.stringContaining(".specify/ is missing") }),
    ]));
  });

  it("reports containment for a registered spec path through an external junction", async (context) => {
    const root = await emptyProject();
    const outside = await emptyProject();
    await initialize(root);
    await writeProjectFile(outside, "external.md", "# External\n[Private](do-not-read.md)\n");
    try {
      await symlink(outside, path.join(root, "linked"), "junction");
    } catch (error) {
      if (["EPERM", "EACCES", "ENOSYS"].includes((error as NodeJS.ErrnoException).code ?? "")) {
        context.skip(); return;
      }
      throw error;
    }
    const registry = await loadRegistry(root);
    canonicalRequirements(registry)[0]!.path = "linked/external.md";
    await saveRegistry(root, registry);
    const result = await validateProject(root);
    expect(result.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "CT105", path: "linked/external.md" }),
    ]));
    expect(result.findings.some((finding) => finding.message.includes("do-not-read.md"))).toBe(false);
  });

  it("does not claim that offline init has freshly researched official sources", async () => {
    const root = await emptyProject();
    await applyInitPlan(await buildInitPlan(root, { now: new Date("2030-01-01T00:00:00Z") }), now);
    const sources = await readFile(path.join(root, ".contexttend/source-registry.yaml"), "utf8");
    expect(sources).not.toContain("2030-01-01");
  });
});
