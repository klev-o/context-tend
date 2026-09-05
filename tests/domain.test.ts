import {
  canAgentWrite,
  parseRegistry,
  parseState,
} from "@contexttend/core";
import { describe, expect, it } from "vitest";

describe("registry domain", () => {
  it("accepts custom roles while validating authority and ownership", () => {
    const registry = parseRegistry({
      version: 1,
      sources: {
        "domain-glossary": {
          path: "docs/GLOSSARY.md",
          role: "domain-glossary",
          authority: "canonical",
          owner: "human",
        },
      },
    });
    expect(registry.sources["domain-glossary"]?.role).toBe("domain-glossary");
    expect(() =>
      parseRegistry({
        version: 1,
        sources: {
          bad: {
            path: "docs/bad.md",
            role: "product",
            authority: "invented",
            owner: "robot",
          },
        },
      }),
    ).toThrow();
  });

  it("enforces generated ownership invariants", () => {
    expect(() =>
      parseRegistry({
        version: 1,
        sources: {
          bad: {
            path: "generated.md",
            role: "generated",
            authority: "canonical",
            owner: "generated",
          },
        },
      }),
    ).toThrow(/generated-owned/);
  });

  it("implements the ownership write boundary", () => {
    expect(canAgentWrite("agent")).toBe(true);
    expect(canAgentWrite("shared")).toBe(false);
    expect(canAgentWrite("shared", { confirmedChange: true })).toBe(true);
    expect(canAgentWrite("human", { confirmedChange: true })).toBe(false);
    expect(canAgentWrite("human", { directHumanInstruction: true })).toBe(true);
    expect(canAgentWrite("system", { systemOperation: true })).toBe(true);
    expect(canAgentWrite("generated")).toBe(false);
    expect(canAgentWrite("external")).toBe(false);
  });

  it("rejects incomplete machine state", () => {
    expect(() => parseState({ schemaVersion: 1 })).toThrow();
  });
});
