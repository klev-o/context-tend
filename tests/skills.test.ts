import { SYSTEM_ASSET_CONTENTS } from "@contexttend/core";
import { describe, expect, it } from "vitest";

describe("semantic Skill contracts", () => {
  it.each([
    ["context-onboard", "ONBOARDING PLAN"],
    ["context-bootstrap", "Unknown - human confirmation required"],
    ["context-sync", "No durable knowledge update required."],
    ["memory-audit", "stale architecture"],
    ["harness-audit", "Official OpenAI"],
    ["context-work", "contexttend work checkpoint"],
  ])("%s is functional and contains its safety contract", (name, expected) => {
    const content = SYSTEM_ASSET_CONTENTS[`.agents/skills/${name}/SKILL.md`];
    expect(content).toBeDefined();
    expect(content).toMatch(/^---\nname:/);
    expect(content).toContain("## Workflow");
    expect(content).toContain(expected);
    expect(content?.length).toBeGreaterThan(700);
  });

  it("work continuity is portable, bounded, and transcript-free", () => {
    const skill =
      SYSTEM_ASSET_CONTENTS[".agents/skills/context-work/SKILL.md"] ?? "";
    const guide =
      SYSTEM_ASSET_CONTENTS[".contexttend/guides/work-continuity.md"] ?? "";
    expect(skill).toContain("$context-sync");
    expect(skill).toContain("git status --short");
    expect(skill).toContain("below 8 KiB");
    expect(skill).toContain("Never store raw prompts");
    expect(guide).toContain("works without hooks");
    expect(guide.replace(/\s+/g, " ").toLowerCase()).toContain("actual repository/tests");
  });

  it("onboarding coordinates focused Skills and requires a reviewable migration", () => {
    const content =
      SYSTEM_ASSET_CONTENTS[".agents/skills/context-onboard/SKILL.md"] ?? "";
    for (const skill of [
      "$harness-audit full",
      "$memory-audit",
      "$context-bootstrap",
      "$context-sync",
    ]) {
      expect(content).toContain(skill);
    }
    for (const classification of [
      "KEEP",
      "MOVE",
      "CONDENSE",
      "CANDIDATE",
      "REMOVE",
      "EXTERNAL",
    ]) {
      expect(content).toContain(classification);
    }
    expect(content).toContain("Ask for confirmation");
    expect(content).toContain("source-coverage ledger");
    expect(content).toContain("contexttend agents-coverage check");
    expect(content).toContain("contexttend record onboarding");
    expect(content.indexOf("Read `AGENTS.md` completely")).toBeLessThan(
      content.indexOf("Inventory conventional documentation"),
    );
  });

  it("onboarding ships a detailed lossless AGENTS migration protocol", () => {
    const content =
      SYSTEM_ASSET_CONTENTS[
        ".agents/skills/context-onboard/references/agents-migration.md"
      ] ?? "";
    expect(content).toContain("## Conservation invariant");
    expect(content).toContain("## Build the source-coverage ledger");
    expect(content).toContain("Git history is recovery evidence");
    expect(content).toContain("A file that says only");
    expect(content).toContain("## Coverage gate");
    expect(content.length).toBeGreaterThan(3000);
  });

  it("bootstrap treats initialized Unknown placeholders as missing knowledge", () => {
    const content =
      SYSTEM_ASSET_CONTENTS[".agents/skills/context-bootstrap/SKILL.md"] ?? "";
    expect(content).toContain("missing or placeholder knowledge");
    expect(content).toContain("scaffold `Unknown` sections");
    expect(content).toContain("Preserve complete verified content");
  });

  it("memory audit requires all MVP audit classes and evidence fields", () => {
    const content = SYSTEM_ASSET_CONTENTS[".agents/skills/memory-audit/SKILL.md"] ?? "";
    for (const classification of [
      "STALE",
      "CONTRADICTORY",
      "DUPLICATE",
      "ORPHAN",
      "UNSUPPORTED",
      "SUPERSEDED",
      "MISSING",
      "MISOWNED",
      "OVERLOADED",
    ]) {
      expect(content).toContain(classification);
    }
    for (const field of [
      "Claim",
      "Canonical source",
      "Conflicting evidence",
      "Confidence",
      "Recommended action",
    ]) {
      expect(content.replace(/\s+/g, " ")).toContain(field);
    }
  });
});
