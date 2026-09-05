import type { Finding, KnowledgeAdapter, KnowledgeSource } from "../domain.js";
import { snapshotHasPath } from "../scanner.js";
import { findSourceByAdapter, source } from "./helpers.js";

export const gsdAdapter: KnowledgeAdapter = {
  id: "gsd",
  name: "GSD Core",
  priority: 70,
  detect(project) {
    const hasPlanning = snapshotHasPath(project, ".planning");
    const markerFiles = [
      ".planning/PROJECT.md",
      ".planning/REQUIREMENTS.md",
      ".planning/ROADMAP.md",
      ".planning/STATE.md",
      ".planning/config.json",
    ].filter((candidate) => snapshotHasPath(project, candidate));
    return {
      detected: hasPlanning && markerFiles.length >= 2,
      confidence: markerFiles.length >= 4 ? "certain" : markerFiles.length >= 2 ? "likely" : "none",
      evidence: [...(hasPlanning ? [".planning/"] : []), ...markerFiles],
    };
  },
  discoverSources(project) {
    const sources: Record<string, KnowledgeSource> = {};
    if (!this.detect(project).detected) return { sources };
    const mappings: Array<[string, string, string, KnowledgeSource["authority"], string]> = [
      ["gsd-project", ".planning/PROJECT.md", "product", "canonical", "GSD canonical project identity"],
      ["gsd-requirements", ".planning/REQUIREMENTS.md", "requirements", "canonical", "GSD acceptance criteria"],
      ["gsd-roadmap", ".planning/ROADMAP.md", "roadmap", "canonical", "GSD milestone and phase roadmap"],
      ["gsd-state", ".planning/STATE.md", "current-state", "canonical", "GSD living project position"],
      ["gsd-milestones", ".planning/MILESTONES.md", "reference", "historical", "GSD completed milestone archive"],
      ["gsd-decisions", ".planning/DECISIONS-INDEX.md", "decisions", "supporting", "GSD decision index"],
    ];
    for (const [id, candidate, role, authority, description] of mappings) {
      if (snapshotHasPath(project, candidate)) {
        sources[id] = source(candidate, role, authority, "external", "gsd", description);
      }
    }
    if (snapshotHasPath(project, ".planning/codebase")) {
      sources["gsd-codebase-map"] = source(".planning/codebase/", "implementation-context", "generated", "system", "gsd", "GSD generated brownfield codebase map");
    }
    if (snapshotHasPath(project, ".planning/phases")) {
      sources["gsd-phase-plans"] = source(".planning/phases/", "execution-plan", "supporting", "external", "gsd", "GSD phase context, plans, and verification");
    }
    return { sources };
  },
  validate(project, registry) {
    const findings: Finding[] = [];
    if (findSourceByAdapter(registry, "gsd").length > 0 && !this.detect(project).detected) {
      findings.push({
        code: "CT331",
        level: "error",
        severity: "P2",
        message: "Registry declares GSD sources but the .planning/ contract is no longer detected",
        path: ".planning/",
        remediation: "Restore GSD planning artifacts or review the external registry entries.",
      });
    }
    return findings;
  },
};
