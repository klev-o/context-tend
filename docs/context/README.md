# Implementation context

Agent-maintained, evidence-backed summaries may live here. Keep them small,
typed, and reproducible from code or tests. Do not store session transcripts
or restate human product intent.

## Current implementation

- `packages/core`: strict TypeScript domain, Zod schemas, scanner, adapters,
  plan/apply lifecycle, validation, hashing, diff, update, migrations, record,
  active-work/recovery, and agent-integration APIs.
- `packages/cli`: Commander presentation over core with a dependency-free
  ASCII wordmark for human output and undecorated JSON/quiet/version channels.
  It is the only public npm package; its build bundles the private core and
  leaves Commander/YAML/Zod as declared runtime dependencies.
- `docs/assets/contexttend-logo.png`: repository-owned README brand asset.
- `tests/fixtures`: existing-repository shapes for native/generic, Spec Kit,
  OpenSpec, Agent OS, GSD, conflicts, and local customization.
- `.agents/skills`: six installed semantic workflows; their source templates
  live in `packages/core/src/assets.ts`. `context-onboard` coordinates the
  focused Skills only during first-run semantic initialization.
- `.contexttend/work/current.md`: optional bounded semantic handoff for the one
  active substantive task. `recovery.json` is deterministic, machine-local,
  and excluded by the managed work-directory `.gitignore`.
- `.contexttend/hooks/codex.mjs`: dependency-free optional hook runtime.
  ContextTend merges hook configuration only through an explicit preview/apply
  command; Claude uses a separate marker-bounded no-hooks bridge.

The test command builds both packages before running Vitest so process-level
CLI tests exercise the same dist artifacts used by local execution.
`tests/package-release.test.ts` additionally guards the npm manifest, MIT
license, public/private boundary, package README, shebang, and bundle imports.
