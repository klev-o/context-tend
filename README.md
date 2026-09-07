<p align="center">
  <img src="docs/assets/contexttend-logo.png" alt="ContextTend — living project knowledge governance for coding agents" width="900">
</p>

# ContextTend

> Living project knowledge governance for coding agents.

[Русская версия](README.ru.md)

ContextTend tells Codex and other coding agents where durable project truth
lives, how authoritative it is, who may change it, and whether its local
infrastructure has drifted. It adopts existing documentation and workflows
before creating anything.

## MVP capabilities

- deterministic repository scanning and Knowledge Registry generation;
- safe dry-run/apply lifecycle with race-conflict protection;
- native, generic, GitHub Spec Kit, OpenSpec, Agent OS, and GSD adapters;
- first-class human-owned SPEC/requirements, including modular topic navigation;
- schema, path, ownership, authority, link, asset, and adapter validation;
- source hash diff and explicit sync/audit state;
- six functional repo-scoped Codex Skills for onboarding, bootstrap, active
  work continuity, sync, memory audit, and harness audit;
- interruption-safe active-work checkpoints with deterministic Git/filesystem
  recovery and optional low-context Codex hooks;
- local-only operation with no telemetry, model call, database, or daemon.

## Installation

- Node.js 20 or newer
- pnpm 11

Run directly from npm without adding a dependency to the target repository:

```powershell
pnpm dlx contexttend --help
pnpm dlx contexttend init C:\path\to\repository --dry-run
```

Or install it in a project to use the short `pnpm contexttend` form:

```powershell
pnpm add --save-dev contexttend
pnpm contexttend --help
```

For development from this repository:

```powershell
pnpm install
pnpm build
pnpm contexttend --help
```

Before the first npm release, only the development form is available. The
complete owner-only release procedure is documented in
[`docs/releasing-npm.md`](docs/releasing-npm.md).

Human-facing commands start with the ContextTend ASCII wordmark. Automation
interfaces stay undecorated: `--json`, `--quiet`, and `--version` never include
the banner.

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
migration. For large files, destinations are written and checked before
`AGENTS.md` is shortened. `init --apply` captures a safe lexical baseline, and
onboarding cannot be recorded while configuration names, paths, flags, or code
symbols from that baseline are absent from active documentation or a
self-contained candidate. A Git-history pointer alone is not preservation.
A successful run records onboarding and resumes the original task.

## Requirements: from one SPEC to a topic tree

A new native project gets human-owned `SPEC.md` when no requirements source
already exists. Write concrete requirements, constraints, and acceptance
expectations there; leave unknowns explicit.

| Document | Purpose |
| --- | --- |
| GOALS | Why the project exists and desired outcomes |
| PRODUCT | Users, product behavior, and intent |
| SPEC | Concrete requirements, constraints, acceptance expectations |
| ARCHITECTURE | How the system is structured |
| PLANS | What is being implemented and in what order |

A small native project can use:

```text
AGENTS.md                 # compact instruction/routing map
SPEC.md                   # human-owned requirements inline
ARCHITECTURE.md            # existing architecture, if present
docs/
  GOALS.md
  PRODUCT.md
  PLANS.md
  decisions/
  context/
.contexttend/             # registry, lifecycle state, managed guides
.agents/skills/           # installed semantic workflows
```

When topics need independent reading, keep the root stable:

```text
SPEC.md                   # purpose, global constraints, authoritative-detail notice, index
docs/spec/
  identity.md             # example topic; choose names for your project
  interfaces.md
  delivery.md
```

The registry keeps one logical canonical source:

```yaml
requirements:
  path:
    - SPEC.md
    - docs/spec/
  role: requirements
  authority: canonical
  owner: human
  adapter: native
```

The agent reads SPEC's global constraints and follows only relevant links.
The root does not duplicate child requirements. Every active topic must be
reachable from the root, directly or through a linked topic index.

A split is a semantic `context-bootstrap` workflow, also routed from
`context-sync`. It preserves requirement text, IDs, qualifications and
provenance, verifies all destinations before shortening the original, rechecks
source/registry hashes, and keeps the source ID and ownership unchanged.
Changed relative links must resolve to the same targets. A size finding never
authorizes automatic splitting or reinterpretation from code. See the
[requirements lifecycle and lossless migration protocol](.contexttend/guides/requirements.md).

### Adoption and upgrades

