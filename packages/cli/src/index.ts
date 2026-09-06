#!/usr/bin/env node

import path from "node:path";

import {
  AGENTS_COVERAGE_PATH,
  CONTEXTTEND_VERSION,
  RECORD_EVENTS,
  activeAdapterIds,
  applyInitPlan,
  applyIntegrationPlan,
  applyUpdatePlan,
  buildAgentCoverageSnapshot,
  buildClaudeBridgePlan,
  buildCodexHooksPlan,
  buildInitPlan,
  buildUpdatePlan,
  captureWorkRecovery,
  checkpointWork,
  completeWork,
  diffProject,
  checkAgentCoverage,
  discoverWithAdapters,
  getProjectStatus,
  getWorkStatus,
  migrateProjectState,
  recordEvent,
  scanProject,
  startWork,
  summarizeInitPlan,
  validateProject,
  writeAgentCoverageSnapshot,
  type ChangePlan,
  type Finding,
  type ActiveWorkStatus,
  type RecordEvent,
  type ValidationResult,
  type IntegrationPlan,
  type WorkRecovery,
  type WorkStatusResult,
} from "@contexttend/core";
import { Command, InvalidArgumentError } from "commander";

interface OutputOptions {
  json?: boolean;
}

function projectRoot(target: string): string {
  return path.resolve(target);
}

function writeJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function line(value = ""): void {
  process.stdout.write(`${value}\n`);
}

function formatFinding(finding: Finding): string {
  const location = finding.path ? ` [${finding.path}]` : "";
  return `${finding.level === "error" ? "x" : finding.level === "warning" ? "!" : "i"} ${finding.code}${location} ${finding.message}`;
}

function showFindings(findings: Finding[]): void {
  for (const finding of findings) {
    line(formatFinding(finding));
    if (finding.remediation) line(`  -> ${finding.remediation}`);
  }
}

function showValidation(result: ValidationResult): void {
  if (result.findings.length === 0) line("✓ No deterministic findings");
  else showFindings(result.findings);
  line("");
  line(
    `Validation: ${result.valid ? "healthy" : "failed"} (${result.errors} errors, ${result.warnings} warnings)`,
  );
}

const WORK_STATUS_FILE_PREVIEW = 25;

function compactRecovery(recovery: WorkRecovery | null): unknown {
  if (recovery === null) return null;
  return {
    capturedAt: recovery.capturedAt,
    source: recovery.source,
    gitHead: recovery.gitHead,
    totalChangedFiles: recovery.totalChangedFiles,
    truncated:
      recovery.truncated ||
      recovery.changedFiles.length > WORK_STATUS_FILE_PREVIEW,
    changedFiles: recovery.changedFiles
      .slice(0, WORK_STATUS_FILE_PREVIEW)
      .map(({ path: filePath, status, previousPath }) => ({
        path: filePath,
        status,
        ...(previousPath === undefined ? {} : { previousPath }),
      })),
  };
}

function compactWorkStatus(result: WorkStatusResult): unknown {
  const work = result.work;
  return {
    active: result.active,
    stale: result.stale,
    reasons: result.reasons,
    work:
      work === null
        ? null
        : {
            id: work.id,
            title: work.title,
            status: work.status,
            path: work.path,
            recoveryPath: work.recoveryPath,
            startedAt: work.startedAt,
            checkpointedAt: work.checkpointedAt,
          },
    currentExists: result.currentExists,
    currentBytes: result.currentBytes,
    recovery: compactRecovery(result.liveRecovery),
  };
}

