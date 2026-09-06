# Publishing ContextTend to npm

ContextTend publishes one unscoped public package: `contexttend`. The internal
`@contexttend/core` workspace package is bundled into the CLI and remains
private, so an npm organization or the `@contexttend` scope is not required.

An ordinary verified npm user account can publish an unscoped public package.
The account that first publishes `contexttend` becomes its owner. A scope or
organization is only required for names such as `@contexttend/core`.

## One-time account setup

1. Create and verify an account at https://www.npmjs.com/.
2. Enable two-factor authentication for authorization and writes.
3. Authenticate locally and verify the public registry:

```sh
npm login
npm whoami
npm config get registry
```

The registry should be `https://registry.npmjs.org/`. Never place an npm token,
password, recovery code, or OTP in this repository or a committed `.npmrc`.

## Preflight

From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
pnpm contexttend validate .
pnpm release:dry-run
```

`release:dry-run` intentionally keeps pnpm Git checks enabled. Commit the
release preparation first and run it from a clean tree. During development
only, the equivalent command may use `--no-git-checks`; never use that bypass
for the real publication.

The production bundle must retain its Node shebang, import the declared
`commander`, `yaml`, and `zod` runtime dependencies, and not import the private
`@contexttend/core` workspace package. The package tarball should contain only
package metadata, README, LICENSE, and `dist/`.

For a tarball-level smoke test:

```sh
pnpm --dir packages/cli pack --pack-destination <temporary-directory>
mkdir <temporary-project>
cd <temporary-project>
pnpm init
pnpm add <temporary-directory>/contexttend-0.2.0.tgz
pnpm contexttend --help
pnpm contexttend init ./demo --dry-run
```

Use a real disposable path for placeholders; do not create release artifacts
inside the repository.

## First publish

Publishing changes the external npm registry and must be run by the owner:

```sh
pnpm --filter contexttend publish --access public --tag next
```

If npm requests a one-time password, enter a fresh OTP locally. Do not store it
in shell history or repository files.

Verify the registry artifact rather than the workspace checkout:

```sh
npm view contexttend@0.2.0 name version bin dependencies dist-tags
pnpm dlx contexttend@next --help
pnpm dlx contexttend@next init ./demo --dry-run
```

After verification, promote the same immutable artifact:

```sh
npm dist-tag add contexttend@0.2.0 latest
```

Users may then run `pnpm dlx contexttend`, install it locally and use
`pnpm contexttend`, or install it globally and use `contexttend` directly.

## Later releases

An npm version cannot be overwritten. Update the root, core, and CLI versions
together, run the full preflight again, commit the release state, and publish
the new CLI version. Use a prerelease tag before `latest` for risky changes.
Trusted Publishing with GitHub Actions and provenance is preferable to a
long-lived automation token once the first manual release is established.
