# ContextTend specification

Authority: human-owned canonical requirements. This compact source contains
the concrete obligations below. [Goals](docs/GOALS.md) explain why the project
exists; [Product](docs/PRODUCT.md) owns users and product intent;
[Architecture](ARCHITECTURE.md) describes mechanisms; [Plans](docs/PLANS.md)
tracks implementation sequence.

Provenance: the maintainer's requirements request of 2026-09-08 and the
existing human-owned GOALS/PRODUCT sources linked above. Implementation and
tests verify these obligations; they do not establish new human intent.

## Portable project knowledge

- CT-REQ-01: Normal operation must work with older Codex generations and other
  coding agents that read ordinary Markdown and repository instructions.
  Critical knowledge must be discoverable through explicit pointers without
  subagents, long-context inference, hidden state, or model-specific APIs.
- CT-REQ-02: Keep deterministic filesystem facts, schemas, hashing, discovery,
  validation and CLI behavior in the reproducible core. Semantic interpretation,
  topic boundaries and intent review belong to agent workflows.
- CT-REQ-03: Preserve the existing framework and canonical source owner before
  creating native project knowledge. No automatic lifecycle operation may
  delete or replace human-owned requirements from implementation evidence.

## Requirements sources

- CT-REQ-04: Use the first-class semantic role `requirements`. In a fresh native
  project without an existing requirements owner, support root `SPEC.md` as a
  human-owned canonical source for requirements, constraints and acceptance
  expectations. Unknown product requirements remain explicit.
- CT-REQ-05: Adopt existing SPEC documents and recognized requirements
  directories. Spec Kit, OpenSpec, Agent OS, GSD and existing specification
  owners must not receive a competing native requirements system.
- CT-REQ-06: Compact SPEC files contain requirements directly. A growing project
  may retain SPEC as a stable entry point and move authoritative topic detail
  into `docs/spec/`, without hardcoded topic categories.
- CT-REQ-07: Root and child paths must remain one logical canonical requirements
  source. The root gives purpose, global constraints where relevant, navigation
  and the location of authoritative detail; it does not duplicate all children.
- CT-REQ-08: Requirements direct feature implementation. Read only relevant
  topics plus global constraints; do not require reading the complete tree.
  Code/spec mismatches are drift, not authority to redefine requirements.

## Preservation and lifecycle

- CT-REQ-09: Structural migration must preserve every confirmed requirement,
  qualification, exception and acceptance expectation. A lossless move verifies
  source coverage and destinations before shortening originals, preserves
  provenance, rebases links to the same targets, and detects intervening edits.
  Semantic changes need direct human intent or approval.
- CT-REQ-10: File size may produce a soft review finding only. Automatic
  semantic splitting based on arbitrary line counts is prohibited.
- CT-REQ-11: Bootstrap uses direct human evidence or already authoritative
  product evidence. Sync distinguishes implementation-only changes, changed/new
  confirmed requirements and drift, and considers modularization.
- CT-REQ-12: Memory audit must expose stale, contradictory, duplicated, orphaned
  and unsupported requirements, broken navigation, unimplemented obligations,
  and implemented behavior misrepresented as human requirements.

## Validation, upgrades and instructions

- CT-REQ-13: Deterministic validation checks path containment/existence, schema
  and registry mappings, canonical-role conflicts, supported local links,
  SPEC/tree consistency and managed invariants. It must not claim semantic
  correctness. Two canonical requirements entries are invalid.
- CT-REQ-14: Keep init/adoption, managed update, schema migration and semantic
  migration distinct. Existing initialized projects remain usable without
  SPEC; ordinary update does not create one or rewrite their knowledge.
  Prefer additive compatibility and avoid unnecessary schema changes.
- CT-REQ-15: Plans are reviewable, dry-run behavior is deterministic, and apply
  protects against changed targets. Never silently overwrite concurrent work.
- CT-REQ-16: AGENTS remains a compact routing map. Instructions must distinguish
  user intent, scoped repository rules, Skills, canonical knowledge,
  implementation evidence and checkpoints. Scope-aware override review and
  exact instruction provenance must expose unexpected stops or conflicts.
- CT-REQ-17: Current official model/harness guidance may inform portable
  improvements. It must never become a requirement to use one model.
- CT-REQ-18: Changes include meaningful regression coverage, successful tests,
  typecheck, build and validation, plus English/Russian usage documentation
  describing ownership, small/modular layouts and migration preservation.
