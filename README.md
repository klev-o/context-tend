# ContextTend

> Living project knowledge governance for coding agents.

ContextTend tells Codex and other coding agents where durable project truth
lives, how authoritative it is, who may change it, and whether its local
infrastructure has drifted. It adopts existing documentation and workflows
before creating anything.

## MVP capabilities

- deterministic repository scanning and Knowledge Registry generation;
- safe dry-run/apply lifecycle with race-conflict protection;
- native, generic, GitHub Spec Kit, OpenSpec, Agent OS, and GSD adapters;
- schema, path, ownership, authority, link, asset, and adapter validation;
- source hash diff and explicit sync/audit state;
- five functional repo-scoped Codex Skills for onboarding, bootstrap, sync,
  memory audit, and harness audit;
- local-only operation with no telemetry, model call, database, or daemon.

## Requirements and local setup

- Node.js 20 or newer
- pnpm 11

```powershell
pnpm install
pnpm build
pnpm contexttend --help
```

The packages are not published by this repository. Use the local command during
MVP development.

## First run

Preview is the default and recommended path for an existing repository:

```powershell
pnpm contexttend init C:\path\to\repository --dry-run
```

Review every detected system, source mapping, owner, and proposed file. Then:

```powershell
pnpm contexttend init C:\path\to\repository --apply
pnpm contexttend validate C:\path\to\repository
pnpm contexttend status C:\path\to\repository
```

`--native` records a preference for ContextTend's native structure, but it
still never creates a second canonical source where an existing framework or
document already owns the role.

Now open that repository in Codex and ask for ordinary project work. The
managed `AGENTS.md` block tells Codex to use `$context-onboard` automatically
while `lastOnboarding` is missing or null. You can also start it explicitly:

```text
$context-onboard
```

The Skill starts with the complete existing `AGENTS.md`, inventories other
registered and conventional knowledge, and uses the focused harness, memory,
and bootstrap Skills where relevant. It shows an `ONBOARDING PLAN` before
mutation. Shortening or removing pre-existing user-authored content requires
confirmation unless the current request already explicitly authorized the
migration. A successful run records onboarding and resumes the original task.

## CLI

| Command | Purpose |
| --- | --- |
| `init` | Scan, detect, adopt, propose, optionally apply, then validate |
| `status` | Summarize version, sources, adapters, audits, and health |
| `doctor` | Explain deterministic findings and remediation |
| `validate` | CI-friendly validation; errors return exit code 1 |
| `diff` | Compare registered source hashes with the recorded baseline |
| `adapters` | Show project facts and adapter detection evidence |
| `update` | Preview/apply only safe managed-asset updates |
| `migrate` | Preview/apply machine-state schema migrations |
| `record` | Record a completed semantic workflow (normally called by Skills) |

All commands support `--json` where structured automation is useful.
`init`, `update`, and `migrate` never write unless `--apply` is supplied.

## Codex workflows

After initialization, current Codex discovers these under `.agents/skills/`:

- `$context-onboard` completes first-run semantic initialization. It audits and
  classifies existing `AGENTS.md` content, checks overlapping knowledge,
  coordinates the focused Skills, proposes a migration, fills missing
  canonical sources, validates, records completion, and resumes the original
  request.
- `$context-bootstrap` fills missing or placeholder native knowledge while
  preserving unknown product intent.
- `$context-sync` performs the documentation-impact matrix after meaningful
  code changes. “No durable knowledge update required” is a valid result.
- `$memory-audit` produces a read-only, evidence-backed report for stale,
  contradictory, duplicate, orphaned, unsupported, superseded, missing,
  misowned, and overloaded knowledge.
- `$harness-audit` performs fresh official OpenAI/Codex research and proposes
  reviewed harness changes without migrating the project.

The short managed block in `AGENTS.md` points agents to the registry. It is not
a knowledge dump. Codex Skills support both explicit and description-based
implicit invocation; the managed block gives onboarding a deterministic state
condition instead of relying only on prompt matching.

## After onboarding: everyday operation

Most work should continue as ordinary Codex work. ContextTend is a knowledge
maintenance layer, not a separate development methodology:

```text
init once -> context-onboard once -> ordinary development
          -> context-sync after material changes
          -> memory-audit periodically
          -> harness-audit when the Codex harness changes
```

### Confirm the onboarding result

When `$context-onboard` finishes, run these commands from the ContextTend
checkout while the package is still unpublished:

```powershell
pnpm contexttend status C:\path\to\repository
pnpm contexttend validate C:\path\to\repository
pnpm contexttend diff C:\path\to\repository
```

A healthy repository has a recorded onboarding time, passes validation, and
reports no changed registered sources immediately after the workflow.

### During normal development

The managed `AGENTS.md` block tells Codex to consult the Knowledge Registry and
perform a context sync after material changes. You normally just ask Codex to
implement the next task. Invoke `$context-sync` explicitly after a broad or
important change when you want to make the documentation check unmistakable.

A material change includes product behaviour, architecture, a business rule,
a public interface, security or reliability constraints, or a durable decision
or plan. Typo fixes, formatting, and internal refactors that do not change a
durable fact normally need no knowledge update. The valid sync result is either
an evidence-backed documentation update or `No durable knowledge update
required`.

Use the audit Skills at deliberate checkpoints rather than after every task:

| Workflow | When to run it |
| --- | --- |
| `$memory-audit` | Before a release, migration, or major refactor; after substantial documentation churn; or when sources appear stale or contradictory |
| `$harness-audit` | After Codex changes its Skills, plugin, configuration, or discovery mechanisms, or when local harness assumptions may be stale |
| `$harness-audit full` | For the first deep review of a legacy harness or after a major Codex/harness redesign |

### When to use the deterministic CLI

| Command | When to run it |
| --- | --- |
| `status` | Any time you want a quick health and last-workflow summary |
| `validate` | In CI and after manual edits to ContextTend configuration or registry files |
| `diff` | To see whether registered knowledge changed since the last successful semantic workflow |
| `doctor` | When validation fails and you need remediation guidance |
| `adapters` | After adding or changing Spec Kit, OpenSpec, Agent OS, GSD, or another detected knowledge system |
| `init` | Once per repository, and again in preview mode when adopting a newly added external knowledge system |
| `update` | After upgrading ContextTend, to refresh only ContextTend-managed assets; preview before `--apply` |
| `migrate` | Only when ContextTend reports that its machine-state schema needs migration |

`update` does not update project knowledge, and `record` should not be used
manually just to make `diff` clean. `record` accepts the current source hashes
as a successful semantic baseline, so onboarding, sync, and audit Skills call
it only after their checks and validation succeed. Manually recording an
unreviewed state can hide real documentation drift.

## Interoperability

Spec Kit's `specs/`, OpenSpec's current specs and changes, Agent OS product /
standards / specs, and GSD's `.planning/` artifacts remain owned by those
systems. ContextTend registers them as external sources and does not rewrite
them or build a competing requirements/planning system.

## Development gates

```powershell
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

The research basis is in
[`docs/research/landscape-2026-09.md`](docs/research/landscape-2026-09.md);
the engineering boundary is detailed in [`ARCHITECTURE.md`](ARCHITECTURE.md).

## Current limitations

- Convention-based adapters intentionally do not parse every version-specific
  framework manifest; harness audits flag assumptions for review.
- Deterministic validation detects structural problems, not semantic truth.
- Implicit Skill selection is model-driven. The managed `AGENTS.md` trigger
  makes first-run onboarding expected, while `$context-onboard` remains the
  explicit fallback.
- npm publishing, plugin packaging, hosted services, and automatic framework
  migrations are outside the MVP.
