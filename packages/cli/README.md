<p align="center">
  <img src="https://raw.githubusercontent.com/klev-o/context-tend/master/docs/assets/contexttend-logo.png" alt="ContextTend" width="760">
</p>

# ContextTend

Living project knowledge governance for coding agents.

ContextTend discovers the documentation and agent conventions already present
in a repository, builds a typed Knowledge Registry, installs repo-scoped agent
Skills, and validates the resulting ownership and authority model without
using an LLM for deterministic filesystem work.

## Requirements

- Node.js 20 or newer
- Git is recommended; optional Codex hooks require a Git repository

## Run without installing

```sh
pnpm dlx contexttend init /path/to/repository --dry-run
pnpm dlx contexttend init /path/to/repository --apply
pnpm dlx contexttend validate /path/to/repository
```

## Install in a project

```sh
pnpm add --save-dev contexttend
pnpm contexttend --help
pnpm contexttend init . --dry-run
```

## Install globally

```sh
pnpm add --global contexttend
contexttend --help
```

Preview is the default. Mutating initialization, update, migration, and
integration operations require an explicit `--apply`.

Full documentation, architecture, Skills, adapters, and release notes are in
the [ContextTend repository](https://github.com/klev-o/context-tend).

## Project requirements

New native projects get human-owned `SPEC.md` when no requirements owner exists.
Existing specs/frameworks are adopted. A growing SPEC may become a stable index
into `docs/spec/` under the same registry source; semantic bootstrap preserves
all confirmed requirements. Ordinary `update` does not create SPEC in older
installations or rewrite project knowledge. See the repository documentation
and the installed `.contexttend/guides/requirements.md`.

## License

MIT
