import { describe, it, expect, beforeEach, vi } from "vitest";
import type { GateDecision } from "@/types";
import type { IngestPayload, TestResult } from "../validator";

/*
 * The processor imports the Prisma singleton, which constructs a client at
 * module load. These tests exercise the demo (in-memory) path, so the database
 * module is replaced outright rather than connected to. Any call into prisma
 * would throw, which is the point: a unit test of the in-memory branch must
 * not be able to reach the database.
 */
vi.mock("../../db", () => ({
  prisma: new Proxy(
    {},
    {
      get(_target, property) {
        throw new Error(`the demo path must not touch prisma.${String(property)}`);
      },
    }
  ),
  isDemoMode: () => true,
  DEFAULT_ORG_ID: "org_demo_001",
}));

const { processPayload, isDuplicate, getRun, getAllRuns, getRunCount, clearRuns } =
  await import("../processor");

type TestCase = { status: TestResult["status"]; duration?: number };

/** Builds `count` passing (or failing) tests without losing the literal type. */
const passed = (count: number): TestCase[] => Array.from({ length: count }, () => ({ status: "passed" }));
const failed = (count: number): TestCase[] => Array.from({ length: count }, () => ({ status: "failed" }));

function payloadWith(outcomes: TestCase[], overrides: Partial<IngestPayload> = {}): IngestPayload {
  return {
    repository: "acme/acme-web",
    branch: "main",
    commit: "abc123",
    environment: "ci",
    trigger: "push",
    suites: [
      {
        name: "e2e",
        tests: outcomes.map((outcome, index) => ({
          id: `t${index}`,
          title: `test ${index}`,
          retries: 0,
          ...outcome,
        })),
      },
    ],
    // Overrides come last so a test can deliberately build an invalid payload.
    ...overrides,
  };
}

beforeEach(() => {
  clearRuns();
});

describe("processPayload", () => {
  it("stores a processed run with aggregate statistics", async () => {
    const run = await processPayload(
      payloadWith([
        { status: "passed", duration: 100 },
        { status: "failed", duration: 250 },
        { status: "skipped" },
      ])
    );

    expect(run.status).toBe("processed");
    expect(run.stats).toMatchObject({ total: 3, passed: 1, failed: 1, skipped: 1 });
    expect(run.id).toMatch(/^run_/);
  });

  it("sums the durations of every test", async () => {
    const run = await processPayload(
      payloadWith([
        { status: "passed", duration: 100 },
        { status: "passed", duration: 250 },
        { status: "passed" },
      ])
    );
    expect(run.duration).toBe(350);
  });

  it("treats a test with no duration as zero", async () => {
    const run = await processPayload(payloadWith([{ status: "passed" }]));
    expect(run.duration).toBe(0);
  });

  it("stamps both received and processed times", async () => {
    const run = await processPayload(payloadWith([{ status: "passed" }]));
    expect(run.receivedAt).toBeInstanceOf(Date);
    expect(run.processedAt).toBeInstanceOf(Date);
  });

  it.each<[string, TestCase[], GateDecision]>([
    [
      "a single failure in an otherwise healthy run warns rather than blocks",
      // 18/19 is a 94.7% pass rate: below the 95% warn line but above the 80%
      // block line, so the run should be flagged without stopping the release.
      [...passed(18), { status: "failed" }],
      "warning",
    ],
    ["a low pass rate blocks even with a single failure", [...passed(3), ...failed(1)], "blocked"],
    ["six failures block the release", failed(6), "blocked"],
    ["a catastrophic pass rate blocks even with few failures", [...passed(3), ...failed(7)], "blocked"],
  ])("decides that %s", async (_name, outcomes, expected) => {
    const run = await processPayload(payloadWith(outcomes));
    expect(run.gateDecision).toBe(expected);
  });
});

describe("idempotency", () => {
  it("records the key and reports later duplicates", async () => {
    await processPayload(payloadWith([{ status: "passed" }], { idempotencyKey: "k1" }));
    expect(isDuplicate("k1")).toBe(true);
  });

  it("does not report an unseen key as a duplicate", () => {
    expect(isDuplicate("never-seen")).toBe(false);
  });

  it("still accepts a run with an empty payload suite boundary", async () => {
    // `suites: []` never reaches here - the schema rejects it - but the
    // decision path must not produce NaN when it is handed zero tests.
    const run = await processPayload(payloadWith([{ status: "passed" }], { suites: [] }));
    expect(run.gateDecision).toBe("pending");
  });
});

describe("accessors", () => {
  it("counts and lists what has been stored", async () => {
    await processPayload(payloadWith([{ status: "passed" }]));
    await processPayload(payloadWith([{ status: "failed" }]));

    expect(getRunCount()).toBe(2);
    expect(getAllRuns()).toHaveLength(2);
  });

  it("returns the stored run by id", async () => {
    const stored = await processPayload(payloadWith([{ status: "passed" }]));
    expect(getRun(stored.id)).toEqual(stored);
  });

  it("returns undefined for an unknown id", () => {
    expect(getRun("run_does_not_exist")).toBeUndefined();
  });

  it("orders runs newest first", async () => {
    const older = await processPayload(payloadWith([{ status: "passed" }]));
    // Force a known ordering rather than racing two same-millisecond writes.
    const base = Date.now();
    older.receivedAt = new Date(base - 1000);

    const newer = await processPayload(payloadWith([{ status: "passed" }]));
    newer.receivedAt = new Date(base);

    expect(getAllRuns().map((r) => r.id)).toEqual([newer.id, older.id]);
  });

  it("forgets everything on clear", async () => {
    await processPayload(payloadWith([{ status: "passed" }], { idempotencyKey: "k2" }));
    clearRuns();

    expect(getRunCount()).toBe(0);
    expect(getAllRuns()).toEqual([]);
    expect(isDuplicate("k2")).toBe(false);
  });
});
