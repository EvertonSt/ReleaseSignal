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

const {
  processPayload,
  isDuplicate,
  getRun,
  getAllRuns,
  getRunCount,
  clearRuns,
  workflowFilePath,
  withConflictRetry,
} = await import("../processor");

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
    expect(await isDuplicate("k1")).toBe(true);
  });

  it("does not report an unseen key as a duplicate", async () => {
    expect(await isDuplicate("never-seen")).toBe(false);
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

    expect(await getRunCount()).toBe(2);
    expect(await getAllRuns()).toHaveLength(2);
  });

  it("returns a summary for a stored run, carrying the fields the read API needs", async () => {
    // The accessors return a RunSummary rather than the stored record, so this
    // asserts the projection: repository, branch and commit come from the
    // payload, and the stats survive intact.
    const stored = await processPayload(payloadWith([{ status: "passed" }]));
    const summary = await getRun(stored.id);

    expect(summary).toEqual({
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
    });
  });

  it("returns undefined for an unknown id", async () => {
    expect(await getRun("run_does_not_exist")).toBeUndefined();
  });

  it("orders runs newest first", async () => {
    const older = await processPayload(payloadWith([{ status: "passed" }]));
    // Force a known ordering rather than racing two same-millisecond writes.
    const base = Date.now();
    older.receivedAt = new Date(base - 1000);

    const newer = await processPayload(payloadWith([{ status: "passed" }]));
    newer.receivedAt = new Date(base);

    expect((await getAllRuns()).map((r) => r.id)).toEqual([newer.id, older.id]);
  });

  it("respects the limit", async () => {
    await processPayload(payloadWith([{ status: "passed" }]));
    await processPayload(payloadWith([{ status: "passed" }]));

    expect(await getAllRuns(1)).toHaveLength(1);
  });

  it("forgets everything on clear", async () => {
    await processPayload(payloadWith([{ status: "passed" }], { idempotencyKey: "k2" }));
    clearRuns();

    expect(await getRunCount()).toBe(0);
    expect(await getAllRuns()).toEqual([]);
    expect(await isDuplicate("k2")).toBe(false);
  });
});

describe("withConflictRetry", () => {
  /** The shape Prisma throws when a unique constraint is violated. */
  const p2002 = Object.assign(new Error("Unique constraint failed"), { code: "P2002" });

  it("returns the result without retrying when nothing conflicts", async () => {
    let calls = 0;
    const result = await withConflictRetry(() => {
      calls++;
      return Promise.resolve("ok");
    });

    expect(result).toBe("ok");
    expect(calls).toBe(1);
  });

  it("retries once and succeeds when the first attempt loses a race", async () => {
    // This is the exact production sequence: Prisma's `upsert` is a lookup
    // followed by a write, so a concurrent ingest of the same repository makes
    // the loser fail with P2002 even though the row it wanted now exists.
    let calls = 0;
    const result = await withConflictRetry(() => {
      calls++;
      return calls === 1 ? Promise.reject(p2002) : Promise.resolve("ok");
    });

    expect(result).toBe("ok");
    expect(calls).toBe(2);
  });

  it("retries up to the bound and then surfaces the failure", async () => {
    // A real duplicate - two genuinely different keys colliding - must not be
    // retried forever.
    let calls = 0;
    await expect(
      withConflictRetry(() => {
        calls++;
        return Promise.reject(p2002);
      })
    ).rejects.toThrow("Unique constraint failed");
    expect(calls).toBe(3);
  });

  it("does not retry an error that is not a conflict", async () => {
    let calls = 0;
    const boom = Object.assign(new Error("connection reset"), { code: "P1001" });

    await expect(
      withConflictRetry(() => {
        calls++;
        return Promise.reject(boom);
      })
    ).rejects.toThrow("connection reset");
    expect(calls).toBe(1);
  });

  it("does not retry an error that carries no code at all", async () => {
    // The helper reads `.code` off whatever it catches, so an error from a
    // layer that never set one has to pass straight through.
    let calls = 0;
    await expect(
      withConflictRetry(() => {
        calls++;
        return Promise.reject(new Error("no code here"));
      })
    ).rejects.toThrow("no code here");
    expect(calls).toBe(1);
  });
});

describe("workflowFilePath", () => {
  it("lowercases and adds the extension", () => {
    expect(workflowFilePath("CI")).toBe(".github/workflows/ci.yml");
  });

  it("does not double the extension", () => {
    // The expression this replaces appended ".yml" unconditionally, so a
    // payload that already reported `integration.yml` produced
    // `integration.yml.yml`.
    expect(workflowFilePath("integration.yml")).toBe(".github/workflows/integration.yml");
  });

  it("accepts a full path from a CI provider", () => {
    expect(workflowFilePath(".github/workflows/deploy.yaml")).toBe(".github/workflows/deploy.yml");
  });

  it("does not eat the letter s", () => {
    // The original regex was `/s+/g`, which replaced runs of the letter "s"
    // rather than whitespace: "tests" became "te-ts".
    expect(workflowFilePath("tests")).toBe(".github/workflows/tests.yml");
  });

  it("turns whitespace and punctuation into single hyphens", () => {
    expect(workflowFilePath("My Tests")).toBe(".github/workflows/my-tests.yml");
    expect(workflowFilePath("  Release  //  Gate  ")).toBe(".github/workflows/release-gate.yml");
  });

  it("falls back rather than producing an empty filename", () => {
    expect(workflowFilePath("   ")).toBe(".github/workflows/workflow.yml");
  });
});
