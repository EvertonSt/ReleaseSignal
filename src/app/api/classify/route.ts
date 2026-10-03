import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  classifyFailure,
  generateSignature,
  suggestAction,
  assignSeverity,
} from "@/lib/failure-analysis/classifier";
import { readJson, statusFor, messageFor } from "@/lib/api/body";

const TestOutcome = z.enum(["passed", "failed", "skipped", "flaky", "timed_out"]);

const ClassifyBody = z.object({
  testTitle: z.string().min(1, "testTitle is required"),
  errorMessage: z.string().optional(),
  stackTrace: z.string().optional(),
  retryResults: z.array(TestOutcome).optional(),
  historicalFailures: z.number().int().min(0).optional(),
  isOnMain: z.boolean().optional(),
});

/** POST /api/classify — Classify a test failure */
export async function POST(request: NextRequest) {
  try {
    const { errorMessage, stackTrace, testTitle, retryResults, historicalFailures, isOnMain } =
      await readJson(request, ClassifyBody);

    // Generate signature
    const signature = generateSignature({
      errorMessage,
      stackTrace,
      testTitle,
    });

    // Classify
    const classification = classifyFailure({
      errorMessage,
      stackTrace,
      testTitle,
      retryResults,
      historicalFailures,
    });

    // Assign severity
    const severity = assignSeverity(classification.classification, {
      affectedRuns: historicalFailures,
      isOnMain,
    });

    // Suggest action
    const suggestedAction = suggestAction(classification.classification, {
      testName: testTitle,
      error: errorMessage,
    });

    return NextResponse.json({
      signature: signature.hash,
      classification: classification.classification,
      confidence: classification.confidence,
      severity,
      matchedRule: classification.matchedRule,
      evidence: classification.evidence,
      suggestedAction,
    });
  } catch (error) {
    return NextResponse.json(
      { error: messageFor(error, "Classification failed"), details: String(error) },
      { status: statusFor(error) }
    );
  }
}
