# ContextTend MVP execution plan

Status markers: `[ ]` pending, `[~]` active, `[x]` complete.

## Architecture and constraints

- [x] Use a small pnpm TypeScript workspace with `packages/core` and
  `packages/cli`; keep interactive presentation out of core.
- [x] Store all project state under `.contexttend/`; store repo Skills under
  the current official `.agents/skills/` discovery path.
- [x] Represent proposed filesystem writes as an in-memory change plan so
  `--dry-run`, apply, and tests share exactly the same behavior.
- [x] Normalize registry paths to relative forward-slash form; resolve and
  contain every path inside the selected project root.
- [x] Never invoke an LLM from the CLI.

## Domain model

- [x] Define extensible string-based `KnowledgeRole` plus validated built-in
  roles, authority, ownership, source, registry, state, configuration,
  external-source registry, adapter result, managed asset, and finding.
- [x] Enforce owner/authority invariants and unique source identifiers.
- [x] Model paths as one-or-many values while producing stable YAML.
- [x] Model findings with code, severity, evidence, location, and remediation.

## Deterministic CLI and core

- [x] Implement bounded project scanning: Git, language, package manager,
  monorepo markers, common docs, AGENTS, specs, ADRs, runbooks, and framework
  markers.
- [x] Implement registry proposal and adoption, native missing-source proposal,
  dry-run/apply, status, doctor, validate, diff, adapters, and update.
- [x] Implement SHA-256 hashing, stable snapshots, Markdown-link validation,
  generated/system asset checks, and CI exit codes.
- [x] Keep all commands non-interactive by default; `init` shows the plan and
  requires `--apply` to write, making the safe path explicit and scriptable.

## Knowledge Registry

- [x] Add Zod-backed YAML parsing with actionable issue paths.
- [x] Register canonical, evidence, supporting, historical, generated, and
  external knowledge with explicit ownership.
- [x] Detect missing paths, path escapes, duplicate canonical roles, invalid
  links, invalid policies, and adapter inconsistencies.
- [x] Snapshot registered source hashes for deterministic `diff`.

## Adapter system

- [x] Implement the common adapter interface and ordered merge policy.
- [x] Implement `native` and `generic` discovery.
- [x] Implement Spec Kit end-to-end: detect `.specify/`/`specs/`, register
  requirements and planning artifacts as external, preserve every Spec Kit
  file, and suppress native duplicate requirements.
- [x] Implement production-ready deterministic discovery for OpenSpec,
  Agent OS v1/v2, and current GSD Core `.planning/` artifacts.
- [x] Emit adapter evidence and confidence; validate marker/source consistency.

## Agent Skills

- [x] Implement `$context-bootstrap`: route through registry, fill only missing
  native documents, preserve unknowns, validate.
- [x] Implement `$context-sync`: inspect repository change evidence, run the
  documentation impact matrix, update only permitted sources or candidates.
- [x] Implement `$memory-audit`: evidence-backed semantic findings for all
  required classes, read-only report by default.
- [x] Implement `$harness-audit`: official-source research, source authority,
  incremental/full modes, report/proposal only.
- [x] Give each Skill focused `SKILL.md` metadata and a shared governance
  reference rather than duplicating long instructions.

## Testing strategy

- [x] Unit tests: schemas, ownership, authority, hashing, path containment,
  managed blocks, state, migrations, link validation, adapter detection.
- [x] Integration fixtures: empty, plain Node, existing AGENTS, existing docs,
  Spec Kit, OpenSpec, Agent OS, GSD, mixed conventions, canonical conflict,
  modified system asset, Unicode/space/CRLF paths.
- [x] CLI process tests: safe init preview, apply, repeat idempotency, validation
  exit codes, diff after mutation.
- [x] After each phase run targeted tests plus typecheck and lint; finish with
  all gates and package smoke tests.

## Migration and state lifecycle

- [x] Schema version `1` owns only `.contexttend` structures, managed AGENTS
  block, and installed ContextTend Skill assets.
