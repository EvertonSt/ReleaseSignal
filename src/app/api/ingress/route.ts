import { type NextRequest, NextResponse } from "next/server";
import { validatePayload } from "@/lib/ingress/validator";
import { authorizeIngest } from "@/lib/ingress/auth";
import { processPayload, isDuplicate, getRun, getAllRuns, getRunCount } from "@/lib/ingress/processor";
import { generateId } from "@/lib/utils";

/**
 * POST /api/ingress — Ingest test results from a CI pipeline.
 *
 * Headers:
 *   Content-Type: application/json
 *   Authorization: Bearer <INGEST_API_KEY>
 *
 * Authentication is enforced by `authorizeIngest`, which fails CLOSED: with no
 * `INGEST_API_KEY` set this endpoint answers 503 rather than accepting an
 * anonymous write. Demo mode is the one exemption.
 *
 * Body: IngestPayload (see src/lib/ingress/validator.ts)
 *
 * Response:
 *   201 — Successfully ingested
 *   400 — Invalid JSON or failed validation
 *   401 — Missing or invalid bearer token
 *   409 — Duplicate (idempotency key already used)
 *   503 — No INGEST_API_KEY configured (not demo mode)
 */
export async function POST(request: NextRequest) {
  const requestId = generateId("req");

  const auth = authorizeIngest(request.headers.get("authorization"));
  if (!auth.ok) {
    return NextResponse.json(
      { success: false, error: auth.error, message: auth.message, requestId },
      { status: auth.status }
    );
  }

  try {
    // Parse body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid JSON payload",
          requestId,
        },
        { status: 400 }
      );
    }

    // Validate payload
    const result = validatePayload(body);
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: result.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
          requestId,
        },
        { status: 400 }
      );
    }

    const payload = result.data;

    // Check idempotency. This consults the database outside demo mode, so a
    // retried webhook is rejected after a redeploy, not just within one
    // process's lifetime.
    if (payload.idempotencyKey && (await isDuplicate(payload.idempotencyKey))) {
      return NextResponse.json(
        {
          success: false,
          error: "Duplicate request",
          message: "This idempotency key has already been processed",
          requestId,
        },
        { status: 409 }
      );
    }

    // Process the payload
    const run = await processPayload(payload);

    // Count total tests
    const totalTests = run.stats.total;
    const failedTests = run.stats.failed;

    return NextResponse.json(
      {
        success: true,
        data: {
          runId: run.id,
          status: run.status,
          gateDecision: run.gateDecision,
          stats: run.stats,
          repository: payload.repository,
          branch: payload.branch,
          commit: payload.commit,
          duration: run.duration,
          message:
            run.gateDecision === "pass"
              ? `All ${totalTests} tests passed`
              : run.gateDecision === "blocked"
                ? `${failedTests} of ${totalTests} tests failed — gate blocked`
                : `${totalTests} tests processed with warnings`,
        },
        requestId,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
        requestId,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ingress — List all ingested runs or get a specific run.
 *
 * Query params:
 *   ?runId=<id> — Get a specific run
 *   ?limit=<n> — Limit results (default 20)
 *
 * Reads go to PostgreSQL outside demo mode. They used to read the in-memory
 * Map unconditionally, which meant a real deployment answered `200` with an
 * empty list no matter how much had been ingested — and nothing caught it,
 * because every other test ran with demo mode on.
 */
export async function GET(request: NextRequest) {
  const requestId = generateId("req");
  const { searchParams } = new URL(request.url);

  const runId = searchParams.get("runId");

  // Get specific run
  if (runId) {
    const run = await getRun(runId);
    if (!run) {
      return NextResponse.json({ success: false, error: "Run not found", requestId }, { status: 404 });
    }
    return NextResponse.json({
      success: true,
      data: run,
      requestId,
    });
  }

  // List all runs
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
  const [allRuns, total] = await Promise.all([getAllRuns(limit), getRunCount()]);

  return NextResponse.json({
    success: true,
    data: {
      runs: allRuns,
      total,
      showing: allRuns.length,
    },
    requestId,
  });
}
