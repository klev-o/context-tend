# Decision 0006: Publish one unscoped npm CLI package

Status: accepted

## Context

The workspace separates deterministic core code from Commander presentation,
but the first public use case is the `contexttend` executable. Publishing the
existing runtime dependency graph directly would also require ownership of
the `@contexttend` npm scope and coordinated publication of two packages.

The owner confirmed the GitHub repository, selected the MIT license, and wants
ordinary pnpm installation without unnecessary npm organization setup.

## Decision

Publish only the unscoped public package `contexttend` from `packages/cli`.
Keep the workspace root and `@contexttend/core` package private. Bundle the
private core into the CLI with tsup `noExternal`; keep Commander, YAML, and Zod
external and declare them as CLI runtime dependencies.

An ordinary verified npm account may own the unscoped package. No npm
organization or `@contexttend` scope is required for this release boundary.

Ship package-local README and MIT license files, use a strict files allowlist,
and validate the actual tarball in an isolated consumer project before
publication. Real publishing and dist-tag changes remain explicit owner-only
external operations.

## Consequences

- Users install one package and may run `pnpm contexttend` locally or
  `pnpm dlx contexttend` ephemerally.
- The internal package boundary remains useful in the monorepo without
  becoming a public compatibility promise.
- The CLI tarball carries three normal runtime dependencies instead of
  bundling YAML's CommonJS implementation into ESM.
- Publishing a reusable core API later requires a separate decision, package
  naming/ownership choice, and compatibility policy.
