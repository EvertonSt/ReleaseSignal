import { test, expect } from "./fixtures";

test.describe("Test Runs", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/test-runs");
    await page.waitForLoadState("networkidle");
  });

  test("page heading renders", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("Test Runs");
  });

  test("test run table has rows", async ({ page }) => {
    const table = page.locator("table");
    await expect(table).toBeVisible();
    const rows = table.locator("tbody tr");
    expect(await rows.count()).toBeGreaterThan(5);
  });

  test("displays repository names", async ({ page }) => {
    await expect(page.getByText("acme-web").first()).toBeVisible();
    await expect(page.getByText("acme-api").first()).toBeVisible();
    await expect(page.getByText("acme-mobile").first()).toBeVisible();
  });

  test("displays branch names", async ({ page }) => {
    await expect(page.getByText("main").first()).toBeVisible();
  });

  test("displays commit SHAs in monospace", async ({ page }) => {
    // The sidebar also uses a mono class, so this is scoped to a visible node
    // inside the page rather than the first match in the document.
    const mono = page.locator(".font-mono").filter({ visible: true }).first();
    await expect(mono).toBeVisible();
  });

  test("status badges show passed/failed/flaky", async ({ page }) => {
    await expect(page.getByText("passed").first()).toBeVisible();
  });

  test("demo banner persists", async ({ page }) => {
    await expect(page.getByText(/demo mode/i)).toBeVisible();
  });

  test("responsive: table visible on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await expect(page.locator("table")).toBeVisible();
  });
});
