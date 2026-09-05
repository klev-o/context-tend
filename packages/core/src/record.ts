import type { State } from "./domain.js";
import { checkAgentCoverage } from "./agents-coverage.js";
import { hashRegisteredSources } from "./init.js";
import {
  loadExternalSourceRegistry,
  loadRegistry,
  loadState,
  serializeJson,
  serializeYaml,
  writeProjectFile,
} from "./storage.js";

export const RECORD_EVENTS = [
  "onboarding",
  "sync",
  "memory-audit",
  "harness-audit",
] as const;
export type RecordEvent = (typeof RECORD_EVENTS)[number];

export interface RecordOptions {
  source?: string;
  now?: Date;
}

export async function recordEvent(
  projectRoot: string,
  event: RecordEvent,
  options: RecordOptions = {},
): Promise<State> {
  const now = options.now ?? new Date();
  const timestamp = now.toISOString();
  const previous = await loadState(projectRoot);
  const next: State = { ...previous, updatedAt: timestamp };

  if (event === "onboarding") {
    const coverage = await checkAgentCoverage(projectRoot);
    if (!coverage.valid) {
      const examples = coverage.anchors.missing
        .slice(0, 8)
        .map((anchor) => anchor.value)
        .join(", ");
      throw new Error(
        `Cannot record onboarding: ${coverage.anchors.missing.length} AGENTS anchor(s) are absent from the active knowledge corpus${examples ? ` (${examples})` : ""}. Run contexttend agents-coverage check and complete the migration first.`,
      );
    }
    next.lastOnboarding = timestamp;
  } else if (event === "sync") {
    next.lastSync = timestamp;
    next.registeredHashes = await hashRegisteredSources(
      projectRoot,
      await loadRegistry(projectRoot),
    );
  } else if (event === "memory-audit") {
    next.lastMemoryAudit = timestamp;
  } else if (event === "harness-audit") {
    next.lastHarnessAudit = timestamp;
    if (options.source) {
      const external = await loadExternalSourceRegistry(projectRoot);
      const entry = external.sources[options.source];
      if (!entry) {
        throw new Error(`Unknown external source id: ${options.source}`);
      }
      entry.lastChecked = timestamp.slice(0, 10);
      await writeProjectFile(
        projectRoot,
        ".contexttend/source-registry.yaml",
        serializeYaml(external),
      );
    }
  }
  await writeProjectFile(
    projectRoot,
    ".contexttend/state.json",
    serializeJson(next),
  );
  return next;
}
