# ContextTend agent governance

This file is managed by ContextTend. Project meaning lives in the sources
registered in `.contexttend/registry.yaml`, not in this guide.

## Authority

- `canonical`: declared source of truth for its role.
- `evidence`: observable implementation or verification facts.
- `supporting`: useful context that does not override canonical knowledge.
- `generated`: reproducible output; do not edit manually.
- `historical`: retained context that is no longer current.
- `external`: knowledge governed outside ContextTend.

When sources disagree, report the conflict. Do not silently pick the newest
file or infer product intent from implementation evidence.

## Ownership

- `human`: change meaning only when the user directly supplies or approves it.
- `shared`: change after verified evidence of the underlying project change.
- `agent`: maintain when evidence is sufficient and cite that evidence.
- `system`: change only through the deterministic ContextTend CLI.
- `generated`: regenerate through its owner; never hand-edit.
- `external`: read-only to ContextTend; use the owning tool's workflow.

## Promotion

Move uncertain knowledge through observation -> candidate -> review -> durable
knowledge. Put unresolved proposals in `.contexttend/candidates/` with claim,
role, evidence, confidence, proposed owner, and recommended destination.

## Evidence

Every semantic finding names the claim, canonical source, conflicting or
supporting evidence, confidence, and recommended action. `unknown` is valid;
fabricated certainty is not.
