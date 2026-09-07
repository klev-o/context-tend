---
name: context-work
description: Start, checkpoint, resume, or complete one substantive ContextTend work item. Use automatically when state.activeWork is non-null and the user says continue/resume, or when a multi-phase task needs interruption-safe handoff; skip minor edits and questions.
---

# Context work

Maintain one concise, portable handoff snapshot while ordinary implementation
continues. Deterministic CLI code owns state and repository fingerprints;
this Skill owns semantic understanding and checkpoint content.

## Workflow

1. Read `.contexttend/state.json`. When an active item exists, read
   `.contexttend/guides/work-continuity.md` and
   `.contexttend/work/current.md` completely before substantive work.
2. Select the mode from the explicit invocation or evidence:
   - `resume` for active work or a plain continue/resume request;
   - `start` for a new substantive multi-phase implementation;
   - `checkpoint` after meaningful progress, a decision, tests, or a blocker;
   - `complete` only after verified Definition of Done;
   - `status` for a read-only explanation.
3. For `start`, refuse to replace another active item. Run
   `contexttend work start . --title "<short title>" --objective "<objective>"`.
   Immediately replace all generic template detail with evidence-backed
   acceptance criteria and next steps, then run `contexttend work checkpoint`
   before implementation.
4. For `resume`, run `contexttend work status . --json`. Inspect
   `git status --short`, unstaged and staged diffs, relevant files/tests, and
   canonical or adapter-owned plans. Treat the current user message as the
   latest intent. Follow the governance guide: requirements govern obligations,
   repository/tests establish facts, and checkpoints override neither.
   Reconcile stale checkpoint claims with repository evidence,
   checkpoint the corrected snapshot, and continue from the first unfinished
   verified step. Ask only when a real product ambiguity or unsafe conflict
   cannot be resolved.
5. For `checkpoint`, rewrite `current.md` as the current snapshot rather than
   appending history. Preserve its metadata markers and every required
   section. Record decisions with rationale, exact next actions, changed paths,
   concise test outcomes, blockers, and unknowns. Never store raw prompts,
   chain-of-thought, full diffs, test logs, secrets, or session transcripts.
   Then run `contexttend work checkpoint`; use `--state blocked` only for a
   genuine blocker.
6. Checkpoint at material boundaries, not after every command. Keep the file
   below 8 KiB and normally 400-1000 tokens. Deterministic recovery hooks may
   run frequently because successful silent output adds no model context.
7. For `complete`, verify the Definition of Done and relevant tests, perform
   `$context-sync` when durable knowledge may have changed, update the final
   checkpoint, run `contexttend work checkpoint`, then
   `contexttend work complete`. Never force completion around stale evidence.

If hooks were absent or the session ended abruptly, semantic freshness is not
guaranteed. Recovery is still deterministic: status compares the saved
checkpoint with the live repository. State unknowns explicitly and recover
from files/tests instead of inventing what the prior model intended.