function showPlan(title: string, plan: ChangePlan, applied: boolean): void {
  line("ContextTend");
  line("");
  line(title);
  line(`Repository: ${plan.root}`);
  line("");
  line("Knowledge systems detected");
  const detected = plan.adapters.filter((adapter) => adapter.detection.detected);
  if (detected.length === 0) line("- none");
  for (const adapter of detected) {
    line(`✓ ${adapter.name} (${adapter.detection.confidence})`);
    for (const evidence of adapter.detection.evidence) line(`  ${evidence}`);
  }
  line("");
  line(applied ? "Applied changes" : "Proposed changes");
  for (const change of plan.changes) {
    const symbol = change.kind === "create" ? "+" : change.kind === "update" ? "~" : "=";
    line(`${symbol} ${change.path} — ${change.reason} [${change.owner}]`);
  }
  if (plan.findings.length > 0) {
    line("");
    line("Findings");
    showFindings(plan.findings);
  }
  if (!applied) {
    line("");
    line("No files changed. Re-run with --apply to apply this exact class of changes.");
  }
}

function setValidationExitCode(result: ValidationResult): void {
  if (!result.valid) process.exitCode = 1;
}

function showIntegrationPlan(plan: IntegrationPlan, applied: boolean): void {
  const change = plan.change;
  line(`ContextTend ${plan.integration}`);
  line("");
  line(`Repository  ${plan.root}`);
  line(`${change.kind === "create" ? "+" : change.kind === "update" ? "~" : "="} ${change.path} — ${change.reason}`);
  if (!applied && change.kind !== "skip") {
    line("");
    line("No files changed. Re-run with --apply after reviewing the integration.");
  }
}

function parseRecordEvent(value: string): RecordEvent {
  if ((RECORD_EVENTS as readonly string[]).includes(value)) {
    return value as RecordEvent;
  }
  throw new InvalidArgumentError(
    `Expected one of: ${RECORD_EVENTS.join(", ")}`,
  );
}

function parseActiveWorkStatus(value: string): ActiveWorkStatus {
  if (value === "active" || value === "blocked") return value;
  throw new InvalidArgumentError("Expected active or blocked");
}

const program = new Command();
program
  .name("contexttend")
  .description("Living project knowledge governance for coding agents")
  .version(CONTEXTTEND_VERSION)
  .showHelpAfterError();

program
  .command("init")
  .description("Discover, adopt, and safely initialize project knowledge")
  .argument("[path]", "repository path", ".")
  .option("--dry-run", "preview only (the default)")
  .option("--apply", "apply the proposed deterministic changes")
  .option("--native", "prefer native sources only where no canonical source exists")
  .option("--json", "emit machine-readable JSON")
  .action(async (target: string, options: OutputOptions & {
    apply?: boolean;
    dryRun?: boolean;
    native?: boolean;
  }) => {
    if (options.apply && options.dryRun) {
      throw new Error("--apply and --dry-run cannot be used together");
    }
    const plan = await buildInitPlan(projectRoot(target), {
      mode: options.native ? "native" : "adaptive",
    });
    if (!options.apply) {
      if (options.json) writeJson({ applied: false, summary: summarizeInitPlan(plan), plan });
      else showPlan("Repository analysis", plan, false);
      return;
    }
    const state = await applyInitPlan(plan);
    const validation = await validateProject(plan.root);
    if (options.json) {
      writeJson({ applied: true, summary: summarizeInitPlan(plan), plan, state, validation });
    } else {
      showPlan("Repository initialized", plan, true);
      line("");
      showValidation(validation);
    }
    setValidationExitCode(validation);
  });

