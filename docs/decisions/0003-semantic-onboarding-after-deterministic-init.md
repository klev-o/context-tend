# 0003 — Complete initialization through semantic onboarding

Status: accepted  
Date: 2026-09-05

## Context

Deterministic init can safely discover paths, install Skills, and preserve an
existing AGENTS file, but it cannot decide whether prose is stale, misplaced,
duplicated, or product intent. Requiring users to remember several focused
Skill commands makes the first-run experience incomplete.

## Decision

Install a repo-scoped `$context-onboard` Skill and direct Codex to use it before
the first substantive task while `lastOnboarding` is unset. The Skill begins
with AGENTS, inventories overlapping project knowledge, and applies the
existing harness-audit, memory-audit, and context-bootstrap contracts as
focused phases. It presents one evidence-backed routing plan before mutation
and requires authority before shortening pre-existing user content.

The deterministic CLI only initializes and records onboarding state. It never
performs semantic classification or calls a model.

## Consequences

Users can begin with an ordinary Codex request instead of memorizing setup
commands. Existing repositories receive a transparent consolidation step, and
focused Skills remain independently usable. Implicit Skill invocation remains
model-driven, so explicit `$context-onboard` is retained as the fallback.
