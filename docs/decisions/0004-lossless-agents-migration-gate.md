# 0004 — Require lossless AGENTS migration before compaction

Status: accepted  
Date: 2026-09-05

## Context

A real onboarding reduced a 777-line, approximately 120 KB AGENTS file to a
short map while much of its detailed configuration and lifecycle knowledge
remained only in code, tests, and an old Git object. Structural validation was
healthy because it cannot prove semantic conservation. The Skill said every
block must be classified but exposed no measurable completion gate.

Codex should not load a monolithic manual on every task: official discovery has
a finite instruction budget, and OpenAI engineering guidance recommends a
short AGENTS map plus directly discoverable in-repository knowledge. The defect
was therefore lost routing coverage, not AGENTS compaction itself.

## Decision

Onboarding is lossless before concise. First init captures a deterministic
lexical baseline from the original user-authored AGENTS content. Semantic
migration uses an atomic source-line ledger and writes verified destinations
and self-contained candidates before shortening the source. Git history is
provenance and recovery evidence, never the sole active destination.

The CLI checks baseline identifiers, paths, flags, and symbols only against
active knowledge sources and candidates, excluding code and tests. Missing
anchors block `record onboarding`. Missing old headings are reported for
semantic explanation but do not automatically fail because reorganized
documentation may use better headings.

## Consequences

Large legacy manuals require more onboarding work and may remain unshortened
when coverage cannot be proved in one run. False positives can be resolved by
documenting an obsolete or disputed item in a self-contained candidate. The
mechanical check does not claim semantic completeness; it complements rather
than replaces the model-reviewed ledger, ownership rules, and memory audit.
