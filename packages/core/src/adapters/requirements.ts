import type { ProjectSnapshot } from "../domain.js";

// No recursive filename guessing: these are explicit repository conventions.
export function conventionalRequirements(project: ProjectSnapshot): string[][] {
  const groups: string[][] = [];
  const modular = project.files.has("SPEC.md");
  if (modular) {
    groups.push(project.directories.has("docs/spec")
      ? ["SPEC.md", "docs/spec/"]
      : ["SPEC.md"]);
  }
  for (const file of ["SPECIFICATION.md", "REQUIREMENTS.md", "docs/REQUIREMENTS.md"]) {
    if (project.files.has(file)) groups.push([file]);
  }
  for (const directory of ["docs/requirements", "requirements", "specs", "docs/spec"]) {
    if (directory === "docs/spec" && modular) continue;
    if (project.directories.has(directory)) groups.push([directory]);
  }
  return groups;
}
