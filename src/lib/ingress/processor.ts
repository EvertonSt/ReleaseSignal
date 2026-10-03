import type { IngestPayload } from "./validator";
import { computeStats } from "./validator";
import { prisma, isDemoMode, DEFAULT_ORG_ID } from "../db";
import {
  classifyFailure,
  generateSignature,
  assignSeverity,
  suggestAction,
} from "../failure-analysis/classifier";
import { evaluateGate, type EvaluationInput } from "../quality-gates/evaluator";
import { generateId } from "../utils";

// ── In-Memory Store (Demo Mode) ────────────────────────────────────────────
// In production, everything writes to PostgreSQL. In demo mode, runs live in memory.

interface StoredRun {
  id: string;
  payload: IngestPayload;
  stats: ReturnType<typeof computeStats>;
  status: "received" | "processing" | "processed" | "failed";
  receivedAt: Date;
  processedAt?: Date;
  duration?: number;
  gateDecision: "pass" | "warning" | "blocked" | "pending";
}

// In-memory stores for demo mode
const runs = new Map<string, StoredRun>();
const idempotencyKeys = new Set<string>();

/**
 * Run IDs were `run_${Date.now()}_${Math.random()...}`, which is guessable from
 * a known ingest timestamp and carries no real entropy after the millisecond
 * prefix. The prefix stays - the end-to-end suite matches on it, and it is
 * what makes a log line readable - but the body is now a UUID.
 */
function generateRunId(): string {
  return generateId("run");
}

/**
 * Where a workflow's definition lives, derived from the name the CI system
 * reported.
 *
 * Two bugs lived in the expression this replaces. The regex was `/s+/g`, so it
 * replaced runs of the letter "s" rather than whitespace - a workflow called
 * "tests" became "te-ts". And it appended `.yml` unconditionally, so a payload
 * that already said `integration.yml` produced `integration.yml.yml`.
 *
 * Exported so the rule is tested directly; a path that is quietly wrong is
 * harmless until someone tries to use it.
 */
