import { createHash } from "node:crypto";
import {
  lstat,
  readFile,
  readdir,
  readlink,
} from "node:fs/promises";
import path from "node:path";

import { toRegistryPath } from "./paths.js";

const IGNORED_DIRECTORY_NAMES = new Set([
  ".git",
  ".contexttend",
  "node_modules",
  "dist",
  "coverage",
  ".next",
  ".turbo",
  "build",
]);

export function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

export async function hashFile(filePath: string): Promise<string> {
  return sha256(await readFile(filePath));
}

async function collectEntries(
  root: string,
  current: string,
  entries: string[],
): Promise<void> {
  const children = await readdir(current, { withFileTypes: true });
  children.sort((left, right) => left.name.localeCompare(right.name, "en"));

  for (const child of children) {
    if (child.isDirectory() && IGNORED_DIRECTORY_NAMES.has(child.name)) {
      continue;
    }
    const absolute = path.join(current, child.name);
    const relative = toRegistryPath(path.relative(root, absolute));
    if (child.isDirectory()) {
      entries.push(`directory\0${relative}`);
      await collectEntries(root, absolute, entries);
    } else if (child.isSymbolicLink()) {
      entries.push(`symlink\0${relative}\0${await readlink(absolute)}`);
    } else if (child.isFile()) {
      entries.push(`file\0${relative}\0${await hashFile(absolute)}`);
    }
  }
}

export async function hashPath(targetPath: string): Promise<string | null> {
  let stats;
  try {
    stats = await lstat(targetPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }

  if (stats.isSymbolicLink()) {
    return sha256(`symlink\0${await readlink(targetPath)}`);
  }
  if (stats.isFile()) {
    return hashFile(targetPath);
  }
  if (stats.isDirectory()) {
    const entries: string[] = [];
    await collectEntries(targetPath, targetPath, entries);
    return sha256(entries.join("\n"));
  }
  return sha256(`other\0${stats.mode}\0${stats.size}`);
}
