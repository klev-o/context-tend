import { sha256 } from "./hashing.js";

export const MANAGED_BLOCK_START = "<!-- contexttend:start -->";
export const MANAGED_BLOCK_END = "<!-- contexttend:end -->";

export const AGENTS_MANAGED_BLOCK = `${MANAGED_BLOCK_START}

## Project knowledge

Use \`.contexttend/registry.yaml\` to locate authoritative project knowledge.
Apply progressive disclosure: read only the sources relevant to the current task.
Read \`.contexttend/guides/agent-governance.md\` for instruction precedence and ownership; explicit user intent takes priority over Skill guidelines.
For features, read the registered requirements entry point (native \`SPEC.md\`), then only relevant topic links.
If Skill invocation is unavailable, read \`.agents/skills/<name>/SKILL.md\` and follow it as ordinary Markdown.
Respect each source's \`owner\` and \`authority\`; implementation evidence does not replace human product intent.
Before substantive repository work, read \`.contexttend/state.json\`. If \`lastOnboarding\` is missing or null, use \`$context-onboard\` first, then resume the original task.
If \`activeWork\` is non-null, reconcile it with \`$context-work resume\` before onboarding or other substantive work; a plain "continue" or "resume" refers to that active work.
For substantive multi-step changes, use \`$context-work\` to keep a compact checkpoint; do not create task memory for minor edits or questions.
After material changes, use \`$context-sync\` for the documentation impact check.
Use \`$memory-audit\` for semantic drift and \`$harness-audit\` for Codex setup freshness.

${MANAGED_BLOCK_END}`;

export const CLAUDE_MANAGED_BLOCK = `${MANAGED_BLOCK_START}

## ContextTend bridge

Read \`AGENTS.md\` and follow its ContextTend managed block before substantive repository work.
If \`.contexttend/state.json\` has non-null \`activeWork\`, read \`.agents/skills/context-work/SKILL.md\` and resume that work before starting another task.
Treat a plain "continue" or "resume" as a request to reconcile \`.contexttend/work/current.md\` with Git, tests, and the current user instruction.
This bridge provides no hooks; use \`contexttend work status\` at resume and checkpoint boundaries.

${MANAGED_BLOCK_END}`;

export interface ManagedBlockResult {
  content: string;
  changed: boolean;
  existingBlocks: number;
}

function preferredNewline(content: string): "\n" | "\r\n" {
  return content.includes("\r\n") ? "\r\n" : "\n";
}

export function countManagedBlocks(content: string): number {
  return content.split(MANAGED_BLOCK_START).length - 1;
}

export function extractManagedBlock(content: string): string | null {
  const start = content.indexOf(MANAGED_BLOCK_START);
  if (start < 0) {
    return null;
  }
  const end = content.indexOf(MANAGED_BLOCK_END, start);
  if (end < 0) {
    return null;
  }
  return content.slice(start, end + MANAGED_BLOCK_END.length);
}

export function managedBlockHash(content: string): string | null {
  const block = extractManagedBlock(content);
  return block === null ? null : sha256(block.replaceAll("\r\n", "\n"));
}

export function upsertManagedBlock(
  original: string,
  block = AGENTS_MANAGED_BLOCK,
): ManagedBlockResult {
  const newline = preferredNewline(original);
  const normalizedBlock = block.replaceAll("\n", newline);
  const existingBlocks = countManagedBlocks(original);
  const start = original.indexOf(MANAGED_BLOCK_START);
  const end = original.indexOf(MANAGED_BLOCK_END, Math.max(start, 0));

  if (existingBlocks > 1) {
    throw new Error("AGENTS.md contains multiple ContextTend managed blocks");
  }
  if (start >= 0 && end < 0) {
    throw new Error("AGENTS.md contains an unterminated ContextTend managed block");
  }

  let content: string;
  if (start >= 0) {
    content =
      original.slice(0, start) +
      normalizedBlock +
      original.slice(end + MANAGED_BLOCK_END.length);
  } else if (original.trim().length === 0) {
    content = `# AGENTS.md${newline}${newline}${normalizedBlock}${newline}`;
  } else {
    const trimmedEnd = original.replace(/[\r\n\s]+$/, "");
    content = `${trimmedEnd}${newline}${newline}${normalizedBlock}${newline}`;
  }

  return { content, changed: content !== original, existingBlocks };
}
