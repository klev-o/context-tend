# ContextTend agent governance

Managed instructions for knowledge maintenance. Project meaning lives in
`.contexttend/registry.yaml` sources, not in this guide.

## Instructions, intent, and facts

Host/system/developer instructions and execution permissions remain in force.
Within that boundary, the user's current request and authorization take
precedence over repository/Skill guidelines; earlier authorization remains
valid within its scope. Repository instructions govern their directory scope.
Apply the host's discovery rules: in Codex, AGENTS.override.md replaces the
same-directory AGENTS.md and deeper files refine ancestor guidance. Never
flatten nested rules into global policy.

Skills describe task procedures; they do not overrule explicit user intent.
Use available session evidence for routine decisions. Ask only for unresolved
product meaning, an unsafe conflict, or permissions the host actually requires.
If a Skill or AGENTS rule causes a pause, approval request, unfinished task,
or change of direction, name and link the exact file, quote the relevant
instruction, and explain its scope and why existing authorization is insufficient.
Do not infer an approval requirement from a guideline.

Knowledge authority is separate from instruction precedence. Canonical
requirements govern what should be built; actual repository/tests establish
what currently exists. A mismatch is drift to investigate, not permission to
rewrite intent from code. Checkpoints and recovery hashes describe progress
and evidence; neither overrides current user intent or canonical requirements.

## Authority

- `canonical`: declared source of truth for its role.
- `evidence`: observable implementation or verification facts.
- `supporting`: useful context that does not override canonical knowledge.
- `generated`: reproducible output; do not edit manually.
- `historical`: retained context that is no longer current.
- `external`: knowledge governed outside ContextTend.

When sources disagree, report the conflict. Do not silently choose the newest
file. A requirement is changed only by confirmed human intent.

## Ownership

- `human`: change meaning only when the user directly supplies or approves it.
- `shared`: change after verified evidence of the underlying project change.
- `agent`: maintain when evidence is sufficient and cite that evidence.
- `system`: maintain through the deterministic ContextTend CLI.
- `generated`: regenerate through its owner; never hand-edit.
- `external`: read-only to ContextTend; use the owning tool's workflow.

System ownership describes installed assets. When developing ContextTend
itself, edit their implementation templates and install with preview/apply.
It does not prohibit an authorized change to ContextTend's own source code.

## Routing and promotion

Use the registry, then the relevant entry point and only needed topic detail.
For requirements creation, repair, or splitting, read
[requirements.md](requirements.md). Do not load all of docs/spec/ for a feature.

Move uncertain knowledge through observation -> candidate -> review -> durable
knowledge. Candidates in `.contexttend/candidates/` include the claim, role,
evidence, confidence, proposed owner, and destination. A Git ref alone is not
a preserved claim. Every semantic finding identifies its canonical source,
conflicting/supporting evidence, confidence, and action. Unknown is valid.

The protocol must work through ordinary Markdown, explicit pointers, and CLI
commands with older and other repository-capable agents. If Skill invocation
is unavailable, read its file under `.agents/skills/<name>/SKILL.md` and follow
the workflow manually. Hooks, subagents, large context windows, hidden state,
and model-specific APIs are optional conveniences, never required for knowledge
discovery or normal operation.
