import { test, expect } from "./fixtures";

test.describe("Failure Intelligence", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/failures");
    await page.waitForLoadState("networkidle");
  });

  test("page heading and description", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("Failure Intelligence");
    await expect(page.getByText("Normalized and classified failure clusters")).toBeVisible();
  });

  test("summary cards show classification counts", async ({ page }) => {
    await expect(page.getByText("Regressions").filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText("Flaky", { exact: true }).filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText("Environment").filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText("Test Defects").filter({ visible: true }).first()).toBeVisible();
  });

  test("all 7 failure clusters render", async ({ page }) => {
    const clusters = [
      "Authentication token expiry race",
      "Dashboard widget render timeout",
      "CI runner memory exhaustion",
      "Payment webhook timeout",
      "Flaky snapshot comparison",
      "API rate limiting in tests",
      "Mobile viewport overflow",
    ];
    for (const name of clusters) {
      await expect(page.getByText(name).first()).toBeVisible();
    }
  });

  test("clusters show error messages in monospace", async ({ page }) => {
    await expect(
      page.getByText("TypeError: Cannot read properties of undefined (reading token)")
    ).toBeVisible();
    await expect(page.getByText("Webhook delivery failed: ETIMEDOUT")).toBeVisible();
    await expect(page.getByText("FATAL ERROR: heap out of memory")).toBeVisible();
    await expect(page.getByText("429 Too Many Requests")).toBeVisible();
  });

  test("clusters show severity badges", async ({ page }) => {
    await expect(page.getByText("critical").first()).toBeVisible();
    await expect(page.getByText("high").first()).toBeVisible();
    await expect(page.getByText("medium").first()).toBeVisible();
    await expect(page.getByText("low").first()).toBeVisible();
  });

  test("clusters show classification badges", async ({ page }) => {
    await expect(
      page.getByText("regression", { exact: true }).filter({ visible: true }).first()
    ).toBeVisible();
    await expect(page.getByText("flaky", { exact: true }).filter({ visible: true }).first()).toBeVisible();
    await expect(
      page.getByText("environment", { exact: true }).filter({ visible: true }).first()
    ).toBeVisible();
    await expect(
      page.getByText("test_defect", { exact: true }).filter({ visible: true }).first()
    ).toBeVisible();
  });

  test("AI explanations render for clusters", async ({ page }) => {
    await expect(page.getByText("AI Explanation").first()).toBeVisible();
    await expect(page.getByText(/token refresh logic/i).first()).toBeVisible();
    await expect(page.getByText(/widget rendering depends/i).first()).toBeVisible();
  });

  test("confidence scores display", async ({ page }) => {
    await expect(page.getByText("92%").first()).toBeVisible();
    await expect(page.getByText("85%").first()).toBeVisible();
    await expect(page.getByText("confidence").first()).toBeVisible();
  });

  test("occurrence counts display", async ({ page }) => {
    await expect(page.getByText("23").first()).toBeVisible();
    await expect(page.getByText("occurrences").first()).toBeVisible();
  });

  test("suggested actions display", async ({ page }) => {
    await expect(page.getByText(/Suggested:/i).first()).toBeVisible();
  });

  test("demo banner persists", async ({ page }) => {
    await expect(page.getByText(/demo mode/i)).toBeVisible();
  });

  test("responsive: clusters stack on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await expect(page.getByText("Authentication token expiry race")).toBeVisible();
    await expect(page.getByText("Payment webhook timeout")).toBeVisible();
  });
});
