# Current work: CRLF-safe managed updates

<!-- contexttend:work:start -->
Work ID: work-20260907T235454689z-c889d34292
Status: completed
Started: 2026-09-07T23:54:54.689Z
Checkpointed: 2026-09-07T23:57:59.592Z
<!-- contexttend:work:end -->

This is a compact handoff snapshot, not a transcript or activity log.

## Objective

Accept newline-only managed asset differences while preserving edits and exact write conflict checks

## Definition of done

- LF/CRLF legacy baselines update safely; validation accepts newline-only differences; real edits and concurrent changes remain protected; regression tests and docs pass.

## Constraints

- Preserve user changes and repository-specific instructions.

## Decisions

- Normalize only managed-content comparisons. Keep filesystem/concurrency hashes exact; do not guess missing or corrupted legacy baselines.

## Completed

- Implemented managed LF/CRLF comparison against current and legacy hashes.
- Added five lifecycle regressions; documented behavior and prepared version 0.3.1.

## In progress

- Implementation complete; final documentation validation.

## Next steps

1. Commit and publish 0.3.1 only when requested.

## Changed files

- hashing.ts, update.ts, validation.ts, lifecycle.test.ts, version manifests, READMEs and release/context documentation.

## Verification

- Typecheck and build passed; 102 tests passed.
- Actual content changes preserve the prior baseline; newline changes after preview still block apply.

## Blockers

- None known.

## Resume instructions

Read this file, run `contexttend work status`, inspect Git status/diff and
relevant tests, then continue from the first unfinished verified step.
