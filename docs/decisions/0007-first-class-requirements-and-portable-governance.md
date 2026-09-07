# 0007 — First-class requirements and portable governance

Status: accepted
Date: 2026-09-08

## Context

The registry already supports requirements and multiple paths, but discovery
missed root SPEC and native init lacked a requirements entry point. Work
continuity also used one ordering for both implementation facts and human intent.
The maintainer requires compatibility with older and other Markdown-capable
agents, preservation of human requirements and adoption of external frameworks.

## Decision

Use human-owned root SPEC while compact and one source with SPEC plus docs/spec
when modular. Reuse registry v1/state v2 and existing Skills. Bootstrap owns a
lossless structural migration; sync routes impact; audits examine meaning and
instruction conflicts. The core reports only reproducible structure and facts.
Ordinary update touches managed infrastructure only; version 0.3.0 carries the
new templates without a semantic migration of initialized repositories.

Separate knowledge authority from instruction precedence. Requirements define
obligations; code/tests describe facts. Honor scoped AGENTS/overrides, existing
user authorization and host permissions. Provide plain-file Skill entry points.

## Consequences

No new Skill, schema, framework methodology or model dependency is introduced.
Small projects gain an obvious requirements entry point. Larger projects can
read selected topics while keeping one owner. Advisory byte budgets prompt
review rather than automatic rewriting. Multiple independent requirements
conventions require explicit classification instead of silent selection.

Plan-wide conflict/containment preflight prevents known later conflicts from
causing earlier writes; it does not introduce a filesystem transaction.
A full lossless semantic rewrite cannot be proven by structural validation.

See [the specification](../../SPEC.md), [architecture](../../ARCHITECTURE.md),
and [migration protocol](../../.contexttend/guides/requirements.md).
