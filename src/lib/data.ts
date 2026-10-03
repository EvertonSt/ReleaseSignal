// ── Unified Data Layer ─────────────────────────────────────────────────────
// Provides data access that works in both demo mode (static arrays) and
// production mode (Prisma DB queries). This is the single source of truth.

import { prisma, isDemoMode, DEFAULT_ORG_ID } from "./db";
import { demoTestRuns, demoFlakyTests } from "@/lib/demo/data";
import { demoFailureClusters } from "@/lib/demo/data/failures";
import { demoQualityGates } from "@/lib/demo/data/quality-gates";

// ── Test Runs ──────────────────────────────────────────────────────────────

export interface RunData {
  id: string;
  repository: string;
  branch: string;
  commit: string;
  environment: string;
  stats: { total: number; passed: number; failed: number; skipped: number; flaky: number; timedOut: number };
  gateDecision: string;
  duration?: number;
  receivedAt: Date;
}

export async function getTestRuns(): Promise<RunData[]> {
  if (isDemoMode()) {
    return demoTestRuns.map((r) => ({
      id: r.id,
      repository: r.repository?.name || r.repositoryId,
      branch: r.branch,
      commit: r.commitSha,
      environment: r.environment || "ci",
      stats: {
        total: r.totalTests,
        passed: r.passed,
        failed: r.failed,
        skipped: r.skipped,
        flaky: r.flaky,
        timedOut: 0,
      },
      gateDecision: r.gateDecision || "pending",
      duration: r.duration,
      receivedAt: r.startedAt || new Date(),
    }));
  }

  // Production: fetch from database
  try {
    const runs = await prisma.testRun.findMany({
      where: { organizationId: DEFAULT_ORG_ID },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { repository: true },
    });
    return runs.map((r) => ({
      id: r.id,
      repository: r.repository?.fullName || r.repositoryId,
      branch: r.branch,
      commit: r.commitSha,
      environment: r.environment,
      stats: {
        total: r.totalTests,
        passed: r.passed,
        failed: r.failed,
        skipped: r.skipped,
        flaky: r.flaky,
        timedOut: 0,
      },
      gateDecision: r.gateDecision,
      duration: r.duration ?? undefined,
      receivedAt: r.createdAt,
    }));
  } catch {
    return [];
  }
}

// ── Failure Clusters ───────────────────────────────────────────────────────

export interface FailureData {
  id: string;
  name: string;
  signature: string;
  classification: string;
  confidence: number;
  severity: string;
  errorMessage: string;
  affectedTests: number;
  affectedRuns: number;
  occurrences: number;
  firstSeen: Date;
  lastSeen: Date;
  trend: string;
  aiExplanation?: string;
  suggestedAction?: string;
  triageStatus: string;
}

export async function getFailureClusters(): Promise<FailureData[]> {
  if (isDemoMode()) {
    return demoFailureClusters.map((fc) => ({
      id: fc.id,
      name: fc.name,
      signature: fc.signature,
      classification: fc.classification,
      confidence: fc.confidence,
      severity: fc.severity,
      errorMessage: fc.errorMessage,
      affectedTests: fc.affectedTests,
      affectedRuns: fc.affectedRuns,
      occurrences: fc.occurrences,
      firstSeen: fc.firstSeen,
      lastSeen: fc.lastSeen,
      trend: fc.trend,
      aiExplanation: fc.aiExplanation,
      suggestedAction: fc.suggestedAction,
      triageStatus: fc.triageStatus,
    }));
  }

  try {
    const clusters = await prisma.failureCluster.findMany({
      where: { organizationId: DEFAULT_ORG_ID },
      orderBy: [{ severity: "asc" }, { occurrences: "desc" }],
    });
    return clusters.map((fc) => ({
      id: fc.id,
      name: fc.name,
      signature: fc.signature,
      classification: fc.classification,
      confidence: fc.confidence,
      severity: fc.severity,
      errorMessage: fc.errorMessage,
      affectedTests: fc.affectedTests,
      affectedRuns: fc.affectedRuns,
      occurrences: fc.occurrences,
      firstSeen: fc.firstSeen,
      lastSeen: fc.lastSeen,
      trend: fc.trend,
      aiExplanation: fc.aiExplanation ?? undefined,
      suggestedAction: fc.suggestedAction ?? undefined,
      triageStatus: fc.triageStatus,
    }));
  } catch {
    return [];
  }
}

// ── Quality Gates ──────────────────────────────────────────────────────────

export interface GateData {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  lastDecision: string;
  evaluatedAt?: Date;
  rulesCount: number;
}

export async function getQualityGates(): Promise<GateData[]> {
  if (isDemoMode()) {
    return demoQualityGates.map((g) => ({
      id: g.id,
      name: g.name,
      description: g.description ?? "",
      enabled: g.enabled,
      lastDecision: g.lastDecision || "pending",
      evaluatedAt: g.evaluatedAt,
      rulesCount: g.rules.length,
    }));
  }

  try {
    const gates = await prisma.qualityGate.findMany({
      where: { organizationId: DEFAULT_ORG_ID },
      include: { rules: true },
    });
    return gates.map((g) => ({
      id: g.id,
      name: g.name,
      description: g.description ?? "",
      enabled: g.enabled,
      lastDecision: g.lastDecision || "pending",
      evaluatedAt: g.evaluatedAt ?? undefined,
      rulesCount: g.rules.length,
    }));
  } catch {
    return [];
  }
}

// ── Flaky Tests ────────────────────────────────────────────────────────────

export interface FlakyData {
  id: string;
  title: string;
  repository: string;
  suite: string;
  flakeRate: number;
  totalRuns: number;
  failedRuns: number;
  status: string;
  trend: string;
  lastSeen: Date;
}

