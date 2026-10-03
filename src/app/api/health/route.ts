import { NextResponse } from "next/server";
import { version } from "../../../../package.json";

/**
 * GET /api/health — Liveness probe.
 *
 * Reports `status: "ok"` rather than "healthy" so a load-balancer probe and a
 * human reading the log are checking the same word. The version is read from
 * package.json rather than hard-coded: the previous literal said 0.1.0 while
 * the package said 1.0.0, and nothing caught it because nothing compared them.
 */
export function GET() {
  return NextResponse.json({
    status: "ok",
    version,
    timestamp: new Date().toISOString(),
    mode: process.env.NEXT_PUBLIC_DEMO_MODE === "true" ? "demo" : "production",
  });
}
