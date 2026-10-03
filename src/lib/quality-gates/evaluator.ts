import type { GateDecision } from "@/types";

// ── Quality Gate Rule Types ────────────────────────────────────────────────

export type RuleType =
  | "failure_rate"
  | "new_regressions"
  | "flaky_rate"
  | "performance_budget"
  | "new_failures"
  | "test_coverage"
  | "pass_rate"
  | "required_suites";

export type RuleCondition = "less_than" | "greater_than" | "equals" | "not_equals";

export interface QualityGateRule {
  id: string;
  gateId: string;
  type: RuleType;
  condition: RuleCondition;
  threshold: number;
  severity: string;
  enabled: boolean;
  description: string;
}

export interface RuleEvaluation {
  ruleId: string;
  ruleType: RuleType;
  description: string;
  passed: boolean;
  actualValue: number;
  threshold: number;
  condition: RuleCondition;
  severity: string;
}

export interface GateEvaluationResult {
  gateId: string;
  decision: GateDecision;
  rules: RuleEvaluation[];
  evaluatedAt: Date;
  summary: string;
}

// ── Evaluation Input ───────────────────────────────────────────────────────

export interface EvaluationInput {
  /** Total tests in the run */
  totalTests: number;
  /** Number of failed tests */
  failedTests: number;
  /** Number of passed tests */
  passedTests: number;
  /** Number of flaky tests */
  flakyTests: number;
  /** Number of new regressions (failures not seen before) */
  newRegressions: number;
  /** Number of new failures (any new failure) */
  newFailures: number;
  /** p95 test duration in seconds */
  p95Duration: number;
  /** Test coverage percentage (0-100) */
  testCoverage?: number;
  /** Branch being tested */
  branch: string;
  /** Environment */
  environment: string;
}

// ── Rule Evaluation Logic ──────────────────────────────────────────────────

function evaluateRule(rule: QualityGateRule, input: EvaluationInput): RuleEvaluation {
  let actualValue = 0;

  switch (rule.type) {
    case "failure_rate":
      actualValue = input.totalTests > 0 ? (input.failedTests / input.totalTests) * 100 : 0;
      break;

    case "pass_rate":
      actualValue = input.totalTests > 0 ? (input.passedTests / input.totalTests) * 100 : 0;
      break;

    case "flaky_rate":
      actualValue = input.totalTests > 0 ? (input.flakyTests / input.totalTests) * 100 : 0;
      break;

    case "new_regressions":
      actualValue = input.newRegressions;
      break;

    case "new_failures":
      actualValue = input.newFailures;
      break;

    case "performance_budget":
      actualValue = input.p95Duration;
      break;

    case "test_coverage":
      actualValue = input.testCoverage ?? 0;
      break;

    case "required_suites":
      // All required suites must have tests
      actualValue = input.totalTests > 0 ? 1 : 0;
      break;
  }

  let passed = false;
  switch (rule.condition) {
    case "less_than":
      passed = actualValue < rule.threshold;
      break;
    case "greater_than":
      passed = actualValue > rule.threshold;
      break;
    case "equals":
      passed = actualValue === rule.threshold;
      break;
    case "not_equals":
      passed = actualValue !== rule.threshold;
      break;
  }

  return {
    ruleId: rule.id,
    ruleType: rule.type,
    description: rule.description,
    passed,
    actualValue: Math.round(actualValue * 100) / 100,
    threshold: rule.threshold,
    condition: rule.condition,
    severity: rule.severity,
  };
}

// ── Gate Evaluation ────────────────────────────────────────────────────────

/** Evaluate a test run against quality gate rules */
export function evaluateGate(rules: QualityGateRule[], input: EvaluationInput): GateEvaluationResult {
  const evaluations = rules.filter((r) => r.enabled).map((rule) => evaluateRule(rule, input));

  // Determine overall decision
  const hasBlocking = evaluations.some((e) => !e.passed && e.severity === "critical");
  const hasWarning = evaluations.some((e) => !e.passed && (e.severity === "high" || e.severity === "medium"));

  let decision: GateDecision;
  if (hasBlocking) {
    decision = "blocked";
  } else if (hasWarning) {
    decision = "warning";
  } else {
    decision = "pass";
  }

  const passedCount = evaluations.filter((e) => e.passed).length;
  const totalCount = evaluations.length;

  return {
    gateId: rules[0]?.gateId || "",
    decision,
    rules: evaluations,
    evaluatedAt: new Date(),
    summary: `${passedCount}/${totalCount} rules passed — ${decision}`,
  };
}

/** Compute pass rate from evaluation input */
export function computePassRate(input: EvaluationInput): number {
  return input.totalTests > 0 ? Math.round((input.passedTests / input.totalTests) * 10000) / 100 : 0;
}

/** Compute flaky rate from evaluation input */
export function computeFlakyRate(input: EvaluationInput): number {
  return input.totalTests > 0 ? Math.round((input.flakyTests / input.totalTests) * 10000) / 100 : 0;
}
