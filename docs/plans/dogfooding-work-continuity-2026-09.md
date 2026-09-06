# Active-work continuity dogfooding — 2026-09

## Scope

ContextTend 0.2.0 was exercised against its own dirty working tree while the
active-work implementation and documentation were still in progress. Optional
Codex/Claude integrations were previewed here and applied in isolated
integration fixtures; they were not enabled in this repository.

## Lifecycle exercised

1. The existing state migration preview reported schema 1→2 without writing.
2. Explicit migration preserved onboarding/sync/audit data and added null work
   lifecycle fields.
3. Managed update previewed and installed `$context-work`, the continuity
   guide, work-directory ignore rule, hook runtime, and updated AGENTS block.
4. `work start` captured 24 already changed implementation/test files and
   created a 1.3 KiB semantic template.
5. The template was replaced with an evidence-backed implementation snapshot
   and `work checkpoint` reported current state.
6. Subsequent documentation changes made `work status` and deterministic
   validation report the checkpoint as stale without making the project
   invalid.
7. Codex hooks and Claude bridge commands both produced additive previews and
   made no changes without `--apply`.

## Issues found and fixed

### Compact status output

The first JSON status response exposed both saved and live recovery objects,
including duplicate hashes for every changed file. It was correct but could
consume several thousand unnecessary model tokens on a dirty repository.

Normal CLI output now returns one live recovery summary, omits hashes, and caps
the changed-path preview at 25 entries. `--verbose` retains the full diagnostic
form for deliberate machine inspection. Process-level tests assert that normal
JSON contains no file hash fields.

### Generated installation metadata

The first self-update correctly moved machine state to 0.2.0 but left
`docs/_meta/contexttend.md` at 0.1.0 because the previous update lifecycle
refreshed managed assets but not the separate generated metadata file.
`update` now regenerates that file, validation reports CT119 when it is stale,
and a regression test covers the full repair.

## Hook behavior verified

An isolated initialized repository executed the installed Node hook runtime:

- SessionStart emitted one short pointer below 400 characters.
- Recovery after a repository mutation succeeded with empty stdout.
- Stop returned one continuation request for stale work.
- A repeated Stop event with `stop_hook_active: true` returned an empty object
  and did not loop.
- Existing Codex Stop handlers survived ContextTend hook merging.
- Existing Claude instructions survived marker-bounded bridge installation.

## Verification

- Official Skill quick validation: valid.
- TypeScript typecheck: passed.
- Lint gate: passed.
- Production build: passed.
- Vitest: 11 test files, 58 tests passed, including CRLF/Unicode checkpoint
  handling and a Windows-specific hook command.
- Self-update deterministic validation: 0 errors, 0 warnings before active work.
- Active-work validation after intentional drift: 0 errors, one expected CT118
  warning.

## Honest limitations

- An abrupt process or quota stop can occur before a semantic checkpoint.
  Recovery detects the mismatch; the next agent must reconstruct meaning from
  repository and test evidence.
- Project Codex hooks currently require Git for stable root resolution.
- Automatic continuation requires a repository-capable agent that reads
  AGENTS.md, CLAUDE.md, or an equivalent native bridge.
- Recovery fingerprints can cost local I/O on very dirty or non-Git
  repositories, but silent hooks add no model context.
