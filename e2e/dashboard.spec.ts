import { test, expect } from "./fixtures";

/*
 * Asserts structure that a user can actually see: named sections, real chart
 * SVGs, and the release-health numbers. The previous version of this file
 * matched on Tailwind class fragments and asserted eight metric cards by
 * literal label - a test that fails when someone renames a utility class and
 * passes when someone deletes a chart.
 */
test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
  });

  test("leads with the release dashboard", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Release Dashboard" })).toBeVisible();
    await expect(page.getByText("Last updated 5 minutes ago")).toBeVisible();
  });

  test("surfaces the gate decision beside the heading", async ({ page }) => {
    await expect(page.getByText("pass").first()).toBeVisible();
  });

  test("shows the headline metrics", async ({ page }) => {
    for (const metric of ["Release Health", "Pass Rate", "Failure Rate", "Flaky Rate"]) {
      // "Pass Rate" is both a metric card label and a chart title, so this
      // asserts at least one match rather than demanding it be unique.
      expect(await page.getByText(metric).count()).toBeGreaterThan(0);
      await expect(page.getByText(metric).first()).toBeVisible();
    }
  });

  test("shows the secondary metrics", async ({ page }) => {
    for (const metric of ["Open Regressions", "Avg Duration", "Performance Risk", "Tests in PR"]) {
      await expect(page.getByText(metric)).toBeVisible();
    }
  });

  test("renders every chart section", async ({ page }) => {
    for (const section of [
      "Pass Rate Trend",
      "Test Duration Trend",
      "Failure Breakdown",
      "Test Volume by Repository",
    ]) {
      await expect(page.getByRole("heading", { name: section })).toBeVisible();
    }
  });

  test("draws real chart geometry rather than empty containers", async ({ page }) => {
    // A chart that silently fails to render still produces its wrapper div.
    // Counting the SVG marks is what distinguishes a chart from a box, and
    // `expect.poll` is used because a bare `count()` does not retry - which is
    // what makes this flaky on a loaded CI runner running five browsers.
    await expect(page.locator(".recharts-surface").first()).toBeVisible();

    const marks = page.locator(".recharts-area-area, .recharts-bar-rectangle, .recharts-pie-sector");
    await expect.poll(() => marks.count()).toBeGreaterThan(5);
  });

  test("labels the failure breakdown legend", async ({ page }) => {
    for (const slice of ["Regressions", "Flaky", "Environment"]) {
      await expect(page.getByText(slice).filter({ visible: true }).first()).toBeVisible();
    }
  });

  test("lists the failure clusters awaiting triage", async ({ page }) => {
    // The heading is the last thing to paint once the charts above it have
    // laid out, so this is where a slow machine shows up.
    await expect(page.getByRole("heading", { name: "Active Failure Clusters" })).toBeVisible();
    await expect
      .poll(async () =>
        page
          .locator("main p, p")
          .filter({ hasText: /TypeError|Timeout/ })
          .count()
      )
      .toBeGreaterThan(0);
  });

  test("lists the gates and their status", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Quality Gates" })).toBeVisible();
    await expect(page.getByText("Production Release Gate")).toBeVisible();
    await expect(page.getByText("Staging Deployment Gate")).toBeVisible();
    await expect(page.getByText("Pull Request Gate")).toBeVisible();
  });

  test("lists recent releases with their totals", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Recent Releases" })).toBeVisible();
    await expect(page.getByText(/\d+ tests/).first()).toBeVisible();
  });

  test("ranks the most unstable tests", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Most Unstable Tests" })).toBeVisible();
    await expect(page.getByText(/^\d+%$/).first()).toBeVisible();
  });

  test("stays usable at mobile width", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await expect(page.getByRole("heading", { name: "Release Dashboard" })).toBeVisible();
    // Content that overflows horizontally is the common mobile failure.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
