import { type NextRequest, NextResponse } from "next/server";
import { demoQualityGates } from "@/lib/demo/data/quality-gates";
import { getApiSession, unauthorized } from "@/lib/api/session";

/** GET /api/gates — List quality gates with their rules */
export async function GET(request: NextRequest) {
  const session = await getApiSession();
  if (!session) return unauthorized();

  const { searchParams } = new URL(request.url);
  const enabled = searchParams.get("enabled");

  let gates = demoQualityGates;

  if (enabled === "true") {
    gates = gates.filter((g) => g.enabled);
  }

  return NextResponse.json({
    gates: gates.map((g) => ({
      id: g.id,
      name: g.name,
      description: g.description,
      enabled: g.enabled,
      lastDecision: g.lastDecision,
      evaluatedAt: g.evaluatedAt,
      rulesCount: g.rules.length,
      rules: g.rules.map((r) => ({
        id: r.id,
        type: r.type,
        condition: r.condition,
        threshold: r.threshold,
        severity: r.severity,
        enabled: r.enabled,
        description: r.description,
      })),
    })),
    total: gates.length,
  });
}
