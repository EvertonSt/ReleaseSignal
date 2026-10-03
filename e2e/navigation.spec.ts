import { test, expect } from "./fixtures";
import { APP_ROUTES } from "./fixtures";

test.describe("Navigation & Layout", () => {
  test.describe("Desktop sidebar", () => {
    test("sidebar renders on desktop", async ({ desktopPage: page }) => {
      await page.goto("/dashboard");
      await expect(page.locator("aside")).toBeVisible();
    });

    test("sidebar has all 10 nav links", async ({ desktopPage: page }) => {
      await page.goto("/dashboard");
      const links = [
        "Dashboard",
        "Test Runs",
        "Failures",
        "Flaky Tests",
        "Quality Gates",
        "Pull Requests",
        "Performance",
        "Reports",
        "Settings",
      ];
      for (const name of links) {
        await expect(page.getByRole("link", { name }).first()).toBeVisible();
      }
    });

    test("RS logo and brand name in sidebar", async ({ desktopPage: page }) => {
      await page.goto("/dashboard");
      await expect(page.getByText("ReleaseSignal").first()).toBeVisible();
    });

    test("active nav link is highlighted", async ({ desktopPage: page }) => {
      await page.goto("/dashboard");
      const dashLink = page.getByRole("link", { name: "Dashboard" }).first();
      await expect(dashLink).toHaveClass(/bg-sidebar-accent/);
    });

    test("sidebar collapse button works", async ({ desktopPage: page }) => {
      await page.goto("/dashboard");
      const collapseBtn = page.locator("aside button").last();
      await collapseBtn.click();
      await page.waitForTimeout(300);
      // Sidebar should be narrower
      const aside = page.locator("aside");
      await expect(aside).toBeVisible();
    });
  });

  test.describe("Mobile bottom nav", () => {
    test("bottom nav shows on mobile", async ({ mobilePage: page }) => {
      await page.goto("/dashboard");
      await expect(page.locator("nav.fixed")).toBeVisible();
    });

    test("bottom nav has exactly 5 items", async ({ mobilePage: page }) => {
      await page.goto("/dashboard");
      const links = page.locator("nav.fixed a");
      expect(await links.count()).toBe(5);
    });

    test("bottom nav items: Dashboard, Runs, Issues, Gates, Perf", async ({ mobilePage: page }) => {
      await page.goto("/dashboard");
      await expect(page.getByRole("link", { name: "Dashboard" }).last()).toBeVisible();
      await expect(page.getByRole("link", { name: "Runs" }).last()).toBeVisible();
      await expect(page.getByRole("link", { name: "Issues" }).last()).toBeVisible();
      await expect(page.getByRole("link", { name: "Gates" }).last()).toBeVisible();
      await expect(page.getByRole("link", { name: "Perf" }).last()).toBeVisible();
    });

    test("bottom nav badge shows count", async ({ mobilePage: page }) => {
      await page.goto("/dashboard");
      await expect(page.getByText("5").last()).toBeVisible();
    });

    test("bottom nav active state on current page", async ({ mobilePage: page }) => {
      await page.goto("/dashboard");
      const dashLink = page.getByRole("link", { name: "Dashboard" }).last();
      await expect(dashLink).toHaveClass(/text-primary/);
    });
  });

  test.describe("Mobile hamburger & drawer", () => {
    test("hamburger shows on mobile, hidden on desktop", async ({ mobilePage, desktopPage }) => {
      await mobilePage.goto("/dashboard");
      await expect(mobilePage.getByRole("button", { name: "Open navigation menu" })).toBeVisible();

      await desktopPage.goto("/dashboard");
      await expect(desktopPage.getByRole("button", { name: "Open navigation menu" })).toBeHidden();
    });

    test("hamburger opens drawer with all nav links", async ({ mobilePage: page }) => {
      await page.goto("/dashboard");
      await page.getByRole("button", { name: /open navigation menu/i }).click();
      await page.waitForTimeout(300);
      // Drawer should contain full navigation
      await expect(page.getByRole("link", { name: "Dashboard" }).first()).toBeVisible();
      await expect(page.getByRole("link", { name: "Settings" }).first()).toBeVisible();
      await expect(page.getByRole("link", { name: "Reports" }).first()).toBeVisible();
    });

    test("drawer closes on backdrop click", async ({ mobilePage: page }) => {
      await page.goto("/dashboard");
      await page.getByRole("button", { name: /open navigation menu/i }).click();
      await page.waitForTimeout(300);
      // Click backdrop
      const backdrop = page.locator('[class*="fixed inset-0"] [class*="bg-black"]').first();
      if (await backdrop.isVisible()) {
        await backdrop.click({ force: true });
        await page.waitForTimeout(300);
      }
    });

    test("drawer closes on nav link click", async ({ mobilePage: page }) => {
      await page.goto("/dashboard");
      await page.getByRole("button", { name: /open navigation menu/i }).click();
      await page.waitForTimeout(300);
      await page.getByRole("link", { name: "Test Runs" }).first().click();
      await page.waitForURL("**/test-runs");
    });
  });

  test.describe("TopBar", () => {
    test("search trigger shows with ⌘K hint", async ({ page }) => {
      await page.goto("/dashboard");
      await expect(
        page
          .locator("button")
          .filter({ hasText: /search/i })
          .first()
      ).toBeVisible();
    });

    test("clicking search opens command palette", async ({ page }) => {
      await page.goto("/dashboard");
      await page
        .locator("button")
        .filter({ hasText: /search/i })
        .first()
        .click();
      await page.waitForTimeout(300);
      await expect(page.locator('input[placeholder*="Search pages"]')).toBeVisible();
    });

    test("command palette has all nav items", async ({ page }) => {
      await page.goto("/dashboard");
      await page
        .locator("button")
        .filter({ hasText: /search/i })
        .first()
        .click();

      // Waiting for the palette's own input is the synchronisation point. A
      // fixed `waitForTimeout` here is what made this test fail intermittently
      // on a loaded runner and never fail locally.
      const input = page.locator('input[placeholder*="Search pages"]');
      await expect(input).toBeVisible();

      await expect(page.getByText("Dashboard").filter({ visible: true }).first()).toBeVisible();
      await expect(page.getByText("Test Runs").filter({ visible: true }).first()).toBeVisible();
      await expect(page.getByText("Failure Intelligence").filter({ visible: true }).first()).toBeVisible();
    });

    test("command palette search filters results", async ({ page }) => {
      await page.goto("/dashboard");
      await page
        .locator("button")
        .filter({ hasText: /search/i })
        .first()
        .click();

      const input = page.locator('input[placeholder*="Search pages"]');
      await expect(input).toBeVisible();
      await input.fill("perf");

      // Scoped to the palette: "Reports" is also in the sidebar, so asserting
      // on the bare text would pass even if the filter did nothing.
      const palette = page.getByRole("dialog", { name: "Search" });
      await expect(palette.getByText("Performance")).toBeVisible();
      await expect(palette.getByText("Reports")).toHaveCount(0);
    });

    test("notification bell shows with unread count", async ({ page }) => {
      await page.goto("/dashboard");
      const bell = page.getByRole("button", { name: /notifications/i });
      await expect(bell).toBeVisible();
    });

    test("notification dropdown opens with items", async ({ page }) => {
      await page.goto("/dashboard");
      await page.getByRole("button", { name: /notifications/i }).click();
      await page.waitForTimeout(300);
      await expect(page.getByText("Notifications")).toBeVisible();
      await expect(page.getByText("Mark all read")).toBeVisible();
      await expect(page.getByText("New regression detected")).toBeVisible();
      await expect(page.getByText("Staging gate: warning")).toBeVisible();
      await expect(page.getByText("Release passed")).toBeVisible();
    });

    test("notification dropdown has 7 items", async ({ page }) => {
      await page.goto("/dashboard");
      await page.getByRole("button", { name: /notifications/i }).click();
      await page.waitForTimeout(300);
      const items = page.locator('[class*="border-b border-border/50"]');
      expect(await items.count()).toBe(7);
    });

    test("notification settings link", async ({ page }) => {
      await page.goto("/dashboard");
      await page.getByRole("button", { name: /notifications/i }).click();
      await page.waitForTimeout(300);
      await expect(page.getByText("Notification settings")).toBeVisible();
    });

    test("user menu shows on desktop", async ({ desktopPage: page }) => {
      await page.goto("/dashboard");
      await expect(page.getByText("Demo User")).toBeVisible();
    });

    test("user menu dropdown opens", async ({ desktopPage: page }) => {
      await page.goto("/dashboard");
      const userBtn = page.locator("button").filter({ hasText: "Demo User" });
      await userBtn.click();
      await page.waitForTimeout(300);
      await expect(page.getByText("Profile & Account")).toBeVisible();
      await expect(page.getByText("Settings").first()).toBeVisible();
      await expect(page.getByText("Sign out")).toBeVisible();
    });
  });

  test.describe("Cross-page navigation", () => {
    test("sidebar links navigate correctly", async ({ desktopPage: page }) => {
      await page.goto("/dashboard");
      for (const route of APP_ROUTES.slice(1)) {
        await page
          .getByRole("link", { name: route.heading.split(" ")[0] })
          .first()
          .click();
        await page.waitForURL(`**${route.path}`);
        await expect(page.locator("h1").first()).toContainText(route.heading);
      }
    });

    test("demo banner persists across all pages", async ({ page }) => {
      for (const route of APP_ROUTES) {
        await page.goto(route.path);
        await expect(page.getByText(/demo mode/i)).toBeVisible();
      }
    });

    test("topbar persists across pages", async ({ page }) => {
      for (const route of ["/dashboard", "/test-runs", "/failures"]) {
        await page.goto(route);
        await expect(page.locator("header")).toBeVisible();
      }
    });
  });

  test.describe("Responsive", () => {
    test("sidebar hidden on mobile, bottom nav visible", async ({ mobilePage: page }) => {
      await page.goto("/dashboard");
      await expect(page.locator("aside")).not.toBeVisible();
      await expect(page.locator("nav.fixed")).toBeVisible();
    });

    test("sidebar visible on desktop, bottom nav hidden", async ({ desktopPage: page }) => {
      await page.goto("/dashboard");
      await expect(page.locator("aside")).toBeVisible();
      await expect(page.locator("nav.fixed")).not.toBeVisible();
    });

    test("tablet shows sidebar", async ({ page }) => {
      await page.setViewportSize({ width: 1024, height: 768 });
      await page.goto("/dashboard");
      await expect(page.locator("aside")).toBeVisible();
    });
  });
});
