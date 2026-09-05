# 0001 — Keep deterministic facts out of semantic Skills

Status: accepted  
Date: 2026-09-04

## Context

Project knowledge governance combines reproducible filesystem facts with
judgment about meaning. Mixing them would make safety behavior difficult to
test and would waste agent context.

## Decision

The TypeScript core exclusively owns discovery, schemas, paths, hashes, links,
state, migrations, adapters, and conflict resolution. Repo-scoped Skills own
semantic routing, bootstrap, impact analysis, memory audit, and harness audit.
The CLI never calls an LLM.

## Consequences

Core behavior is local, portable, CI-friendly, and testable. Semantic results
must cite evidence and may return unknown. Structural validation never claims
that product or architecture knowledge is semantically fresh.
