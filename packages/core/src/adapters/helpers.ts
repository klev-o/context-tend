import type {
  AdapterStatus,
  KnowledgeAdapter,
  KnowledgeSource,
  ProjectSnapshot,
  Registry,
} from "../domain.js";

export function source(
  path: string | string[],
  role: string,
  authority: KnowledgeSource["authority"],
  owner: KnowledgeSource["owner"],
  adapter: string,
  description: string,
): KnowledgeSource {
  return { path, role, authority, owner, adapter, description };
}

export function findSourceByAdapter(
  registry: Registry,
  adapter: string,
): Array<[string, KnowledgeSource]> {
  return Object.entries(registry.sources).filter(
    ([, knowledgeSource]) => knowledgeSource.adapter === adapter,
  );
}

export function detectedStatus(
  adapter: KnowledgeAdapter,
  project: ProjectSnapshot,
): AdapterStatus {
  return {
    id: adapter.id,
    name: adapter.name,
    detection: adapter.detect(project),
  };
}
