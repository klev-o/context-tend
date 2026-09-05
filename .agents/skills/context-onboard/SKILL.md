---
name: context-onboard
description: Onboard a repository on the first substantive Codex task after ContextTend init. Use automatically when `.contexttend/state.json` has no `lastOnboarding`, or explicitly via $context-onboard, to audit and route existing AGENTS.md and overlapping project knowledge before normal work.
---

# Context onboarding

Complete the semantic half of ContextTend initialization, then return to the
user's original task. Deterministic `contexttend init` owns structure; this
Skill owns evidence-backed understanding, consolidation, and routing.

## Related Skills

Read a related Skill's `SKILL.md` completely before using that phase. Its
current contract wins; do not duplicate or weaken it here.

- `$harness-audit full`: verify non-managed AGENTS content and existing Codex
  Skills, plugins, configuration, or discovery assumptions. It reports only.
- `$memory-audit`: report stale, contradictory, duplicate, unsupported,
  misowned, and overloaded durable knowledge before consolidation.
- `$context-bootstrap`: fill missing native sources from verified evidence
  after existing sources and external owners have been identified.
- `$context-sync`: maintain durable knowledge after onboarding and material
  repository changes; it is not a substitute for first-run consolidation.

## Workflow

1. Preserve the user's original request. Locate the repository root; read
   `.contexttend/state.json`, `.contexttend/registry.yaml`, and the governance
   guide completely. If `lastOnboarding` is already set and onboarding was not
   explicitly requested, resume the original task without rerunning this flow.
2. Run `contexttend validate`. Stop semantic writes when deterministic
   infrastructure is invalid and report the exact remediation.
3. Read `AGENTS.md` completely. Separate the marker-bounded ContextTend block
   from user-authored content and split the latter into coherent claims or
   instruction blocks with source locations. Treat existing text as claims to
   verify, not as proof that product or implementation facts are current.
4. Inventory conventional documentation, registered sources, external
   framework artifacts, code, tests, and configuration. Read likely canonical
   sources first and expand only where a claim overlaps, conflicts, or lacks
   evidence. Never create a second source of truth owned by an adapter.
5. When non-managed AGENTS content or a non-ContextTend Codex harness exists,
   use `$harness-audit full` as a read-only phase. When sources overlap or
   freshness is doubtful, use `$memory-audit` as a read-only phase. Continue
   only with findings supported by repository or authoritative evidence.
6. Classify every AGENTS block and overlapping durable claim as `KEEP`,
   `MOVE`, `CONDENSE`, `CANDIDATE`, `REMOVE`, or `EXTERNAL`. For each item
   provide source, claim, evidence, confidence, registered destination, owner,
   and proposed action. Unsupported or disputed claims become candidates; they
   are never promoted merely because AGENTS.md states them.
7. Present one `ONBOARDING PLAN` before mutation. Include files to change,
   exact knowledge routing, conflicts and unknowns, content that would remain
   in AGENTS.md, and content proposed for removal. Ask for confirmation before
   shortening, replacing, or removing pre-existing user-authored content unless
   the user's current request already explicitly authorizes that migration.
8. Apply the approved plan. Use `$context-bootstrap` for missing native
   knowledge. Write a verified destination before removing its source text;
   preserve unresolved material as candidates; keep AGENTS.md as a concise
   operational map; and never modify external or generated sources directly.
9. Recheck the affected claims and run `contexttend validate` plus
   `contexttend diff`. On success, run `contexttend record sync` and
   `contexttend record onboarding`. Do not record completion when required
   migration was declined, validation failed, or material claims were dropped.
10. Report sources inspected, Skill phases used or skipped, files changed,
    claims kept/moved/condensed/candidate/removed, unknowns, and validation.
    Then resume the user's original task unless it is no longer applicable.

A completed onboarding may retain explicit unknowns and candidates. Do not
rerun it merely because code changed; use sync or the focused audits instead.
Never edit ContextTend-managed assets or machine state directly.
