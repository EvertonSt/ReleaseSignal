import { describe, it, expect } from "vitest";
import { generateSignature, classifyFailure, assignSeverity, suggestAction } from "../classifier";

// ── Signature Generation ──────────────────────────────────────────────────

describe("generateSignature", () => {
  it("generates a deterministic hash from error data", () => {
    const sig1 = generateSignature({
      errorMessage: "TypeError: Cannot read properties of undefined",
      testTitle: "should render dashboard",
    });
    const sig2 = generateSignature({
      errorMessage: "TypeError: Cannot read properties of undefined",
      testTitle: "should render dashboard",
    });
    expect(sig1.hash).toBe(sig2.hash);
    expect(sig1.hash).toMatch(/^sig_/);
  });

  it("normalizes error messages", () => {
    const sig = generateSignature({
      errorMessage: "  TypeError:  Cannot  read   properties  ",
      testTitle: "test",
    });
    expect(sig.normalizedError).toBe("typeerror: cannot read properties");
  });

  it("extracts stack frames from trace", () => {
    const sig = generateSignature({
      errorMessage: "Error",
      stackTrace:
        "at Object.<anonymous> (src/app.ts:10:5)\nat Module._compile (internal/modules/cjs/loader.js:1234:5)",
      testTitle: "test",
    });
    expect(sig.stackFrames.length).toBeGreaterThan(0);
  });

  it("returns empty stack frames when no trace", () => {
    const sig = generateSignature({ testTitle: "test" });
    expect(sig.stackFrames).toEqual([]);
  });

  it("normalizes test titles", () => {
    const sig = generateSignature({ testTitle: "  Should Render  Dashboard  " });
    expect(sig.normalizedTitle).toBe("should render dashboard");
  });

  it("produces different hashes for different errors", () => {
    const sig1 = generateSignature({ errorMessage: "TypeError", testTitle: "a" });
    const sig2 = generateSignature({ errorMessage: "TimeoutError", testTitle: "b" });
    expect(sig1.hash).not.toBe(sig2.hash);
  });
});

// ── Classification ────────────────────────────────────────────────────────

describe("classifyFailure", () => {
  it("classifies timeout errors as environment", () => {
    const result = classifyFailure({
      errorMessage: "TimeoutError: Operation timed out after 30000ms",
      testTitle: "should load page",
    });
    expect(result.classification).toBe("environment");
    expect(result.confidence).toBeGreaterThanOrEqual(0.8);
    expect(result.evidence.length).toBeGreaterThan(0);
  });

  it("classifies ETIMEDOUT as environment", () => {
    const result = classifyFailure({
      errorMessage: "connect ETIMEDOUT 10.0.0.1:443",
      testTitle: "api call",
    });
    expect(result.classification).toBe("environment");
  });

  it("classifies 429 rate limit as environment", () => {
    const result = classifyFailure({
      errorMessage: "429 Too Many Requests",
      testTitle: "rate limited test",
    });
    expect(result.classification).toBe("environment");
    expect(result.severity).toBe("medium");
  });

  it("classifies out of memory as environment with high confidence", () => {
    const result = classifyFailure({
      errorMessage: "FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed - heap out of memory",
      testTitle: "memory test",
    });
    expect(result.classification).toBe("environment");
    expect(result.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it("classifies TypeError as regression", () => {
    const result = classifyFailure({
      errorMessage: "TypeError: Cannot read properties of undefined (reading 'map')",
      testTitle: "renders list",
    });
    expect(result.classification).toBe("regression");
    expect(result.severity).toBe("critical");
  });

  it("classifies assertion errors as regression", () => {
    const result = classifyFailure({
      errorMessage: "AssertionError: expected 5 to equal 3",
      testTitle: "counts items",
    });
    expect(result.classification).toBe("regression");
  });

  it("classifies snapshot mismatches as flaky", () => {
    const result = classifyFailure({
      errorMessage: "Snapshot mismatch: expected pixel diff > 0.1%",
      testTitle: "visual snapshot",
    });
    expect(result.classification).toBe("flaky");
  });

  it("classifies selector not found as test_defect", () => {
    const result = classifyFailure({
      errorMessage: "Element locator not visible: [data-testid='submit']",
      testTitle: "form submit",
    });
    expect(result.classification).toBe("test_defect");
  });

  it("returns unknown for unmatched patterns", () => {
    const result = classifyFailure({
      errorMessage: "Something went wrong with the widget",
      testTitle: "widget test",
    });
    expect(result.classification).toBe("unknown");
    expect(result.confidence).toBe(0.3);
  });

  it("reduces confidence when retry passes", () => {
    const resultWithRetry = classifyFailure({
      errorMessage: "TypeError: Cannot read properties of undefined",
      testTitle: "test",
      retryResults: ["passed"],
    });
    const resultWithoutRetry = classifyFailure({
      errorMessage: "TypeError: Cannot read properties of undefined",
      testTitle: "test",
    });
    expect(resultWithRetry.confidence).toBeLessThan(resultWithoutRetry.confidence);
  });

  it("boosts confidence with high historical failures", () => {
    const result = classifyFailure({
      errorMessage: "TimeoutError: request timed out",
      testTitle: "api test",
      historicalFailures: 15,
    });
    expect(result.confidence).toBeGreaterThanOrEqual(0.85);
  });
});

// ── Severity Assignment ───────────────────────────────────────────────────

describe("assignSeverity", () => {
  it("returns high severity for regressions", () => {
    expect(assignSeverity("regression", {})).toBe("high");
  });

  it("returns medium for environment issues", () => {
    expect(assignSeverity("environment", {})).toBe("medium");
  });

  it("returns low for flaky tests", () => {
    expect(assignSeverity("flaky", {})).toBe("low");
  });

  it("escalates to critical when blocking", () => {
    expect(assignSeverity("environment", { isBlocking: true })).toBe("critical");
  });

  it("escalates to critical when many runs affected", () => {
    expect(assignSeverity("regression", { affectedRuns: 15 })).toBe("critical");
  });

  it("escalates medium to high on main branch", () => {
    expect(assignSeverity("environment", { isOnMain: true })).toBe("high");
  });

  it("escalates low to medium on main branch", () => {
    expect(assignSeverity("flaky", { isOnMain: true })).toBe("medium");
  });
});

// ── Suggested Actions ─────────────────────────────────────────────────────

describe("suggestAction", () => {
  it("suggests investigation for regressions", () => {
    const action = suggestAction("regression", {});
    expect(action).toContain("Investigate");
  });

  it("suggests re-running for environment issues", () => {
    const action = suggestAction("environment", {});
    expect(action).toContain("re-running");
  });

  it("suggests quarantine for flaky tests", () => {
    const action = suggestAction("flaky", {});
    expect(action).toContain("quarantine");
  });

  it("suggests updating for test defects", () => {
    const action = suggestAction("test_defect", {});
    expect(action).toContain("Update");
  });

  it("suggests manual investigation for unknown", () => {
    const action = suggestAction("unknown", {});
    expect(action).toContain("Manual investigation");
  });
});
