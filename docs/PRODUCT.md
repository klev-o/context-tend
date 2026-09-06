# Product

Authority: human-owned canonical product knowledge.

## Problem and users

Long-lived repositories accumulate READMEs, instructions, architecture,
decisions, specs, plans, generated documentation, and framework-owned
knowledge. Eventually agents and maintainers cannot reliably tell which source
is authoritative, current, writable, or relevant to a task.

ContextTend is for maintainers and coding-agent users who want durable project
knowledge governance without migrating to another development framework.

## Product behavior

ContextTend answers five questions:

1. Where does truth for each semantic role live?
2. How can structural drift and semantic staleness be found?
3. Who is allowed to change each source?
4. How should an agent route to only the context relevant to a task?
5. How can interrupted substantive work resume from a clean session without
   depending on chat history?

The CLI deterministically scans an existing repository, detects knowledge
systems, proposes a typed Knowledge Registry, creates only missing native
sources, validates infrastructure, and tracks stable hashes. Preview is the
default; writes require explicit `--apply`.

The public distribution is one unscoped npm package named `contexttend`.
Users may run it ephemerally with `pnpm dlx contexttend`, install it locally
and use `pnpm contexttend`, or install it globally and invoke `contexttend`.
The internal core is not a separately required public package.

Interactive CLI output carries a recognizable ContextTend ASCII wordmark,
while machine-readable JSON, quiet recovery, version output, and errors remain
free of decorative text so scripts can consume them safely.

Repo-scoped Codex Skills then perform semantic bootstrap, documentation-impact
sync, memory audit, and fresh harness audit. Uncertain observations become
candidates, not fabricated canonical truth.

For substantive multi-phase implementation, one optional active-work record
preserves a compact semantic checkpoint and a separate deterministic
Git/filesystem recovery snapshot. A fresh coding-agent session can interpret a
plain continue/resume request by reconciling that checkpoint with the current
user message, repository, canonical knowledge, diffs, and tests. Minor work
does not create checkpoint overhead.

Codex lifecycle hooks may refresh recovery evidence and remind the model to
checkpoint before stopping, but they are an explicitly installed reliability
adapter rather than the foundation. Claude and other agents can use the same
portable files without hooks through a small native instruction bridge.

On the first substantive Codex task after init, semantic onboarding starts
while `lastOnboarding` is unset. It begins with the complete existing
`AGENTS.md`, inventories overlapping repository knowledge, coordinates focused
audits and bootstrap, and presents a reviewable routing plan. Approved changes
leave AGENTS as a concise operational map, populate the registered canonical
sources, record completion, and return to the user's original request.

Onboarding is lossless before it is concise. Init captures a deterministic,
non-secret-bearing index of headings, configuration identifiers, symbols,
flags, and paths from pre-onboarding AGENTS content. The semantic workflow must
account for every substantive source span, materialize detailed subsystem
knowledge and self-contained candidates before shortening AGENTS, and pass the
lexical coverage gate before completion can be recorded. Git history may
support provenance but is not an active knowledge destination.

## Constraints

- Existing project and external-framework files must be preserved.
- Pre-existing user-authored knowledge must not be shortened or removed without
  explicit migration authority and a reviewable plan.
- Unsupported or disputed source knowledge must remain directly reviewable in
  a self-contained candidate; a commit pointer or summary of omitted detail is
  insufficient.
- An LLM must not perform filesystem skeleton creation, hashing, comparison,
  schema validation, migration, adapter detection, state, or conflict
  resolution.
- Human product intent cannot be inferred from implementation alone.
- The MVP is local-first and sends no repository content over the network.
- Active work must remain bounded, replace-in-place, and free of transcripts,
  hidden reasoning, raw diffs, full logs, and secret values.
- Abrupt termination cannot guarantee a semantically current summary; it must
  leave detectable staleness and deterministic evidence for the next agent.
- Optional agent integrations must preserve existing hook/rule content and
  require explicit preview/apply.
- No publish, deploy, commit, push, production mutation, or credential use is
  part of the product lifecycle.
