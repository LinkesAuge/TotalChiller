import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";

/**
 * Dashboard (root page) tests.
 */

test.describe("Dashboard: Page loading", () => {
  test("root page loads for authenticated member", async ({ page }) => {
    await loginAs(page, "member");
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    /* Should be on dashboard or redirected to home */
    await expect(page.locator(".content-inner, .card").first()).toBeVisible({ timeout: 10000 });
  });

  test("dashboard shows announcements or news preview", async ({ page }) => {
    await loginAs(page, "member");
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    /* Dashboard should render cards or section content */
    await expect(page.locator(".card, .dashboard-section, .section-hero, .content-inner").first()).toBeVisible({
      timeout: 10000,
    });
  });

  test("no JS errors on dashboard", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await loginAs(page, "member");
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page.locator(".content-inner")).toBeVisible({ timeout: 10000 });

    expect(errors).toEqual([]);
  });
});
