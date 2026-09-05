import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parse, stringify } from "yaml";
import { z } from "zod";

import type {
  Config,
  ExternalSourceRegistry,
  Registry,
  State,
} from "./domain.js";
import { assertSafeProjectWritePath, resolveRegistryPath } from "./paths.js";
import {
  formatSchemaIssues,
  parseConfig,
  parseExternalSourceRegistry,
  parseRegistry,
  parseState,
} from "./schemas.js";

export class ContextTendFileError extends Error {
  readonly filePath: string;
  readonly issues: string[];

  constructor(filePath: string, message: string, issues: string[] = []) {
    super(message);
    this.name = "ContextTendFileError";
    this.filePath = filePath;
    this.issues = issues;
  }
}

export function serializeYaml(value: unknown): string {
  return stringify(value, {
    indent: 2,
    lineWidth: 0,
    sortMapEntries: false,
  });
}

export function serializeJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function loadStructuredFile<T>(
  filePath: string,
  format: "yaml" | "json",
  parser: (value: unknown) => T,
): Promise<T> {
  let text: string;
  try {
    text = await readFile(filePath, "utf8");
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    throw new ContextTendFileError(
      filePath,
      code === "ENOENT" ? `Missing file: ${filePath}` : `Cannot read ${filePath}`,
    );
  }
  try {
    const value = format === "yaml" ? parse(text) : JSON.parse(text);
    return parser(value);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ContextTendFileError(
        filePath,
        `Schema validation failed: ${filePath}`,
        formatSchemaIssues(error),
      );
    }
    throw new ContextTendFileError(filePath, `Cannot parse ${filePath}`, [
      error instanceof Error ? error.message : String(error),
    ]);
  }
}

export function loadRegistry(root: string): Promise<Registry> {
  return loadStructuredFile(
    resolveRegistryPath(root, ".contexttend/registry.yaml"),
    "yaml",
    parseRegistry,
  );
}

export function loadConfig(root: string): Promise<Config> {
  return loadStructuredFile(
    resolveRegistryPath(root, ".contexttend/config.yaml"),
    "yaml",
    parseConfig,
  );
}

export function loadState(root: string): Promise<State> {
  return loadStructuredFile(
    resolveRegistryPath(root, ".contexttend/state.json"),
    "json",
    parseState,
  );
}

export function loadExternalSourceRegistry(
  root: string,
): Promise<ExternalSourceRegistry> {
  return loadStructuredFile(
    resolveRegistryPath(root, ".contexttend/source-registry.yaml"),
    "yaml",
    parseExternalSourceRegistry,
  );
}

export async function writeProjectFile(
  root: string,
  relativePath: string,
  content: string,
): Promise<void> {
  const destination = await assertSafeProjectWritePath(root, relativePath);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, content, "utf8");
}
