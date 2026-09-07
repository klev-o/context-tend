# ContextTend architecture

ContextTend is a local, inspectable governance layer for durable project
knowledge. It does not own feature methodology, code generation, retrieval, or
agent orchestration.

## Architectural boundary

```text
repository
   |
   v
deterministic core ---> registry / state / findings / change plans
   |                                      |
   v                                      v
CLI preview + apply                 repo-scoped Skills
filesystem facts                   semantic judgment
```

The TypeScript core owns facts that can be reproduced without a model:
bounded filesystem scanning, Git status, manifest/convention detection, path
containment, schema validation, SHA-256 hashing, Markdown links, adapter
detection, state, migrations, managed blocks, AGENTS lexical coverage, and
conflict-safe writes. Active-work fingerprints, checkpoint structure/size,
Codex hook merging, and Claude bridge merging stay on this deterministic side.

The six Codex Skills own semantic work: first-run onboarding, selecting
relevant sources, deciding whether knowledge is stale or contradictory,
classifying candidates, applying the documentation-impact matrix, and
reviewing current harness guidance. `$context-work` additionally owns the
semantic meaning of an active handoff snapshot. The CLI never invokes an LLM.

## Packages

- `packages/core` has no terminal UI. It exposes domain schemas, scanner,
  adapters, plan/apply operations, validation, diff, migration, state,
  active-work, recovery, and optional integration APIs.
- `packages/cli` presents the core through Commander. Mutating lifecycle
  commands are non-interactive and preview-only unless `--apply` is explicit.
  A shared presentation hook adds the dependency-free ASCII banner only to
  human output; JSON, quiet, version, and error channels stay undecorated.
- `.agents/skills` is installed per repository by `init`, matching current
  Codex repo-Skill discovery.
- `.contexttend/hooks/codex.mjs` is a dependency-free managed runtime.
  `.codex/hooks.json` is not installed by init; the explicit integration
  command merges reviewed handlers into existing project hooks.

The dependency direction is `cli -> core`. Project repositories do not need a
runtime service, database, daemon, or network connection.

## Distribution boundary

The repository remains a private pnpm workspace, while `packages/cli` is the
single public npm package named `contexttend`. Its tsup build bundles the
private `@contexttend/core` workspace package. Commander, YAML, and Zod remain
declared external runtime dependencies so their supported ESM/CommonJS entry
behavior is preserved. Consumers never resolve the workspace-only core.

The npm tarball is allowlisted to CLI `dist/`, package README, LICENSE, and
package metadata. Release regression tests verify the public/private package
boundary, MIT text, Node shebang, repository metadata, external imports, and
absence of an `@contexttend/core` runtime import.

## Registry model

`.contexttend/registry.yaml` maps stable source identifiers to:

- a custom or built-in semantic `role`;
- one or more project-relative `path` values;
- `authority`: canonical, evidence, supporting, generated, historical, or
  external;
- `owner`: human, shared, agent, system, generated, or external;
- an optional adapter and description.

Custom kebab-case roles are valid. A role may have many supporting/evidence
sources, but validation rejects multiple canonical sources for the same role.
Paths are stored with forward slashes and resolved only at the filesystem
boundary. Absolute paths and traversal outside the selected root are rejected.
Existing real paths are also checked so symlinks cannot make registered reads
or managed writes escape the repository.

## Requirements lifecycle and compatibility

The built-in `requirements` role already existed; registry v1 permits multiple
paths, so neither registry nor state schema changes for this feature. Version
0.3.0 updates managed assets through existing hash-based preview/apply.

Fresh native creation supplies root `SPEC.md` with human ownership and explicit
unknowns. Generic discovery recognizes only exact root document and directory
conventions, including SPECIFICATION/REQUIREMENTS and docs/requirements.
Root SPEC plus docs/spec are grouped before adapter merging. Independent
conventions remain conflicting candidates, not silently merged human meaning.
A higher-priority external canonical owner retains authority; conventional
sources for the same role become supporting. Competing external canonical
owners remain an error. Early external markers prevent parallel native
requirements even before their specs exist.

`createMissingNativeSources` gates native scaffolds. Existing requirements
are adopted first. Ordinary update never adds SPEC or changes the knowledge
registry. Legacy installations without requirements remain valid; explicit
init/bootstrap is the opt-in addition/adoption path.

For compact projects, SPEC contains concrete obligations, constraints and
acceptance expectations. For larger ones, SPEC holds purpose, global constraints,
an authoritative-detail notice and topic links; `docs/spec/` contains detail.
Both are paths of the same source with the same stable ID, owner and authority.
No fixed topics, second canonical source, database or retrieval runtime is needed.

