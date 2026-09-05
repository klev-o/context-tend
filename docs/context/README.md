# Implementation context

Agent-maintained, evidence-backed summaries may live here. Keep them small,
typed, and reproducible from code or tests. Do not store session transcripts
or restate human product intent.

## Current implementation

- `packages/core`: strict TypeScript domain, Zod schemas, scanner, adapters,
  plan/apply lifecycle, validation, hashing, diff, update, migrations, and
  record APIs.
- `packages/cli`: Commander presentation over core with human and JSON output.
- `tests/fixtures`: existing-repository shapes for native/generic, Spec Kit,
  OpenSpec, Agent OS, GSD, conflicts, and local customization.
- `.agents/skills`: five installed semantic workflows; their source templates
  live in `packages/core/src/assets.ts`. `context-onboard` coordinates the
  focused Skills only during first-run semantic initialization.

The test command builds both packages before running Vitest so process-level
CLI tests exercise the same dist artifacts used by local execution.
