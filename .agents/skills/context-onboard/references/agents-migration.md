# Lossless AGENTS.md migration

Use this protocol whenever onboarding may shorten or reorganize pre-existing
user-authored AGENTS content. The objective is not to preserve every sentence
verbatim; it is to preserve every still-relevant rule, constraint, rationale,
exception, workflow, and unresolved claim in an immediately discoverable source.

## Conservation invariant

Before source removal, every substantive non-managed source span must have one
explicit disposition and a real destination. Git history is recovery evidence,
not an active knowledge destination. Preserve exact operational details such as
configuration names, thresholds, timing, retry/cooldown behavior, allowlists,
state compatibility, failure isolation, security constraints, and exceptions.
Do not collapse several independently actionable nested bullets into one vague
summary.

## Establish the source baseline

Fresh `contexttend init --apply` captures `.contexttend/agents-coverage.json`
before adding the managed block. For a legacy installation or repair, preview
and then capture a trusted source before mutation:

```text
contexttend agents-coverage snapshot . --source AGENTS.md --git-ref <ref>
contexttend agents-coverage snapshot . --source AGENTS.md --git-ref <ref> --apply
```

When the original was not committed, keep an untracked copy at
`.contexttend/original-agents-source.md` and use that with `--source` instead
of `--git-ref`. This location is outside the active coverage corpus. Never
capture the already-condensed file as though it were the original. During
repair, also read that exact source file or `git show <ref>:AGENTS.md` completely;
the baseline contains lexical anchors, not the full semantic source.

## Build the source-coverage ledger

Read the entire source in bounded chunks. Create a ledger before editing:

| ID | Source lines | Knowledge item | Kind | Evidence | Disposition | Destination | Owner |
| --- | --- | --- | --- | --- | --- | --- | --- |

Line ranges must cover every substantive source line without unexplained gaps.
Split a section when its nested rules have different evidence or destinations.
Use these routing defaults:

- always-on agent behavior and navigation -> concise `AGENTS.md`;
- human product intent, goals, and non-goals -> registered human-owned sources;
- architecture and accepted decisions -> registered architecture/decision sources;
- detailed subsystem behavior and configuration -> `docs/context/<subsystem>.md`
  or another registered canonical implementation-context directory;
- employee/user procedures -> their existing owner and instruction files;
- adapter-owned specs/plans -> the external source without rewriting it;
- unverified, conflicting, or possibly stale content -> a self-contained candidate.

A candidate must restate the claim, source location, evidence, uncertainty, owner,
and intended destination. Redact secret values while preserving variable names and
security meaning. A file that says only `see <commit>:AGENTS.md` is incomplete.

## Apply in two stages

1. Write destinations and candidates while the original AGENTS text remains.
2. Verify each ledger row against the written destination and resolve overlap.
3. Only then replace detail in AGENTS with concise rules and direct navigation.
4. If the run cannot finish, leave AGENTS unshortened and leave onboarding unset.

## Coverage gate

Run the deterministic check after writing destinations and again after shortening:

```text
contexttend agents-coverage check .
```

The default corpus includes registered non-evidence knowledge, common repository
documentation, employee instructions, and self-contained candidates; it excludes
implementation code and tests so an identifier cannot pass merely because it still
exists in code. Use repeated `--target` values only when an approved durable source
is outside those defaults. Zero missing anchors is required. Old heading coverage is
diagnostic: explain every missing heading through the ledger.

The check is intentionally conservative and lexical. It catches vanished config
names, paths, flags, and symbols, but cannot prove semantic truth or completeness.
The ledger review remains the semantic gate.

## Completion report

Report source line/section/anchor counts and totals for KEEP, MOVE, CONDENSE,
CANDIDATE, REMOVE, and EXTERNAL. The disposition totals must equal the ledger
item count. Name every destination, every intentionally obsolete item, unresolved
candidate, missing heading explanation, and the final coverage-check result.
