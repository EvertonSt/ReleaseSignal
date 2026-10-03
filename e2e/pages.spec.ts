import { test, expect } from "./fixtures";

/*
 * Each app page is checked for the thing it exists to show. The previous
 * version matched on utility-class substrings and on loose text like
 * /quarantine/i, which matched two different elements and failed for reasons
 * that had nothing to do with the page.
 */
const PAGES = [
  { path: "/test-runs", heading: "Test Runs" },
  { path: "/failures", heading: "Failure Intelligence" },
  { path: "/flaky-tests", heading: "Flaky Test Center" },
  { path: "/quality-gates", heading: "Quality Gates" },
  { path: "/pull-requests", heading: "Pull Request Quality" },
  { path: "/performance", heading: "Performance Analysis" },
  { path: "/reports", heading: "Reports" },
  { path: "/settings", heading: "Settings" },
];

test.describe("App pages", () => {
  for (const { path, heading } of PAGES) {
    test(`${path} renders its heading`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    });

    test(`${path} keeps the demo-mode banner`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("status", { name: "Demo mode active" })).toBeVisible();
    });

    test(`${path} has no horizontal overflow`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      );
      expect(overflow).toBeLessThanOrEqual(1);
    });
  }
});

test.describe("Failure Intelligence", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/failures");
    await page.waitForLoadState("networkidle");
  });

  test("breaks failures down by classification", async ({ page }) => {
    for (const bucket of ["Regressions", "Flaky", "Environment", "Test Defects"]) {
      await expect(page.getByText(bucket, { exact: true })).toBeVisible();
    }
  });

  test("lists real failure clusters, not a placeholder", async ({ page }) => {
    await expect(page.getByText("Authentication token expiry race")).toBeVisible();
    await expect(page.getByText("Dashboard widget render timeout")).toBeVisible();
  });

  test("shows how often each cluster has occurred", async ({ page }) => {
    await expect(page.getByText(/occurrences/).first()).toBeVisible();
    await expect(page.getByText(/confidence/).first()).toBeVisible();
  });

  test("shows the error that caused the cluster", async ({ page }) => {
    await expect(page.getByText(/TypeError|AssertionError|Timeout/).first()).toBeVisible();
  });
});

test.describe("Flaky Test Center", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/flaky-tests");
    await page.waitForLoadState("networkidle");
  });

  test("counts the flaky, quarantined and resolved tests", async ({ page }) => {
    // "Quarantined" is both a summary tile and a per-test status badge, so
    // this asserts each bucket is present rather than unique.
    for (const bucket of ["Active Flaky", "Quarantined", "Resolved"]) {
      expect(await page.getByText(bucket).count()).toBeGreaterThan(0);
      await expect(page.getByText(bucket).first()).toBeVisible();
    }
  });

  test("names the tests it is tracking", async ({ page }) => {
    await expect(page.getByText("should render dashboard widgets")).toBeVisible();
    await expect(page.getByText("should complete payment flow")).toBeVisible();
  });

  test("gives each test a flake rate and a run history", async ({ page }) => {
    await expect(page.getByText("flake rate").first()).toBeVisible();
    await expect(page.getByText(/\d+\/\d+ runs/).first()).toBeVisible();
  });

  test("suggests a remediation for each test", async ({ page }) => {
    await expect(page.getByText(/^Suggested:/).first()).toBeVisible();
  });
});

test.describe("Pull Request Quality", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/pull-requests");
    await page.waitForLoadState("networkidle");
  });

  test("lists pull requests with their author and branch", async ({ page }) => {
    await expect(page.getByText("feat: Add dashboard analytics widget")).toBeVisible();
    await expect(page.getByText("Sarah Chen | feat/auth-v2 | acme-web")).toBeVisible();
  });

  test("gives each pull request a quality score", async ({ page }) => {
    await expect(page.getByText("quality score").first()).toBeVisible();
    await expect(page.getByText("94").first()).toBeVisible();
  });

  test("shows a gate decision, not just a score", async ({ page }) => {
    await expect(page.getByText("pass", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("blocked", { exact: true })).toBeVisible();
  });

  test("summarises what changed in the risk picture", async ({ page }) => {
    await expect(page.getByText(/new failures/).first()).toBeVisible();
    await expect(page.getByText(/flaky/).first()).toBeVisible();
  });
});

test.describe("Performance Analysis", () => {
  test("reports p50, p95 and the budget", async ({ page }) => {
    await page.goto("/performance");
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("p50 Duration")).toBeVisible();
    await expect(page.getByText("p95 Duration")).toBeVisible();
    await expect(page.getByText("Budget").first()).toBeVisible();
    await expect(page.getByText("120.0s")).toBeVisible();
  });

  test("says whether the run is inside the budget", async ({ page }) => {
    await page.goto("/performance");
    await expect(page.getByText("Within")).toBeVisible();
  });

  test("shows a day-by-day duration trend", async ({ page }) => {
    await page.goto("/performance");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { name: /duration trend/i })).toBeVisible();
    expect(await page.getByText(/^p50: /).count()).toBeGreaterThan(0);
    expect(await page.getByText(/^p95: /).count()).toBeGreaterThan(0);
  });
});

test.describe("Reports", () => {
  test("lists generated reports with a share action", async ({ page }) => {
    await page.goto("/reports");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { name: "Reports", level: 1 })).toBeVisible();

    // A `.count()` snapshot races the list: the heading is in the shell, the
    // rows arrive after the client data resolves, so the count can be read as
    // 0 on a slow runner and the test fails for no real reason. An awaited
    // `toBeVisible` retries until the button is actually on screen.
    await expect(page.getByRole("button", { name: /share/i }).first()).toBeVisible();
  });
});

test.describe("Settings", () => {
  test("covers every settings area", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");

    for (const section of [
      "Organization Profile",
      "Team Members",
      "Roles and Permissions",
      "API Keys",
      "Notifications",
      "Branding",
      "Data Management",
    ]) {
      await expect(page.getByRole("heading", { name: section })).toBeVisible();
    }
  });
});