- [x] `update --dry-run` is default; `--apply` runs ordered idempotent migrations.
- [x] Never migrate semantic project documents or external framework files.
- [x] Refuse to overwrite locally modified fully managed assets; report the
  expected and actual hashes.

## Risks and disputed decisions

- [x] Use `.agents/skills`, not `.codex/skills`, based on current official
  OpenAI discovery documentation.
- [x] Do not ship a plugin manifest in MVP; direct repo Skills are the local
  authoring/discovery mechanism, while plugins are distribution packaging.
- [x] Prefer explicit `--apply` over an interactive prompt. It is safer for
  existing repositories, deterministic in CI, and still gives an explanatory
  first-run plan.
- [x] Confirm YAML ordering and cross-platform path serialization in tests.
- [x] Confirm adapter precedence cannot silently create two canonical sources.
- [x] Confirm semantic Skills never imply that CLI validation proves semantic
  freshness.

## Dogfooding and completion

- [x] Once `init`, registry, and validation pass, run ContextTend against this
  repository.
- [x] Execute all four Skills' deterministic preconditions and manually inspect
  their repo-local instructions for native discoverability.
- [x] Record issues and fixes in the plan and architecture documentation.
- [x] Verify every MVP Definition of Done item and document honest limitations.

## Completion evidence

- Research and plan preceded the implementation; current official Codex
  discovery changed the installed Skill path to `.agents/skills`.
- The first self-init preview proposed 17 additive changes and wrote nothing.
  Apply completed with 0 validation errors and 0 warnings.
- Process-level testing found and fixed non-idempotent source merging caused by
  descriptions and trailing-slash differences.
- Dogfooding found and fixed missing generic adoption for existing
  `docs/plans/` and `docs/research/`.
- Realpath hardening prevents registered reads or writes through symlinks from
  escaping the repository.
- Semantic bootstrap populated only native human/shared/agent sources from the
  direct product specification and implementation evidence.
- Memory and full harness audit reports were written and recorded; both report
  no supported finding requiring migration.
- Final gates: strict typecheck, lint, production build, 8 Vitest suites / 40
  tests, CLI smoke checks, update preview, migration preview, validation, and
  clean registered-source diff.

## Phase 11 — semantic onboarding

- [x] Preserve deterministic `init` behavior and add a backward-compatible
  `lastOnboarding` lifecycle plus `record onboarding`.
- [x] Add `$context-onboard` as the first-work semantic initializer.
- [x] Start with complete AGENTS analysis, inventory overlapping sources, and
  coordinate harness, memory, bootstrap, and later sync contracts.
- [x] Require a reviewable classification/routing plan and migration authority
  before shortening user-authored content.
- [x] Install the updated managed assets into this repository, run the
  onboarding path against it, and pass all development gates.

## Phase 13 — interruption-safe active work

- [x] Add schema v2 with one active-work pointer, checkpoint hashes, last
  completed summary, and explicit v0/v1 migrations.
- [x] Implement deterministic start/status/checkpoint/recover/complete APIs and
  CLI with bounded document validation and live Git/filesystem fingerprints.
- [x] Add `$context-work` with automatic continue/resume routing, evidence
  precedence, meaningful checkpoint boundaries, and transcript-free limits.
- [x] Add an optional self-contained Codex hook runtime and conflict-safe
  `.codex/hooks.json` merge; cap SessionStart context and prevent Stop loops.
- [x] Add a marker-bounded no-hooks Claude bridge without changing the portable
  core protocol.
- [x] Add unit, integration, runtime, process-level CLI, migration, and managed
  asset tests.
- [x] Document usage, architecture, product behavior, decision, limitations,
  migration, and dogfooding; run sync and every final gate.

Phase 13 completion evidence: state migration and managed self-update passed;
dogfooding detected and fixed oversized default JSON recovery output; the
official Skill validator passed; typecheck, lint, build, and 11 Vitest files /
58 tests passed. Self-update also found and fixed stale generated installation
metadata, now covered by CT119 and a lifecycle regression test.
