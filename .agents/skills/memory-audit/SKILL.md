---
name: memory-audit
description: Audit durable project knowledge against repository evidence for staleness, contradiction, duplication, orphaning, unsupported claims, supersession, missing sources, ownership errors, and overload. Read-only except for the audit report.
---

# Memory audit

Audit whether durable knowledge still matches the project.

## Workflow

1. Read the registry and governance guide. Run `contexttend validate` and
   include its findings rather than rediscovering path/schema facts.
2. Inventory registered sources by role, authority, owner, and adapter.
3. Use progressive disclosure. For each claim under review, inspect its
   canonical source and only the relevant code, tests, plans, decisions, or
   external artifacts.
4. Check every class: `STALE`, `CONTRADICTORY`, `DUPLICATE`, `ORPHAN`,
   `UNSUPPORTED`, `SUPERSEDED`, `MISSING`, `MISOWNED`, and `OVERLOADED`.
5. Explicitly test for stale architecture, contradictory product rules,
   duplicate canonical sources, completed active plans, and missing registered
   files. For requirements inspect stale/contradictory/duplicated obligations,
   orphan spec documents, broken index links, requirements no longer implemented,
   and implemented behavior presented as requirements without human evidence.
   Compare only relevant topic detail. Absence of evidence is not automatically
   a contradiction; code does not decide that a requirement is obsolete.
6. Assign P0 dangerous contradiction, P1 material stale knowledge, P2
   structural problem, or P3 optional cleanup.
7. Every finding must include: Finding, Claim, Canonical source, Conflicting
   evidence, Confidence, and Recommended action. Omit unsupported guesses.
8. Write `.contexttend/audits/YYYY-MM-DD-memory.md`. Do not change project
   knowledge during the audit. Then run `contexttend record memory-audit`.

The report begins with scope, registry version, commit or working-tree state,
and deterministic validation summary. A clean audit is a valid result.
