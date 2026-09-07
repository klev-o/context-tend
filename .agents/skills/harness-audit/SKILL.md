---
name: harness-audit
description: Research current official Codex guidance and audit this repository's AGENTS.md, Skills, plugins, configuration, discovery paths, and adapter assumptions. Use $harness-audit for incremental checks or $harness-audit full for reconsideration.
---

# Harness audit

Audit the coding-agent configuration, not the product.

## Source policy

Use fresh network research. Official OpenAI Codex/developer documentation and
release notes are AUTHORITATIVE; explicit official recommendations are
OFFICIAL_RECOMMENDATION; Cookbook examples are OFFICIAL_EXAMPLE; OpenAI
engineering reports are EXPERIMENTAL_PRACTICE; community sources are
COMMUNITY_PRACTICE and never override official sources.

## Workflow

1. Read `.contexttend/source-registry.yaml`, the registry, and governance guide.
2. Without `full`, research changes since each relevant `lastChecked`; with
   `full`, reconsider every recorded assumption.
3. Fetch primary pages, not search snippets. Check AGENTS discovery and size
   behavior, `.agents/skills` discovery, Skill metadata, plugin packaging,
   Codex configuration, changelog/release notes, relevant Cookbook material,
   OpenAI engineering publications, and external adapter contracts.
4. Run contexttend validate for mechanical instruction/spec findings. Inventory
   root/nested AGENTS.md and AGENTS.override.md by scope, global instructions
   when accessible, configured fallback filenames and instruction budgets.
   Record what is unavailable instead of assuming the complete effective prompt.
   Check Skills and referenced guides for silent instructions, contradictory
   precedence, redundant mandatory reads, unexpected approvals/stops, scope
   expansion, oversized entry points, deprecated config, local customization,
   and stale adapter assumptions. Inspect only relevant references.
   For each behavioral rule map trigger, scope, precedence, source, and effect.
   Distinguish mechanical duplication/size from semantic conflict; neither
   recency nor a model's larger context window establishes authority.
   Verify that a less capable agent can find critical knowledge from explicit
   pointers without subagents, hidden state, proprietary APIs, or long-context
   inference. Model-specific guidance can inform portable invariants only.
5. For every finding cite URL, source class, checked date, repository evidence,
   confidence, and a reviewable proposal. Name exact file/section/rule when it
   could change expected behavior; explain whether existing user authorization
   already resolves it. Do not invent a new approval gate.
6. Write `.contexttend/audits/YYYY-MM-DD-harness.md`. Do not migrate or rewrite
   the project during the audit.
7. After a successful report run
   `contexttend record harness-audit --source <actually-checked-source-id>`.
   Record freshness only for sources actually fetched; an index page does not
   establish every linked topic.

The audit produces findings first. When the active task also authorizes fixes,
continue with that implementation after the report; do not ask again merely
because this audit phase is read-only. Deterministic asset/state changes use
explicit CLI preview/apply; semantic migrations use the appropriate workflow
and existing authorization. Never silently rewrite external frameworks.
