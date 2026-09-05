# ContextTend dogfooding — 2026-09-04

## Outcome

ContextTend initialized and governed its own repository successfully.

## Sequence

1. Built the core and CLI.
2. Ran `contexttend init --dry-run`; 17 additive changes were proposed and no
   file was written.
3. Ran `contexttend init --apply`; validation returned 0 errors and 0
   warnings.
4. Performed semantic bootstrap from the direct technical specification and
   verified implementation, then recorded a sync baseline.
5. Ran deterministic validation/diff/status/adapters.
6. Performed and recorded memory and full harness audits.
7. Re-ran all type, build, test, CLI, update, migration, and validation gates.

## Problems found and fixed

### Repeat init duplicated native sources

Cause: source equality included descriptions and did not normalize trailing
slashes. Native and generic discovery could therefore re-add the same
role/location under suffixed IDs.

Fix: adapter and registry merging now compares normalized role/location, and
existing canonical roles are not silently replaced or duplicated.

Evidence: process-level CLI test repeats `init --apply` and validates the
result.

### Existing plan and research directories were under-classified

Cause: the generic adapter recognized a roadmap file but not conventional
`docs/plans/` and `docs/research/` directories.

Fix: those directories are adopted as supporting execution-plan and reference
sources. No native duplicate is created.

### Symlink containment needed realpath checks

Cause: lexical path containment alone cannot detect an in-repository symlink
whose target is outside the repository.

Fix: registered Markdown reads and all managed writes now verify real paths.
Writing through a symlinked target is refused. The cross-platform test executes
where the host permits symlink creation.

## Audit artifacts

- `.contexttend/audits/2026-09-04-memory.md`
- `.contexttend/audits/2026-09-04-harness.md`

The repository had no prior commits, so the memory audit records medium overall
confidence for historical staleness while avoiding an unsupported finding.

## Semantic onboarding follow-up — 2026-09-05

The managed update preview proposed one new Skill, one marker-bounded AGENTS
block update, and machine-state hashes. Apply installed `$context-onboard`
without changing project-authored content and validation returned zero errors
and zero warnings.

The onboarding inventory started with AGENTS. Its only content was the
ContextTend managed block, so it was classified `KEEP` and no migration needed
approval. Registered canonical roles were unique; supporting README content
and implementation/test evidence were correctly lower-authority overlaps.
Harness audit was skipped because there was no non-ContextTend harness or
user-authored AGENTS content. Memory audit was skipped because no semantic
conflict or doubtful overlap was found. Bootstrap was skipped because every
native source existed and was already populated.

After the implementation and documentation checks, sync and onboarding were
recorded. Subsequent ordinary Codex work can therefore proceed without
re-running first-use onboarding.

The pass also exposed ambiguous bootstrap wording: init creates native files
with `Unknown` placeholders, so “fill missing native sources” could be read as
doing nothing because the files already exist. The contract now explicitly
fills missing or placeholder knowledge while preserving complete verified
content.
