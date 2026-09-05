import { cp, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const fixtures = fileURLToPath(new URL("./fixtures", import.meta.url));
const created: string[] = [];

export async function copyFixture(name: string): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), "contexttend-test-"));
  created.push(root);
  await cp(path.join(fixtures, name), root, { recursive: true });
  return root;
}

export async function emptyProject(): Promise<string> {
  return copyFixture("empty-repo");
}

export async function cleanupProjects(): Promise<void> {
  await Promise.all(
    created.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
}
