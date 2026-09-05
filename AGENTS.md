# AGENTS.md

<!-- contexttend:start -->

## Project knowledge

Use `.contexttend/registry.yaml` to locate authoritative project knowledge.
Apply progressive disclosure: read only the sources relevant to the current task.
Respect each source's `owner` and `authority`; implementation evidence does not replace human product intent.
Before substantive repository work, read `.contexttend/state.json`. If `lastOnboarding` is missing or null, use `$context-onboard` first, then resume the original task.
After material changes, use `$context-sync` for the documentation impact check.
Use `$memory-audit` for semantic drift and `$harness-audit` for Codex setup freshness.

<!-- contexttend:end -->