program
  .command("status")
  .description("Show knowledge coverage and health")
  .argument("[path]", "repository path", ".")
  .option("--json", "emit machine-readable JSON")
  .action(async (target: string, options: OutputOptions) => {
    const status = await getProjectStatus(projectRoot(target));
    if (options.json) {
      writeJson({ ...status, work: compactWorkStatus(status.work) });
      return;
    }
    const sources = Object.values(status.registry.sources);
    const canonical = sources.filter((source) => source.authority === "canonical").length;
    const historical = sources.filter((source) => source.authority === "historical").length;
    const detected = activeAdapterIds(status.adapters);
    line("ContextTend");
    line("");
    line(`Version          ${status.state.contextTendVersion}`);
    line(`Registry         ${status.validation.valid ? "healthy" : "needs attention"}`);
    line(`Adapters         ${detected.length > 0 ? detected.join(", ") : "native"}`);
    line(`Sources          ${sources.length}`);
    line(`Canonical        ${canonical}`);
    line(`Historical       ${historical}`);
    line(`Findings         ${status.validation.errors} errors, ${status.validation.warnings} warnings`);
    line(`Last onboarding  ${status.state.lastOnboarding ?? "never"}`);
    line(`Last sync        ${status.state.lastSync ?? "never"}`);
    line(`Last memory audit ${status.state.lastMemoryAudit ?? "never"}`);
    line(`Last harness audit ${status.state.lastHarnessAudit ?? "never"}`);
    line(
      `Active work      ${status.work.work?.title ?? "none"}${status.work.stale ? " (stale)" : ""}`,
    );
    line("");
    line(`Knowledge health: ${status.validation.valid ? "healthy" : "needs attention"}`);
  });

const work = program
  .command("work")
  .description("Manage compact, portable active-work checkpoints");

work
  .command("status")
  .description("Compare active-work metadata with the live repository state")
  .argument("[path]", "repository path", ".")
  .option("--json", "emit machine-readable JSON")
  .option("--verbose", "include full recovery hashes in JSON and output")
  .action(async (
    target: string,
    options: OutputOptions & { verbose?: boolean },
  ) => {
    const result = await getWorkStatus(projectRoot(target));
    if (options.json) {
      writeJson(options.verbose ? result : compactWorkStatus(result));
      return;
    }
    line("ContextTend active work");
    line("");
    if (!result.active || result.work === null) {
      line("Active work     none");
      line("Resume action   start a new checkpoint only for substantive work");
      return;
    }
    line(`Title           ${result.work.title}`);
    line(`Status          ${result.work.status}`);
    line(`Checkpoint      ${result.work.checkpointedAt}`);
    line(`Document        ${result.work.path}`);
    line(`Recovery        ${result.work.recoveryPath}`);
    line(`Freshness       ${result.stale ? "stale" : "current"}`);
    if (result.reasons.length > 0) {
      line("");
      line("Recovery findings");
      for (const reason of result.reasons) line(`- ${reason}`);
    }
    const changed = result.liveRecovery?.changedFiles ?? [];
    if (changed.length > 0) {
      line("");
      line("Current changed files");
      const shown = options.verbose
        ? changed
        : changed.slice(0, WORK_STATUS_FILE_PREVIEW);
      for (const file of shown) line(`- ${file.status} ${file.path}`);
      if (
        result.liveRecovery &&
        result.liveRecovery.totalChangedFiles > shown.length
      ) {
        line(
          `- ... ${result.liveRecovery.totalChangedFiles - shown.length} more; use --verbose`,
        );
      }
    }
  });

work
  .command("start")
  .description("Start one substantive work item and create its compact template")
  .argument("[path]", "repository path", ".")
  .requiredOption("--title <title>", "short work title")
  .option("--objective <objective>", "concise objective; defaults to title")
  .option("--json", "emit machine-readable JSON")
  .action(async (
    target: string,
    options: OutputOptions & { title: string; objective?: string },
  ) => {
    const result = await startWork(projectRoot(target), {
      title: options.title,
      objective: options.objective,
    });
    if (options.json) writeJson(compactWorkStatus(result));
    else {
      line(`Started active work: ${result.work?.title ?? options.title}`);
      line(`Edit ${result.work?.path ?? ".contexttend/work/current.md"} and run contexttend work checkpoint.`);
    }
  });

