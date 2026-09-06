import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  CURRENT_WORK_PATH,
  WORK_DOCUMENT_MAX_BYTES,
  applyInitPlan,
  buildInitPlan,
  checkpointWork,
  completeWork,
  getWorkStatus,
  loadState,
  startWork,
  validateProject,
} from "@contexttend/core";
import { afterEach, describe, expect, it } from "vitest";

import { cleanupProjects, emptyProject } from "./helpers.js";

afterEach(cleanupProjects);

const startedAt = new Date("2026-09-05T10:00:00.000Z");
const checkpointedAt = new Date("2026-09-05T10:30:00.000Z");

async function initialized(): Promise<string> {
  const root = await emptyProject();
  await applyInitPlan(await buildInitPlan(root, { now: startedAt }), startedAt);
  return root;
}

describe("active work lifecycle", () => {
  it("detects repository drift, checkpoints it, and completes only when fresh", async () => {
    const root = await initialized();
    const started = await startWork(root, {
      title: "Implement resumable work",
      objective: "Persist enough verified context to resume after interruption.",
      now: startedAt,
    });
    expect(started).toMatchObject({
      active: true,
      stale: false,
      work: { status: "active", path: CURRENT_WORK_PATH },
    });

    await mkdir(path.join(root, "src"), { recursive: true });
    await writeFile(path.join(root, "src", "feature.ts"), "export const ready = true;\n");
    const stale = await getWorkStatus(root, checkpointedAt);
    expect(stale.stale).toBe(true);
    expect(stale.reasons).toContain(
      "repository state changed after the recorded checkpoint",
    );
    expect(await validateProject(root)).toMatchObject({
      valid: true,
      findings: expect.arrayContaining([
        expect.objectContaining({ code: "CT118", level: "warning" }),
      ]),
    });
    await expect(completeWork(root, checkpointedAt)).rejects.toThrow(
      /Cannot complete stale active work/,
    );

    const currentPath = path.join(root, ...CURRENT_WORK_PATH.split("/"));
    const current = await readFile(currentPath, "utf8");
    await writeFile(
      currentPath,
      current.replace(
        "- None recorded yet.",
        "- `src/feature.ts` — implemented resumable work.",
      ),
      "utf8",
    );
    expect((await getWorkStatus(root, checkpointedAt)).reasons).toContain(
      "current work document changed after the recorded checkpoint",
    );

    const checkpoint = await checkpointWork(root, {
      now: checkpointedAt,
    });
    expect(checkpoint).toMatchObject({ active: true, stale: false });
    const completed = await completeWork(
      root,
      new Date("2026-09-05T10:31:00.000Z"),
    );
    expect(completed.activeWork).toBeNull();
    expect(completed.lastCompletedWork).toMatchObject({
      title: "Implement resumable work",
      completedAt: "2026-09-05T10:31:00.000Z",
    });
    expect(await readFile(currentPath, "utf8")).toContain("Status: completed");
  });

  it("refuses a second active task and enforces the checkpoint size budget", async () => {
    const root = await initialized();
    await startWork(root, { title: "First task", now: startedAt });
    await expect(
      startWork(root, { title: "Second task", now: checkpointedAt }),
    ).rejects.toThrow(/Active work already exists/);

    const currentPath = path.join(root, ...CURRENT_WORK_PATH.split("/"));
    const current = await readFile(currentPath, "utf8");
    await writeFile(
      currentPath,
      `${current}\n${"x".repeat(WORK_DOCUMENT_MAX_BYTES)}`,
      "utf8",
    );
    await expect(
      checkpointWork(root, { now: checkpointedAt }),
    ).rejects.toThrow(/maximum is/);
  });

  it("persists schema-v2 active-work state", async () => {
    const root = await initialized();
    await startWork(root, { title: "Portable resume", now: startedAt });
    expect(await loadState(root)).toMatchObject({
      schemaVersion: 2,
      activeWork: {
        title: "Portable resume",
        recoveryPath: ".contexttend/work/recovery.json",
      },
    });
  });

  it("preserves CRLF metadata and Unicode work intent", async () => {
    const root = await initialized();
    await startWork(root, {
      title: "Продолжить задачу с пробелами",
      objective: "Проверить переносимый checkpoint на Windows.",
      now: startedAt,
    });
    const currentPath = path.join(root, ...CURRENT_WORK_PATH.split("/"));
    const current = await readFile(currentPath, "utf8");
    await writeFile(currentPath, current.replaceAll("\n", "\r\n"), "utf8");
    await checkpointWork(root, { now: checkpointedAt });
    const checkpoint = await readFile(currentPath, "utf8");
    expect(checkpoint).toContain("Продолжить задачу с пробелами");
    expect(checkpoint.replaceAll("\r\n", "")).not.toContain("\n");
    expect((await getWorkStatus(root, checkpointedAt)).stale).toBe(false);
  });
});
