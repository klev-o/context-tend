import { conventionalRequirements } from "./requirements.js";
import type { KnowledgeAdapter, KnowledgeSource } from "../domain.js";
import {
  filesUnder,
  firstExistingPath,
  snapshotHasPath,
} from "../scanner.js";
import { source } from "./helpers.js";

function addFirst(
  sources: Record<string, KnowledgeSource>,
  project: Parameters<KnowledgeAdapter["discoverSources"]>[0],
  id: string,
  candidates: string[],
  role: string,
  authority: KnowledgeSource["authority"],
  owner: KnowledgeSource["owner"],
  description: string,
): void {
  const found = firstExistingPath(project, candidates);
  if (found !== null) {
    sources[id] = source(found, role, authority, owner, "generic", description);
  }
}

export const genericAdapter: KnowledgeAdapter = {
  id: "generic",
  name: "Generic repository conventions",
  priority: 10,
  detect: () => ({
    detected: true,
    confidence: "certain",
    evidence: ["generic fallback is always available"],
  }),
  discoverSources(project) {
    const sources: Record<string, KnowledgeSource> = {};
    addFirst(sources, project, "repository-readme", ["README.md", "README.mdx"], "reference", "supporting", "human", "Repository overview");
    addFirst(sources, project, "agent-instructions", ["AGENTS.md"], "instructions", "canonical", "shared", "Repository-level agent instructions");
    addFirst(sources, project, "goals", ["docs/GOALS.md", "GOALS.md"], "goals", "canonical", "human", "Project goals");
    addFirst(sources, project, "product", ["docs/PRODUCT.md", "PRODUCT.md"], "product", "canonical", "human", "Product intent");
    addFirst(sources, project, "architecture", ["ARCHITECTURE.md", "docs/ARCHITECTURE.md", "docs/architecture.md"], "architecture", "canonical", "shared", "Architecture description");
    addFirst(sources, project, "roadmap", ["docs/PLANS.md", "ROADMAP.md", "docs/ROADMAP.md", "PLANS.md"], "roadmap", "canonical", "shared", "Project roadmap and active plans");
    addFirst(sources, project, "execution-plans", ["docs/plans", "plans"], "execution-plan", "supporting", "shared", "Detailed implementation and execution plans");
    addFirst(sources, project, "decisions", ["docs/decisions", "docs/adr", "docs/adrs", "adr"], "decisions", "canonical", "shared", "Architectural decisions");
    addFirst(sources, project, "research", ["docs/research", "research"], "reference", "supporting", "human", "Project research and source analysis");
    addFirst(sources, project, "security", ["SECURITY.md", "docs/SECURITY.md", "docs/security.md"], "security", "canonical", "human", "Security policy and assumptions");
    addFirst(sources, project, "operations", ["docs/runbooks", "runbooks", "docs/operations"], "operations", "canonical", "shared", "Operational runbooks");

    for (const [index, paths] of conventionalRequirements(project).entries()) {
      const id = index === 0 ? "requirements" : "requirements-" + (index + 1);
      sources[id] = source(paths.length === 1 ? paths[0]! : paths,
        "requirements", "canonical", "human", "generic", "Repository requirements");
    }

    const implementationPaths = ["src", "packages", "app", "lib"].filter((candidate) =>
      snapshotHasPath(project, candidate),
    );
    if (implementationPaths.length > 0) {
      sources["implementation"] = source(
        implementationPaths,
        "implementation-context",
        "evidence",
        "external",
        "generic",
        "Implementation evidence",
      );
    }

    const testPaths = ["tests", "test", "__tests__"].filter((candidate) =>
      snapshotHasPath(project, candidate),
    );
    if (testPaths.length > 0 || filesUnder(project, "src", (file) => /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(file)).length > 0) {
      sources["verification"] = source(
        testPaths.length > 0 ? testPaths : "src",
        "verification",
        "evidence",
        "external",
        "generic",
        "Executable verification evidence",
      );
    }
    return { sources };
  },
};
