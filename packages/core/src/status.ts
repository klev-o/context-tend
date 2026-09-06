import { discoverWithAdapters } from "./adapters/index.js";
import type { AdapterStatus, Config, Registry, State, ValidationResult } from "./domain.js";
import { scanProject } from "./scanner.js";
import { loadConfig, loadRegistry, loadState } from "./storage.js";
import { validateProject } from "./validation.js";
import { getWorkStatus, type WorkStatusResult } from "./work.js";

export interface ProjectStatus {
  root: string;
  config: Config;
  registry: Registry;
  state: State;
  adapters: AdapterStatus[];
  validation: ValidationResult;
  work: WorkStatusResult;
}

export async function getProjectStatus(projectRoot: string): Promise<ProjectStatus> {
  const snapshot = await scanProject(projectRoot);
  const [config, registry, state, validation, work] = await Promise.all([
    loadConfig(snapshot.root),
    loadRegistry(snapshot.root),
    loadState(snapshot.root),
    validateProject(snapshot.root),
    getWorkStatus(snapshot.root),
  ]);
  return {
    root: snapshot.root,
    config,
    registry,
    state,
    adapters: discoverWithAdapters(snapshot).statuses,
    validation,
    work,
  };
}
