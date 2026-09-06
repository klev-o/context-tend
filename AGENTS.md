# AGENTS.md

<!-- contexttend:start -->

## Project knowledge

Use `.contexttend/registry.yaml` to locate authoritative project knowledge.
Apply progressive disclosure: read only the sources relevant to the current task.
Respect each source's `owner` and `authority`; implementation evidence does not replace human product intent.
Before substantive repository work, read `.contexttend/state.json`. If `lastOnboarding` is missing or null, use `$context-onboard` first, then resume the original task.
If `activeWork` is non-null, use `$context-work resume` before starting other work; a plain "continue" or "resume" refers to that active work.
For substantive multi-step changes, use `$context-work` to keep a compact checkpoint; do not create task memory for minor edits or questions.
After material changes, use `$context-sync` for the documentation impact check.
Use `$memory-audit` for semantic drift and `$harness-audit` for Codex setup freshness.

<!-- contexttend:end -->
