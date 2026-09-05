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
4. Compare sources with the repository. Look for obsolete/conflicting rules,
   changed discovery paths, overly large always-on context, deprecated config,
   locally modified managed assets, and stale adapter assumptions.
5. For every finding cite URL, source class, checked date, repository evidence,
   confidence, and a reviewable proposal.
6. Write `.contexttend/audits/YYYY-MM-DD-harness.md`. Do not migrate or rewrite
   the project during the audit.
7. After a successful report run
   `contexttend record harness-audit --source openai-codex-docs`.

Migration is always a separate explicit CLI operation. Never silently reshape
AGENTS.md, Skills, framework directories, or semantic project knowledge.
