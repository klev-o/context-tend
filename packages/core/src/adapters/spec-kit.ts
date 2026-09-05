import type { Finding, KnowledgeAdapter, KnowledgeSource } from "../domain.js";
import { snapshotHasPath } from "../scanner.js";
import { findSourceByAdapter, source } from "./helpers.js";

export const specKitAdapter: KnowledgeAdapter = {
  id: "spec-kit",
  name: "GitHub Spec Kit",
  priority: 100,
  detect(project) {
    const hasMarker = snapshotHasPath(project, ".specify");
    const hasSpecs = snapshotHasPath(project, "specs");
    const detected = hasMarker || (hasSpecs && snapshotHasPath(project, ".specify/memory/constitution.md"));
    return {
      detected,
      confidence: hasMarker && hasSpecs ? "certain" : detected ? "likely" : "none",
      evidence: [
        ...(hasMarker ? [".specify/"] : []),
        ...(hasSpecs ? ["specs/"] : []),
      ],
    };
  },
  discoverSources(project) {
    const sources = {};
    if (!this.detect(project).detected) return { sources };
    const discovered: Record<string, KnowledgeSource> = {};
    if (snapshotHasPath(project, "specs")) {
      discovered["spec-kit-requirements"] = source(
        "specs/",
        "requirements",
        "canonical",
        "external",
        "spec-kit",
        "Spec Kit feature specifications, plans, tasks, and verification",
      );
    }
    if (snapshotHasPath(project, ".specify/memory/constitution.md")) {
      discovered["spec-kit-constitution"] = source(
        ".specify/memory/constitution.md",
        "instructions",
        "canonical",
        "external",
        "spec-kit",
        "Spec Kit governing principles",
      );
    }
    return { sources: discovered };
  },
  validate(project, registry) {
    const findings: Finding[] = [];
    const registered = findSourceByAdapter(registry, "spec-kit");
    if (registered.length > 0 && !snapshotHasPath(project, ".specify")) {
      findings.push({
        code: "CT301",
        level: "error",
        severity: "P2",
        message: "Registry declares Spec Kit sources but .specify/ is missing",
        path: ".specify/",
        remediation: "Restore Spec Kit or review the external registry entries.",
      });
    }
    if (
      this.detect(project).detected &&
      snapshotHasPath(project, "specs") &&
      !registered.some(([, item]) => item.role === "requirements")
    ) {
      findings.push({
        code: "CT302",
        level: "error",
        severity: "P2",
        message: "Detected Spec Kit specs are not registered as requirements",
        path: "specs/",
        remediation: "Re-run contexttend init --apply after reviewing the proposed registry.",
      });
    }
    return findings;
  },
};
