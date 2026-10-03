import { test, expect, json } from "./fixtures";

/*
 * The ingestion endpoint's authorization, proven over HTTP.
 *
 * The unit suite covers `authorizeIngest` directly. What it cannot cover is
 * whether the ROUTE calls it - and that is exactly the gap that let an
 * unauthenticated write endpoint ship behind a doc comment claiming a 401.
 * A test that only exercises the helper would keep passing if someone deleted
 * the call.
 *
 * These tests therefore drive the real server over the network, which also
 * means they need a real non-demo build: demo mode skips the check, and demo
 * mode is inlined into the bundle at build time. scripts/e2e-server.mjs builds
 * that variant and serves it on the two ports below.
 *
 *   :3101  no INGEST_API_KEY   -> must fail CLOSED (503), not open (201)
 *   :3102  INGEST_API_KEY set -> must reject a missing or wrong token (401)
 *
 * The token below is a fixture used by both the server script and these tests.
 * It is not a credential and grants access to nothing.
 */

const PORT_UNCONFIGURED = Number(process.env.E2E_PORT ?? 3100) + 1;
const PORT_KEYED = Number(process.env.E2E_PORT ?? 3100) + 2;
const TEST_KEY = "e2e-ingest-key-not-a-real-secret";

const UNCONFIGURED = `http://127.0.0.1:${PORT_UNCONFIGURED}`;
const KEYED = `http://127.0.0.1:${PORT_KEYED}`;

/** A payload that would otherwise be accepted. */
const payload = {
  repository: "acme/acme-web",
  branch: "main",
  commit: "abc123def",
  suites: [{ name: "auth", tests: [{ id: "t1", title: "renders", status: "passed" }] }],
};

function withKey(key: string, idempotencyKey: string) {
  return { ...payload, idempotencyKey };
}

test.describe("POST /api/ingress authorization", () => {
  test.describe("when no INGEST_API_KEY is configured", () => {
    test("fails CLOSED rather than accepting an anonymous write", async ({ request }) => {
      const response = await request.post(`${UNCONFIGURED}/api/ingress`, {
        data: withKey("unused", `unconfigured-${Date.now()}`),
      });

      // 201 here would mean anyone can forge the CI results that every gate
      // decision is derived from. A loud 503 naming the missing variable is the
      // correct failure; see docs/decisions/0006-ingestion-fails-closed.md.
      expect(response.status()).toBe(503);

      const body = (await json(response)) as { success: boolean; message: string };
      expect(body.success).toBe(false);
      expect(body.message).toContain("INGEST_API_KEY");
    });

    test("does not accept a token either - nothing is configured to match", async ({ request }) => {
      const response = await request.post(`${UNCONFIGURED}/api/ingress`, {
        headers: { Authorization: "Bearer anything-at-all" },
        data: withKey("unused", `unconfigured-authed-${Date.now()}`),
      });

      // A deployment that forgot the variable must not become open just because
      // the caller supplies a token; there is nothing to compare it against.
      expect(response.status()).toBe(503);
    });
  });

  test.describe("when INGEST_API_KEY is configured", () => {
    test("rejects a request with no Authorization header", async ({ request }) => {
      const response = await request.post(`${KEYED}/api/ingress`, {
        data: withKey("unused", `noauth-${Date.now()}`),
      });

      expect(response.status()).toBe(401);
      expect(((await json(response)) as { success: boolean }).success).toBe(false);
    });

    test("rejects a wrong token", async ({ request }) => {
      const response = await request.post(`${KEYED}/api/ingress`, {
        headers: { Authorization: "Bearer wrong-key" },
        data: withKey("unused", `wrongkey-${Date.now()}`),
      });

      expect(response.status()).toBe(401);
    });

    test("rejects a token that merely extends the real one", async ({ request }) => {
      // Guards a prefix comparison - the kind that passes every happy-path test
      // and lets a leaked-key-plus-suffix through.
      const response = await request.post(`${KEYED}/api/ingress`, {
        headers: { Authorization: `Bearer ${TEST_KEY}-extra` },
        data: withKey("unused", `prefixkey-${Date.now()}`),
      });

      expect(response.status()).toBe(401);
    });

    test("rejects a Basic credential in place of a bearer token", async ({ request }) => {
      const response = await request.post(`${KEYED}/api/ingress`, {
        headers: { Authorization: `Basic ${Buffer.from(TEST_KEY).toString("base64")}` },
        data: withKey("unused", `basic-${Date.now()}`),
      });

      expect(response.status()).toBe(401);
    });

    test("accepts the correct token and gets past the check", async ({ request }) => {
      const response = await request.post(`${KEYED}/api/ingress`, {
        headers: { Authorization: `Bearer ${TEST_KEY}` },
        data: withKey("unused", `goodkey-${Date.now()}`),
      });

      // This server has no database configured, so a correct token reaches the
      // Prisma layer and fails there with 500. That IS the assertion: reaching
      // the database proves authorization passed. Asserting 201 instead would
      // be asserting the demo path, which skips authorization entirely.
      expect(response.status()).not.toBe(401);
      expect(response.status()).not.toBe(503);

      const body = (await json(response)) as { requestId: string };
      expect(body.requestId).toMatch(/^req_/);
    });
  });

  test("the two servers are configured differently, or these tests prove nothing", async ({ request }) => {
    // A guard on the guard: if the script ever started both servers with the
    // same environment, every 401 expectation above would start failing loudly
    // - but if it started them BOTH unconfigured they would all pass while
    // asserting the wrong thing. Pinning both shapes here means a change to the
    // script cannot silently weaken the suite.
    const unconfigured = await request.post(`${UNCONFIGURED}/api/ingress`, {
      data: withKey("unused", `shape-unconf-${Date.now()}`),
    });
    const keyed = await request.post(`${KEYED}/api/ingress`, {
      data: withKey("unused", `shape-keyed-${Date.now()}`),
    });

    expect(unconfigured.status()).toBe(503);
    expect(keyed.status()).toBe(401);
  });
});