export function workflowFilePath(workflow: string): string {
  const trimmed = workflow.trim().toLowerCase();
  // Strip the one prefix that is a genuine convention, rather than taking an
  // arbitrary last path segment - "Release // Gate" is a name with punctuation
  // in it, not a path, and splitting it would silently drop "Release".
  const base = trimmed.replace(/^\.?github\/workflows\//, "");
  const withoutExtension = base.replace(/\.(ya?ml)$/, "");
  const slug = withoutExtension.replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return `.github/workflows/${slug || "workflow"}.yml`;
}

/**
 * Is this idempotency key already recorded?
 *
 * It has to be ASYNC, and until the database integration test existed it was
 * not. It used to be synchronous and check only the in-memory Set, on the
 * reasoning that "the DB check is handled in processPayload" - but
 * processPayload does not signal a duplicate, it RETURNS THE EXISTING RUN. So
 * a retried CI webhook in production was answered `201` again, with the
 * original run's data, and no error. The documented `409` only ever happened
 * inside a single process's lifetime in demo mode.
 *
 * That is the whole reason the route's 409 existed on paper and not in
 * production.
 */
export async function isDuplicate(idempotencyKey: string): Promise<boolean> {
  if (idempotencyKeys.has(idempotencyKey)) return true;
  if (isDemoMode()) return false;

  const existing = await prisma.testRun.findUnique({
    where: { idempotencyKey },
    select: { id: true },
  });
  return existing !== null;
}

function computeGateDecision(
  stats: ReturnType<typeof computeStats>
): "pass" | "warning" | "blocked" | "pending" {
  if (stats.total === 0) return "pending";
  const passRate = (stats.passed / stats.total) * 100;
  if (passRate < 80 || stats.failed > 5) return "blocked";
  if (passRate < 95 || stats.failed > 0) return "warning";
  return "pass";
}

/**
 * Process an ingested payload. In production, writes to PostgreSQL.
 * In demo mode, stores in memory.
 */
export async function processPayload(payload: IngestPayload): Promise<StoredRun> {
  const runId = generateRunId();
  const stats = computeStats(payload);
  const gateDecision = computeGateDecision(stats);
  const duration = payload.suites.reduce(
    (total, suite) => total + suite.tests.reduce((sum, test) => sum + (test.duration || 0), 0),
    0
  );

  if (isDemoMode()) {
    return processInMemory(runId, payload, stats, gateDecision, duration);
  }

  return processToDatabase(runId, payload, stats, gateDecision, duration);
}

// ── In-Memory Processing (Demo Mode) ─────────────────────────────────────

function processInMemory(
  runId: string,
  payload: IngestPayload,
  stats: ReturnType<typeof computeStats>,
  gateDecision: "pass" | "warning" | "blocked" | "pending",
  duration: number
): StoredRun {
  const run: StoredRun = {
    id: runId,
    payload,
    stats,
    status: "processed",
    receivedAt: new Date(),
    processedAt: new Date(),
    duration,
    gateDecision,
  };
  runs.set(runId, run);
  if (payload.idempotencyKey) idempotencyKeys.add(payload.idempotencyKey);
  return run;
}

// ── Database Processing (Production Mode) ─────────────────────────────────

async function processToDatabase(
  runId: string,
  payload: IngestPayload,
  stats: ReturnType<typeof computeStats>,
  gateDecision: "pass" | "warning" | "blocked" | "pending",
  duration: number
): Promise<StoredRun> {
  const orgId = DEFAULT_ORG_ID;
  const now = new Date();

  // 1. Find or create repository.
  //
  // `upsert`, not find-then-create. Two CI pipelines reporting the same
  // repository at the same moment both used to find nothing and both created,
  // and one lost on the unique constraint with a 500. That is not a theoretical
  // race: a push and its pull-request run routinely land together.
  const fullName = payload.repository;
  const repoName = fullName.split("/").pop() || fullName;
  const repo = await prisma.repository.upsert({
    where: { organizationId_fullName: { organizationId: orgId, fullName } },
    create: {
      organizationId: orgId,
      name: repoName,
      fullName,
      connected: true,
      integrationStatus: "connected",
    },
    update: {},
  });

  // 2. Find or create workflow. Atomic for the same reason as the repository,
  // which is why migration 1 adds the unique constraint this relies on.
  let workflowId: string | null = null;
  if (payload.workflow) {
    const wf = await prisma.workflow.upsert({
      where: { repositoryId_name: { repositoryId: repo.id, name: payload.workflow } },
      create: {
        repositoryId: repo.id,
        name: payload.workflow,
        path: workflowFilePath(payload.workflow),
      },
      update: {},
    });
    workflowId = wf.id;
  }

  // 3. Check idempotency
  if (payload.idempotencyKey) {
    const existing = await prisma.testRun.findUnique({
      where: { idempotencyKey: payload.idempotencyKey },
    });
    if (existing) {
      return {
        id: existing.id,
        payload,
        stats,
        status: "processed",
        receivedAt: existing.createdAt,
        processedAt: existing.createdAt,
        duration: existing.duration ?? undefined,
        gateDecision: existing.gateDecision as StoredRun["gateDecision"],
      };
    }
  }

  // 4. Create the test run
  const testRun = await prisma.testRun.create({
    data: {
      id: runId,
      organizationId: orgId,
      repositoryId: repo.id,
      workflowId,
      branch: payload.branch,
      commitSha: payload.commit,
      commitMessage: payload.commitMessage,
      prNumber: payload.pullRequest?.number,
      prTitle: payload.pullRequest?.title,
      prAuthor: payload.pullRequest?.author,
      environment: payload.environment,
      status: gateDecision === "blocked" ? "failed" : "passed",
      startedAt: now,
      finishedAt: now,
      duration,
      totalTests: stats.total,
      passed: stats.passed,
      failed: stats.failed,
      skipped: stats.skipped,
      flaky: stats.flaky,
      retried: 0,
      gateDecision,
      browser: payload.browser,
      os: payload.os,
      trigger: payload.trigger,
      actor: payload.actor,
      idempotencyKey: payload.idempotencyKey,
    },
  });

  // 5. Create test suites and test cases
  for (const suite of payload.suites) {
    const dbSuite = await prisma.testSuite.create({
      data: {
        testRunId: testRun.id,
        name: suite.name,
        file: suite.file,
        totalTests: suite.tests.length,
        passed: suite.tests.filter((t) => t.status === "passed").length,
        failed: suite.tests.filter((t) => t.status === "failed").length,
        skipped: suite.tests.filter((t) => t.status === "skipped").length,
        duration: suite.tests.reduce((s, t) => s + (t.duration || 0), 0),
      },
    });

    for (const test of suite.tests) {
      await prisma.testCase.create({
        data: {
          testSuiteId: dbSuite.id,
          title: test.title,
          fullTitle: test.fullTitle || test.title,
          status: test.status,
          duration: test.duration,
          retries: test.retries,
          retryResults: test.retryResults || undefined,
          errorMessage: test.errorMessage,
          stackTrace: test.stackTrace,
          locator: test.locator,
          browser: test.browser,
          screenshotUrl: test.screenshotUrl,
          videoUrl: test.videoUrl,
          traceUrl: test.traceUrl,
          logs: test.logs,
        },
      });
    }
  }

  // 6. Classify failures and create failure clusters
  for (const suite of payload.suites) {
    for (const test of suite.tests) {
      if (test.status !== "failed" && test.status !== "timed_out") continue;

      const sig = generateSignature({
        errorMessage: test.errorMessage,
        stackTrace: test.stackTrace,
        testTitle: test.title,
      });

      const classification = classifyFailure({
        errorMessage: test.errorMessage,
        stackTrace: test.stackTrace,
        testTitle: test.title,
        retryResults: test.retryResults,
      });

      const severity = assignSeverity(classification.classification, {
        isOnMain: payload.branch === "main",
      });

      const suggestedAction = suggestAction(classification.classification, {
        testName: test.title,
        error: test.errorMessage,
      });

      // Upsert failure cluster (group by signature)
      const existingCluster = await prisma.failureCluster.findFirst({
        where: { organizationId: orgId, signature: sig.hash },
      });

      if (existingCluster) {
        await prisma.failureCluster.update({
          where: { id: existingCluster.id },
          data: {
            affectedTests: { increment: 1 },
            affectedRuns: { increment: 1 },
            occurrences: { increment: 1 },
            lastSeen: now,
            aiExplanation: classification.evidence.join("; "),
          },
        });
      } else {
        await prisma.failureCluster.create({
          data: {
            organizationId: orgId,
            runId: testRun.id,
            name: `${test.title} — ${classification.classification}`,
            signature: sig.hash,
            classification: classification.classification,
            confidence: classification.confidence,
            severity,
            errorMessage: test.errorMessage || "Unknown error",
            stackTrace: test.stackTrace,
            locator: test.locator,
            affectedTests: 1,
            affectedRuns: 1,
            occurrences: 1,
            firstSeen: now,
            lastSeen: now,
            aiExplanation: classification.evidence.join("; "),
            suggestedAction,
          },
        });
      }
    }
  }

  // 7. Evaluate quality gates
  const gates = await prisma.qualityGate.findMany({
    where: { organizationId: orgId, enabled: true },
    include: { rules: true },
  });

  for (const gate of gates) {
    const evalInput: EvaluationInput = {
      totalTests: stats.total,
      failedTests: stats.failed,
      passedTests: stats.passed,
      flakyTests: stats.flaky,
      newRegressions: stats.failed,
      newFailures: stats.failed,
      p95Duration: duration / 1000,
      branch: payload.branch,
      environment: payload.environment,
    };

    const result = evaluateGate(
      gate.rules.map((r) => ({
        id: r.id,
        gateId: r.gateId,
        type: r.type as
          | "pass_rate"
          | "failure_rate"
          | "flaky_rate"
          | "new_regressions"
          | "new_failures"
          | "performance_budget"
          | "test_coverage"
          | "required_suites",
        condition: r.condition as "less_than" | "greater_than" | "equals" | "not_equals",
        threshold: r.threshold,
        severity: r.severity,
        enabled: r.enabled,
        description: r.description,
      })),
      evalInput
    );

    await prisma.gateEvaluation.create({
      data: {
        gateId: gate.id,
        decision: result.decision,
        summary: result.summary,
        /*
         * Projected field by field rather than round-tripped through
         * JSON.parse(JSON.stringify(...)). The round-trip was doing nothing
         * except silently rewriting `undefined` as `null` and throwing away the
         * types; naming the columns doubles as the schema documentation for a
         * Json column that nothing else can check.
         */
        ruleResults: result.rules.map((rule) => ({
          ruleId: rule.ruleId,
          ruleType: rule.ruleType,
          description: rule.description,
          passed: rule.passed,
          actualValue: rule.actualValue,
          threshold: rule.threshold,
          condition: rule.condition,
          severity: rule.severity,
        })),
      },
    });

    await prisma.qualityGate.update({
      where: { id: gate.id },
      data: { evaluatedAt: now, lastDecision: result.decision },
    });
  }

  // 8. Create audit event
  await prisma.auditEvent.create({
    data: {
      organizationId: orgId,
      action: "ingest",
      resource: "test_run",
      resourceId: testRun.id,
      details: {
        repository: payload.repository,
        branch: payload.branch,
        commit: payload.commit,
        totalTests: stats.total,
        failed: stats.failed,
        gateDecision,
      },
    },
  });

  // 9. Create notifications for failures
  if (stats.failed > 0) {
    await prisma.notification.create({
      data: {
        organizationId: orgId,
        type: gateDecision === "blocked" ? "gate_failure" : "regression_detected",
        title: gateDecision === "blocked" ? "Quality gate blocked" : "Test failures detected",
        message: `${stats.failed} of ${stats.total} tests failed in ${payload.repository} (${payload.branch})`,
        link: "/test-runs",
      },
    });
  }

  return {
    id: testRun.id,
    payload,
    stats,
    status: "processed",
    receivedAt: testRun.createdAt,
    processedAt: now,
    duration,
    gateDecision,
  };
}

// ── Accessors ──────────────────────────────────────────────────────────────

/**
 * What the read endpoints return.
 *
 * Deliberately NOT `StoredRun`: that type carries the full submitted payload,
 * which only the in-memory store has. Deriving a fake payload to satisfy it
 * would be inventing data, so the read model is declared separately and both
 * stores project into it. The route already projected exactly these fields.
 */
export interface RunSummary {
  id: string;
  status: string;
  gateDecision: string;
  stats: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    flaky: number;
    timedOut: number;
  };
  repository: string;
  branch: string;
  commit: string;
  duration?: number;
  receivedAt: Date;
  processedAt?: Date;
}

