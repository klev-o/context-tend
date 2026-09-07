import type { Finding, KnowledgeSource, ProjectSnapshot, Registry } from "./domain.js";
import { sourcePaths } from "./domain.js";
import { localMarkdownTargets, markdownTargetPath, readContainedText } from "./markdown.js";
import { resolveRegistryPath, toRegistryPath } from "./paths.js";

// Advisory reading budget, not an automatic semantic split or a model limit.
const SPEC_REVIEW_BYTES = 16 * 1024;

function covers(source: KnowledgeSource, file: string, snapshot: ProjectSnapshot): boolean {
  return sourcePaths(source).some((value) => {
    const normalized = toRegistryPath(value).replace(/\/$/u, "");
    return file === normalized ||
      (snapshot.directories.has(normalized) && file.startsWith(normalized + "/"));
  });
}

export async function validateRequirements(snapshot: ProjectSnapshot, registry: Registry): Promise<Finding[]> {
  const findings: Finding[] = [];
  const sources = Object.values(registry.sources).filter((source) =>
    source.role === "requirements" && source.authority === "canonical" && source.owner !== "external");
  for (const source of sources) {
    const files = [...snapshot.files].filter((file) =>
      file.toLowerCase().endsWith(".md") && covers(source, file, snapshot)).sort();
    const contents = new Map<string, string>();
    for (const file of files) {
      const content = await readContainedText(snapshot.root, file);
      if (content === null) continue;
      contents.set(file, content);
      const bytes = Buffer.byteLength(content, "utf8");
      if (bytes > SPEC_REVIEW_BYTES) findings.push({
        code: "CT154", level: "warning", severity: "P3", path: file,
        message: "Requirements document exceeds the 16 KiB advisory reading budget (" + bytes + " bytes)",
        remediation: "Review topic boundaries with context-bootstrap and the requirements guide; never split automatically by size.",
      });
    }
    // Conventional SPEC navigation is opt-in by an explicit registered root entry.
    if (!sourcePaths(source).some((item) => toRegistryPath(item) === "SPEC.md")) continue;
    const children = [...snapshot.files].filter((file) =>
      file.startsWith("docs/spec/") && file.toLowerCase().endsWith(".md")).sort();
    if (snapshot.directories.has("docs/spec") &&
      !sourcePaths(source).some((item) => toRegistryPath(item).replace(/\/$/u, "") === "docs/spec")) {
      findings.push({
        code: "CT151", level: "error", severity: "P1", path: "SPEC.md",
        message: "SPEC.md and docs/spec/ must be paths of the same canonical requirements source",
        remediation: "Extend the existing source path list after reviewing ownership; do not add another canonical source.",
      });
    }
    const reachable = new Set<string>();
    const pending = ["SPEC.md"];
    while (pending.length > 0) {
      const file = pending.pop()!;
      if (reachable.has(file)) continue;
      reachable.add(file);
      const content = contents.get(file);
      if (content === undefined) continue;
      for (const link of localMarkdownTargets(content)) {
        try {
          let target = markdownTargetPath(file, link);
          resolveRegistryPath(snapshot.root, target);
          // Directory links route only through a real README, never every child.
          if (snapshot.directories.has(target.replace(/\/$/u, ""))) {
            target = target.replace(/\/$/u, "") + "/README.md";
          }
          if (target.startsWith("docs/spec/") && contents.has(target)) pending.push(target);
        } catch { /* General link validation reports invalid targets. */ }
      }
    }
    for (const file of children) {
      if (contents.has(file) && !reachable.has(file)) findings.push({
        code: "CT152", level: "warning", severity: "P2", path: file,
        message: "Specification document is not reachable from SPEC.md",
        remediation: "Add a link from SPEC.md or a reachable topic index; review whether this document is active requirements.",
      });
    }
  }
  return findings;
}
