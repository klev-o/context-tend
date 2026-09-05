import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  applyInitPlan,
  buildInitPlan,
  loadRegistry,
  serializeYaml,
  validateProject,
  writeProjectFile,
} from "@contexttend/core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { cleanupProjects, emptyProject } from "./helpers.js";

let root: string;
const now = new Date("2026-09-04T10:00:00.000Z");

beforeEach(async () => {
  root = await emptyProject();
  await applyInitPlan(await buildInitPlan(root, { now }), now);
});
afterEach(cleanupProjects);

describe("deterministic validation", () => {
  it("reports duplicate canonical roles", async () => {
    const registry = await loadRegistry(root);
    registry.sources["other-product"] = {
      path: "OTHER-PRODUCT.md",
      role: "product",
      authority: "canonical",
      owner: "human",
    };
    await writeFile(path.join(root, "OTHER-PRODUCT.md"), "# Other\n", "utf8");
    await writeProjectFile(
      root,
      ".contexttend/registry.yaml",
      serializeYaml(registry),
    );
    const result = await validateProject(root);
    expect(result.valid).toBe(false);
    expect(result.findings.some((finding) => finding.code === "CT103")).toBe(true);
  });

  it("reports missing registered paths", async () => {
    await rm(path.join(root, "docs", "GOALS.md"));
    const result = await validateProject(root);
    expect(result.findings.some((finding) => finding.code === "CT104")).toBe(true);
  });

  it("reports broken links only in registered Markdown", async () => {
    await writeFile(
      path.join(root, "docs", "PRODUCT.md"),
      "# Product\n\n[Missing](missing.md)\n",
      "utf8",
    );
    const result = await validateProject(root);
    expect(result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "CT106", path: "docs/PRODUCT.md" }),
      ]),
    );
  });

  it("reports missing markers in native generated sources", async () => {
    const target = path.join(root, "docs", "_meta", "contexttend.md");
    const original = await readFile(target, "utf8");
    await writeFile(
      target,
      original.replace("<!-- contexttend:generated -->\n", ""),
      "utf8",
    );
    const result = await validateProject(root);
    expect(result.findings.some((finding) => finding.code === "CT113")).toBe(true);
  });
});
