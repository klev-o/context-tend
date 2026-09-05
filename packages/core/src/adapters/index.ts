import type {
  AdapterStatus,
  KnowledgeAdapter,
  KnowledgeSource,
  ProjectSnapshot,
  Registry,
} from "../domain.js";
import { sourcePaths } from "../domain.js";
import { toRegistryPath } from "../paths.js";
import { agentOsAdapter } from "./agent-os.js";
import { genericAdapter } from "./generic.js";
import { gsdAdapter } from "./gsd.js";
import { detectedStatus } from "./helpers.js";
import { nativeAdapter } from "./native.js";
import { openSpecAdapter } from "./openspec.js";
import { specKitAdapter } from "./spec-kit.js";

export const adapters: readonly KnowledgeAdapter[] = [
  specKitAdapter,
  openSpecAdapter,
  agentOsAdapter,
  gsdAdapter,
  nativeAdapter,
  genericAdapter,
].sort((left, right) => right.priority - left.priority);

export interface AdapterDiscoveryResult {
  statuses: AdapterStatus[];
  registry: Registry;
}

function sameSource(left: KnowledgeSource, right: KnowledgeSource): boolean {
  const normalize = (source: KnowledgeSource): string[] =>
    sourcePaths(source)
      .map((item) => toRegistryPath(item).replace(/\/$/, ""))
      .sort();
  return (
    left.role === right.role &&
    JSON.stringify(normalize(left)) === JSON.stringify(normalize(right))
  );
}

function uniqueId(
  requested: string,
  adapterId: string,
  sources: Record<string, KnowledgeSource>,
): string {
  if (sources[requested] === undefined) return requested;
  const prefixed = `${adapterId}-${requested}`;
  if (sources[prefixed] === undefined) return prefixed;
  let suffix = 2;
  while (sources[`${prefixed}-${suffix}`] !== undefined) suffix += 1;
  return `${prefixed}-${suffix}`;
}

export function discoverWithAdapters(
  project: ProjectSnapshot,
): AdapterDiscoveryResult {
  const statuses = adapters.map((adapter) => detectedStatus(adapter, project));
  const sources: Record<string, KnowledgeSource> = {};
  for (const adapter of adapters) {
    const status = statuses.find((item) => item.id === adapter.id);
    if (status?.detection.detected !== true) continue;
    const discovery = adapter.discoverSources(project);
    for (const [requestedId, knowledgeSource] of Object.entries(discovery.sources)) {
      if (Object.values(sources).some((existing) => sameSource(existing, knowledgeSource))) {
        continue;
      }
      sources[uniqueId(requestedId, adapter.id, sources)] = knowledgeSource;
    }
  }
  return { statuses, registry: { version: 1, sources } };
}

export function activeAdapterIds(statuses: AdapterStatus[]): string[] {
  return statuses
    .filter((status) => status.detection.detected && status.id !== "generic")
    .map((status) => status.id);
}
