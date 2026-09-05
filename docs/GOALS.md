# Project goals

Authority: human-owned canonical product intent.

## Goals

- Keep the durable context used by coding agents structured, authoritative,
  current, and compatible with the repository's existing workflow.
- Make the location, authority, and ownership of project knowledge explicit.
- Let agents route progressively to relevant canonical sources instead of
  loading every document.
- Detect deterministic drift safely and surface semantic drift through
  evidence-backed audit workflows.
- Treat existing repositories as the primary use case: discover, adopt, and
  create only what is missing.
- Let normal Codex work trigger one transparent semantic onboarding pass after
  deterministic init, without requiring users to memorize Skill commands.

## Non-goals

ContextTend is not a specification methodology, task framework, coding-agent
runtime, multi-agent orchestrator, semantic code index, memory database,
knowledge graph, transcript store, rules compiler, MCP server, dashboard,
watcher, deployment system, or automatic pull-request service.

It does not replace Spec Kit, OpenSpec, Agent OS, GSD, existing documentation,
or task trackers.

## Success signals

- A plain repository can be initialized, semantically bootstrapped, validated,
  synchronized, and audited.
- A Spec Kit repository registers `specs/` as requirements without a duplicate
  requirements system or changes to Spec Kit files.
- Existing `AGENTS.md` content survives init and update around one small
  managed block.
- First-run onboarding identifies overloaded or unreliable AGENTS content,
  proposes evidence-backed destinations, and records completion before
  resuming the user's original task.
- Mechanical facts are handled by deterministic code; semantic claims include
  evidence, confidence, ownership, and a reviewable action.
- The project remains local-first, portable, inspectable, and small enough to
  understand without operating infrastructure.
