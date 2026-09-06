# ContextTend landscape research — September 2026

Research date: 2026-09-04

## Decision summary

ContextTend should remain a small, local governance layer over knowledge that a
repository already owns. It should not compete with spec-driven workflows,
session-memory systems, rule compilers, semantic indexes, or agent runtimes.
The useful gap is a typed registry that states where knowledge lives, how
authoritative it is, who may update it, and whether its deterministic
infrastructure has drifted.

The MVP therefore has two deliberately separate parts:

- a deterministic TypeScript CLI for discovery, adoption, schemas, paths,
  hashes, managed blocks, state, migrations, and validation;
- repo-scoped Codex Skills for semantic routing, bootstrap, documentation
  impact checks, memory audits, and evidence-backed harness audits.

## Official OpenAI findings

### AGENTS.md is an instruction chain, not a knowledge database

Current Codex discovery starts with global guidance, then walks from the
project root to the current directory. In each directory it prefers
`AGENTS.override.md`, then `AGENTS.md`, then configured fallback names. Files
nearer the working directory take precedence. The combined project-document
budget defaults to 32 KiB. This supports a short managed pointer in the root
`AGENTS.md`, while detailed durable knowledge remains elsewhere.

Source: [Custom instructions with AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md)

### Repo Skills now live under `.agents/skills`

The current repo-scoped discovery path is `.agents/skills`, scanned from the
working directory upward to the repository root. A Skill is a directory with a
required `SKILL.md`; optional `scripts/`, `references/`, `assets/`, and
`agents/openai.yaml` support deterministic helpers and UI metadata. Skills are
loaded through progressive disclosure: name and description first, full
instructions only when selected. Explicit invocation uses `$skill-name` in
Codex CLI and the IDE extension.

