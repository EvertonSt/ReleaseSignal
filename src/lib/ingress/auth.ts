import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Authorization for POST /api/ingress.
 *
 * WHY THIS EXISTS
 * The route's own doc comment promised `401 - Missing or invalid API key
 * (production only)` while the handler never read the Authorization header at
 * all. That is the exact failure mode decision record 0004 was written about: a
 * signature that promises a guard the body does not contain. An unauthenticated
 * write endpoint accepts forged CI results from anyone who can reach it, which
 * makes every downstream gate decision meaningless.
 *
 * So either the code does the check or the documentation stops claiming it.
 * This module is the code.
 *
 * THE COMPARISON
 * `timingSafeEqual` leaks the length of its inputs through its argument check
 * and throws when they differ, so both sides are hashed to a fixed 32 bytes
 * first. That makes the comparison constant-time over equal-length inputs and
 * removes the length side channel. A plain `!==` on the raw string is the bug
 * this is here to avoid.
 */

export type AuthResult = { ok: true } | { ok: false; status: 401 | 503; error: string; message: string };

/** Constant-time string comparison over equal-length digests. */
function safeEqual(a: string, b: string): boolean {
  const hashA = createHash("sha256").update(a).digest();
  const hashB = createHash("sha256").update(b).digest();
  return timingSafeEqual(hashA, hashB);
}

/** Pull the bearer token out of an Authorization header. */
function bearerToken(header: string | null): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1]?.trim() || null;
}

/**
 * Decide whether an ingestion request may proceed.
 *
 * Three cases, in order:
 *
 * 1. Demo mode - allowed. The demo path has no integrations and no data worth
 *    corrupting, and the end-to-end suite runs against it.
 * 2. A key is configured - the bearer token must match it exactly.
 * 3. Neither - refused with 503. Failing open here would mean a production
 *    deployment that forgot to set the key accepts anonymous writes, which is
 *    the vulnerability this module closes. A loud 503 is the correct failure:
 *    it names the missing configuration instead of quietly accepting forgery.
 */
export function authorizeIngest(authorizationHeader: string | null): AuthResult {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
    return { ok: true };
  }

  const configured = process.env.INGEST_API_KEY;

  if (!configured) {
    return {
      ok: false,
      status: 503,
      error: "Ingestion is not configured",
      message:
        "INGEST_API_KEY is not set. This endpoint accepts authenticated writes only; " +
        "set the key, or run with NEXT_PUBLIC_DEMO_MODE=true for a synthetic environment.",
    };
  }

  const token = bearerToken(authorizationHeader);

  if (!token || !safeEqual(token, configured)) {
    return {
      ok: false,
      status: 401,
      error: "Unauthorized",
      message: "A valid bearer token is required: Authorization: Bearer <INGEST_API_KEY>",
    };
  }

  return { ok: true };
}
