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

export function isDuplicate(idempotencyKey: string): boolean {
  // Check in-memory first
  if (idempotencyKeys.has(idempotencyKey)) return true;
  // In production, check DB
  return false; // DB check handled in processPayload
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

  // 1. Find or create repository
  const fullName = payload.repository;
  const repoName = fullName.split("/").pop() || fullName;
  let repo = await prisma.repository.findFirst({
    where: { organizationId: orgId, fullName },
  });
  if (!repo) {
    repo = await prisma.repository.create({
      data: {
        organizationId: orgId,
        name: repoName,
        fullName,
        connected: true,
        integrationStatus: "connected",
      },
    });
  }

  // 2. Find or create workflow
  let workflowId: string | null = null;
  if (payload.workflow) {
    let wf = await prisma.workflow.findFirst({
      where: { repositoryId: repo.id, name: payload.workflow },
    });
    if (!wf) {
      wf = await prisma.workflow.create({
        data: {
          repositoryId: repo.id,
          name: payload.workflow,
          path: `.github/workflows/${payload.workflow.toLowerCase().replace(/s+/g, "-")}.yml`,
        },
      });
    }
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

export function getRun(runId: string): StoredRun | undefined {
  return runs.get(runId);
}

export function getAllRuns(): StoredRun[] {
  return Array.from(runs.values()).sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime());
}

export function getRunCount(): number {
  return runs.size;
}

export function clearRuns(): void {
  runs.clear();
  idempotencyKeys.clear();
}