function summarize(stored: StoredRun): RunSummary {
  return {
    id: stored.id,
    status: stored.status,
    gateDecision: stored.gateDecision,
    stats: stored.stats,
    repository: stored.payload.repository,
    branch: stored.payload.branch,
    commit: stored.payload.commit,
    duration: stored.duration,
    receivedAt: stored.receivedAt,
    processedAt: stored.processedAt,
  };
}

/** The row shape the accessors select. Declared so Prisma's result stays typed. */
type RunRow = {
  id: string;
  status: string;
  gateDecision: string;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  flaky: number;
  branch: string;
  commitSha: string;
  duration: number | null;
  createdAt: Date;
  finishedAt: Date | null;
  repository: { fullName: string } | null;
};

function summarizeRow(row: RunRow): RunSummary {
  return {
    id: row.id,
    // The schema stores a CI status; the read model reports ingestion state,
    // which is always "processed" for a row that exists.
    status: "processed",
    gateDecision: row.gateDecision,
    stats: {
      total: row.totalTests,
      passed: row.passed,
      failed: row.failed,
      skipped: row.skipped,
      flaky: row.flaky,
      // The schema has no timed-out counter; the ingestion payload's
      // `timed_out` maps onto `failed` on the way in, so it is not invented
      // back out here.
      timedOut: 0,
    },
    repository: row.repository?.fullName ?? "",
    branch: row.branch,
    commit: row.commitSha,
    duration: row.duration ?? undefined,
    receivedAt: row.createdAt,
    processedAt: row.finishedAt ?? undefined,
  };
}

const RUN_SELECT = {
  id: true,
  status: true,
  gateDecision: true,
  totalTests: true,
  passed: true,
  failed: true,
  skipped: true,
  flaky: true,
  branch: true,
  commitSha: true,
  duration: true,
  createdAt: true,
  finishedAt: true,
  repository: { select: { fullName: true } },
} as const;

export async function getRun(runId: string): Promise<RunSummary | undefined> {
  if (isDemoMode()) {
    const stored = runs.get(runId);
    return stored ? summarize(stored) : undefined;
  }

  const row = await prisma.testRun.findUnique({ where: { id: runId }, select: RUN_SELECT });
  return row ? summarizeRow(row) : undefined;
}

export async function getAllRuns(limit = 20): Promise<RunSummary[]> {
  if (isDemoMode()) {
    return Array.from(runs.values())
      .sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime())
      .slice(0, limit)
      .map(summarize);
  }

  const rows = await prisma.testRun.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: RUN_SELECT,
  });
  return rows.map(summarizeRow);
}

export async function getRunCount(): Promise<number> {
  if (isDemoMode()) return runs.size;
  return prisma.testRun.count();
}

export function clearRuns(): void {
  runs.clear();
  idempotencyKeys.clear();
}
