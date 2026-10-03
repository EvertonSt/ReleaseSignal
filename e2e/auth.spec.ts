import { test, expect } from "./fixtures";

test.describe("Authentication", () => {
  test("login page names the product and the action", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("ReleaseSignal").first()).toBeVisible();
    await expect(page.getByText("Sign in to your account")).toBeVisible();
  });

  test("offers GitHub as the only sign-in provider", async ({ page }) => {
    await page.goto("/login");

    // Least privilege means one provider, not a password form to get wrong.
    const provider = page.getByRole("button", { name: /sign in with github/i });
    await expect(provider).toBeVisible();
    await expect(provider).toHaveCount(1);
    await expect(page.locator('input[type="password"]')).toHaveCount(0);
  });

  test("never asks for a password", async ({ page }) => {
    // Nothing on this page may collect a credential ReleaseSignal would then
    // have to store.
    await page.goto("/login");
    await expect(page.locator('input[type="password"]')).toHaveCount(0);
    await expect(page.locator('input[name*="password" i]')).toHaveCount(0);
  });

  test("reaches the app without a session in demo mode", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Demo mode is deliberately open - but it says so, loudly, on every app
    // page, so nobody mistakes the numbers for a live install.
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("status", { name: "Demo mode active" })).toBeVisible();
  });

  test("marks demo mode on every app page", async ({ page }) => {
    await page.goto("/dashboard");
    const banner = page.getByRole("status", { name: "Demo mode active" });
    await expect(banner).toBeVisible();
    await expect(banner).toContainText(/synthetic test data/i);
  });
});