- Existing `SPEC.md` is adopted; with `docs/spec/` both paths belong to one
  source. Other recognized documents are `SPECIFICATION.md`, `REQUIREMENTS.md`,
  and `docs/REQUIREMENTS.md`. Recognized directories are `requirements/`,
  `docs/requirements/`, `specs/`, and `docs/spec/`.
- During fresh discovery, independent requirement conventions produce a
  reviewable canonical-role conflict. On re-init, explicit existing registry
  mappings retain precedence; review new sources before changing that mapping.
- Spec Kit, OpenSpec, Agent OS and GSD retain external ownership. Conventional
  documents for their canonical roles remain supporting. An early external
  installation without requirements yet suppresses native SPEC creation.
- `createMissingNativeSources: false` in `.contexttend/config.yaml` disables
  missing native document creation while preserving adoption.
- `update --apply` refreshes managed assets only. Older installations without
  SPEC remain valid; neither their registry nor human documents are rewritten.
  To add/adopt requirements explicitly, review `contexttend init . --dry-run`
  before `contexttend init . --apply`, then use bootstrap for semantic content.
  State schema v2 and registry v1 remain unchanged.

### Who edits what

Maintainers normally edit human-owned goals, product intent and requirements,
or supply confirmed changes to the agent. Agents maintain shared architecture,
plans and decisions from confirmed changes, and agent-owned implementation
summaries from evidence. Implementation alone never changes human requirements.

ContextTend maintains generated metadata, installed Skills/guides and its
managed AGENTS block through preview/apply. Let the CLI maintain `state.json`,
managed hashes, and recovery data; do not edit them by hand. Registry/config
changes are deliberate configuration work, not automatic promotion from code.
External artifacts are maintained through their owning framework.

Validation checks canonical conflicts, containment/existence, SPEC/tree
mapping, supported local file links and orphan topic reachability. A requirements
document or selected repository instruction chain over 16 KiB produces only an
advisory reading-budget warning. This is not a Codex limit; effective global
instructions, fallback filenames and host settings require a harness audit.
Inline/reference links are supported outside code examples; heading anchors
and arbitrary Markdown extensions still need review.

`context-sync` distinguishes changed/new confirmed requirements, implementation
changes and drift. `memory-audit` reviews stale or duplicated requirements,
unimplemented obligations, unsupported promotion from code, and navigation gaps.
No deterministic check claims that human meaning is correct.

The same files work with older Codex generations and other repository-capable
agents: if Skill invocation is unavailable, read its `SKILL.md` directly.
No specific model, hook, subagent, hidden state or large context window is
required. [Governance](.contexttend/guides/agent-governance.md) separates user
intent, scoped instructions, canonical requirements and implementation facts;
`harness-audit` reports exact rules behind conflicts or unexpected pauses.

## Interruption-safe active work

For an ordinary small task, keep working normally. For a substantive
multi-phase task, the managed `AGENTS.md` instruction lets Codex select
`$context-work` automatically. You can also invoke it directly:

```text
$context-work start
$context-work checkpoint
$context-work resume
$context-work complete
```

The Skill starts one active item, fills
`.contexttend/work/current.md` with a compact semantic snapshot, and calls the
deterministic CLI to record hashes. Checkpoints are updated after material
phases, decisions, verification, or blockers—not after every command.
`current.md` is capped at 8 KiB and is replaced in place rather than used as a
growing log.

After an interruption, open the same repository in a fresh coding-agent
session and write:

```text
Continue.
```

If that agent follows `AGENTS.md`, it sees non-null `activeWork`, loads
`$context-work resume`, reads the checkpoint, runs `work status`, inspects Git
status/diffs and relevant tests, and continues from the first unfinished
verified step. A more specific message such as “the run stopped after the
migration; inspect Git and continue” is useful current intent and improves
recovery, but repository and test evidence are still checked.

The deterministic CLI can also be driven manually from the ContextTend
checkout:

```powershell
pnpm contexttend -- work start C:\path\to\repository --title "Add billing" --objective "Implement and verify invoice creation"
pnpm contexttend -- work status C:\path\to\repository
# Edit .contexttend/work/current.md as work progresses
pnpm contexttend -- work checkpoint C:\path\to\repository
pnpm contexttend -- work checkpoint C:\path\to\repository --state blocked
pnpm contexttend -- work complete C:\path\to\repository
```

`work complete` refuses a stale checkpoint. The semantic snapshot must first
match the actual repository fingerprint and required document structure.
Normal status output shows at most 25 changed paths and omits hashes from JSON
to keep agent context small; add `--verbose` only for a deliberate machine-level
diagnostic.

