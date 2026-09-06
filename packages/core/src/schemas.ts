import { z } from "zod";

import {
  ACTIVE_WORK_STATUSES,
  AUTHORITIES,
  OWNERS,
  type Config,
  type ExternalSourceRegistry,
  type Registry,
  type State,
  type WorkRecovery,
} from "./domain.js";

const relativePathSchema = z
  .string()
  .min(1)
  .refine((value) => !/^(?:[A-Za-z]:[\\/]|[\\/]{1,2})/.test(value), {
    message: "path must be relative to the project root",
  })
  .refine(
    (value) =>
      !value
        .replaceAll("\\", "/")
        .split("/")
        .some((segment) => segment === ".."),
    { message: "path must not escape the project root" },
  );

export const knowledgeSourceSchema = z
  .object({
    path: z.union([
      relativePathSchema,
      z.array(relativePathSchema).min(1),
    ]),
    role: z
      .string()
      .min(1)
      .regex(/^[a-z][a-z0-9-]*$/, "role must be kebab-case"),
    authority: z.enum(AUTHORITIES),
    owner: z.enum(OWNERS),
    adapter: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    tags: z.array(z.string().min(1)).optional(),
  })
  .strict()
  .superRefine((source, context) => {
    if (source.owner === "generated" && source.authority !== "generated") {
      context.addIssue({
        code: "custom",
        path: ["authority"],
        message: "generated-owned sources must use generated authority",
      });
    }
    if (
      source.authority === "generated" &&
      source.owner !== "generated" &&
      source.owner !== "system"
    ) {
      context.addIssue({
        code: "custom",
        path: ["owner"],
        message: "generated authority requires generated or system ownership",
      });
    }
    if (source.owner === "external" && source.authority === "generated") {
      context.addIssue({
        code: "custom",
        path: ["authority"],
        message: "external-owned sources cannot use generated authority",
      });
    }
  });

export const registrySchema = z
  .object({
    version: z.literal(1),
    sources: z.record(
      z
        .string()
        .min(1)
        .regex(/^[a-z][a-z0-9-]*$/, "source id must be kebab-case"),
      knowledgeSourceSchema,
    ),
  })
  .strict();

export const managedAssetStateSchema = z
  .object({
    hash: z.string().regex(/^[a-f0-9]{64}$/),
    version: z.string().min(1),
  })
  .strict();

export const activeWorkStateSchema = z
  .object({
    id: z.string().min(1).max(160),
    title: z.string().min(1).max(240),
    status: z.enum(ACTIVE_WORK_STATUSES),
    path: relativePathSchema,
    recoveryPath: relativePathSchema,
    startedAt: z.string().datetime(),
    checkpointedAt: z.string().datetime(),
    checkpointHash: z.string().regex(/^[a-f0-9]{64}$/),
    checkpointFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();

export const completedWorkStateSchema = z
  .object({
    id: z.string().min(1).max(160),
    title: z.string().min(1).max(240),
    completedAt: z.string().datetime(),
  })
  .strict();

export const stateSchema = z
  .object({
    schemaVersion: z.literal(2),
    contextTendVersion: z.string().min(1),
    installedAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    lastOnboarding: z.string().datetime().nullable().optional(),
    lastSync: z.string().datetime().nullable(),
    lastMemoryAudit: z.string().datetime().nullable(),
    lastHarnessAudit: z.string().datetime().nullable(),
    detectedAdapters: z.array(z.string().min(1)),
    registeredHashes: z.record(z.string(), z.string().nullable()),
    managedAssets: z.record(z.string(), managedAssetStateSchema),
    managedBlocks: z.record(z.string(), managedAssetStateSchema),
    activeWork: activeWorkStateSchema.nullable(),
    lastCompletedWork: completedWorkStateSchema.nullable(),
  })
  .strict();

export const workRecoverySchema = z
  .object({
    version: z.literal(1),
    workId: z.string().min(1).max(160),
    capturedAt: z.string().datetime(),
    source: z.enum(["git", "filesystem"]),
    gitHead: z.string().min(1).nullable(),
    fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
    totalChangedFiles: z.number().int().nonnegative(),
    truncated: z.boolean(),
    changedFiles: z
      .array(
        z
          .object({
            path: relativePathSchema,
            status: z.string().min(1).max(16),
            hash: z.string().regex(/^[a-f0-9]{64}$/).nullable(),
            previousPath: relativePathSchema.optional(),
          })
          .strict(),
      )
      .max(250),
  })
  .strict();

export const configSchema = z
  .object({
    version: z.literal(1),
    mode: z.enum(["adaptive", "native"]),
    agentIntegration: z.boolean(),
    createMissingNativeSources: z.boolean(),
  })
  .strict();

const externalSourceEntrySchema = z
  .object({
    authority: z.enum([
      "authoritative",
      "official-recommendation",
      "official-example",
      "experimental-practice",
      "community-practice",
    ]),
    url: z.url(),
    lastChecked: z.string().date(),
    relevantTopics: z.array(z.string().min(1)).min(1),
  })
  .strict();

export const externalSourceRegistrySchema = z
  .object({
    version: z.literal(1),
    sources: z.record(z.string().min(1), externalSourceEntrySchema),
  })
  .strict();

export function parseRegistry(value: unknown): Registry {
  return registrySchema.parse(value);
}

export function parseState(value: unknown): State {
  return stateSchema.parse(value);
}

export function parseConfig(value: unknown): Config {
  return configSchema.parse(value);
}

export function parseExternalSourceRegistry(
  value: unknown,
): ExternalSourceRegistry {
  return externalSourceRegistrySchema.parse(value);
}

export function parseWorkRecovery(value: unknown): WorkRecovery {
  return workRecoverySchema.parse(value);
}

export function formatSchemaIssues(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const issuePath = issue.path.length > 0 ? issue.path.join(".") : "<root>";
    return `${issuePath}: ${issue.message}`;
  });
}
