# Requirements lifecycle

A requirements source says what must be built: confirmed requirements,
constraints, and acceptance expectations. Preserve its human authority.

## Boundaries and entry points

| Role | Meaning |
| --- | --- |
| goals / GOALS | Why the project exists and its desired outcomes |
| product / PRODUCT | Users, product behavior, and product intent |
| requirements / SPEC | Concrete obligations, constraints, acceptance expectations |
| architecture / ARCHITECTURE | System structure and architectural mechanisms |
| roadmap / PLANS | Current implementation sequence |

Adopt an existing canonical specification document or framework before
creating anything. Spec Kit, OpenSpec, Agent OS, and GSD keep their ownership
and workflows. An external owner without specs yet still prevents a parallel
native SPEC; establish requirements using that owner's workflow.

Fresh init may create a human-owned `SPEC.md` with explicit unknowns when no
requirements source exists and `createMissingNativeSources` allows creation.
Ordinary update changes managed infrastructure only: it does not create SPEC,
change registry mappings, or rewrite human knowledge. Existing installations
remain valid without SPEC. Explicit init previews adoption/addition of missing
native sources; review that plan before apply.

For an explicit semantic bootstrap of an existing installation, first adopt
existing requirements through the reviewed registry/init plan. If none exist,
native creation uses init, not guessed requirements derived from code.

## Populate and use

`context-bootstrap` uses direct user statements or already authoritative
human product documents, with provenance. Leave unknowns explicit. A README
or implementation comment is not automatically product authority.

For a feature, read the canonical requirements entry point, its global
constraints, and only relevant topic links. Keep confirmed new requirements
with their source evidence; do not duplicate PRODUCT or summarize all child
requirements into the root.

`context-sync` distinguishes a changed requirement, a confirmed new requirement,
an implementation-only change, and code/spec drift. Only the first two can
change human-owned meaning, with human evidence. Drift is a finding/candidate
until intent resolves it. Sync also considers whether topic structure needs
review; file size alone never authorizes rewriting.

## Growth and a lossless split

While compact, SPEC contains requirements directly. When topics require
independent reading, `context-bootstrap` performs the structural migration;
`context-sync` routes a needed split there. No separate Skill is required.

Keep `SPEC.md` as the stable human/agent entry point with purpose, global
constraints, navigation, and a statement that linked topic documents carry
authoritative detail. Keep one registry source (preserve its ID/owner/authority):

```yaml
requirements:
  path:
    - SPEC.md
    - docs/spec/
  role: requirements
  authority: canonical
  owner: human
  adapter: native
```

Topic names follow the project, not a fixed taxonomy. Link every active
Markdown topic from SPEC or another reachable topic index. A directory link
must lead to its README index; a directory name alone does not expose children.
Use ordinary inline/reference Markdown links. File targets are checked;
heading-anchor correctness and arbitrary Markdown extensions require review.

A safe structural move requires all of the following:

1. The task authorizes reorganization. Existing authorization is sufficient;
   unknown or changed product meaning still needs direct human evidence.
2. Record the original source and registry hashes plus a complete source-span
   ledger mapping each requirement, exception, rationale, constraint, and
   acceptance expectation to its destination. Preserve IDs and provenance.
3. Move text verbatim, retaining headings, order within each moved section,
   normative words, values, examples, and qualifications. Changes to relative
   links must resolve to the same original targets. Do not infer, condense,
   resolve contradictions, or delete confirmed requirements during the move.
4. Write and verify all destinations while the original source remains intact.
   Compare every ledger span with its destination, allowing only the recorded
   link rebasing and navigation additions. Hash/byte equality proves unchanged
   spans, not the correctness of a semantic rewrite.
5. Recheck original and registry hashes before replacing the root or mapping.
   If either changed, reconcile first. If interrupted, keep the original
   unshortened and checkpoint destination/coverage status.
6. Once coverage is complete, replace moved root detail with purpose, global
   constraints, authoritative-detail notice and links. Extend the existing
   source's paths; never create a second canonical requirements entry.
7. Check the ledger again, file links, reachability, `contexttend validate`,
   and `contexttend diff`. Then record sync and retain a concise migration
   decision with provenance. Git history supplements rather than replaces
   accessible requirements.

A semantic rewrite or ambiguous relocation is not a proven lossless move.
Keep the original meaning and prepare a reviewable proposal for the unresolved
portion; continue independent authorized work.

## Audit and deterministic limits

`memory-audit` checks stale/contradictory/duplicated requirements, orphan topics,
broken navigation, unimplemented obligations, and claims promoted from code
without human evidence. Absence of code is evidence of a possible gap, not
proof the requirement is obsolete.

The core checks schemas, containment/existence, one canonical source per role,
SPEC/tree registry consistency, supported local links, and topic reachability.
A requirements document above 16 KiB yields only an advisory reading-budget
finding. That threshold is a review signal, not a semantic split rule or a
model limit. Semantic completeness, thematic boundaries, and preserved human
meaning remain the agent/reviewer's responsibility.
