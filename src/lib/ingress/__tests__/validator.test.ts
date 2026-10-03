import { describe, it, expect } from "vitest";
import { validatePayload, computeStats, IngestPayloadSchema } from "../validator";
import type { IngestPayload, TestResult } from "../validator";

/**
 * Several cases below hand the schema a value it is supposed to reject. The
 * cast is the test: it says "this is what arrives over the wire, even though
 * the compiler would not let us build it". The validator's whole job is to
 * survive untrusted input, so the input has to be untrusted in the test too.
 */
function raw<T>(value: unknown): T {
  return value as T;
}

function make(overrides: Partial<IngestPayload> = {}): IngestPayload {
  return {
    repository: "acme/acme-web",
    branch: "main",
    commit: "abc123",
    environment: "ci",
    trigger: "push",
    suites: [
      {
        name: "e2e",
        tests: [
          { id: "t1", title: "login", status: "passed", retries: 0, duration: 100 },
          { id: "t2", title: "dashboard", status: "failed", retries: 0, errorMessage: "TypeError" },
          { id: "t3", title: "logout", status: "skipped", retries: 0 },
          { id: "t4", title: "nav", status: "flaky", retries: 2, retryResults: ["failed", "passed"] },
        ],
      },
    ],
    ...overrides,
  };
}

describe("validatePayload", () => {
  it("accepts valid payload", () => {
    expect(validatePayload(make()).success).toBe(true);
  });
  it("rejects without repository", () => {
    const r = validatePayload({
      branch: "m",
      commit: "c",
      suites: [{ name: "s", tests: [{ id: "t", title: "t", status: "passed", retries: 0 }] }],
    });
    expect(r.success).toBe(false);
  });
  it("rejects without branch", () => {
    expect(
      validatePayload({
        repository: "r",
        commit: "c",
        suites: [{ name: "s", tests: [{ id: "t", title: "t", status: "passed", retries: 0 }] }],
      }).success
    ).toBe(false);
  });
  it("rejects without commit", () => {
    expect(
      validatePayload({
        repository: "r",
        branch: "m",
        suites: [{ name: "s", tests: [{ id: "t", title: "t", status: "passed", retries: 0 }] }],
      }).success
    ).toBe(false);
  });
  it("rejects without suites", () => {
    expect(validatePayload({ repository: "r", branch: "m", commit: "c" }).success).toBe(false);
  });
  it("rejects empty suites", () => {
    expect(validatePayload({ repository: "r", branch: "m", commit: "c", suites: [] }).success).toBe(false);
  });
  it("rejects suite with no tests", () => {
    expect(
      validatePayload({ repository: "r", branch: "m", commit: "c", suites: [{ name: "s", tests: [] }] })
        .success
    ).toBe(false);
  });
  it("rejects invalid status", () => {
    expect(
      validatePayload({
        repository: "r",
        branch: "m",
        commit: "c",
        suites: [{ name: "s", tests: [{ id: "t", title: "t", status: raw<TestResult["status"]>("bad") }] }],
      }).success
    ).toBe(false);
  });
  it("accepts all valid statuses", () => {
    for (const s of ["passed", "failed", "skipped", "flaky", "timed_out"]) {
      const r = validatePayload(
        make({
          suites: [
            { name: "s", tests: [{ id: "t", title: "t", status: raw<TestResult["status"]>(s), retries: 0 }] },
          ],
        })
      );
      expect(r.success).toBe(true);
    }
  });
  it("defaults environment to ci", () => {
    const r = validatePayload(make({ environment: raw<IngestPayload["environment"]>(undefined) }));
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.environment).toBe("ci");
  });
  it("accepts optional pullRequest", () => {
    expect(validatePayload(make({ pullRequest: { number: 42, title: "Fix" } })).success).toBe(true);
  });
  it("accepts idempotencyKey", () => {
    const r = validatePayload(make({ idempotencyKey: "k1" }));
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.idempotencyKey).toBe("k1");
  });
  it("rejects non-object input", () => {
    expect(validatePayload("str").success).toBe(false);
    expect(validatePayload(42).success).toBe(false);
    expect(validatePayload(null).success).toBe(false);
  });
});

describe("computeStats", () => {
  it("counts all statuses", () => {
    expect(computeStats(make())).toEqual({
      total: 4,
      passed: 1,
      failed: 1,
      skipped: 1,
      flaky: 1,
      timedOut: 0,
    });
  });
  it("counts multiple suites", () => {
    const s = computeStats(
      make({
        suites: [
          { name: "s1", tests: [{ id: "t", title: "t", status: "passed", retries: 0 }] },
          { name: "s2", tests: [{ id: "t2", title: "t2", status: "timed_out", retries: 0 }] },
        ],
      })
    );
    expect(s.total).toBe(2);
    expect(s.passed).toBe(1);
    expect(s.timedOut).toBe(1);
  });
  it("handles single skipped test", () => {
    const s = computeStats(
      make({ suites: [{ name: "s", tests: [{ id: "t", title: "t", status: "skipped", retries: 0 }] }] })
    );
    expect(s).toEqual({ total: 1, passed: 0, failed: 0, skipped: 1, flaky: 0, timedOut: 0 });
  });
  it("counts timed_out separately from failed", () => {
    const s = computeStats(
      make({
        suites: [
          {
            name: "s",
            tests: [
              { id: "t", title: "t", status: "failed", retries: 0 },
              { id: "t2", title: "t2", status: "timed_out", retries: 0 },
            ],
          },
        ],
      })
    );
    expect(s.failed).toBe(1);
    expect(s.timedOut).toBe(1);
  });
});

describe("IngestPayloadSchema", () => {
  it("strips unknown fields", () => {
    expect(IngestPayloadSchema.safeParse({ ...make(), extra: 1 }).success).toBe(true);
  });
  it("rejects empty tests array", () => {
    expect(
      IngestPayloadSchema.safeParse({
        repository: "r",
        branch: "m",
        commit: "c",
        suites: [{ name: "s", tests: [] }],
      }).success
    ).toBe(false);
  });
  it("validates PR number is positive", () => {
    expect(IngestPayloadSchema.safeParse({ ...make(), pullRequest: { number: -1 } }).success).toBe(false);
  });
});
