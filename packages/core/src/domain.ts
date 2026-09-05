export const CONTEXTTEND_VERSION = "0.1.0";
export const SCHEMA_VERSION = 1;

export const BUILT_IN_ROLES = [
  "instructions",
  "goals",
  "product",
  "requirements",
  "architecture",
  "design",
  "decisions",
  "roadmap",
  "execution-plan",
  "current-state",
  "implementation-context",
  "technical-debt",
  "security",
  "reliability",
  "operations",
  "verification",
  "generated",
  "reference",
] as const;

export const AUTHORITIES = [
  "canonical",
  "evidence",
  "supporting",
  "generated",
  "historical",
  "external",
] as const;

export const OWNERS = [
  "human",
  "shared",
  "agent",
  "system",
  "generated",
  "external",
] as const;

export const SEVERITIES = ["P0", "P1", "P2", "P3"] as const;

export type BuiltInKnowledgeRole = (typeof BUILT_IN_ROLES)[number];
export type Authority = (typeof AUTHORITIES)[number];
export type Owner = (typeof OWNERS)[number];
export type Severity = (typeof SEVERITIES)[number];
export type FindingLevel = "error" | "warning" | "info";

export interface KnowledgeSource {
  path: string | string[];
  role: string;
  authority: Authority;
  owner: Owner;
  adapter?: string;
  description?: string;
  tags?: string[];
}

export interface Registry {
  version: 1;
  sources: Record<string, KnowledgeSource>;
}

export interface ManagedAssetState {
  hash: string;
  version: string;
}

export interface State {
  schemaVersion: 1;
  contextTendVersion: string;
  installedAt: string;
  updatedAt: string;
  lastOnboarding?: string | null;
  lastSync: string | null;
  lastMemoryAudit: string | null;
  lastHarnessAudit: string | null;
  detectedAdapters: string[];
  registeredHashes: Record<string, string | null>;
  managedAssets: Record<string, ManagedAssetState>;
  managedBlocks: Record<string, ManagedAssetState>;
}

export interface Config {
  version: 1;
  mode: "adaptive" | "native";
  agentIntegration: boolean;
  createMissingNativeSources: boolean;
}

export type ExternalSourceAuthority =
  | "authoritative"
  | "official-recommendation"
  | "official-example"
  | "experimental-practice"
  | "community-practice";

export interface ExternalSourceEntry {
  authority: ExternalSourceAuthority;
  url: string;
  lastChecked: string;
  relevantTopics: string[];
}

export interface ExternalSourceRegistry {
  version: 1;
  sources: Record<string, ExternalSourceEntry>;
}

export interface Finding {
  code: string;
  level: FindingLevel;
  severity: Severity;
  message: string;
  path?: string;
  evidence?: string[];
  remediation?: string;
}

export interface DetectionResult {
  detected: boolean;
  confidence: "none" | "candidate" | "likely" | "certain";
  evidence: string[];
}

export interface AdapterDiscovery {
  sources: Record<string, KnowledgeSource>;
  findings?: Finding[];
}

export interface ProjectSnapshot {
  root: string;
  files: ReadonlySet<string>;
  directories: ReadonlySet<string>;
  isGitRepository: boolean;
  gitStatus: "clean" | "dirty" | "not-repository" | "unknown";
  packageManagers: string[];
  languages: string[];
  frameworks: string[];
  monorepo: boolean;
}

export interface AdapterStatus {
  id: string;
  name: string;
  detection: DetectionResult;
}

export interface ValidationResult {
  findings: Finding[];
  errors: number;
  warnings: number;
  valid: boolean;
}

export type ChangeKind = "create" | "update" | "skip";

export interface PlannedChange {
  path: string;
  kind: ChangeKind;
  reason: string;
  owner: Owner;
  content?: string;
  beforeHash?: string | null;
}

export interface ChangePlan {
  root: string;
  changes: PlannedChange[];
  adapters: AdapterStatus[];
  registry: Registry;
  findings: Finding[];
}

export interface KnowledgeAdapter {
  id: string;
  name: string;
  priority: number;
  detect(project: ProjectSnapshot): DetectionResult;
  discoverSources(project: ProjectSnapshot): AdapterDiscovery;
  validate?(project: ProjectSnapshot, registry: Registry): Finding[];
}

export interface WritePolicyContext {
  directHumanInstruction?: boolean;
  confirmedChange?: boolean;
  systemOperation?: boolean;
}

export function canAgentWrite(
  owner: Owner,
  context: WritePolicyContext = {},
): boolean {
  switch (owner) {
    case "agent":
      return true;
    case "shared":
      return context.confirmedChange === true;
    case "human":
      return context.directHumanInstruction === true;
    case "system":
      return context.systemOperation === true;
    case "generated":
    case "external":
      return false;
  }
}

export function sourcePaths(source: KnowledgeSource): string[] {
  return Array.isArray(source.path) ? source.path : [source.path];
}