### Optional Codex hooks

The portable workflow works without hooks. To improve recovery when Codex is
interrupted abruptly, preview and explicitly install the repository hooks:

```powershell
pnpm contexttend -- work install-codex-hooks C:\path\to\repository --dry-run
pnpm contexttend -- work install-codex-hooks C:\path\to\repository --apply
```

Then use `/hooks` in Codex to review and trust the installed definitions.
ContextTend merges its handlers into an existing `.codex/hooks.json` rather
than replacing other hooks. `SessionStart` contributes only a short active-work
pointer (limited to 200 tokens); `PostToolUse`, `Interrupt`, and `SessionEnd`
refresh `recovery.json` without model-visible output. `Stop` asks for at most
one extra checkpoint pass and honors `stop_hook_active` to prevent loops.
Project hooks require a Git repository so their command can resolve the root
reliably. See the [official Codex hooks documentation](https://learn.chatgpt.com/docs/hooks)
for lifecycle, trust, and configuration behavior.

No hook reads `transcript_path`. The recovery file contains Git HEAD, changed
paths, hashes, and a fingerprint—not prompts, file contents, reasoning, or
session transcripts.

### Claude and other coding agents

Claude can use the same checkpoint without hooks:

```powershell
pnpm contexttend -- work install-claude-bridge C:\path\to\repository --dry-run
pnpm contexttend -- work install-claude-bridge C:\path\to\repository --apply
```

This preserves existing `CLAUDE.md` content and adds one marker-bounded bridge
to `AGENTS.md` and `.agents/skills/context-work/SKILL.md`. For another agent
that does not read `AGENTS.md`, add the equivalent short instruction in its
native rules file. A plain web chat with no repository, filesystem, Git, or
command access cannot perform automatic recovery.

## CLI

| Command | Purpose |
| --- | --- |
| `init` | Scan, detect, adopt, propose, optionally apply, then validate |
| `status` | Summarize version, sources, adapters, audits, and health |
| `doctor` | Explain deterministic findings and remediation |
| `validate` | CI-friendly validation; errors return exit code 1 |
| `diff` | Compare registered source hashes with the recorded baseline |
| `adapters` | Show project facts and adapter detection evidence |
| `agents-coverage` | Snapshot/check lexical conservation during AGENTS migration |
| `update` | Preview/apply only safe managed-asset updates |
| `migrate` | Preview/apply machine-state schema migrations |
| `record` | Record a completed semantic workflow (normally called by Skills) |
| `work start/status/checkpoint/recover/complete` | Manage one portable, bounded active-work checkpoint |
| `work install-codex-hooks` | Preview/apply optional Codex lifecycle hooks |
| `work install-claude-bridge` | Preview/apply a marker-bounded no-hooks Claude bridge |

All commands support `--json` where structured automation is useful.
`init`, `update`, and `migrate` never write unless `--apply` is supplied.

## Codex workflows

After initialization, current Codex discovers these under `.agents/skills/`:

- `$context-onboard` completes first-run semantic initialization. It audits and
  classifies existing `AGENTS.md` content down to independently actionable
  rules, checks overlapping knowledge, coordinates the focused Skills,
  proposes a lossless migration, fills missing canonical and subsystem
  sources, verifies source coverage, records completion, and resumes the
  original request.
- `$context-bootstrap` fills missing or placeholder native knowledge while
  preserving unknown product intent, and performs authorized lossless SPEC splits.
- `$context-work` starts, checkpoints, resumes, blocks, or completes one
  substantive work item. It reconciles semantic progress with actual
  Git/filesystem and test evidence instead of trusting stale memory.
- `$context-sync` performs the documentation-impact matrix after meaningful
  code changes. “No durable knowledge update required” is a valid result.
- `$memory-audit` produces a read-only, evidence-backed report for stale,
  contradictory, duplicate, orphaned, unsupported, superseded, missing,
  misowned, and overloaded knowledge.
- `$harness-audit` performs fresh official OpenAI/Codex research and proposes
  reviewed harness changes. A request that also authorizes fixes continues after
  the audit report without a second permission request.

The short managed block in `AGENTS.md` points agents to the registry. It is not
a knowledge dump. Codex Skills support both explicit and description-based
implicit invocation; the managed block gives onboarding a deterministic state
condition instead of relying only on prompt matching.

## After onboarding: everyday operation

Most work should continue as ordinary Codex work. ContextTend is a knowledge
maintenance layer, not a separate development methodology:

```text
init once -> context-onboard once -> ordinary development
          -> context-work only for substantive interruption-sensitive tasks
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

### Repair an earlier incomplete onboarding

If an older ContextTend run already shortened `AGENTS.md`, first update the
managed assets and capture the real pre-migration version—not the condensed
working copy. From the ContextTend checkout:

```powershell
pnpm contexttend update C:\path\to\repository --apply
pnpm contexttend agents-coverage snapshot C:\path\to\repository --source AGENTS.md --git-ref <pre-migration-ref>
pnpm contexttend agents-coverage snapshot C:\path\to\repository --source AGENTS.md --git-ref <pre-migration-ref> --apply
```

Then open the target repository in Codex and invoke `$context-onboard`
explicitly, asking it to repair the previous migration from the original Git
ref recorded in `.contexttend/agents-coverage.json`. The Skill must read that
original file, restore detailed knowledge into subsystem documents or
self-contained candidates, pass `agents-coverage check`, and only then record
onboarding again. If the original file was never committed, preserve it as a
temporary, untracked `.contexttend/original-agents-source.md` and use that path
with `--source`, omitting `--git-ref`. Do not put the source copy under `docs/`
or `.contexttend/candidates/`: those are active coverage targets and would make
the conservation check meaningless.

### During normal development

The managed `AGENTS.md` block tells Codex to consult the Knowledge Registry and
perform a context sync after material changes. You normally just ask Codex to
implement the next task. Invoke `$context-sync` explicitly after a broad or
important change when you want to make the documentation check unmistakable.

When one active work item exists, “continue” or “resume” refers to that item.
The agent checks `current.md` against the live working tree before acting.
Additional user context has higher priority than the old checkpoint, while
code, Git, canonical knowledge, and tests remain the evidence for what was
actually completed.

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
| `agents-coverage check` | During AGENTS migration and before recording onboarding; zero missing anchors is required |
| `init` | Once per repository, and again in preview mode when adopting a newly added external knowledge system |
| `update` | After upgrading ContextTend, to refresh only ContextTend-managed assets; preview before `--apply` |
| `migrate` | Only when ContextTend reports that its machine-state schema needs migration |
| `work status` | At resume, handoff, or whenever you want to know whether the checkpoint is stale |
| `work recover` | Manually refresh machine-only recovery evidence when hooks are unavailable; Skills normally handle this |
| `work start/checkpoint/complete` | Normally called by `$context-work`; manual use is supported for explicit lifecycle control |

`update` does not update project knowledge, and `record` should not be used
manually just to make `diff` clean. `record` accepts the current source hashes
as a successful semantic baseline, so onboarding, sync, and audit Skills call
it only after their checks and validation succeed. Manually recording an
unreviewed state can hide real documentation drift.

Candidates under `.contexttend/candidates/` are unresolved durable knowledge,
not disposable logs. Keep self-contained candidate documents under version
control unless repository policy explicitly requires another durable owner.

### What to keep in Git

Commit `AGENTS.md`, `.agents/`, and `.contexttend/` so another account or
coding agent receives the same governance and checkpoint protocol. The managed
`.contexttend/work/.gitignore` excludes `recovery.json` because it is
machine-local and frequently refreshed. `current.md` and state may be committed
when a handoff must cross machines; review them under the repository's normal
sensitive-data policy. Optional `.codex/hooks.json` and `CLAUDE.md` should be
committed only when the team wants those integrations shared.

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
- AGENTS coverage is a conservative lexical guard. It catches missing config
  identifiers, symbols, flags, and paths but cannot prove that rewritten prose
  preserved the original meaning; the onboarding ledger provides that review.
- Implicit Skill selection is model-driven. The managed `AGENTS.md` trigger
  makes first-run onboarding expected, while `$context-onboard` remains the
  explicit fallback.
- No system can guarantee a semantically fresh final checkpoint when a process,
  machine, or quota stops abruptly. ContextTend guarantees detectable stale
  state and deterministic recovery evidence; the next agent reconstructs
  semantics from the repository.
- Codex hooks are optional, require explicit installation and trust review, and
  are currently installed only for Git repositories. The no-hooks resume path
  remains fully functional.
- Automatic “continue” requires a coding agent that reads a supported
  repository instruction file and has filesystem/Git access.
- npm publishing, plugin packaging, hosted services, and automatic framework
  migrations are outside the MVP.