GOALS explains why; PRODUCT describes users and product intent; SPEC records
concrete obligations; ARCHITECTURE describes structure; PLANS orders execution.
The requirements guide is the sole detailed lifecycle/split protocol.
Bootstrap owns semantic splitting, sync detects impact and routes needed
migration, memory audit reviews meaning/drift, and core checks structure.
A lossless move preserves source spans and links, writes/compares destinations
before shortening the root, rechecks source/registry hashes, and retains all
human intent. A semantic rewrite is never justified by code evidence or size.

## Ownership model

| Owner | Agent write policy |
| --- | --- |
| human | Only with direct human product evidence or approval |
| shared | After a verified and confirmed underlying change |
| agent | May maintain from strong cited evidence |
| system | Only deterministic ContextTend lifecycle code |
| generated | Regenerate through the owning system |
| external | Read-only; use the external tool's workflow |

Authority and ownership are separate. Code and tests are evidence; their
existence does not convert behavior into human product intent.

## Discovery and adapter precedence

The scanner collects bounded conventional facts and ignores heavy generated
trees. Adapters are deterministic and ordered:

1. GitHub Spec Kit
2. OpenSpec
3. Agent OS
4. GSD Core
5. ContextTend native
6. generic repository conventions

Higher-priority external systems keep ownership of the roles they already
provide. Discovery merges identical role/path mappings and gives colliding IDs
stable adapter prefixes. Validation exposes unresolved canonical conflicts
instead of silently choosing one. Init also rejects canonical conflicts before
writing infrastructure; validation checks registered adapter contracts even
when their discovery markers have disappeared.

Spec Kit is the end-to-end reference adapter: `.specify/` and `specs/` are
detected, `specs/` becomes canonical external requirements, its constitution
becomes instructions when present, and no parallel requirements tree is
created or modified.

## Plan/apply safety

`init` and `update` first build an in-memory `ChangePlan`. A plan states
the target, create/update/skip decision, reason, and owner. No preview writes
files.

For every planned update, the full current content hash is recorded. Apply
preflights all write targets and containment before the first write, then
rechecks each target immediately before writing. It refuses changed targets.
This prevents known late-plan conflicts from causing earlier writes, but is
not a transaction or cross-process filesystem lock; races during writes and
I/O failure can still leave a partial apply. Writes are additive or bounded:

- existing project knowledge is adopted and preserved;
- missing native sources contain explicit unknowns, not invented claims;
- existing `AGENTS.md` content is preserved around one marker-bounded block;
- complete system assets are updated only when unchanged since installation;
- project-owned knowledge and external framework files are never migrated;
- no command deletes documents, edits application code, commits, pushes, or
  sends repository content over the network.

Optional Codex hooks and the Claude bridge use the same preview/apply and
before-hash conflict pattern. Existing handlers and user-authored rules are
preserved around ContextTend-owned entries or markers. Hook merging recognizes
exact generated handlers and retains user handlers and metadata even inside
mixed groups; a path mentioned in unrelated text is not ownership evidence.

`$context-onboard` may later migrate semantic knowledge only after an
evidence-backed `ONBOARDING PLAN`. It must write and validate destinations
before removing source text, and it requires confirmation before changing
pre-existing user-authored content unless the active request already grants
that authority. Detailed migrations use an atomic source-coverage ledger and
two stages: destinations/candidates first, AGENTS compaction second. A
self-contained candidate preserves an unresolved claim; a Git-only pointer
does not. This semantic workflow does not weaken deterministic init safety.

On first init, the core captures `.contexttend/agents-coverage.json` from the
user-authored portion of AGENTS before adding its managed block. It stores a
source hash, section locations, and lexical anchors such as configuration
identifiers, paths, flags, and symbols—not the full source. Assignment-like
values are excluded, but the baseline remains local repository metadata and
must still be reviewed under the project's secret-handling policy.
`agents-coverage check` searches active non-evidence knowledge and candidates,
excluding code and tests so implementation existence cannot masquerade as
documentation preservation. `record onboarding` refuses an incomplete anchor
result. Legacy repair can explicitly recapture from a trusted file or Git ref.

## State and migrations

`.contexttend/state.json` records schema/tool versions, onboarding/sync/audit
timestamps, active adapters, registered-source baselines, managed-asset hashes,
the managed `AGENTS.md` block hash, one optional `activeWork` pointer, and the
last completed work summary. Schema v2 introduces active work; migration from
v1 adds null lifecycle fields without inventing a task. `lastOnboarding` starts
as null; `contexttend record onboarding` sets it only after the semantic
workflow succeeds.

