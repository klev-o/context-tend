# Current work: Prepare the first npm release

<!-- contexttend:work:start -->
Work ID: work-20260906T020857984z-4577685d76
Status: completed
Started: 2026-09-06T02:08:57.984Z
Checkpointed: 2026-09-06T02:22:15.485Z
<!-- contexttend:work:end -->

This is a compact handoff snapshot, not a transcript or activity log.

## Objective

Make ContextTend publish-ready as one public npm CLI package, add MIT licensing and package metadata, verify tarball installation, and document the exact account and release workflow without publishing.

## Definition of done

- Exactly one public npm package, `contexttend`, is publishable from packages/cli; root and core stay private.
- The CLI production artifact bundles the internal core and has no runtime dependency on unpublished `@contexttend/core`; Commander, YAML, and Zod remain declared external runtime dependencies.
- MIT license, npm metadata, package README, repository links, Node engine, files allowlist, and prepack build are complete.
- `pnpm publish --dry-run` and tarball inspection show only intended distributable files.
- A clean temporary project can install the packed tarball and run `pnpm contexttend --help`, init dry-run/apply, and validate.
- Project tests, typecheck, lint, build, ContextTend validation, registry sync, and release documentation pass.
- No npm publish, dist-tag, GitHub release, tag, or push is performed.

## Constraints

- Preserve user changes and repository-specific instructions.
- Use the user-approved MIT license and GitHub repository https://github.com/klev-o/context-tend.
- Avoid requiring an npm organization or public core package for the first release.
- Keep package consumers independent of workspace-only dependency resolution.
- Never create, print, or commit npm credentials or tokens.

## Decisions

- Publish unscoped `contexttend` from an ordinary npm account; npm organization ownership is unnecessary for unscoped packages.
- Keep `@contexttend/core` private and move it to a CLI development dependency while tsup `noExternal` bundles it.
- Keep Commander, YAML, and Zod external as declared runtime dependencies; bundle only the private workspace core.
- Root workspace remains private to prevent accidental publication.

## Completed

- Active work checkpoint created.
- Confirmed clean Git state, `master`, and origin git@github.com:klev-o/context-tend.git.
- Confirmed npm registry currently returns 404 for unscoped `contexttend`.
- Confirmed current tarballs omit README/LICENSE and current CLI imports unpublished `@contexttend/core`.
- Verified from current npm documentation that an individual account may publish an unscoped public package.
- Verified tsup `noExternal` takes precedence over automatic dependency externalization.
- Initial all-in-one dependency bundle failed on YAML CommonJS dynamic require; corrected the boundary to externalize YAML/Zod while preserving a single public package.
- Added root and package MIT license text with copyright holder klev-o.
- Made only packages/cli publishable and added complete npm metadata, files allowlist, Node engine, package README, and prepack build.
- Added a tsup configuration that bundles private @contexttend/core while externalizing declared Commander/YAML/Zod runtime dependencies.
- Added release packaging regression tests and an owner-facing npm release guide.
- `pnpm publish --dry-run --no-git-checks` reached the registry target and skipped publication as expected.
- Packed the actual contexttend-0.2.0.tgz and verified its five intended files and transformed manifest.
- Installed the tarball in a clean temporary project; `pnpm contexttend --help`, init dry-run/apply, and validate all passed.
- Removed the isolated temporary pack/smoke directories after verification.
- Confirmed the authenticated npm account is the ordinary user `klev-o`; no organization is required for unscoped `contexttend`.
- Completed context-sync updates to goals, product, architecture, ADR 0006, implementation context, and roadmap.
- Recorded the synchronized Knowledge Registry baseline after clean validation.

## In progress

- Run final freshness/diff checks and close active work.

## Next steps

1. Record this final semantic checkpoint.
2. Confirm validation, registry diff, and work freshness are clean.
3. Complete active work without publishing and report the owner's remaining 2FA/account action.

## Changed files

- .contexttend/work/current.md
- LICENSE
- README.md
- ARCHITECTURE.md
- docs/GOALS.md
- docs/PLANS.md
- docs/PRODUCT.md
- docs/context/README.md
- docs/decisions/0006-single-public-npm-package.md
- docs/releasing-npm.md
- package.json
- packages/cli/LICENSE
- packages/cli/README.md
- packages/cli/package.json
- packages/cli/tsup.config.ts
- pnpm-lock.yaml
- tests/package-release.test.ts

## Verification

- Initial active work status: none.
- Initial Git status: clean.
- Registry name check: `contexttend` returned npm E404 on 2026-09-06; final eligibility remains registry-controlled at publish time.
- Corrected bundle size: 165.55 KB; no @contexttend/core runtime import.
- Targeted package/CLI tests: 5/5 passed.
- Publish dry-run: passed; no registry mutation.
- Tarball contents: LICENSE, README.md, package.json, dist/index.js, dist/index.d.ts only.
- Clean tarball consumer smoke test: short pnpm command and full init/validate lifecycle passed.
- Full `pnpm test`: 12 files / 61 tests passed.
- Full typecheck, lint, and build: passed.
- `git diff --check`: passed (Windows line-ending notices only).
- `npm whoami`: klev-o; `npm profile get` reports 2FA disabled, so the owner must enable it before the first publish.
- Post-sync validation: healthy with 0 errors and 0 warnings.
- `contexttend record sync`: completed at 2026-09-06T02:21:15.607Z.

## Blockers

- None known.

## Resume instructions

Read this file, run `contexttend work status`, inspect Git status/diff and
relevant tests, then continue from the first unfinished verified step.
