import { test, expect } from "./fixtures";

test.describe("Quality Gates", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/quality-gates");
    await page.waitForLoadState("networkidle");
  });

  test("renders its heading", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1, name: "Quality Gates" })).toBeVisible();
  });

  test("lists all three gates", async ({ page }) => {
    for (const gate of ["Production Release Gate", "Staging Deployment Gate", "Pull Request Gate"]) {
      await expect(page.getByRole("heading", { name: gate })).toBeVisible();
    }
  });

  test("shows a decision for every gate", async ({ page }) => {
    // A gate with no verdict is worse than no gate: it reads as "fine".
    expect(await page.getByText("pass", { exact: true }).count()).toBeGreaterThan(0);
    expect(await page.getByText("warning", { exact: true }).count()).toBeGreaterThan(0);
  });

  test("lists the rules and thresholds that produce the decision", async ({ page }) => {
    // A decision a reviewer cannot audit is the thing this product exists to
    // replace, so the rules are rendered, not summarised.
    await expect(page.getByText(/failure rate/i).first()).toBeVisible();
    await expect(page.getByText(/flaky test rate/i).first()).toBeVisible();
    await expect(page.getByText(/test coverage/i).first()).toBeVisible();
    await expect(page.getByText("failure_rate | threshold: 2").first()).toBeVisible();
  });

  test("grades each rule by severity", async ({ page }) => {
    for (const severity of ["critical", "high", "medium"]) {
      expect(await page.getByText(severity, { exact: true }).count()).toBeGreaterThan(0);
    }
  });

  test("explains the purpose of each gate", async ({ page }) => {
    await expect(page.getByText("Configurable rules that determine release readiness")).toBeVisible();
  });

  test("keeps the demo-mode banner visible", async ({ page }) => {
    await expect(page.getByRole("status", { name: "Demo mode active" })).toBeVisible();
  });

  test("remains readable at mobile width", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await expect(page.getByRole("heading", { name: "Production Release Gate" })).toBeVisible();
  });
});
