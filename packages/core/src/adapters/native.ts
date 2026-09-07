import type { KnowledgeAdapter, KnowledgeSource } from "../domain.js";
import { snapshotHasPath } from "../scanner.js";
import { source } from "./helpers.js";
import { conventionalRequirements } from "./requirements.js";

export const nativeAdapter: KnowledgeAdapter = {
  id: "native",
  name: "ContextTend native knowledge",
  priority: 60,
  detect(project) {
    const detected = snapshotHasPath(project, ".contexttend");
    return {
      detected,
      confidence: detected ? "certain" : "none",
      evidence: detected ? [".contexttend/"] : [],
    };
  },
  discoverSources(project) {
    const sources: Record<string, KnowledgeSource> = {};
    const mappings: Array<[string, string, string, KnowledgeSource["owner"], string]> = [
      ["goals", "docs/GOALS.md", "goals", "human", "ContextTend native goals"],
      ["product", "docs/PRODUCT.md", "product", "human", "ContextTend native product intent"],
      ["roadmap", "docs/PLANS.md", "roadmap", "shared", "ContextTend native roadmap"],
      ["decisions", "docs/decisions", "decisions", "shared", "ContextTend native decisions"],
      ["implementation-context", "docs/context", "implementation-context", "agent", "ContextTend maintained implementation context"],
    ];
    for (const [id, candidate, role, owner, description] of mappings) {
      if (snapshotHasPath(project, candidate)) {
        sources[id] = source(candidate.endsWith(".md") ? candidate : `${candidate}/`, role, "canonical", owner, "native", description);
      }
    }
    const spec = conventionalRequirements(project).find((paths) => paths[0] === "SPEC.md");
    if (spec) {
      sources["requirements"] = source(spec.length === 1 ? spec[0]! : spec,
        "requirements", "canonical", "human", "native", "Project requirements and specification");
    }
    return { sources };
  },
};
