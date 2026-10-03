import { test, expect, json } from "./fixtures";

/*
 * These tests are written against the routes that exist. The previous version
 * of this file asserted `status === 'ok'` against a handler returning
 * 'healthy', posted `suite` where the schema requires `suites`, and requested
 * `/api/v1/reports`, which is not a route in this app. None of it had ever
 * been run against a server, which is a worse failure than a failing test:
 * it looks like coverage.
 */
test.describe("API endpoints", () => {
  test.describe("GET /api/health", () => {
    test("reports ok with the package version", async ({ request }) => {
      const res = await request.get("/api/health");
      expect(res.status()).toBe(200);
      expect(await json(res)).toMatchObject({
        status: "ok",
        version: "1.0.0",
        mode: "demo",
      });
    });
  });

  test.describe("POST /api/classify", () => {
    test("classifies a regression and explains itself", async ({ request }) => {
      const res = await request.post("/api/classify", {
        data: {
          testTitle: "checkout > applies discount",
          errorMessage: 'TypeError: Cannot read properties of undefined (reading "total")',
          isOnMain: true,
          historicalFailures: 3,
        },
      });

      expect(res.status()).toBe(200);
      const body = await json(res);

      // The point of a deterministic classifier is that every answer arrives
      // with the rule that produced it.
      expect(body).toMatchObject({
        classification: "regression",
        confidence: expect.any(Number),
        matchedRule: expect.any(String),
        evidence: expect.any(Array),
        suggestedAction: expect.stringContaining("checkout > applies discount"),
      });
      expect((body as { signature: string }).signature).toMatch(/^sig_/);
    });

    test("is deterministic for identical input", async ({ request }) => {
      const payload = {
        testTitle: "cart > totals",
        errorMessage: "AssertionError: expected 10 to equal 11",
      };
      const first = await json(await request.post("/api/classify", { data: payload }));
      const second = await json(await request.post("/api/classify", { data: payload }));
      expect(first).toEqual(second);
    });

    test("rejects a body missing testTitle", async ({ request }) => {
      const res = await request.post("/api/classify", { data: { errorMessage: "boom" } });
      expect(res.status()).toBe(422);
    });

    test("rejects a body that is valid JSON but not an object", async ({ request }) => {
      // Playwright serialises a string to `"not json at all"`, which parses
      // fine and then fails the schema. The distinction matters: 422 means
      // "wrong shape"; 400 would mean "not JSON at all".
      const res = await request.post("/api/classify", {
        headers: { "content-type": "application/json" },
        data: "not json at all",
      });
      expect(res.status()).toBe(422);
    });

    test("rejects wrongly typed fields instead of coercing them", async ({ request }) => {
      const res = await request.post("/api/classify", {
        data: { testTitle: "x", historicalFailures: "many" },
      });
      expect(res.status()).toBe(422);
    });
  });

  test.describe("POST /api/gates/evaluate", () => {
    test("blocks on a critical rule failure", async ({ request }) => {
      const res = await request.post("/api/gates/evaluate", {
        data: { totalTests: 200, failedTests: 12, newRegressions: 3, branch: "main" },
      });

      expect(res.status()).toBe(200);
      const body = (await json(res)) as { decision: string; summary: string };
      expect(["blocked", "warning"]).toContain(body.decision);
      expect(body.summary).toMatch(/\d+\/\d+ rules passed/);
    });

    test("404s for an unknown gate id", async ({ request }) => {
      const res = await request.post("/api/gates/evaluate", { data: { gateId: "nope" } });
      expect(res.status()).toBe(404);
    });

    test("rejects a non-numeric count", async ({ request }) => {
      const res = await request.post("/api/gates/evaluate", {
        data: { totalTests: "lots" },
      });
      expect(res.status()).toBe(422);
    });
  });

  test.describe("POST /api/ingress", () => {
    const validPayload = {
      idempotencyKey: "e2e-fixture-1",
      repository: "acme/acme-web",
      branch: "main",
      commit: "abc123def",
      workflow: "ci.yml",
      trigger: "push",
      suites: [
        {
          name: "e2e",
          tests: [
            { id: "t1", title: "renders the dashboard", status: "passed", duration: 1200 },
            { id: "t2", title: "applies a discount", status: "failed", duration: 500 },
          ],
        },
      ],
    };

    test("accepts a valid payload and reports aggregate stats", async ({ request }) => {
      const res = await request.post("/api/ingress", {
        data: { ...validPayload, idempotencyKey: `e2e-${Date.now()}` },
      });

      // 201: the run is a resource that did not exist before this request.
      expect(res.status()).toBe(201);
      const body = await json(res);
      expect(body).toMatchObject({
        success: true,
        data: {
          runId: expect.stringMatching(/^run_/),
          status: "processed",
          gateDecision: expect.any(String),
          stats: { total: 2, passed: 1, failed: 1 },
        },
      });
    });

    test("rejects a payload with no suites", async ({ request }) => {
      const res = await request.post("/api/ingress", { data: {} });
      expect(res.status()).toBe(400);
    });

    test("rejects an unknown test status", async ({ request }) => {
      const res = await request.post("/api/ingress", {
        data: {
          ...validPayload,
          idempotencyKey: `e2e-bad-${Date.now()}`,
          suites: [{ name: "e2e", tests: [{ id: "t1", title: "x", status: "exploded" }] }],
        },
      });
      expect(res.status()).toBe(400);
    });
  });

  test.describe("GET list endpoints", () => {
    test("/api/failures returns clustered failures", async ({ request }) => {
      const body = await json(await request.get("/api/failures"));
      expect(body).toMatchObject({ failures: expect.any(Array) });
      expect((body as { total: number }).total).toBeGreaterThan(0);
    });

    test("/api/gates returns gates with their rules", async ({ request }) => {
      const body = (await json(await request.get("/api/gates"))) as { gates: unknown[] };
      expect(body.gates.length).toBeGreaterThan(0);
    });

    test("/api/runs lists ingested runs", async ({ request }) => {
      const body = (await json(await request.get("/api/runs"))) as { runs: unknown[]; total: number };
      expect(Array.isArray(body.runs)).toBe(true);
      expect(body.total).toBeGreaterThanOrEqual(0);
    });
  });
});
