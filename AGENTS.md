# AGENTS.md

<!-- contexttend:start -->

## Project knowledge

Use `.contexttend/registry.yaml` to locate authoritative project knowledge.
Apply progressive disclosure: read only the sources relevant to the current task.
Read `.contexttend/guides/agent-governance.md` for instruction precedence and ownership; explicit user intent takes priority over Skill guidelines.
For features, read the registered requirements entry point (native `SPEC.md`), then only relevant topic links.
If Skill invocation is unavailable, read `.agents/skills/<name>/SKILL.md` and follow it as ordinary Markdown.
Respect each source's `owner` and `authority`; implementation evidence does not replace human product intent.
Before substantive repository work, read `.contexttend/state.json`. If `lastOnboarding` is missing or null, use `$context-onboard` first, then resume the original task.
If `activeWork` is non-null, reconcile it with `$context-work resume` before onboarding or other substantive work; a plain "continue" or "resume" refers to that active work.
For substantive multi-step changes, use `$context-work` to keep a compact checkpoint; do not create task memory for minor edits or questions.
After material changes, use `$context-sync` for the documentation impact check.
Use `$memory-audit` for semantic drift and `$harness-audit` for Codex setup freshness.

<!-- contexttend:end -->
