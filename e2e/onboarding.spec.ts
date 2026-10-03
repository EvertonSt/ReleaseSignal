import { test, expect } from "./fixtures";

test.describe("Onboarding wizard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/onboarding");
    await page.waitForLoadState("networkidle");
  });

  test("opens on the welcome step", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1, name: "Set Up ReleaseSignal" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Welcome" })).toBeVisible();
  });

  test("shows a progress indicator", async ({ page }) => {
    await expect(page.getByText(/step/i).first()).toBeVisible();
  });

  test("offers a way forward and back", async ({ page }) => {
    await expect(page.getByRole("button", { name: /continue/i })).toBeVisible();
  });

  test("advances to the organization step", async ({ page }) => {
    await page.getByRole("button", { name: /continue/i }).click();

    await expect(page.getByRole("heading", { name: "Organization" })).toBeVisible();
    await expect(page.getByLabel("Organization Name")).toBeVisible();
    await expect(page.getByLabel("Slug")).toBeVisible();
  });

  test("derives a slug from the organization name", async ({ page }) => {
    await page.getByRole("button", { name: /continue/i }).click();
    await page.getByLabel("Organization Name").fill("Acme Engineering");

    // Slugging as you type is what stops the user filing a second bug about the
    // slug field.
    await expect(page.getByLabel("Slug")).toHaveValue("acme-engineering");
  });

  test("gives every form control a label", async ({ page }) => {
    await page.getByRole("button", { name: /continue/i }).click();

    for (const label of ["Organization Name", "Slug", "Timezone", "Default Branch"]) {
      await expect(page.getByLabel(label)).toBeVisible();
    }
  });

  test("can go back to the previous step", async ({ page }) => {
    await page.getByRole("button", { name: /continue/i }).click();
    await expect(page.getByRole("heading", { name: "Organization" })).toBeVisible();

    await page.getByRole("button", { name: /back/i }).click();
    await expect(page.getByRole("heading", { name: "Welcome" })).toBeVisible();
  });

  test("keeps the demo-mode banner visible throughout", async ({ page }) => {
    await expect(page.getByRole("status", { name: "Demo mode active" })).toBeVisible();

    await page.getByRole("button", { name: /continue/i }).click();
    await expect(page.getByRole("status", { name: "Demo mode active" })).toBeVisible();
  });
});