export async function getFlakyTests(): Promise<FlakyData[]> {
  if (isDemoMode()) {
    return demoFlakyTests.map((ft) => ({
      id: ft.id,
      title: ft.title,
      repository: ft.repository,
      suite: ft.suite,
      flakeRate: ft.flakeRate,
      totalRuns: ft.totalRuns,
      failedRuns: ft.flakyRuns,
      status: ft.status,
      trend: ft.trend,
      lastSeen: ft.lastSeen,
    }));
  }

  try {
    const tests = await prisma.flakyTest.findMany({
      where: { organizationId: DEFAULT_ORG_ID },
      orderBy: { flakeRate: "desc" },
    });
    return tests.map((ft) => ({
      id: ft.id,
      title: ft.title,
      repository: ft.repository,
      suite: ft.suite ?? "",
      flakeRate: ft.flakeRate,
      totalRuns: ft.totalRuns,
      failedRuns: ft.flakyRuns,
      status: ft.status,
      trend: ft.trend,
      lastSeen: ft.lastSeen,
    }));
  } catch {
    return [];
  }
}

// ── Dashboard Aggregates ───────────────────────────────────────────────────

export interface DashboardMetrics {
  releaseHealth: number;
  passRate: number;
  failureRate: number;
  flakyRate: number;
  openRegressions: number;
  avgDuration: string;
  performanceRisk: string;
  testsInPR: number;
  totalRuns: number;
  totalFailures: number;
  totalFlaky: number;
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const runs = await getTestRuns();
  const failures = await getFailureClusters();
  const flaky = await getFlakyTests();

  const totalTests = runs.reduce((sum, r) => sum + r.stats.total, 0);
  const totalPassed = runs.reduce((sum, r) => sum + r.stats.passed, 0);
  const totalFailed = runs.reduce((sum, r) => sum + r.stats.failed, 0);
  const totalFlaky = runs.reduce((sum, r) => sum + r.stats.flaky, 0);

  const passRate = totalTests > 0 ? Math.round((totalPassed / totalTests) * 10000) / 100 : 0;
  const failureRate = totalTests > 0 ? Math.round((totalFailed / totalTests) * 10000) / 100 : 0;
  const flakyRate = totalTests > 0 ? Math.round((totalFlaky / totalTests) * 10000) / 100 : 0;

  const regressions = failures.filter((f) => f.classification === "regression").length;
  const avgDurationMs = runs.reduce((sum, r) => sum + (r.duration || 0), 0) / (runs.length || 1);
  const avgDurationSec = Math.round(avgDurationMs / 1000);
  const avgDuration =
    avgDurationSec > 60
      ? `${Math.floor(avgDurationSec / 60)}m ${avgDurationSec % 60}s`
      : `${avgDurationSec}s`;

  return {
    releaseHealth: Math.round(passRate * 1.002 * 10) / 10,
    passRate,
    failureRate,
    flakyRate,
    openRegressions: regressions,
    avgDuration,
    performanceRisk: avgDurationSec < 120 ? "Low" : avgDurationSec < 180 ? "Medium" : "High",
    testsInPR: runs
      .filter((r) => r.gateDecision === "blocked" || r.gateDecision === "warning")
      .reduce((sum, r) => sum + r.stats.total, 0),
    totalRuns: runs.length,
    totalFailures: failures.length,
    totalFlaky: flaky.length,
  };
}

// ── Pass Rate History (for charts) ─────────────────────────────────────────

export interface HistoryPoint {
  date: string;
  rate: number;
  runs: number;
}

export function getPassRateHistory(): HistoryPoint[] {
  if (isDemoMode()) {
    return [
      { date: "Aug 1", rate: 96.2, runs: 4 },
      { date: "Aug 3", rate: 95.8, runs: 3 },
      { date: "Aug 5", rate: 97.1, runs: 5 },
      { date: "Aug 7", rate: 93.4, runs: 4 },
      { date: "Aug 9", rate: 94.9, runs: 6 },
      { date: "Aug 11", rate: 96.7, runs: 3 },
      { date: "Aug 13", rate: 97.3, runs: 4 },
      { date: "Aug 15", rate: 95.1, runs: 5 },
      { date: "Aug 17", rate: 96.8, runs: 4 },
      { date: "Aug 19", rate: 94.2, runs: 6 },
      { date: "Aug 21", rate: 97.5, runs: 3 },
      { date: "Aug 23", rate: 96.1, runs: 4 },
    ];
  }
  return [];
}

export interface DurationPoint {
  date: string;
  p50: number;
  p95: number;
  budget: number;
}

export function getDurationHistory(): DurationPoint[] {
  if (isDemoMode()) {
    return [
      { date: "Aug 1", p50: 42, p95: 89, budget: 120 },
      { date: "Aug 3", p50: 44, p95: 92, budget: 120 },
      { date: "Aug 5", p50: 41, p95: 85, budget: 120 },
      { date: "Aug 7", p50: 58, p95: 124, budget: 120 },
      { date: "Aug 9", p50: 48, p95: 98, budget: 120 },
      { date: "Aug 11", p50: 43, p95: 87, budget: 120 },
      { date: "Aug 13", p50: 40, p95: 82, budget: 120 },
      { date: "Aug 15", p50: 45, p95: 94, budget: 120 },
      { date: "Aug 17", p50: 42, p95: 88, budget: 120 },
      { date: "Aug 19", p50: 46, p95: 96, budget: 120 },
      { date: "Aug 21", p50: 41, p95: 84, budget: 120 },
      { date: "Aug 23", p50: 39, p95: 81, budget: 120 },
    ];
  }
  return [];
}
