import type { Finding, Registry } from "./domain.js";

export function validateCanonicalRoles(registry: Registry): Finding[] {
  const byRole = new Map<string, string[]>();
  for (const [id, source] of Object.entries(registry.sources)) {
    if (source.authority !== "canonical") continue;
    const ids = byRole.get(source.role) ?? [];
    ids.push(id);
    byRole.set(source.role, ids);
  }
  return [...byRole.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([role, ids]) => ({
      code: "CT103",
      level: "error" as const,
      severity: "P1" as const,
      message: `Multiple canonical sources are registered for role "${role}"`,
      evidence: ids,
      remediation: "Choose one canonical source and mark the others supporting or historical.",
    }));
}

