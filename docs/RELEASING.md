# Publishing ContextTend

The maintainer requested GitHub Actions publication on 2026-09-08.
[The workflow](../.github/workflows/publish.yml) publishes `contexttend` from
`packages/cli` when a stable `vX.Y.Z` tag is pushed. Core remains private and
is bundled into the CLI. An ordinary branch push does not publish anything.

## One-time npm setup

In the npm package settings for `contexttend`, add a GitHub Actions trusted
publisher: owner `klev-o`, repository `context-tend`, workflow filename
`publish.yml` (no directory). Leave environment empty because the workflow
has no environment. Allow direct `npm publish`. No `NPM_TOKEN` secret is needed.
You must have permission to manage the package. If the package does not yet
exist, establish the package under your npm account before configuring its
trusted publisher.

The workflow uses a GitHub-hosted runner, Node 24, npm 11 (OIDC requires at
least npm 11.5.1), and the pnpm version in root `package.json`. It disables
caching and persisted checkout credentials, installs the frozen lockfile,
runs typechecking and tests (which build both packages), then packs using
pnpm to resolve workspace metadata and publishes the same tarball with npm.

## Each release

1. Update versions together in root `package.json`, `packages/cli/package.json`,
   `packages/core/package.json`, and `CONTEXTTEND_VERSION` in
   `packages/core/src/domain.ts`. Version `0.3.1` is already prepared.
2. Commit the release changes, including the workflow for the first release.
3. Configure npm trust before pushing the tag, then run from the repository:

   ```sh
   git push origin master
   git tag -a v0.3.1 -m "ContextTend 0.3.1"
   git push origin v0.3.1
   ```

4. Check the Publish to npm run in GitHub Actions, then verify:

   ```sh
   npm view contexttend version
   npm install -g contexttend@latest
   ```

The tag must match all four version values. Prereleases are rejected so they
cannot replace `latest`. Versions are not incremented automatically. Use a
new version for changed package contents; an already published version cannot
be overwritten. A GitHub Release page is optional and is not created by this
workflow. Installed CLIs and ContextTend assets in consumer repositories are
not updated automatically; install the new CLI and use its normal update flow.

Local validation cannot prove npm authorization; the first tag run verifies
OIDC and account configuration. After a failure, check whether npm publication
already succeeded before retrying.

References: [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/),
[pnpm pack](https://pnpm.io/cli/pack),
[setup-node](https://github.com/actions/setup-node).
