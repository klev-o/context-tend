---
name: context-bootstrap
description: Bootstrap or repair missing or placeholder typed project knowledge after ContextTend init. Use when canonical knowledge is incomplete or the user invokes $context-bootstrap; do not replace an external spec framework.
---

# Context bootstrap

Create useful durable knowledge from repository evidence without inventing
product intent.

For requirements creation, repair, or a requested structural split, read
[the requirements lifecycle](../../../.contexttend/guides/requirements.md).
Preserve the existing source ID and human meaning; size findings only trigger
review. This Skill performs the semantic migration, not the update command.

## Workflow

1. Locate the repository root and read `.contexttend/registry.yaml` completely.
2. Read `.contexttend/guides/agent-governance.md` completely.
3. Run `contexttend validate`. Repair authorized mechanical faults first; pause
   only affected semantic writes if deterministic
   infrastructure is invalid; report the exact findings.
4. Build a role coverage table from the registry. Treat external adapter
   sources as read-only and use them instead of parallel ContextTend docs.
5. Route progressively: read canonical goals/product first when needed, then
   only architecture, requirements, decisions, plans, code, and tests relevant
   to each missing claim. Do not read every spec or decision by default.
6. Fill missing or placeholder knowledge in native sources only, including
   scaffold `Unknown` sections. Preserve complete verified content. For `human`
   ownership, use direct user statements or clearly cited existing product
   documentation. If intent is unavailable, write
   `Unknown - human confirmation required` and list the evidence inspected;
   never turn code behavior into a product requirement.
7. For `shared` sources, state the verified evidence behind every durable
   claim. For `agent` sources, keep summaries concise and reproducible.
8. Put disputed observations in `.contexttend/candidates/`; do not promote
   them merely because they appear implemented.
9. Run `contexttend validate` again and report sources read, files changed,
   unknowns, candidates, and validation outcome.

Never modify `.contexttend/state.json`, managed Skill files, generated files,
or external framework artifacts directly.
