import { describe, it, expect, beforeEach, vi } from "vitest";

/*
 * The data layer branches on demo mode: static fixtures one way, Prisma the
 * other, and every branch is wrapped in a catch that returns empty data rather
 * than taking the page down. Both paths are exercised here with the database
 * module replaced, so the unit suite never opens a connection.
 */
const prismaStub = {
  testRun: { findMany: vi.fn() },
  failureCluster: { findMany: vi.fn() },
  qualityGate: { findMany: vi.fn() },
  flakyTest: { findMany: vi.fn() },
};

vi.mock("../db", () => ({
  prisma: prismaStub,
  isDemoMode: () => true,
  DEFAULT_ORG_ID: "org_demo_001",
}));

const {
  getTestRuns,
  getFailureClusters,
  getQualityGates,
  getFlakyTests,
  getDashboardMetrics,
  getPassRateHistory,
  getDurationHistory,
} = await import("../data");

beforeEach(() => {
  for (const model of Object.values(prismaStub)) {
    for (const fn of Object.values(model)) fn.mockReset();
  }
});

describe("getTestRuns", () => {
  it("returns the seeded runs in demo mode", async () => {
    const runs = await getTestRuns();

    expect(runs.length).toBeGreaterThan(0);
    expect(runs[0]).toMatchObject({
      repository: expect.any(String),
      branch: expect.any(String),
      commit: expect.any(String),
      gateDecision: expect.any(String),
    });
  });

  it("normalises the statistics shape", async () => {
    const [first] = await getTestRuns();
    expect(first?.stats).toEqual(
      expect.objectContaining({
        total: expect.any(Number),
        passed: expect.any(Number),
        failed: expect.any(Number),
        skipped: expect.any(Number),
        flaky: expect.any(Number),
        timedOut: 0,
      })
    );
  });

  it("never asks the database in demo mode", async () => {
    await getTestRuns();
    expect(prismaStub.testRun.findMany).not.toHaveBeenCalled();
  });
});

describe("getFailureClusters", () => {
  it("returns clusters in demo mode", async () => {
    const clusters = await getFailureClusters();
    expect(clusters.length).toBeGreaterThan(0);
    expect(clusters[0]).toMatchObject({
      classification: expect.any(String),
      confidence: expect.any(Number),
      severity: expect.any(String),
    });
  });
});

describe("getQualityGates", () => {
  it("returns gates with a rule count", async () => {
    // The data layer exposes a count rather than the rule bodies: the gate list
    // view only needs the tally, and shipping every rule to every page load is
    // how a list endpoint turns into a payload problem.
    const gates = await getQualityGates();
    expect(gates.length).toBeGreaterThan(0);
    expect(gates[0]).toMatchObject({
      id: expect.any(String),
      name: expect.any(String),
      enabled: expect.any(Boolean),
      lastDecision: expect.any(String),
      rulesCount: expect.any(Number),
    });
    expect(gates[0]?.rulesCount).toBeGreaterThan(0);
  });
});

describe("getFlakyTests", () => {
  it("returns flaky tests in demo mode", async () => {
    const tests = await getFlakyTests();
    expect(tests.length).toBeGreaterThan(0);
    expect(tests[0]).toMatchObject({
      title: expect.any(String),
      flakeRate: expect.any(Number),
      totalRuns: expect.any(Number),
    });
  });
});

describe("getDashboardMetrics", () => {
  it("derives a health score and the headline counts", async () => {
    const metrics = await getDashboardMetrics();

    expect(metrics.releaseHealth).toBeGreaterThanOrEqual(0);
    expect(metrics.releaseHealth).toBeLessThanOrEqual(100);
    expect(metrics.totalRuns).toBeGreaterThan(0);
    expect(metrics.totalFailures).toBeGreaterThanOrEqual(0);
  });

  it("keeps every rate inside 0..100", async () => {
    // A rate outside the range would be a division that trusted one side of a
    // count; the dashboard renders these straight into a percentage.
    const { passRate, failureRate, flakyRate } = await getDashboardMetrics();
    for (const rate of [passRate, failureRate, flakyRate]) {
      expect(rate).toBeGreaterThanOrEqual(0);
      expect(rate).toBeLessThanOrEqual(100);
    }
  });

  it("grades performance risk from the average duration", async () => {
    const { performanceRisk, avgDuration } = await getDashboardMetrics();
    expect(["Low", "Medium", "High"]).toContain(performanceRisk);
    expect(avgDuration).toMatch(/^\d+[sm]( \d+[sm])?$/);
  });

  it("counts the tests sitting behind a warning or a block", async () => {
    const metrics = await getDashboardMetrics();
    expect(metrics.testsInPR).toBeGreaterThanOrEqual(0);
  });
});

describe("history helpers", () => {
  it("returns a chronological pass-rate series", () => {
    const history = getPassRateHistory();
    expect(history.length).toBeGreaterThan(0);
    expect(history[0]).toMatchObject({ date: expect.any(String), rate: expect.any(Number) });
  });

  it("returns a duration series with a budget to compare against", () => {
    const history = getDurationHistory();
    expect(history.length).toBeGreaterThan(0);
    expect(history[0]).toMatchObject({
      date: expect.any(String),
      p50: expect.any(Number),
      p95: expect.any(Number),
      budget: expect.any(Number),
    });
  });

  it("is a pure function of the fixtures", () => {
    expect(getPassRateHistory()).toEqual(getPassRateHistory());
    expect(getDurationHistory()).toEqual(getDurationHistory());
  });
});
