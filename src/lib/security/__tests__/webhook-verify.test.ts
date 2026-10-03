import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { verifyWebhookSignature, extractEventType, extractDeliveryId } from "../webhook-verify";

const SECRET = "whsec_test_secret";
const PAYLOAD = JSON.stringify({ action: "opened", pull_request: { number: 42 } });

function sign(payload: string, secret = SECRET): string {
  return `sha256=${createHmac("sha256", secret).update(payload).digest("hex")}`;
}

describe("verifyWebhookSignature", () => {
  it("accepts a signature it produced itself", () => {
    expect(verifyWebhookSignature(PAYLOAD, sign(PAYLOAD), SECRET)).toBe(true);
  });

  it("accepts a Buffer payload as readily as a string", () => {
    // A Node webhook handler receives a raw Buffer; the string and buffer
    // paths must agree or the same request verifies differently by runtime.
    expect(verifyWebhookSignature(Buffer.from(PAYLOAD), sign(PAYLOAD), SECRET)).toBe(true);
  });

  it("rejects a signature made with a different secret", () => {
    expect(verifyWebhookSignature(PAYLOAD, sign(PAYLOAD, "whsec_other"), SECRET)).toBe(false);
  });

  it("rejects a tampered body", () => {
    const signature = sign(PAYLOAD);
    expect(verifyWebhookSignature(`${PAYLOAD} `, signature, SECRET)).toBe(false);
  });

  it("rejects a missing signature header", () => {
    expect(verifyWebhookSignature(PAYLOAD, null, SECRET)).toBe(false);
  });

  it("rejects a signature with the wrong algorithm prefix", () => {
    const hex = createHmac("sha256", SECRET).update(PAYLOAD).digest("hex");
    expect(verifyWebhookSignature(PAYLOAD, `sha1=${hex}`, SECRET)).toBe(false);
  });

  it("rejects a signature that is not hex instead of throwing", () => {
    // Buffer.from(x, "hex") silently truncates at the first invalid pair. The
    // comparison must still fail rather than raise out of the request handler.
    expect(verifyWebhookSignature(PAYLOAD, "sha256=not-a-hex-digest", SECRET)).toBe(false);
  });

  it("rejects a truncated digest of the right shape", () => {
    expect(verifyWebhookSignature(PAYLOAD, "sha256=abcd", SECRET)).toBe(false);
  });
});

describe("header extraction", () => {
  const headers = new Headers({
    "x-github-event": "pull_request",
    "x-github-delivery": "1f2e3d4c-0000-1111-2222-333344445555",
  });

  it("reads the event type", () => {
    expect(extractEventType(headers)).toBe("pull_request");
  });

  it("reads the delivery id", () => {
    expect(extractDeliveryId(headers)).toBe("1f2e3d4c-0000-1111-2222-333344445555");
  });

  it("returns null when the header is absent", () => {
    expect(extractEventType(new Headers())).toBeNull();
    expect(extractDeliveryId(new Headers())).toBeNull();
  });
});
