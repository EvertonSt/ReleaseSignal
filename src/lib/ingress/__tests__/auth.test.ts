import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { authorizeIngest } from "../auth";

/*
 * These tests exist because the check itself was missing. The route documented
 * a 401 for a bad API key for the whole life of the repository while the
 * handler never read the Authorization header - so the first version of this
 * file is a list of the ways that could have been true, and each one is.
 */

const ORIGINAL = {
  demo: process.env.NEXT_PUBLIC_DEMO_MODE,
  key: process.env.INGEST_API_KEY,
};

beforeEach(() => {
  delete process.env.NEXT_PUBLIC_DEMO_MODE;
  delete process.env.INGEST_API_KEY;
});

afterEach(() => {
  if (ORIGINAL.demo === undefined) delete process.env.NEXT_PUBLIC_DEMO_MODE;
  else process.env.NEXT_PUBLIC_DEMO_MODE = ORIGINAL.demo;

  if (ORIGINAL.key === undefined) delete process.env.INGEST_API_KEY;
  else process.env.INGEST_API_KEY = ORIGINAL.key;
});

describe("authorizeIngest", () => {
  describe("with a key configured", () => {
    beforeEach(() => {
      process.env.INGEST_API_KEY = "correct-key";
    });

    it("allows a request carrying the exact bearer token", () => {
      expect(authorizeIngest("Bearer correct-key")).toEqual({ ok: true });
    });

    it("accepts the token case-insensitively in the scheme", () => {
      // RFC 7235 says the scheme is case-insensitive, and a client that sends
      // `bearer` is not an attacker.
      expect(authorizeIngest("bearer correct-key")).toEqual({ ok: true });
    });

    it("tolerates surrounding whitespace", () => {
      // Trimmed, not compared verbatim: a client that pads the header is not an
      // attacker, and being strict about whitespace would only produce support
      // tickets. The security-relevant cases are the ones below.
      expect(authorizeIngest("  Bearer correct-key  ")).toEqual({ ok: true });
    });

    it("rejects a missing header with 401", () => {
      const result = authorizeIngest(null);
      expect(result).toMatchObject({ ok: false, status: 401 });
    });

    it("rejects a wrong key with 401", () => {
      expect(authorizeIngest("Bearer wrong-key")).toMatchObject({ ok: false, status: 401 });
    });

    it("rejects a token that merely starts with the real one", () => {
      expect(authorizeIngest("Bearer correct-key-and-then-some")).toMatchObject({
        ok: false,
        status: 401,
      });
    });

    it("rejects a bare token with no scheme", () => {
      expect(authorizeIngest("correct-key")).toMatchObject({ ok: false, status: 401 });
    });

    it("rejects an empty bearer value", () => {
      expect(authorizeIngest("Bearer ")).toMatchObject({ ok: false, status: 401 });
    });

    it("rejects a Basic credential in place of a bearer token", () => {
      expect(authorizeIngest("Basic Y29ycmVjdC1rZXk=")).toMatchObject({ ok: false, status: 401 });
    });

    it("never echoes the expected key back in the error", () => {
      const result = authorizeIngest("Bearer wrong-key");
      expect(JSON.stringify(result)).not.toContain("correct-key");
    });
  });

  describe("with no key configured", () => {
    it("fails CLOSED with 503, not open", () => {
      // The whole point. A production deployment that forgets the variable must
      // refuse writes, because an unauthenticated write endpoint lets anyone
      // forge the CI results every gate decision is derived from.
      const result = authorizeIngest(null);
      expect(result).toMatchObject({ ok: false, status: 503 });
    });

    it("refuses even when a token is supplied - any token would be wrong", () => {
      expect(authorizeIngest("Bearer anything")).toMatchObject({ ok: false, status: 503 });
    });

    it("names the missing variable in the message", () => {
      const result = authorizeIngest(null);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.message).toContain("INGEST_API_KEY");
    });
  });

  describe("in demo mode", () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_DEMO_MODE = "true";
    });

    it("allows an unauthenticated request", () => {
      // Demo mode has no integrations and no data worth corrupting, and the
      // end-to-end suite runs against exactly this path.
      expect(authorizeIngest(null)).toEqual({ ok: true });
    });

    it("still allows a request that carries a token", () => {
      process.env.INGEST_API_KEY = "correct-key";
      expect(authorizeIngest("Bearer correct-key")).toEqual({ ok: true });
    });
  });

  describe("demo mode only counts when it is exactly the string true", () => {
    it.each(["1", "yes", "TRUE", "on"])("treats %j as off", (value) => {
      process.env.NEXT_PUBLIC_DEMO_MODE = value;
      // Anything but the exact "true" must not unlock an unauthenticated write.
      expect(authorizeIngest(null)).toMatchObject({ ok: false, status: 503 });
    });
  });
});
