# Decision 0005: Portable active work with optional hooks

Status: accepted
Date: 2026-09-05

## Context

A substantial coding task can stop because of quota exhaustion, interruption,
process failure, account switching, or a deliberate handoff. Chat history is
not a portable project source, and no end-of-session callback can guarantee
that a model has time to write a semantically complete final summary.

The recovery mechanism must work for existing repositories, remain useful
outside Codex, avoid transcript storage, respect external planning systems, and
keep deterministic facts out of LLM reasoning.

## Decision

ContextTend supports one optional active work item using two layers:

- `.contexttend/work/current.md` is a shared, replace-in-place semantic
  checkpoint maintained by `$context-work` and limited to 8 KiB.
- `.contexttend/work/recovery.json` is machine-generated evidence containing
  Git/filesystem fingerprints, changed paths, hashes, and timestamps but no
  source contents or model transcript.

Schema v2 stores the active pointer and checkpoint hashes in
`.contexttend/state.json`. Completion is rejected until the current document
and live repository match the recorded checkpoint.

Codex hooks are an optional explicit integration, not a dependency. The
installer merges ContextTend handlers into existing `.codex/hooks.json` with
dry-run/apply conflict protection. Silent lifecycle handlers refresh recovery;
session start adds only a short pointer; Stop can request at most one semantic
checkpoint pass. Hooks never read `transcript_path`.

A marker-bounded `CLAUDE.md` bridge is available separately. Other
repository-capable agents can use the same file/state protocol through their
native instruction mechanism.

External systems such as Spec Kit, OpenSpec, Agent OS, and GSD remain the
owners of detailed specs and plans. Active work records only the handoff delta
and pointers required to resume.

## Consequences

- A plain “continue” can recover the one active task when the coding agent
  reads the repository instructions and has filesystem/Git access.
- Extra user context is treated as current intent and improves recovery, while
  repository/test evidence remains authoritative for completed facts.
- Abrupt termination may leave semantic content stale, but staleness is
  detectable and deterministic evidence survives the last completed hook or
  explicit status capture.
- Small tasks incur no active-work overhead. Substantive tasks add one bounded
  read on resume and concise checkpoints at meaningful boundaries.
- Recovery is not a task manager, historical log, memory database, transcript
  store, or guarantee that an arbitrary chat-only LLM can access the project.
- Codex project hooks require a Git root and explicit trust review. The
  no-hooks path remains functional.

## Evidence

- [Official OpenAI Codex hooks documentation](https://learn.chatgpt.com/docs/hooks)
- `packages/core/src/work.ts`
- `packages/core/src/integrations.ts`
- `packages/core/src/hook-assets.ts`
- `tests/work.test.ts` and `tests/integrations.test.ts`
