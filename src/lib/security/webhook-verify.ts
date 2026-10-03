import { createHmac, timingSafeEqual } from "crypto";

// ── Webhook Signature Verification ─────────────────────────────────────────
// Verifies GitHub webhook signatures using HMAC-SHA256.

/** Verify a GitHub webhook signature */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) return false;

  // GitHub sends "sha256=<hash>"
  const expectedPrefix = "sha256=";
  if (!signature.startsWith(expectedPrefix)) return false;

  const expectedHash = signature.slice(expectedPrefix.length);
  const actualHash = createHmac("sha256", secret)
    .update(typeof payload === "string" ? payload : payload.toString())
    .digest("hex");

  // Timing-safe comparison
  try {
    return timingSafeEqual(Buffer.from(expectedHash, "hex"), Buffer.from(actualHash, "hex"));
  } catch {
    return false;
  }
}

/** Extract the webhook event type from headers */
export function extractEventType(headers: Headers): string | null {
  return headers.get("x-github-event");
}

/** Extract the delivery ID from headers */
export function extractDeliveryId(headers: Headers): string | null {
  return headers.get("x-github-delivery");
}
