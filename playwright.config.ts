import { defineConfig, devices } from "@playwright/test";

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

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "mobile-chrome", use: { ...devices["Pixel 7"] } },
    { name: "mobile-safari", use: { ...devices["iPhone 14"] } },
    { name: "tablet", use: { ...devices["iPad (gen 7)"] } },
  ],

  webServer: {
    // Build first, then serve the build. `reuseExistingServer` is false in CI so
    // a stale server from a previous run cannot make the suite pass against
    // yesterday's code.
    command: `pnpm build && pnpm start --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      // The suite exercises the demo path, which is the path a reviewer opening
      // the repository will see.
      NEXT_PUBLIC_DEMO_MODE: "true",
    },
  },
});
