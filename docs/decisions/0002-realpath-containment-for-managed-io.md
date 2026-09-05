# 0002 — Enforce realpath containment for managed I/O

Status: accepted  
Date: 2026-09-04

## Context

Rejecting absolute paths and `..` traversal protects lexical repository
boundaries, but an in-repository symbolic link may still resolve to a target
outside the repository. A managed write through such a link could mutate
unrelated user data, and a registered Markdown read could cross the declared
local-first scope.

## Decision

ContextTend resolves the selected root and nearest existing target through
`realpath` before managed writes. Existing symbolic-link destinations are not
writable, and real parents must remain inside the real project root.
Registered sources and Markdown link targets are also checked after realpath
resolution.

## Consequences

Lexical paths remain portable in the registry while filesystem operations are
contained against symlink traversal. Repositories may register symlinks that
resolve inside the repository for read-only use, but ContextTend refuses to
write through a symlink itself.
