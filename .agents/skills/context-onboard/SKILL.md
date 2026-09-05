---
name: context-onboard
description: Onboard a repository on the first substantive Codex task after ContextTend init. Use automatically when `.contexttend/state.json` has no `lastOnboarding`, or explicitly via $context-onboard, to audit and route existing AGENTS.md and overlapping project knowledge before normal work.
---

# Context onboarding

Complete the semantic half of ContextTend initialization, then return to the
user's original task. Deterministic `contexttend init` owns structure; this
Skill owns evidence-backed understanding, consolidation, and routing.
Onboarding is lossless before it is concise: never make user-authored
knowledge discoverable only through Git history.

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
   infrastructure is invalid and report the exact remediation. Confirm
   `.contexttend/agents-coverage.json` represents the original source. For a
   legacy or repair run, capture a trusted pre-migration file or Git ref first.
3. When user-authored AGENTS content exists, read
   [references/agents-migration.md](references/agents-migration.md) completely
   and follow its lossless protocol. Read `AGENTS.md` completely, in chunks if
   needed; never infer coverage from a summary or file-size comparison. In a
   repair run, read the exact original path/ref named by the coverage baseline,
   not only the already-condensed working-tree AGENTS file.
4. Inventory conventional documentation, registered sources, external
   framework artifacts, code, tests, and configuration. Read likely canonical
   sources first and expand only where a claim overlaps, conflicts, or lacks
   evidence. Never create a second source of truth owned by an adapter.
5. When non-managed AGENTS content or a non-ContextTend Codex harness exists,
   use `$harness-audit full` as a read-only phase. When sources overlap or
   freshness is doubtful, use `$memory-audit` as a read-only phase. Continue
   only with findings supported by repository or authoritative evidence.
6. Build an atomic source-coverage ledger before mutation. Classify every
   substantive source span and nested rule as `KEEP`, `MOVE`, `CONDENSE`,
   `CANDIDATE`, `REMOVE`, or `EXTERNAL`, with source lines, claim, evidence,
   confidence, destination, owner, and action. `REMOVE` requires evidence that
   the item is obsolete or exactly duplicated; unsupported items are candidates.
7. Present one `ONBOARDING PLAN` before mutation. Include files to change,
   exact knowledge routing, conflicts and unknowns, content that would remain
   in AGENTS.md, and content proposed for removal. Ask for confirmation before
   shortening, replacing, or removing pre-existing user-authored content unless
   the user's current request already explicitly authorizes that migration.
8. Apply the approved plan in two stages. First write and verify every durable
   destination and self-contained candidate while leaving original AGENTS text
   intact. Then shorten AGENTS only after the ledger has no uncovered source
   span. Use subsystem documents under a registered documentation directory
   when exact configuration, retry, threshold, state, allowlist, or lifecycle
   rules would overload a canonical overview. Never modify external/generated
   sources directly.
9. Recheck every ledger row against its actual destination. Run
   `contexttend agents-coverage check`, `contexttend validate`, and
   `contexttend diff`. Missing anchors block completion; missing old headings
   require explanation. On success, run `contexttend record sync` and
   `contexttend record onboarding`. The latter independently enforces anchor
   coverage. Do not record when claims were dropped or review is incomplete.
10. Report sources inspected, Skill phases used or skipped, files changed,
    claims kept/moved/condensed/candidate/removed, unknowns, and validation.
    Then resume the user's original task unless it is no longer applicable.

A completed onboarding may retain explicit unknowns and self-contained
candidates. A candidate containing only a Git ref or a pointer to deleted text
does not preserve knowledge and blocks source removal. Do not
rerun it merely because code changed; use sync or the focused audits instead.
Never edit ContextTend-managed assets or machine state directly.
