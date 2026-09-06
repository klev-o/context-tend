import { readFile } from "node:fs/promises";

import { CONTEXTTEND_VERSION, SCHEMA_VERSION, type State } from "./domain.js";
import { resolveRegistryPath } from "./paths.js";
import { parseState } from "./schemas.js";
import { serializeJson, writeProjectFile } from "./storage.js";

export interface MigrationResult {
  state: State;
  migratedFrom: number;
  migratedTo: number;
  changed: boolean;
}

function objectValue(input: unknown): Record<string, unknown> {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("State migration requires a JSON object");
  }
  return input as Record<string, unknown>;
}

function legacyTimestamp(value: unknown, fallback: string): string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value)) ? value : fallback;
}

export function migrateStateDocument(input: unknown, now = new Date()): MigrationResult {
  const raw = objectValue(input);
  const from = typeof raw["schemaVersion"] === "number" ? raw["schemaVersion"] : 0;
  if (from > SCHEMA_VERSION) {
    throw new Error(
      `State schema ${from} is newer than supported schema ${SCHEMA_VERSION}`,
    );
  }
  if (from === SCHEMA_VERSION) {
    return {
      state: parseState(raw),
      migratedFrom: from,
      migratedTo: SCHEMA_VERSION,
      changed: false,
    };
  }
  if (from !== 0 && from !== 1) {
    throw new Error(`No deterministic migration exists from state schema ${from}`);
  }

  const timestamp = now.toISOString();
  const migrated = parseState({
    schemaVersion: 2,
    contextTendVersion:
      typeof raw["contextTendVersion"] === "string"
        ? raw["contextTendVersion"]
        : CONTEXTTEND_VERSION,
    installedAt: legacyTimestamp(raw["installedAt"], timestamp),
    updatedAt: timestamp,
    lastOnboarding:
      typeof raw["lastOnboarding"] === "string" ? raw["lastOnboarding"] : null,
    lastSync: typeof raw["lastSync"] === "string" ? raw["lastSync"] : null,
    lastMemoryAudit:
      typeof raw["lastMemoryAudit"] === "string" ? raw["lastMemoryAudit"] : null,
    lastHarnessAudit:
      typeof raw["lastHarnessAudit"] === "string" ? raw["lastHarnessAudit"] : null,
    detectedAdapters: Array.isArray(raw["detectedAdapters"])
      ? raw["detectedAdapters"].filter((item): item is string => typeof item === "string")
      : [],
    registeredHashes:
      raw["registeredHashes"] !== null && typeof raw["registeredHashes"] === "object"
        ? raw["registeredHashes"]
        : {},
    managedAssets:
      raw["managedAssets"] !== null && typeof raw["managedAssets"] === "object"
        ? raw["managedAssets"]
        : {},
    managedBlocks:
      raw["managedBlocks"] !== null && typeof raw["managedBlocks"] === "object"
        ? raw["managedBlocks"]
        : {},
    activeWork: null,
    lastCompletedWork: null,
  });
  return {
    state: migrated,
    migratedFrom: from,
    migratedTo: SCHEMA_VERSION,
    changed: true,
  };
}

export async function migrateProjectState(
  projectRoot: string,
  apply: boolean,
  now = new Date(),
): Promise<MigrationResult> {
  const text = await readFile(
    resolveRegistryPath(projectRoot, ".contexttend/state.json"),
    "utf8",
  );
  const result = migrateStateDocument(JSON.parse(text) as unknown, now);
  if (apply && result.changed) {
    await writeProjectFile(
      projectRoot,
      ".contexttend/state.json",
      serializeJson(result.state),
    );
  }
  return result;
}
