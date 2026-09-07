# Current work: GitHub Actions npm release

<!-- contexttend:work:start -->
Work ID: work-20260907T231822386z-d680123453
Status: completed
Started: 2026-09-07T23:18:22.386Z
Checkpointed: 2026-09-07T23:22:06.405Z
<!-- contexttend:work:end -->

This is a compact handoff snapshot, not a transcript or activity log.

## Objective

Add a verified tag-triggered npm publication workflow and setup documentation

## Definition of done

- Tag-only workflow verifies matching stable versions, runs checks, packs CLI and publishes via npm OIDC; bilingual setup instructions and local verification complete.

## Constraints

- Preserve user changes and repository-specific instructions.

## Decisions

- Use npm trusted publishing on GitHub-hosted runners; publish only the CLI tarball packed by pnpm.

## Completed

- Added tag-triggered OIDC workflow, stable version guard, frozen install, checks and tarball publication.
- Added release setup guide and English/Russian README instructions; corrected obsolete npm limitation.

## In progress

- Implementation and local verification complete.

## Next steps

1. Maintainer configures npm trusted publisher, commits workflow and pushes release tag.

## Changed files

- .github/workflows/publish.yml; docs/RELEASING.md; README.md; README.ru.md; docs/context/README.md.

## Verification

- YAML parsed; correct tag accepted and incorrect/prerelease tags rejected.
- Typecheck, build and 97 tests passed. pnpm pack and npm publish --dry-run passed.
- Actual GitHub OIDC publication remains untested until the first tag run.

## Blockers

- None known.

## Resume instructions

Read this file, run `contexttend work status`, inspect Git status/diff and
relevant tests, then continue from the first unfinished verified step.