Source: [Build skills](https://learn.chatgpt.com/docs/build-skills)

### Plugins distribute capabilities; they are not required for repo-local MVP

Plugins bundle Skills, connectors, MCP servers, hooks, browser extensions, or
scheduled-task templates. Their required manifest is
`.codex-plugin/plugin.json`. Plugins are appropriate when distributing
ContextTend beyond a repository, but adding a plugin manifest to the MVP would
not improve the core local workflow. The project ships directly discoverable
repo Skills and documents plugin packaging as future distribution work.

Sources: [Plugins](https://learn.chatgpt.com/docs/plugins),
[ChatGPT & Codex changelog](https://learn.chatgpt.com/docs/changelog)

### OpenAI's harness guidance strongly matches the product premise

OpenAI reports that a large monolithic `AGENTS.md` crowds out relevant context,
rots quickly, and is difficult to verify. Their working pattern is a short
`AGENTS.md` map, structured repository knowledge, progressive disclosure,
mechanical validation, and recurring documentation gardening. This is evidence
for ContextTend's registry and audit boundary, not a reason to reproduce their
full development harness.

Source: [Harness engineering: leveraging Codex in an agent-first world](https://openai.com/index/harness-engineering/)

The Codex App Server, SDK, and MCP modes expose or embed the Codex harness. The
MVP does not need to drive Codex or store threads: Skills already provide the
semantic workflow at the correct extension boundary.

Sources: [Unlocking the Codex harness](https://openai.com/index/unlocking-the-codex-harness/),
[Unrolling the Codex agent loop](https://openai.com/index/unrolling-the-codex-agent-loop/)

The relevant Cookbook article is an archived writing guide rather than a
knowledge-governance design. Its durable advice—front-load takeaways, keep
documents scannable and consistent, and minimize dependencies in examples—is
applied to ContextTend's generated documents. No current Cookbook recipe was
found that replaces the registry/ownership problem.

Source: [What makes documentation good](https://developers.openai.com/cookbook/articles/what_makes_documentation_good)

## Competitive landscape

### Spec-driven development

**GitHub Spec Kit** owns the feature-development lifecycle: constitution,
specification, technical plan, tasks, implementation, and convergence. It now
supports Skills-mode integrations and has extensions, presets, workflows, and
upgrade lifecycle commands. Its `specs/` artifacts and `.specify/` marker are
authoritative external knowledge for ContextTend. ContextTend must register
them, never create a parallel requirements tree, and never mutate them during
its own migrations.

Source: [github/spec-kit](https://github.com/github/spec-kit)

**OpenSpec** explicitly separates current truth in `openspec/specs/` from
proposed deltas in `openspec/changes/`; archive merges deltas into current specs
and retains change history. This lifecycle is richer than anything ContextTend
should invent. The adapter should map current specs to canonical external
requirements, active proposals/specs/design/tasks to supporting working
knowledge, and the archive to historical knowledge.

Source: [OpenSpec getting started](https://github.com/Fission-AI/OpenSpec/blob/main/docs/getting-started.md)

**Agent OS** focuses on discovering/deploying codebase standards and shaping
specifications. Current v2 uses visible `agent-os/` structures and profiles;
older installations may use `.agent-os/`. Its product, standards, and specs are
external sources. ContextTend should recognize both generations and avoid
becoming a standards compiler.

Sources: [buildermethods/agent-os](https://github.com/buildermethods/agent-os),
[Agent OS concepts](https://buildermethods.com/agent-os/concepts)

**GSD Core** moved from `gsd-build/get-shit-done` to `open-gsd/gsd-core`. Its
`.planning/` directory is deliberately shared project memory with canonical
`PROJECT.md`, `REQUIREMENTS.md`, `ROADMAP.md`, a living `STATE.md`, codebase
maps, phase plans, and verification artifacts. ContextTend should register
these typed artifacts and not create another roadmap, state tracker, planning
methodology, or orchestration layer.

Sources: [GSD planning artifacts](https://github.com/open-gsd/gsd-core/blob/next/docs/reference/planning-artifacts.md),
[GSD architecture](https://github.com/open-gsd/gsd-core/blob/next/docs/ARCHITECTURE.md)

### Project memory and context engines

Serena and newer memory products store project memories and often add semantic
retrieval, transcripts, SQLite, embeddings, knowledge graphs, or MCP servers.
These solve recall and code navigation. They do not reliably distinguish human
product intent from implementation evidence or declare per-source authority
and write ownership. ContextTend avoids those storage/search layers and may
register their durable files as supporting or external knowledge.

Representative primary sources:

- [Serena memories](https://oraios.github.io/serena/02-usage/045_memories.html)
- [agent-mem](https://github.com/lmaksym/agent-mem)
- [shared-agent-memory](https://github.com/dan-calin/shared-agent-memory)

### AGENTS and rule managers

Ruler, Rulesync, AgentSync, and similar tools compile or synchronize one rule
source into formats used by multiple agents. That is a distinct ownership
problem: distribution of behavioral instructions. ContextTend should discover
those conventions, preserve their outputs, and validate only its own managed
block. It should not become a cross-agent rules compiler.

Representative primary sources:

- [Ruler](https://github.com/intellectronica/ruler)
- [Rulesync](https://github.com/dyoshikawa/rulesync)
- [AgentSync](https://github.com/obielin/agentsync)

### Harness projects

Harness starter projects combine workflow prompts, guardrails, planning,
orchestration, tests, and memory. They validate that repository legibility and
continuous cleanup matter, but their broad runtime/workflow scope is explicitly
outside ContextTend. The MVP exposes composable facts and semantic Skills that
such harnesses can use.

Representative primary sources:

- [OpenAI harness engineering](https://openai.com/index/harness-engineering/)
- [AIDD harness](https://github.com/AIDD-Projects/harness)
- [Harness Starter Kit](https://github.com/harnessworks/harness-starter-kit)

### Codex hooks follow-up — 2026-09-05

Current official Codex documentation now defines repository lifecycle hooks in
`<repo>/.codex/hooks.json` or `config.toml`. Project hooks require explicit
trust review, matching hooks from multiple layers accumulate rather than
replace each other, and project commands should resolve paths from the Git root
because a session can start in a subdirectory.

The documented lifecycle includes `SessionStart`, `PostToolUse`, `Stop`,
`Interrupt`, and `SessionEnd`. Empty successful command output adds no context;
`SessionStart` may add developer context, and the documented default
large-output threshold is approximately 2,500 tokens per hook message.
OpenAI explicitly recommends keeping hook/plugin context concise because
multiple sources accumulate. `Stop` exposes `stop_hook_active` so a continuation
hook can avoid loops. The documented `transcript_path` format is not a stable
hook interface.

This changes the earlier blanket “no hooks” assumption, but not the product
boundary. ContextTend uses hooks only as an optional, explicitly installed
reliability adapter around a portable file/state protocol. Recovery hooks are
silent; session-start output is capped at 200 tokens; no transcript is parsed.

Primary source:

- [Official OpenAI Codex hooks documentation](https://learn.chatgpt.com/docs/hooks)

## Capability matrix

| Capability | Existing owner | ContextTend behavior |
| --- | --- | --- |
| Feature specs and plans | Spec Kit, OpenSpec, Agent OS, GSD | Discover and register |
| Coding standards/rules distribution | Ruler, Rulesync, Agent OS | Discover; do not compile |
| Session memory and retrieval | Serena and memory tools | Do not store or index transcripts; keep only one bounded active handoff |
| Agent runtime/orchestration | Codex harness, GSD, other harnesses | Do not implement |
| Code semantic index | Serena and context engines | Do not implement |
| Knowledge authority/ownership | Fragmented or implicit | Own registry model |
| Deterministic drift and path validation | Partly tool-specific | Own cross-system validation |
| Semantic stale/contradiction audit | Usually ad hoc | Own Skill workflow |
| Codex harness freshness audit | Not project-specific | Own evidence-backed Skill workflow |

## What the MVP deliberately does not build

- no spec or task methodology;
- no agent orchestration or Codex embedding;
- no database, embeddings, semantic code index, or knowledge graph;
- no transcript/session capture or growing activity log;
- no MCP server, dashboard, daemon, background watcher, required hooks,
  deployment, or PR automation;
- no rules compiler or framework-file migration;
- no automatic semantic rewrite of human- or external-owned knowledge.

## Differentiation

1. **Adopt before create.** Discovery runs before any proposal or write.
2. **Typed truth.** Role, authority, owner, adapter, and path are explicit.
3. **Deterministic/semantic boundary.** The CLI reports facts; Skills judge
   meaning with evidence.
4. **Safe coexistence.** External systems keep ownership of their knowledge.
5. **Auditable evolution.** Managed hashes, source-check dates, candidates, and
   review-only audit reports make drift visible without surprise rewrites.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Convention detection creates false confidence | Detection records evidence and confidence; generic fallback remains available |
| Multiple systems claim the same role | Validation reports duplicate canonical roles; adapters use supporting authority where appropriate |
| Agent rewrites human intent from code | Ownership policy in every Skill forbids this without direct human evidence |
| Managed integration damages AGENTS.md | Marker-bounded replacement, newline preservation, idempotency tests, no full-file rewrite |
| Skills or paths change upstream | Source registry plus `$harness-audit`; current `.agents/skills` is documented explicitly |
| Adapter assumptions rot | Adapter validation and versioned research assumptions; no automatic external migrations |
| Large repositories make scans slow | Bounded conventional discovery, ignored heavy directories, no deep code parsing |
| Windows path behavior diverges | Store POSIX-style relative registry paths and convert only at filesystem boundaries |
| Hooks increase token use or become the only recovery path | Keep hooks optional; silent recovery output, 200-token SessionStart cap, and portable no-hooks status/resume |

## Documented deviation from the original specification

The specification suggested a top-level `skills/` directory and reflected an
older Codex convention in places. The implementation installs repo-scoped
Skills under `.agents/skills/`, the location in current official OpenAI
documentation. A top-level plugin is not created for MVP because current
official guidance positions plugins as a distribution bundle; repository-local
Skills already satisfy native discovery.