work
  .command("checkpoint")
  .description("Validate current.md and record its repository fingerprint")
  .argument("[path]", "repository path", ".")
  .option(
    "--state <state>",
    "active work state: active or blocked",
    parseActiveWorkStatus,
  )
  .option("--json", "emit machine-readable JSON")
  .action(async (
    target: string,
    options: OutputOptions & { state?: ActiveWorkStatus },
  ) => {
    const result = await checkpointWork(projectRoot(target), {
      status: options.state,
    });
    if (options.json) writeJson(compactWorkStatus(result));
    else {
      line(`Checkpoint recorded at ${result.work?.checkpointedAt ?? "unknown"}`);
      line(`Freshness: ${result.stale ? "stale" : "current"}`);
    }
  });

work
  .command("recover")
  .description("Capture deterministic recovery evidence without semantic inference")
  .argument("[path]", "repository path", ".")
  .option("--quiet", "write no output on success")
  .option("--json", "emit machine-readable JSON")
  .option("--verbose", "include changed-file hashes in JSON")
  .action(async (
    target: string,
    options: OutputOptions & { quiet?: boolean; verbose?: boolean },
  ) => {
    const recovery = await captureWorkRecovery(projectRoot(target));
    if (options.json) {
      writeJson(options.verbose ? recovery : compactRecovery(recovery));
    }
    else if (!options.quiet) {
      line(
        recovery === null
          ? "No active work; recovery snapshot was not changed."
          : `Recovery captured at ${recovery.capturedAt}`,
      );
    }
  });

work
  .command("complete")
  .description("Close active work only when its checkpoint matches the repository")
  .argument("[path]", "repository path", ".")
  .option("--json", "emit machine-readable JSON")
  .action(async (target: string, options: OutputOptions) => {
    const state = await completeWork(projectRoot(target));
    if (options.json) writeJson(state);
    else line(`Completed active work: ${state.lastCompletedWork?.title ?? "unknown"}`);
  });

function addIntegrationCommand(
  name: "install-codex-hooks" | "install-claude-bridge",
  description: string,
  builder: (root: string) => Promise<IntegrationPlan>,
): void {
  work
    .command(name)
    .description(description)
    .argument("[path]", "repository path", ".")
    .option("--dry-run", "preview only (the default)")
    .option("--apply", "apply the marker-bounded integration")
    .option("--json", "emit machine-readable JSON")
    .action(async (
      target: string,
      options: OutputOptions & { apply?: boolean; dryRun?: boolean },
    ) => {
      if (options.apply && options.dryRun) {
        throw new Error("--apply and --dry-run cannot be used together");
      }
      const plan = await builder(projectRoot(target));
      if (!options.apply) {
        if (options.json) writeJson({ applied: false, plan });
        else showIntegrationPlan(plan, false);
        return;
      }
      const change = await applyIntegrationPlan(plan);
      if (options.json) writeJson({ applied: change.kind !== "skip", plan });
      else showIntegrationPlan(plan, true);
    });
}

addIntegrationCommand(
  "install-codex-hooks",
  "Preview or merge optional low-context Codex lifecycle hooks",
  buildCodexHooksPlan,
);

addIntegrationCommand(
  "install-claude-bridge",
  "Preview or upsert a no-hooks CLAUDE.md continuity bridge",
  buildClaudeBridgePlan,
);

for (const commandName of ["doctor", "validate"] as const) {
  program
    .command(commandName)
    .description(
      commandName === "doctor"
        ? "Run deterministic project diagnostics"
        : "Validate project knowledge for local use or CI",
    )
    .argument("[path]", "repository path", ".")
    .option("--json", "emit machine-readable JSON")
    .action(async (target: string, options: OutputOptions) => {
      const result = await validateProject(projectRoot(target));
      if (options.json) writeJson(result);
      else {
        line(commandName === "doctor" ? "ContextTend doctor" : "ContextTend validation");
        line("");
        showValidation(result);
      }
      setValidationExitCode(result);
    });
}

