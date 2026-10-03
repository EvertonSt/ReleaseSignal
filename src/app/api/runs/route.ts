import { type NextRequest, NextResponse } from "next/server";
import { getAllRuns, getRunCount } from "@/lib/ingress/processor";

/** GET /api/runs — List all ingested test runs */
export function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
  const offset = parseInt(searchParams.get("offset") || "0");
  const status = searchParams.get("status");
  const repo = searchParams.get("repo");
  const branch = searchParams.get("branch");

  let runs = getAllRuns();

  // Apply filters
  if (status) {
    runs = runs.filter((r) => r.gateDecision === status);
  }
  if (repo) {
    runs = runs.filter((r) => r.payload.repository.toLowerCase().includes(repo.toLowerCase()));
  }
  if (branch) {
    runs = runs.filter((r) => r.payload.branch.toLowerCase().includes(branch.toLowerCase()));
  }

  const total = runs.length;
  const paginated = runs.slice(offset, offset + limit);

  return NextResponse.json({
    runs: paginated.map((r) => ({
      id: r.id,
      repository: r.payload.repository,
      branch: r.payload.branch,
      commit: r.payload.commit,
      environment: r.payload.environment,
      stats: r.stats,
      gateDecision: r.gateDecision,
      duration: r.duration,
      receivedAt: r.receivedAt,
      processedAt: r.processedAt,
    })),
    total,
    limit,
    offset,
    hasMore: offset + limit < total,
  });
}

/** HEAD /api/runs — Run count without the body */
export function HEAD() {
  return NextResponse.json({ count: getRunCount() });
}
