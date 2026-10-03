import { type NextRequest, NextResponse } from "next/server";
import { demoFailureClusters } from "@/lib/demo/data/failures";

/** GET /api/failures — List failure clusters with classification details */
export function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const classification = searchParams.get("classification");
  const severity = searchParams.get("severity");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);

  let clusters = demoFailureClusters;

  // Apply filters
  if (classification) {
    clusters = clusters.filter((c) => c.classification === classification);
  }
  if (severity) {
    clusters = clusters.filter((c) => c.severity === severity);
  }

  const paginated = clusters.slice(0, limit);

  return NextResponse.json({
    failures: paginated.map((fc) => ({
      id: fc.id,
      name: fc.name,
      signature: fc.signature,
      classification: fc.classification,
      confidence: fc.confidence,
      severity: fc.severity,
      errorMessage: fc.errorMessage,
      affectedTests: fc.affectedTests,
      affectedRuns: fc.affectedRuns,
      occurrences: fc.occurrences,
      firstSeen: fc.firstSeen,
      lastSeen: fc.lastSeen,
      trend: fc.trend,
      aiExplanation: fc.aiExplanation,
      suggestedAction: fc.suggestedAction,
      triageStatus: fc.triageStatus,
    })),
    total: clusters.length,
    filtered: classification || severity ? clusters.length : undefined,
  });
}
