import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { evaluateGate, type QualityGateRule, type EvaluationInput } from "@/lib/quality-gates/evaluator";
import { demoQualityGates } from "@/lib/demo/data/quality-gates";
import { readJson, statusFor, messageFor } from "@/lib/api/body";

const EvaluateBody = z.object({
  gateId: z.string().optional(),
  totalTests: z.number().int().min(0).optional(),
  failedTests: z.number().int().min(0).optional(),
  passedTests: z.number().int().min(0).optional(),
  flakyTests: z.number().int().min(0).optional(),
  newRegressions: z.number().int().min(0).optional(),
  newFailures: z.number().int().min(0).optional(),
  p95Duration: z.number().min(0).optional(),
  testCoverage: z.number().min(0).max(100).optional(),
  branch: z.string().min(1).optional(),
  environment: z.enum(["ci", "staging", "production"]).optional(),
});

/** POST /api/gates/evaluate — Evaluate a test run against quality gate rules */
export async function POST(request: NextRequest) {
  try {
    const {
      totalTests,
      failedTests,
      passedTests,
      flakyTests,
      newRegressions,
      newFailures,
      p95Duration,
      testCoverage,
      branch,
      environment,
      gateId,
    } = await readJson(request, EvaluateBody);

    // Use provided gate or default to first gate
    const gate = gateId ? demoQualityGates.find((g) => g.id === gateId) : demoQualityGates[0];

    if (!gate) {
      return NextResponse.json({ error: "No quality gate found" }, { status: 404 });
    }

    // Convert demo rules to evaluator format
    const rules: QualityGateRule[] = gate.rules.map((r) => ({
      id: r.id,
      gateId: r.gateId,
      type: r.type as QualityGateRule["type"],
      condition: r.condition as QualityGateRule["condition"],
      threshold: r.threshold,
      severity: r.severity,
      enabled: r.enabled,
      description: r.description,
    }));

    const input: EvaluationInput = {
      totalTests: totalTests ?? 100,
      failedTests: failedTests ?? 0,
      passedTests: passedTests ?? 100,
      flakyTests: flakyTests ?? 0,
      newRegressions: newRegressions ?? 0,
      newFailures: newFailures ?? 0,
      p95Duration: p95Duration ?? 60,
      testCoverage,
      branch: branch ?? "main",
      environment: environment ?? "ci",
    };

    const result = evaluateGate(rules, input);

    return NextResponse.json({
      gateId: gate.id,
      gateName: gate.name,
      decision: result.decision,
      summary: result.summary,
      evaluatedAt: result.evaluatedAt,
      rules: result.rules,
    });
  } catch (error) {
    return NextResponse.json(
      { error: messageFor(error, "Evaluation failed"), details: String(error) },
      { status: statusFor(error) }
    );
  }
}