program
  .command("diff")
  .description("Show deterministic changes since the last recorded sync")
  .argument("[path]", "repository path", ".")
  .option("--json", "emit machine-readable JSON")
  .action(async (target: string, options: OutputOptions) => {
    const result = await diffProject(projectRoot(target));
    if (options.json) {
      writeJson(result);
      return;
    }
    line("Knowledge registry diff");
    line("");
    for (const source of result.sources) {
      const location = Array.isArray(source.path) ? source.path.join(", ") : source.path ?? "(removed)";
      line(`${source.status === "unchanged" ? "=" : "~"} ${source.role ?? source.id}`);
      line(`  ${location}: ${source.status}`);
    }
    line("");
    line(`${result.changed} source(s) differ from the recorded baseline.`);
  });

program
  .command("adapters")
  .description("Show deterministic adapter detection evidence")
  .argument("[path]", "repository path", ".")
  .option("--json", "emit machine-readable JSON")
  .action(async (target: string, options: OutputOptions) => {
    const snapshot = await scanProject(projectRoot(target));
    const result = {
      project: {
        root: snapshot.root,
        git: snapshot.isGitRepository,
        gitStatus: snapshot.gitStatus,
        packageManagers: snapshot.packageManagers,
        languages: snapshot.languages,
        frameworks: snapshot.frameworks,
        monorepo: snapshot.monorepo,
      },
      adapters: discoverWithAdapters(snapshot).statuses,
    };
    if (options.json) {
      writeJson(result);
      return;
    }
    line("ContextTend adapters");
    line("");
    for (const adapter of result.adapters) {
      line(`${adapter.detection.detected ? "✓" : "-"} ${adapter.name}: ${adapter.detection.confidence}`);
      for (const evidence of adapter.detection.evidence) line(`  ${evidence}`);
    }
  });

const agentsCoverage = program
  .command("agents-coverage")
  .description("Guard lossless migration of detailed AGENTS.md knowledge");

agentsCoverage
  .command("snapshot")
  .description("Capture a safe pre-migration AGENTS anchor baseline")
  .argument("[path]", "repository path", ".")
  .option("--source <path>", "source path inside the repository", "AGENTS.md")
  .option("--git-ref <ref>", "read the source path from this Git ref")
  .option("--baseline <path>", "coverage baseline path", AGENTS_COVERAGE_PATH)
  .option("--dry-run", "preview only (the default)")
  .option("--apply", "write the generated baseline")
  .option("--json", "emit machine-readable JSON")
  .action(async (target: string, options: OutputOptions & {
    source: string;
    gitRef?: string;
    baseline: string;
    dryRun?: boolean;
    apply?: boolean;
  }) => {
    if (options.apply && options.dryRun) {
      throw new Error("--apply and --dry-run cannot be used together");
    }
    const root = projectRoot(target);
    const snapshot = await buildAgentCoverageSnapshot(root, {
      sourcePath: options.source,
      gitRef: options.gitRef,
    });
    if (options.apply) {
      await writeAgentCoverageSnapshot(root, snapshot, options.baseline);
    }
    if (options.json) {
      writeJson({ applied: options.apply === true, baseline: options.baseline, snapshot });
      return;
    }
    line("AGENTS coverage snapshot");
    line("");
    line(`Source     ${snapshot.source.gitRef ? `${snapshot.source.gitRef}:` : ""}${snapshot.source.path}`);
    line(`Lines      ${snapshot.source.lineCount}`);
    line(`Sections   ${snapshot.sections.length}`);
    line(`Anchors    ${snapshot.anchors.length}`);
    line(`Baseline   ${options.baseline} (${options.apply ? "written" : "preview"})`);
    if (!options.apply) line("No files changed. Re-run with --apply after reviewing the source.");
  });

