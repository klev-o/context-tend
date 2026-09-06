# ContextTend work continuity

This protocol preserves enough verified context to resume one interrupted
work item. It is not a transcript, task framework, or replacement for an
external specification system.

## Files and authority

- `.contexttend/state.json` is system-owned machine state. Its `activeWork`
  pointer selects the one active work item.
- `.contexttend/work/current.md` is a shared, compact semantic checkpoint.
  The agent maintains its prose; the CLI owns its marker-bounded metadata.
- `.contexttend/work/recovery.json` is generated deterministic evidence:
  Git HEAD, changed paths, hashes, and a repository fingerprint. It never
  contains file contents, model reasoning, prompts, or transcripts.

When evidence conflicts, use this order: the current user instruction, actual
repository/tests, canonical registered knowledge, `current.md`, then
`recovery.json`. A checkpoint describes intent and progress but cannot
override observable repository facts.

## Lifecycle

Start active work only for a substantive multi-step task where interruption
would lose useful context. Immediately replace template text with objective,
definition of done, constraints, decisions, completed work, exact next steps,
changed files, concise verification, blockers, and resume instructions.

Checkpoint after a material phase, durable decision, meaningful test result,
new blocker, or before a planned handoff. Replace the snapshot; do not append
an activity log. Keep it below 8 KiB and normally around 400-1000 tokens.

On resume, run `contexttend work status`, read `current.md` completely, then
inspect Git status/diff and relevant tests. Reconcile stale or contradictory
claims before continuing. Do not redo completed work without evidence.

Complete only after the definition of done and relevant validation pass,
durable knowledge impact has been handled, the final checkpoint is fresh, and
`contexttend work complete` accepts it.

## Portability and hooks

The file/state protocol works without hooks in any coding agent that follows
the repository instructions and can access the working tree. Codex hooks are
an optional reliability adapter: session start provides only a short pointer,
mutation/interrupt hooks update recovery silently, and Stop requests at most
one extra checkpoint pass. Hooks never parse the unstable session transcript.

For an external framework such as Spec Kit, OpenSpec, Agent OS, or GSD, keep
detailed task truth in its owned artifacts. `current.md` stores only the
handoff delta and direct pointers needed to resume.
