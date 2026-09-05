import type { Registry, State } from "./domain.js";
import { hashRegisteredSources } from "./init.js";
import { loadRegistry, loadState } from "./storage.js";

export type SourceDiffStatus = "unchanged" | "changed" | "missing" | "new" | "removed";

export interface SourceDiff {
  id: string;
  role: string | null;
  path: string | string[] | null;
  status: SourceDiffStatus;
  baseline: string | null | undefined;
  current: string | null | undefined;
}

export interface ProjectDiff {
  root: string;
  sources: SourceDiff[];
  changed: number;
}

export function compareHashes(
  registry: Registry,
  state: State,
  current: Record<string, string | null>,
): SourceDiff[] {
  const ids = new Set([
    ...Object.keys(registry.sources),
    ...Object.keys(state.registeredHashes),
  ]);
  return [...ids].sort().map((id) => {
    const source = registry.sources[id];
    const baseline = state.registeredHashes[id];
    const actual = current[id];
    let status: SourceDiffStatus;
    if (source === undefined) status = "removed";
    else if (!(id in state.registeredHashes)) status = "new";
    else if (actual === null) status = "missing";
    else if (baseline === actual) status = "unchanged";
    else status = "changed";
    return {
      id,
      role: source?.role ?? null,
      path: source?.path ?? null,
      status,
      baseline,
      current: actual,
    };
  });
}

export async function diffProject(projectRoot: string): Promise<ProjectDiff> {
  const registry = await loadRegistry(projectRoot);
  const state = await loadState(projectRoot);
  const current = await hashRegisteredSources(projectRoot, registry);
  const sources = compareHashes(registry, state, current);
  return {
    root: projectRoot,
    sources,
    changed: sources.filter((source) => source.status !== "unchanged").length,
  };
}
