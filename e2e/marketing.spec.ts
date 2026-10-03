import { test, expect } from "./fixtures";

/*
 * Written against the page as it renders. The previous version of this file
 * asserted a "problem section explains 6 pain points", a "technical credibility
 * section", and features named "Flaky-test detection" and "GitHub App
 * integration" - none of which exist on this landing page. It had never been
 * run. Every assertion below names something the page actually renders, so a
 * failure here means the page changed.
 */
test.describe("Marketing site", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("states the value proposition in the hero", async ({ page }) => {
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toContainText("Turn every test run into a release decision");
    await expect(page.getByText(/explainable quality gate/i).first()).toBeVisible();
  });

  test("offers both calls to action", async ({ page }) => {
    await expect(page.getByRole("link", { name: /explore live demo/i })).toHaveAttribute(
      "href",
      "/dashboard"
    );
    // "Pricing" is a nav label and a hero call to action; the anchor is what
    // both of them point at.
    expect(await page.locator('a[href="#pricing"]').count()).toBeGreaterThan(0);
  });

  test("names the problem it solves", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "The problem with CI output" })).toBeVisible();
  });

  test("lists every capability", async ({ page }) => {
    for (const capability of [
      "Release Health Scoring",
      "Failure Classification",
      "Flaky Test Detection",
      "Regression Detection",
      "PR Quality Reports",
      "Performance Analysis",
      "Human Triage",
    ]) {
      await expect(page.getByRole("heading", { name: capability })).toBeVisible();
    }
  });

  test("explains the workflow step by step", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "How it works" })).toBeVisible();
    for (const step of [
      "Connect a repository",
      "Receive CI data",
      "Classify failures",
      "Apply quality gate",
    ]) {
      await expect(page.getByRole("heading", { name: step })).toBeVisible();
    }
  });

  test("states a price and a way to enquire", async ({ page }) => {
    await expect(page.getByText(/starting at/i)).toBeVisible();

    const enquiry = page.getByRole("link", { name: /book a technical walkthrough/i });
    // Two calls to action carry this label: the hero one scrolls to the
    // pricing card, and the card's own button opens a mail client.
    expect(await enquiry.count()).toBeGreaterThan(1);
    await expect(enquiry.last()).toHaveAttribute("href", /^mailto:/);
  });

  test("credits the builder with working profile links", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "About the builder" })).toBeVisible();

    const external = page.locator('a[href^="http"]');
    const count = await external.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      await expect(external.nth(i)).toHaveAttribute("target", "_blank");
      await expect(external.nth(i)).toHaveAttribute("rel", /noopener/);
    }
  });

  test("does not claim to be running live data", async ({ page }) => {
    // The marketing pages are outside the app shell, so they carry no demo
    // banner. A visitor should not have to guess whether the numbers on the
    // next page are real.
    await expect(page.getByRole("status", { name: "Demo mode active" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /explore live demo/i })).toBeVisible();
  });
});
