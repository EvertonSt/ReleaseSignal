import type { FailureClassification, Severity } from "@/types";

// ── Failure Signature ──────────────────────────────────────────────────────
// Deterministic normalization for grouping similar failures.

export interface FailureSignature {
  /** Normalized error message (lowercased, whitespace-collapsed) */
  normalizedError: string;
  /** Top stack frames (file:function) */
  stackFrames: string[];
  /** Normalized test title */
  normalizedTitle: string;
  /** Combined signature hash */
  hash: string;
}

/** Normalize an error message for clustering */
function normalizeError(msg: string): string {
  return msg
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/["'`]/g, "")
    .replace(/at\s+.*:\d+:\d+/g, "") // remove line:col
    .replace(/\d{13,}/g, "TIMESTAMP") // replace long numbers (timestamps)
    .replace(/[0-9a-f]{8,}/g, "HASH") // replace hashes
    .trim();
}

/** Extract top stack frames from a stack trace */
function extractStackFrames(trace?: string): string[] {
  if (!trace) return [];
  const lines = trace.split("\n").slice(0, 5);
  const frames: string[] = [];
  for (const line of lines) {
    const frame = line.match(/at\s+(.+?)\s*\(/)?.[1];
    if (frame) frames.push(frame);
  }
  return frames;
}

/** Normalize a test title */
function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/\s+/g, " ").replace(/[>"']/g, "").trim();
}

/** Generate a deterministic hash from signature components */
function hashSignature(components: string[]): string {
  let hash = 0;
  const str = components.join("||");
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return "sig_" + Math.abs(hash).toString(36);
}

/** Generate a failure signature from test result data */
export function generateSignature(data: {
  errorMessage?: string;
  stackTrace?: string;
  testTitle: string;
}): FailureSignature {
  const normalizedError = normalizeError(data.errorMessage || "");
  const stackFrames = extractStackFrames(data.stackTrace);
  const normalizedTitle = normalizeTitle(data.testTitle);

  const hash = hashSignature([normalizedError, stackFrames.join("|"), normalizedTitle]);

  return { normalizedError, stackFrames, normalizedTitle, hash };
}

// ── Classification Rules ───────────────────────────────────────────────────

interface ClassificationRule {
  pattern: RegExp;
  classification: FailureClassification;
  severity: Severity;
  confidence: number;
  description: string;
}

const CLASSIFICATION_RULES: ClassificationRule[] = [
  // Environment issues
  {
    pattern: /timeout|etimedout|econnrefused|econnreset|econnaborted/i,
    classification: "environment",
    severity: "high",
    confidence: 0.85,
    description: "Network or timeout error",
  },
  {
    pattern: /429|rate.?limit|too many requests|epipe/i,
    classification: "environment",
    severity: "medium",
    confidence: 0.9,
    description: "Rate limiting detected",
  },
  {
    pattern: /heap out of memory|oom|enomem|out of memory/i,
    classification: "environment",
    severity: "high",
    confidence: 0.95,
    description: "Memory exhaustion",
  },
  {
    pattern: /eaddrinuse|port.*in use|address already/i,
    classification: "environment",
    severity: "medium",
    confidence: 0.9,
    description: "Port conflict on CI runner",
  },
  {
    pattern: /permission denied|eacces|access denied/i,
    classification: "environment",
    severity: "medium",
    confidence: 0.8,
    description: "Permission or access error",
  },

  // Flaky tests
  {
    pattern: /flaky|intermittent|nondeterministic/i,
    classification: "flaky",
    severity: "medium",
    confidence: 0.8,
    description: "Test marked as flaky",
  },
  {
    pattern: /snapshot.?mismatch|visual.?diff|pixel.?diff/i,
    classification: "flaky",
    severity: "low",
    confidence: 0.85,
    description: "Visual snapshot mismatch",
  },
  {
    pattern: /race.?condition|timing|async.*not.*settled/i,
    classification: "flaky",
    severity: "medium",
    confidence: 0.7,
    description: "Possible race condition",
  },

  // Test defects
  {
    pattern: /viewport|overflow|responsive|mobile.*layout/i,
    classification: "test_defect",
    severity: "low",
    confidence: 0.75,
    description: "Layout or viewport issue",
  },
  {
    pattern: /selector.*not.*found|locator.*not.*visible|element.*not.*attached/i,
    classification: "test_defect",
    severity: "medium",
    confidence: 0.7,
    description: "Element not found (test may need update)",
  },

  // Regressions (catch-all for application errors)
  {
    pattern: /typeerror|referenceerror|syntaxerror|rangeerror/i,
    classification: "regression",
    severity: "critical",
    confidence: 0.9,
    description: "JavaScript runtime error",
  },
  {
    pattern: /assertionerror|expect\(|received.*expected/i,
    classification: "regression",
    severity: "high",
    confidence: 0.85,
    description: "Assertion failure",
  },
  {
    pattern: /5\d{2}|internal server error|server responded/i,
    classification: "regression",
    severity: "high",
    confidence: 0.8,
    description: "Server error response",
  },
];

// ── Classification Engine ──────────────────────────────────────────────────

export interface ClassificationResult {
  classification: FailureClassification;
  confidence: number;
  severity: Severity;
  matchedRule: string;
  evidence: string[];
}

/** Classify a failure based on its error message and context */
export function classifyFailure(data: {
  errorMessage?: string;
  stackTrace?: string;
  testTitle: string;
  retryResults?: string[];
  historicalFailures?: number;
}): ClassificationResult {
  const evidence: string[] = [];
  const errorText = data.errorMessage || "";
  const stackText = data.stackTrace || "";

  // Check each rule
  for (const rule of CLASSIFICATION_RULES) {
    if (rule.pattern.test(errorText) || rule.pattern.test(stackText)) {
      evidence.push(`Error pattern matched: ${rule.description}`);

      // Boost confidence if retry passed (flaky indicator)
      let confidence = rule.confidence;
      if (data.retryResults && data.retryResults.includes("passed") && rule.classification !== "flaky") {
        // Retry passed suggests flaky, reduce confidence of other classifications
        confidence *= 0.6;
        evidence.push("Retry passed — possible flaky test");
      }

      // Boost confidence with historical failures
      if (data.historicalFailures && data.historicalFailures > 5) {
        confidence = Math.min(0.95, confidence + 0.05);
        evidence.push(`Seen ${data.historicalFailures} times historically`);
      }

      return {
        classification: rule.classification,
        confidence,
        severity: rule.severity,
        matchedRule: rule.description,
        evidence,
      };
    }
  }

  // Default: unknown with low confidence
  evidence.push("No pattern matched — defaulting to unknown");
  return {
    classification: "unknown",
    confidence: 0.3,
    severity: "medium",
    matchedRule: "No pattern matched",
    evidence,
  };
}

/** Assign severity based on classification and context */
export function assignSeverity(
  classification: FailureClassification,
  context: {
    affectedRuns?: number;
    isOnMain?: boolean;
    isBlocking?: boolean;
  }
): Severity {
  // Base severity from classification
  const base: Record<FailureClassification, Severity> = {
    regression: "high",
    environment: "medium",
    flaky: "low",
    test_defect: "low",
    unknown: "medium",
  };

  let severity = base[classification];

  // Escalate if on main branch
  if (context.isOnMain && severity === "medium") severity = "high";
  if (context.isOnMain && severity === "low") severity = "medium";

  // Escalate if many runs affected
  if (context.affectedRuns && context.affectedRuns > 10) severity = "critical";
  if (context.affectedRuns && context.affectedRuns > 5 && severity === "high") {
    severity = "critical";
  }

  // Escalate if blocking
  if (context.isBlocking) severity = "critical";

  return severity;
}

/** Generate suggested action based on classification */
export function suggestAction(
  classification: FailureClassification,
  context: { testName?: string; error?: string } = {}
): string {
  const actions: Record<FailureClassification, string> = {
    regression:
      "Investigate the recent commit that introduced this failure. Check for breaking changes in the code under test.",
    environment:
      "Check CI runner health, network connectivity, and service dependencies. Consider re-running the test.",
    flaky:
      "Add this test to the quarantine list. Investigate the root cause (timing, async, external dependency). Consider adding retries or fixing the test.",
    test_defect:
      "Update the test to match current application behavior. Verify selectors, viewport settings, and assertions.",
    unknown:
      "Manual investigation required. Collect more evidence (logs, traces, screenshots) before triaging.",
  };

  const advice = actions[classification];

  // Naming the failing test is the difference between advice someone can act
  // on and advice they have to re-derive from the triage queue.
  return context.testName ? `${advice} (failing test: "${context.testName}")` : advice;
}
