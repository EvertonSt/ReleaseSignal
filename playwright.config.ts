import { defineConfig, devices, type Project } from "@playwright/test";

/**
 * The e2e suite runs against a production build, not `next dev`.
 *
 * This is the single most valuable change in this file. The dev server compiles
 * routes on demand, serves them with different caching, and does not run the
 * same code-splitting and prerendering the production build does - so a suite
 * that passes against it is testing a different application. It is also why
 * three tests in the original API spec had never run: the endpoints they named
 * did not exist.
 */
const PORT = Number(process.env.E2E_PORT ?? 3100);
const BASE_URL = process.env.BASE_URL ?? `http://127.0.0.1:${PORT}`;

/**
 * The ingestion authorization spec. It talks to the two non-demo servers, so it
 * runs in its own project rather than five times inside the browser projects.
 */
const AUTH_SPEC = /ingestion-auth\.spec\.ts/;

/** The spec that needs a real PostgreSQL instance. */
const DB_SPEC = /ingestion-db\.spec\.ts/;

/**
 * The database project is added only when DATABASE_URL is present, rather than
 * being declared and skipped. A declared-but-skipped project leaves a permanent
 * "skipped" line in every local run, which trains people to ignore skips; an
 * absent project simply is not there.
 */
const projects: Project[] = [
  { name: "chromium", use: { ...devices["Desktop Chrome"] }, testIgnore: [AUTH_SPEC, DB_SPEC] },
  { name: "firefox", use: { ...devices["Desktop Firefox"] }, testIgnore: [AUTH_SPEC, DB_SPEC] },
  { name: "mobile-chrome", use: { ...devices["Pixel 7"] }, testIgnore: [AUTH_SPEC, DB_SPEC] },
  { name: "mobile-safari", use: { ...devices["iPhone 14"] }, testIgnore: [AUTH_SPEC, DB_SPEC] },
  { name: "tablet", use: { ...devices["iPad (gen 7)"] }, testIgnore: [AUTH_SPEC, DB_SPEC] },
  { name: "api-security", testMatch: AUTH_SPEC },
];

if (process.env.DATABASE_URL) {
  projects.push({ name: "db-integration", testMatch: DB_SPEC });
}

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 30_000,
  expect: { timeout: 7_000 },

  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }], ["list"]]
    : [["html", { open: "never" }], ["list"]],

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
  },

  projects,

  webServer: {
    // Builds the demo bundle AND a non-demo bundle, then serves three servers.
    // See scripts/e2e-server.mjs for why two of them cannot share the demo
    // build: the authorization check is compiled out of a demo build.
    command: "node scripts/e2e-server.mjs",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