agentsCoverage
  .command("check")
  .description("Check AGENTS anchors against the active knowledge corpus")
  .argument("[path]", "repository path", ".")
  .option("--baseline <path>", "coverage baseline path", AGENTS_COVERAGE_PATH)
  .option("--target <paths...>", "override knowledge paths to scan")
  .option("--json", "emit machine-readable JSON")
  .action(async (target: string, options: OutputOptions & {
    baseline: string;
    target?: string[];
  }) => {
    const result = await checkAgentCoverage(projectRoot(target), {
      baselinePath: options.baseline,
      targetPaths: options.target,
    });
    if (options.json) {
      writeJson(result);
    } else {
      line("AGENTS migration coverage");
      line("");
      line(`Anchors    ${result.anchors.preserved}/${result.anchors.total} preserved`);
      line(`Sections   ${result.sections.headingsFound}/${result.sections.total} headings discoverable`);
      line(`Files      ${result.scannedFiles.length} knowledge files scanned`);
      if (result.anchors.missing.length > 0) {
        line("");
        line("Missing anchors");
        for (const anchor of result.anchors.missing) {
          line(`- ${anchor.value} [${anchor.kind}; source lines ${anchor.lines.join(", ")}]`);
        }
      }
      line("");
      line(result.valid ? "Coverage: complete" : "Coverage: incomplete");
    }
    if (!result.valid) process.exitCode = 1;
  });

program
  .command("update")
  .description("Safely update only ContextTend-managed assets")
  .argument("[path]", "repository path", ".")
  .option("--dry-run", "preview only (the default)")
  .option("--apply", "apply safe managed updates")
  .option("--json", "emit machine-readable JSON")
  .action(async (target: string, options: OutputOptions & {
    apply?: boolean;
    dryRun?: boolean;
  }) => {
    if (options.apply && options.dryRun) {
      throw new Error("--apply and --dry-run cannot be used together");
    }
    const plan = await buildUpdatePlan(projectRoot(target));
    if (!options.apply) {
      if (options.json) writeJson({ applied: false, plan });
      else showPlan("Managed update preview", plan, false);
      return;
    }
    const state = await applyUpdatePlan(plan);
    const validation = await validateProject(plan.root);
    if (options.json) writeJson({ applied: true, plan, state, validation });
    else {
      showPlan("Managed update applied", plan, true);
      line("");
      showValidation(validation);
    }
    setValidationExitCode(validation);
  });

program
  .command("migrate")
  .description("Migrate ContextTend machine state only")
  .argument("[path]", "repository path", ".")
  .option("--dry-run", "preview only (the default)")
  .option("--apply", "apply a supported deterministic migration")
  .option("--json", "emit machine-readable JSON")
  .action(async (target: string, options: OutputOptions & {
    apply?: boolean;
    dryRun?: boolean;
  }) => {
    if (options.apply && options.dryRun) {
      throw new Error("--apply and --dry-run cannot be used together");
    }
    const result = await migrateProjectState(projectRoot(target), options.apply === true);
    if (options.json) writeJson({ applied: options.apply === true && result.changed, ...result });
    else {
      line(
        `State schema ${result.migratedFrom} -> ${result.migratedTo}: ${result.changed ? (options.apply ? "applied" : "available") : "already current"}`,
      );
      if (result.changed && !options.apply) line("No files changed. Re-run with --apply.");
    }
  });

program
  .command("record")
  .description("Record completion of a semantic Skill workflow")
  .argument("<event>", RECORD_EVENTS.join(" | "), parseRecordEvent)
  .argument("[path]", "repository path", ".")
  .option("--source <id>", "external source refreshed by a harness audit")
  .option("--json", "emit machine-readable JSON")
  .action(async (event: RecordEvent, target: string, options: OutputOptions & {
    source?: string;
  }) => {
    const state = await recordEvent(projectRoot(target), event, { source: options.source });
    if (options.json) writeJson(state);
    else line(`Recorded ${event} at ${state.updatedAt}`);
  });

program.parseAsync(process.argv).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`ContextTend error: ${message}\n`);
  process.exitCode = 1;
});