`contexttend diff` compares current hashes with the last init/sync baseline.
`contexttend record sync` accepts a new baseline only after the semantic
workflow succeeds. Audit records only update their completion timestamps and,
for harness audits, optional external-source freshness.

Migrations are explicit, ordered, deterministic, dry-run by default, and
limited to machine state and managed infrastructure. The v0-to-v2 and
v1-to-v2 migrations are implemented; newer unknown schemas are rejected.

## Active work continuity

Active work is operational handoff state, not durable product truth and not a
task methodology:

```text
state.activeWork
      |
      +--> .contexttend/work/current.md
      |      compact semantic snapshot, maintained by $context-work
      |
      `--> .contexttend/work/recovery.json
             deterministic Git/filesystem evidence, machine-local
```

Only one work item can be active. `start` creates a required-section template
and baseline fingerprint. `checkpoint` validates the 8 KiB limit, refreshes the
marker metadata and repository fingerprint, and records both hashes.
`complete` refuses when the current file or live repository differs from that
checkpoint. The completed file remains inspectable until a later explicit
`start` replaces it; ContextTend does not create an unbounded task archive.

Recovery fingerprinting includes Git HEAD, porcelain status, and hashes for
changed paths. Non-Git repositories use the existing ignored-tree hashing
rules. `.contexttend/` is excluded so recovery updates do not make themselves
stale. `recovery.json` records paths and hashes, never content.

On resume, the semantic Skill uses the current user message for intent and
canonical requirements for obligations. Actual repository/tests establish
implementation facts; `current.md` and recovery evidence describe progress.
This prevents a stale checkpoint from overriding observed facts. External
Spec Kit/OpenSpec/Agent OS/GSD task artifacts retain ownership; the handoff
stores only pointers and the resume delta.

Codex hooks are optional. Session start injects only a short pointer capped at
200 tokens. Mutation, interrupt, and session-end handlers refresh recovery with
no model-visible output. Stop requests a single checkpoint continuation only
when hashes differ and stops requesting when `stop_hook_active` is true. The
runtime never parses `transcript_path`. Without hooks, `work status` computes
the same live comparison during resume.

## Promotion model

Uncertain semantic knowledge follows:

```text
observation -> candidate -> review/classification -> durable knowledge
```

Candidates live under `.contexttend/candidates/` and include the claim,
suggested role, evidence, confidence, proposed owner, and destination. Audit
reports live under `.contexttend/audits/`. Neither is a transcript store.

## Validation

`validate` is CI-friendly and returns a non-zero exit code for errors. It
checks control-file schemas, policy invariants, path containment/existence,
duplicate canonical roles, registered Markdown links, native generated
markers, system assets, exactly one managed AGENTS block, and adapter
consistency. Warnings surface preserved local customization without making a
healthy repository unusable.

Requirements validation checks SPEC/tree mapping, file links and graph reachability
from the root, including topic indexes and cycles. Inline/reference Markdown
links outside fenced/inline code are supported; directory navigation follows a
README index. Heading anchors and arbitrary Markdown extensions are outside
this bounded parser. External specification structures retain their own contract.

Requirements documents and selected ancestor instruction chains above a 16 KiB
advisory reading budget produce warnings, never automatic rewrites. Instruction
checks expose same-directory AGENTS.override shadowing and exact ancestor
duplication, without counting sibling scopes as one prompt. They do not emulate
global/fallback/configured host loading or classify semantic contradictions.

Managed AGENTS is a compact map with an explicit plain-Markdown Skill fallback.
The governance guide separates host instruction precedence, scoped repository
rules, user authorization, semantic knowledge authority and checkpoint evidence.
Harness audit maps exact rule sources, scopes and behavioral effects; it does
not add implicit approval gates. The protocol requires no specific model,
subagent runtime, proprietary API, hidden model state or large context window.

Offline init seeds external references with their bundled research date, not
the installation date. Only an actual source review and record operation
advances its freshness; ordinary update preserves existing source metadata.

Semantic freshness is intentionally not claimed by deterministic validation.
That is the job of `$memory-audit`, with evidence and confidence in every
finding.

Likewise, AGENTS lexical coverage is a conservative loss detector rather than
semantic proof. It catches the disappearance of machine-identifiable anchors;
the Skill's source ledger and evidence review decide whether prose meaning,
ownership, and freshness were preserved.

## Deliberate non-goals

No MCP server, database, vector index, knowledge graph, dashboard, daemon,
background watcher, transcript/session store, rules compiler, task
methodology, multi-agent runtime, automatic PR, or cloud backend is part of
this MVP. Optional lifecycle hooks only strengthen local recovery; first-run
and resume behavior still works through managed instructions, Skill discovery,
and explicit machine state.
