import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const workspaceRoot = fileURLToPath(new URL("..", import.meta.url));
const cliRoot = path.join(workspaceRoot, "packages", "cli");

interface PackageManifest {
  name?: string;
  private?: boolean;
  bin?: Record<string, string>;
  files?: string[];
  license?: string;
  author?: string;
  engines?: Record<string, string>;
  repository?: { type?: string; url?: string; directory?: string };
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  publishConfig?: Record<string, string>;
}

describe("npm release package", () => {
  it("has a public single-package CLI manifest", async () => {
    const manifest = JSON.parse(
      await readFile(path.join(cliRoot, "package.json"), "utf8"),
    ) as PackageManifest;

    expect(manifest).toMatchObject({
      name: "contexttend",
      bin: { contexttend: "./dist/index.js" },
      license: "MIT",
      author: "klev-o",
      engines: { node: ">=20" },
      repository: {
        type: "git",
        url: "git+https://github.com/klev-o/context-tend.git",
        directory: "packages/cli",
      },
      publishConfig: {
        access: "public",
        registry: "https://registry.npmjs.org/",
      },
    });
    expect(manifest.private).not.toBe(true);
    expect(manifest.files).toEqual(
      expect.arrayContaining(["dist", "README.md", "LICENSE"]),
    );
    expect(manifest.dependencies).toEqual({
      commander: "14.0.3",
      yaml: "2.9.0",
      zod: "4.5.4",
    });
    expect(manifest.devDependencies).toHaveProperty(
      "@contexttend/core",
      "workspace:*",
    );
  });

  it("ships matching MIT text and a self-contained internal core bundle", async () => {
    const [rootLicense, packageLicense, packageReadme, bundle] = await Promise.all([
      readFile(path.join(workspaceRoot, "LICENSE"), "utf8"),
      readFile(path.join(cliRoot, "LICENSE"), "utf8"),
      readFile(path.join(cliRoot, "README.md"), "utf8"),
      readFile(path.join(cliRoot, "dist", "index.js"), "utf8"),
    ]);

    expect(packageLicense).toBe(rootLicense);
    expect(packageReadme).toContain("pnpm contexttend --help");
    expect(bundle.startsWith("#!/usr/bin/env node")).toBe(true);
    expect(bundle).not.toContain('from "@contexttend/core"');
    expect(bundle).toContain('from "commander"');
    expect(bundle).toContain('from "yaml"');
    expect(bundle).toContain('from "zod"');
  });

  it("keeps the workspace root and internal core private", async () => {
    const [rootManifest, coreManifest] = await Promise.all([
      readFile(path.join(workspaceRoot, "package.json"), "utf8"),
      readFile(path.join(workspaceRoot, "packages", "core", "package.json"), "utf8"),
    ]);

    expect((JSON.parse(rootManifest) as PackageManifest).private).toBe(true);
    expect((JSON.parse(coreManifest) as PackageManifest).private).toBe(true);
  });
});
