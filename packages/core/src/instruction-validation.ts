import path from "node:path";
import type { Finding, ProjectSnapshot } from "./domain.js";
import { readContainedText } from "./markdown.js";

// Generic advisory budget; not a simulation of any host's configurable loader.
const INSTRUCTION_REVIEW_BYTES = 16 * 1024;

export async function validateInstructionContext(snapshot: ProjectSnapshot): Promise<Finding[]> {
  const findings: Finding[] = [];
  const selected = new Map<string, { file: string; content: string }>();
  const files = [...snapshot.files].filter((file) =>
    /(?:^|\/)AGENTS(?:\.override)?\.md$/u.test(file)).sort();
  for (const file of files) {
    const content = await readContainedText(snapshot.root, file);
    if (!content?.trim()) continue;
    const directory = path.posix.dirname(file);
    const previous = selected.get(directory);
    if (previous === undefined || file.endsWith("AGENTS.override.md")) {
      selected.set(directory, { file, content });
    }
  }
  for (const [directory, item] of selected) {
    const ordinary = directory === "." ? "AGENTS.md" : directory + "/AGENTS.md";
    if (item.file.endsWith("AGENTS.override.md") && snapshot.files.has(ordinary)) {
      findings.push({
        code: "CT160", level: "warning", severity: "P2", path: item.file,
        message: "AGENTS.override.md shadows the same-directory AGENTS.md in Codex",
        evidence: [ordinary],
        remediation: "Review the effective scope and preserve needed routing in the selected file; ContextTend does not rewrite overrides.",
      });
    }
    const chain = [...selected.entries()].filter(([ancestor]) =>
      ancestor === "." || ancestor === directory || directory.startsWith(ancestor + "/"))
      .sort(([a], [b]) => a.length - b.length || a.localeCompare(b, "en"))
      .map(([, entry]) => entry);
    const bytes = chain.reduce((total, entry) => total + Buffer.byteLength(entry.content, "utf8"), 0);
    if (bytes > INSTRUCTION_REVIEW_BYTES) findings.push({
      code: "CT161", level: "warning", severity: "P3", path: item.file,
      message: "Repository instruction chain exceeds the 16 KiB advisory reading budget (" + bytes + " bytes)",
      evidence: chain.map((entry) => entry.file),
      remediation: "Use harness-audit to move detail behind pointers. Actual host limits, global files and fallback names require a host audit.",
    });
    const duplicate = chain.find((entry) =>
      entry.file !== item.file && entry.content.trim() === item.content.trim() &&
      Buffer.byteLength(item.content.trim(), "utf8") >= 80);
    if (duplicate) findings.push({
      code: "CT162", level: "warning", severity: "P3", path: item.file,
      message: "Identical instruction text repeats in an ancestor scope",
      evidence: [duplicate.file],
      remediation: "Review whether the nested copy can be replaced with only its local rules.",
    });
  }
  return findings;
}
