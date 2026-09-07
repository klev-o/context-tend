# Current work: First-class requirements and portable agent governance

<!-- contexttend:work:start -->
Work ID: work-20260907T223240748z-a8f88cf09b
Status: completed
Started: 2026-09-07T22:32:40.748Z
Checkpointed: 2026-09-07T23:09:33.762Z
<!-- contexttend:work:end -->

This is a compact handoff snapshot, not a transcript or activity log.

## Objective

Review architecture and current official guidance; implement native and modular SPEC lifecycle, deterministic safeguards, backward compatibility, regression tests and bilingual documentation.

## Definition of done

- Native and modular SPEC, conservative adoption, no competing external source; schemas unchanged.
- Legacy update preserves knowledge; meaningful regressions, typecheck/build/validate and bilingual docs pass.

## Constraints

- Preserve human intent, external ownership, deterministic core/semantic Skills boundary. Ordinary Markdown must work with older/other agents. No commit or push.

## Decisions

- Reuse requirements role and multi-path registry; keep update infrastructure-only.
- Fix ignored createMissingNativeSources; separate intent authority from implementation facts in resume.

## Completed

- Implemented native/modular SPEC and conservative external adoption; no schema change.
- Added navigation/instruction diagnostics, preflight, source-date and adapter-marker fixes.
- Preserved mixed user hook handlers; updated six managed Skills and guides.
- Added SPEC from direct human request; updated README/README.ru/architecture/ADR.
- Applied managed update and explicit SPEC adoption to this repository.
- Completed official-source review, documentation-impact sync and final checks.

## In progress

- None; implementation and verification are complete.

## Next steps

- No implementation work remains. Review the diff; commit/push only on a separate user request.

## Changed files

- See git diff: core adapters/init/update/validation/assets/integrations, regression tests, versions, SPEC, READMEs, architecture/ADR, managed files and registry.

## Verification

- Final pnpm typecheck/build passed; 97 tests passed across 14 files.
- Repository validate: 0 errors/0 warnings; AGENTS coverage passed.
- All six installed Skills passed quick_validate.py using temporary PyYAML.
- git diff --check passed; README UTF-8 content checked.

## Blockers

- Default Windows sandbox cannot start; approved elevated execution works. No task blocker.

## Resume instructions

This task is complete. Use the audit report and git diff for review; do not repeat implementation or publish without a new request.
