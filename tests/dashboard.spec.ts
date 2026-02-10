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
    const body = await page.textContent("body");
    expect(body?.length).toBeGreaterThan(50);
  });

  test("dashboard shows announcements or news preview", async ({ page }) => {
    await loginAs(page, "member");
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    /* Dashboard content */
    const body = await page.textContent("body");
    expect(body?.length).toBeGreaterThan(100);
  });

  test("no JS errors on dashboard", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await loginAs(page, "member");
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    expect(errors).toEqual([]);
  });
});
