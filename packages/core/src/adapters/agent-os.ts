import type { Finding, KnowledgeAdapter, KnowledgeSource } from "../domain.js";
import { snapshotHasPath } from "../scanner.js";
import { findSourceByAdapter, source } from "./helpers.js";

function agentOsRoot(project: Parameters<KnowledgeAdapter["detect"]>[0]): string | null {
  if (snapshotHasPath(project, "agent-os")) return "agent-os";
  if (snapshotHasPath(project, ".agent-os")) return ".agent-os";
  return null;
}

export const agentOsAdapter: KnowledgeAdapter = {
  id: "agent-os",
  name: "Agent OS",
  priority: 80,
  detect(project) {
    const root = agentOsRoot(project);
    if (root === null) {
      return { detected: false, confidence: "none", evidence: [] };
    }
    const evidence = [`${root}/`];
    const hasProduct = snapshotHasPath(project, `${root}/product`);
    const hasStandards = snapshotHasPath(project, `${root}/standards`);
    if (hasProduct) evidence.push(`${root}/product/`);
    if (hasStandards) evidence.push(`${root}/standards/`);
    return {
      detected: true,
      confidence: hasProduct || hasStandards ? "certain" : "candidate",
      evidence,
    };
  },
  discoverSources(project) {
    const sources: Record<string, KnowledgeSource> = {};
    const root = agentOsRoot(project);
    if (root === null) return { sources };
    const addFile = (
      id: string,
      relative: string,
      role: string,
      authority: KnowledgeSource["authority"],
      description: string,
    ): void => {
      const candidate = `${root}/${relative}`;
      if (snapshotHasPath(project, candidate)) {
        sources[id] = source(candidate, role, authority, "external", "agent-os", description);
      }
    };
    addFile("agent-os-mission", "product/mission.md", "product", "canonical", "Agent OS product mission");
    addFile("agent-os-roadmap", "product/roadmap.md", "roadmap", "canonical", "Agent OS product roadmap");
    addFile("agent-os-tech-stack", "product/tech-stack.md", "architecture", "supporting", "Agent OS technology choices");
    if (snapshotHasPath(project, `${root}/standards`)) {
      sources["agent-os-standards"] = source(`${root}/standards/`, "instructions", "canonical", "external", "agent-os", "Agent OS project standards");
    }
    if (snapshotHasPath(project, `${root}/specs`)) {
      sources["agent-os-specs"] = source(`${root}/specs/`, "requirements", "canonical", "external", "agent-os", "Agent OS feature specifications");
    }
    return { sources };
  },
  validate(project, registry) {
    const findings: Finding[] = [];
    if (findSourceByAdapter(registry, "agent-os").length > 0 && agentOsRoot(project) === null) {
      findings.push({
        code: "CT321",
        level: "error",
        severity: "P2",
        message: "Registry declares Agent OS sources but agent-os/ and .agent-os/ are missing",
        remediation: "Restore Agent OS or review the external registry entries.",
      });
    }
    return findings;
  },
};
