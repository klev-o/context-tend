import { mkdir, symlink, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  AGENTS_MANAGED_BLOCK,
  countManagedBlocks,
  hashPath,
  managedBlockHash,
  resolveRegistryPath,
  sha256,
  toRegistryPath,
  upsertManagedBlock,
  writeProjectFile,
} from "@contexttend/core";
import { afterEach, describe, expect, it } from "vitest";

import { cleanupProjects, emptyProject } from "./helpers.js";

afterEach(cleanupProjects);

describe("filesystem primitives", () => {
  it("normalizes separators and blocks traversal and absolute paths", async () => {
    const root = await emptyProject();
    expect(toRegistryPath("docs\\decisions\\")).toBe("docs/decisions/");
    expect(resolveRegistryPath(root, "docs/Файл с пробелом.md")).toBe(
      path.join(root, "docs", "Файл с пробелом.md"),
    );
    expect(() => resolveRegistryPath(root, "../outside.md")).toThrow(/escapes/);
    expect(() => resolveRegistryPath(root, "C:\\outside.md")).toThrow(/relative/);
    expect(() => resolveRegistryPath(root, "\\\\server\\share")).toThrow(/relative/);
  });

  it("hashes directories deterministically and detects file changes", async () => {
    const root = await emptyProject();
    await mkdir(path.join(root, "docs"), { recursive: true });
    await writeFile(path.join(root, "docs", "b.md"), "B", "utf8");
    await writeFile(path.join(root, "docs", "a.md"), "A", "utf8");
    const before = await hashPath(path.join(root, "docs"));
    expect(before).toMatch(/^[a-f0-9]{64}$/);
    expect(await hashPath(path.join(root, "docs"))).toBe(before);
    await writeFile(path.join(root, "docs", "a.md"), "changed", "utf8");
    expect(await hashPath(path.join(root, "docs"))).not.toBe(before);
    expect(await hashPath(path.join(root, "missing"))).toBeNull();
    expect(sha256("abc")).toHaveLength(64);
  });

  it("preserves CRLF and user content around exactly one managed block", () => {
    const original = "# User rules\r\n\r\nKeep this.\r\n";
    const inserted = upsertManagedBlock(original);
    expect(inserted.content).toContain("Keep this.");
    expect(inserted.content).toContain("\r\n");
    expect(countManagedBlocks(inserted.content)).toBe(1);
    expect(managedBlockHash(inserted.content)).toBe(
      managedBlockHash(AGENTS_MANAGED_BLOCK),
    );
    expect(upsertManagedBlock(inserted.content).changed).toBe(false);
  });

  it("refuses duplicate or unterminated managed blocks", () => {
    expect(() =>
      upsertManagedBlock(
        "<!-- contexttend:start -->\n<!-- contexttend:start -->\n<!-- contexttend:end -->",
      ),
    ).toThrow(/multiple/);
    expect(() => upsertManagedBlock("<!-- contexttend:start -->")).toThrow(
      /unterminated/,
    );
  });

  it("refuses writes through a symlink that resolves outside the project", async () => {
    const root = await emptyProject();
    const outside = await emptyProject();
    const linked = path.join(root, "linked");
    try {
      await symlink(outside, linked, "junction");
    } catch (error) {
      if (["EPERM", "EACCES", "ENOSYS"].includes((error as NodeJS.ErrnoException).code ?? "")) {
        return;
      }
      throw error;
    }
    await expect(writeProjectFile(root, "linked/escape.md", "no")).rejects.toThrow(
      /outside the project root/,
    );
  });
});
