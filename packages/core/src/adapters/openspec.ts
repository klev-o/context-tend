import type { Finding, KnowledgeAdapter, KnowledgeSource } from "../domain.js";
import { snapshotHasPath } from "../scanner.js";
import { findSourceByAdapter, source } from "./helpers.js";

export const openSpecAdapter: KnowledgeAdapter = {
  id: "openspec",
  name: "OpenSpec",
  priority: 90,
  detect(project) {
    const hasRoot = snapshotHasPath(project, "openspec");
    const hasConfig = snapshotHasPath(project, "openspec/config.yaml");
    const hasSpecs = snapshotHasPath(project, "openspec/specs");
    return {
      detected: hasRoot && (hasConfig || hasSpecs),
      confidence: hasConfig && hasSpecs ? "certain" : hasRoot ? "likely" : "none",
      evidence: [
        ...(hasRoot ? ["openspec/"] : []),
        ...(hasConfig ? ["openspec/config.yaml"] : []),
        ...(hasSpecs ? ["openspec/specs/"] : []),
      ],
    };
  },
  discoverSources(project) {
    const sources: Record<string, KnowledgeSource> = {};
    if (!this.detect(project).detected) return { sources };
    if (snapshotHasPath(project, "openspec/specs")) {
      sources["openspec-current-specs"] = source(
        "openspec/specs/",
        "requirements",
        "canonical",
        "external",
        "openspec",
        "OpenSpec current system specifications",
      );
    }
    if (snapshotHasPath(project, "openspec/changes")) {
      sources["openspec-active-changes"] = source(
        "openspec/changes/",
        "execution-plan",
        "supporting",
        "external",
        "openspec",
        "OpenSpec proposals, delta specs, designs, and tasks",
      );
    }
    if (snapshotHasPath(project, "openspec/changes/archive")) {
      sources["openspec-change-history"] = source(
        "openspec/changes/archive/",
        "reference",
        "historical",
        "external",
        "openspec",
        "Archived OpenSpec changes",
      );
    }
    return { sources };
  },
  validate(project, registry) {
    const findings: Finding[] = [];
    if (
      findSourceByAdapter(registry, "openspec").length > 0 &&
      !this.detect(project).detected
    ) {
      findings.push({
        code: "CT311",
        level: "error",
        severity: "P2",
        message: "Registry declares OpenSpec sources but its project markers are missing",
        path: "openspec/",
        remediation: "Restore OpenSpec or review the external registry entries.",
      });
    }
    return findings;
  },
};
