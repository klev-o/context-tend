---
name: context-sync
description: Perform a documentation impact check after material repository changes. Use when the user invokes $context-sync or asks whether durable project knowledge must change.
---

# Context sync

Determine whether repository changes require durable knowledge updates.

## Workflow

1. Read `.contexttend/registry.yaml` and the governance guide completely.
2. Run `contexttend validate` and `contexttend diff`.
3. Inspect `git status --short`, the relevant git diff, changed tests, and
   active external specs/plans. Never store raw transcripts.
4. Answer each impact question with yes/no/unknown and evidence:
   product behavior, architecture, business rule, public interface, security
   assumption, reliability behavior, durable decision, accepted limitation,
   and completed plan.
5. Route only to registered roles affected by a yes/unknown answer.
6. Apply ownership policy. Human-owned meaning needs direct user evidence;
   shared knowledge needs a confirmed project change; agent-owned summaries
   may be maintained from strong evidence; external/generated sources are not
   edited through ContextTend.
7. Write uncertain claims as candidates. If every answer is no, explicitly
   report `No durable knowledge update required.`
8. Run validation again. If successful, run `contexttend record sync`.

Report the evidence, affected role, canonical destination, ownership decision,
and exact changes. Do not update documentation simply because files changed.
