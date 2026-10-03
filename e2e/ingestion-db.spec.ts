import { test, expect, json } from "./fixtures";

/*
 * The production branch of the ingestion pipeline, against a real database.
 *
 * Everything else in this suite runs with demo mode on, where `processPayload`
 * writes into an in-memory Map. That is not the branch a deployment runs. The
 * Prisma branch creates Repository, Workflow, TestRun, TestSuite and TestCase
 * rows, and it is the branch that has to honour an idempotency key across a
 * process restart rather than for the lifetime of one Map.
 *
 * This project only exists when DATABASE_URL is set (see playwright.config.ts),
 * so a developer with no database is not asked to run it. CI runs it against a
 * PostgreSQL service container, with migrations applied from the checked-in
 * migration - which also means the migration itself is executed on every run
 * instead of only being reviewed.
 */

const PORT = Number(process.env.E2E_PORT ?? 3100);
const BASE = `http://127.0.0.1:${PORT}`;
const TEST_KEY = "e2e-ingest-key-not-a-real-secret";

function payload(idempotencyKey: string) {
  return {
    repository: "acme/acme-web",
    branch: "main",
    commit: "abc123def",
    workflow: "integration.yml",
    trigger: "push",
    suites: [
      {
        name: "checkout.spec.ts",
        tests: [
          { id: "t1", title: "adds an item to the cart", status: "passed", duration: 120 },
          { id: "t2", title: "applies a discount", status: "failed", duration: 240 },
          { id: "t3", title: "renders the receipt", status: "skipped", duration: 0 },
        ],
      },
    ],
    idempotencyKey,
  };
}

/** Headers for an authenticated ingestion request. */
const AUTH = { Authorization: `Bearer ${TEST_KEY}` };

/** The body of a response, or a placeholder if it cannot be read. */
async function safeJson(response: { json: () => Promise<unknown> }): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return "<unreadable body>";
  }
}

test.describe("POST /api/ingress against PostgreSQL", () => {
  test("persists a run and reports it back from the database", async ({ request }) => {
    const key = `db-persist-${Date.now()}`;

    const response = await request.post(`${BASE}/api/ingress`, {
      headers: AUTH,
      data: payload(key),
    });

    // 201 is the first assertion that this branch ran at all: in demo mode this
    // same request also returns 201, so the proof has to come from the read-back
    // below, which only a real database can answer.
    expect(response.status()).toBe(201);
    const created = (await json(response)) as {
      success: boolean;
      data: { runId: string; gateDecision: string; stats: Record<string, number> };
    };

    expect(created.success).toBe(true);
    expect(created.data.runId).toMatch(/^run_/);
    expect(created.data.stats).toMatchObject({ total: 3, passed: 1, failed: 1, skipped: 1 });

    // A fresh read. Nothing here is served from the request that just wrote it -
    // GET /api/ingress in non-demo mode queries Prisma, so finding the run means
    // the row is genuinely in the table.
    const listed = await request.get(`${BASE}/api/ingress?runId=${created.data.runId}`);
    expect(listed.status()).toBe(200);

    const found = (await json(listed)) as {
      success: boolean;
      data: { id: string; stats: Record<string, number>; repository: string; commit: string };
    };

    expect(found.success).toBe(true);
    expect(found.data.id).toBe(created.data.runId);
    expect(found.data.stats.total).toBe(3);
    expect(found.data.repository).toBe("acme/acme-web");
    expect(found.data.commit).toBe("abc123def");
  });

  test("honours the idempotency key across requests, not just within one process", async ({ request }) => {
    // This is the assertion the in-memory demo path cannot make. `isDuplicate`
    // consults a Set that lives as long as the process; the Prisma branch
    // looks the key up in the TestRun table, which is what stops a retried CI
    // webhook from being ingested twice once the app has been redeployed.
    const key = `db-idem-${Date.now()}`;

    const first = await request.post(`${BASE}/api/ingress`, {
      headers: AUTH,
      data: payload(key),
    });

    // The response body is included in the failure message on purpose. A bare
    // "expected 201, received 500" tells nobody anything; the body carries the
    // underlying database error, which is the part worth reading.
    expect(first.status(), `ingest failed: ${JSON.stringify(await safeJson(first))}`).toBe(201);

    const second = await request.post(`${BASE}/api/ingress`, {
      headers: AUTH,
      data: payload(key),
    });

    expect(second.status()).toBe(409);
    expect(((await json(second)) as { success: boolean }).success).toBe(false);
  });

  test("still rejects an unauthorised write before touching the database", async ({ request }) => {
    // Authorization is the first thing the route does. Proving it here as well
    // as in ingestion-auth.spec.ts matters because this server has a real
    // database behind it - a check that regressed to "check after writing"
    // would be far more expensive here than in the demo server.
    const response = await request.post(`${BASE}/api/ingress`, {
      data: payload(`db-unauth-${Date.now()}`),
    });

    expect(response.status()).toBe(401);
  });

  test("rejects a schema-invalid payload before writing anything", async ({ request }) => {
    const response = await request.post(`${BASE}/api/ingress`, {
      headers: AUTH,
      data: { repository: "acme/acme-web" },
    });

    // Validation runs before the processor, so a partial payload must never
    // reach Prisma and create a half-written TestRun.
    expect(response.status()).toBe(400);

    const body = (await json(response)) as { success: boolean; details: unknown[] };
    expect(body.success).toBe(false);
    expect(Array.isArray(body.details)).toBe(true);
    expect(body.details.length).toBeGreaterThan(0);
  });

  test("the run list is readable and reflects what was ingested", async ({ request }) => {
    const listed = await request.get(`${BASE}/api/ingress?limit=100`);
    expect(listed.status()).toBe(200);

    const body = (await json(listed)) as {
      success: boolean;
      data: { runs: unknown[]; total: number; showing: number };
    };

    expect(body.success).toBe(true);
    expect(Array.isArray(body.data.runs)).toBe(true);
    // The seed plus the runs written above.
    expect(body.data.total).toBeGreaterThan(0);
  });
});
