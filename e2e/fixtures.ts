import { test as base, devices, expect, type APIResponse, type Page } from "@playwright/test";

// ── Shared selectors ──────────────────────────────────────────────────────
export const SELECTORS = {
  demoBanner: /demo mode/i,
  releaseDashboard: "Release Dashboard",
  sidebar: "aside",
  bottomNav: "nav.fixed",
  hamburger: /open navigation menu/i,
  notifications: /notifications/i,
  searchTrigger: /search runs/i,
  searchInput: 'input[placeholder*="Search pages"]',
  userMenu: "Demo User",
  rsLogo: "ReleaseSignal",
} as const;

// ── Navigation helpers ────────────────────────────────────────────────────
export const APP_ROUTES = [
  { path: "/dashboard", heading: "Release Dashboard" },
  { path: "/test-runs", heading: "Test Runs" },
  { path: "/failures", heading: "Failure Intelligence" },
  { path: "/flaky-tests", heading: "Flaky Test" },
  { path: "/quality-gates", heading: "Quality Gates" },
  { path: "/pull-requests", heading: "Pull Request" },
  { path: "/performance", heading: "Performance" },
  { path: "/reports", heading: "Reports" },
  { path: "/settings", heading: "Settings" },
] as const;

export const MARKETING_SECTIONS = [
  "ReleaseSignal",
  "Turn every test run into a release decision",
  "Release health scoring",
  "Failure classification",
  "Flaky-test detection",
  "US$10,000",
] as const;

// ── Custom test fixture ───────────────────────────────────────────────────
// The callback parameter is deliberately not named `use`. Playwright's own
// docs call it that, but a `use(...)` call inside a plain function expression
// reads to the React hooks rule as a hook call in a non-component - and it is
// right to object. This is Playwright code, not React code.
//
// Each fixture opens its OWN browser context. They previously both resolved
// the built-in `page`, which means they were the same object: a test asking for
// `mobilePage` and `desktopPage` got one page whose viewport was whichever
// fixture was set up last. The responsive assertions were passing and failing
// for reasons that had nothing to do with the layout.
type TestFixtures = {
  desktopPage: Page;
  mobilePage: Page;
};

export const test = base.extend<TestFixtures>({
  desktopPage: async ({ browser, baseURL }, provide) => {
    const context = await browser.newContext({
      baseURL,
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();
    await provide(page);
    await context.close();
  },
  mobilePage: async ({ browser, baseURL }, provide) => {
    const context = await browser.newContext({
      baseURL,
      ...devices["Pixel 7"],
      viewport: { width: 375, height: 812 },
    });
    const page = await context.newPage();
    await provide(page);
    await context.close();
  },
});

export { expect };

/**
 * Reads a response body as `unknown`.
 *
 * Playwright types `Response.json()` as `any`, and an assertion written
 * against `any` will happily pass on a body that has the wrong shape - it just
 * compares whatever happens to be there. Widening to `unknown` forces each
 * spec to say what it expects instead of inheriting a lie.
 */
export async function json(response: APIResponse): Promise<unknown> {
  return (await response.json()) as unknown;
}

// ── Utility functions ─────────────────────────────────────────────────────
export async function waitForHydration(page: Page) {
  await page.waitForLoadState("networkidle");
}

export async function navigateAndVerify(page: Page, path: string, headingPattern: RegExp | string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  await expect(page.locator("h1").first()).toContainText(headingPattern);
}

export async function checkDemoBanner(page: Page) {
  await expect(page.getByText(SELECTORS.demoBanner)).toBeVisible();
}

export async function checkResponsiveLayout(page: Page, isMobile: boolean) {
  if (isMobile) {
    await expect(page.locator(SELECTORS.bottomNav)).toBeVisible();
    await expect(page.getByRole("button", { name: SELECTORS.hamburger })).toBeVisible();
  } else {
    await expect(page.locator(SELECTORS.sidebar)).toBeVisible();
  }
}
