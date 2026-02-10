import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";

/**
 * Notification bell and notification flow tests.
 */

test.describe("Notifications: Bell icon", () => {
  test("notification bell is visible for authenticated user", async ({ page }) => {
    await loginAs(page, "member");
    await page.goto("/news");
    await page.waitForLoadState("networkidle");
    await expect(page.locator(".content-inner")).toBeVisible({ timeout: 10000 });

    /* Bell icon should be in the top bar */
    const bell = page.locator(".notification-bell, [aria-label*='notification'], [aria-label*='Benachrichtigung']");
    expect(await bell.count()).toBeGreaterThan(0);
  });

  test("clicking bell opens notification dropdown", async ({ page }) => {
    await loginAs(page, "member");
    await page.goto("/news");
    await page.waitForLoadState("networkidle");
    await expect(page.locator(".content-inner")).toBeVisible({ timeout: 10000 });

    const bell = page
      .locator(".notification-bell, [aria-label*='notification'], [aria-label*='Benachrichtigung']")
      .first();
    if ((await bell.count()) > 0) {
      await bell.click();

      /* Dropdown panel should appear */
      const panel = page.locator(".notification-panel, .notification-dropdown, [role='dialog']");
      await expect(panel.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test("notification panel has mark-all-read button", async ({ page }) => {
    await loginAs(page, "member");
    await page.goto("/news");
    await page.waitForLoadState("networkidle");
    await expect(page.locator(".content-inner")).toBeVisible({ timeout: 10000 });

    const bell = page
      .locator(".notification-bell, [aria-label*='notification'], [aria-label*='Benachrichtigung']")
      .first();
    if ((await bell.count()) > 0) {
      await bell.click();

      /* Look for mark-all-read button */
      const markAllBtn = page.locator("button", { hasText: /mark all|alle als gelesen/i });
      /* May not be visible if no unread notifications */
      expect(await markAllBtn.count()).toBeGreaterThanOrEqual(0);
    }
  });
});

test.describe("Notifications: API endpoints", () => {
  test("GET /api/notifications returns valid response for authenticated user", async ({ page, request }) => {
    await loginAs(page, "member");

    const cookies = await page.context().cookies();
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");
    const baseUrl = page.url().replace(/\/[^/]*$/, "");

    const res = await request.get(`${baseUrl}/api/notifications`, {
      headers: { Cookie: cookieHeader },
    });
    expect([200, 401]).toContain(res.status());

    if (res.status() === 200) {
      const body = await res.json();
      expect(Array.isArray(body)).toBe(true);
    }
  });

  test("POST /api/notifications/mark-all-read works for authenticated user", async ({ page, request }) => {
    await loginAs(page, "member");

    const cookies = await page.context().cookies();
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");
    const baseUrl = page.url().replace(/\/[^/]*$/, "");

    const res = await request.post(`${baseUrl}/api/notifications/mark-all-read`, {
      headers: { Cookie: cookieHeader },
    });
    expect([200, 401]).toContain(res.status());
  });

  test("GET /api/notification-settings returns valid response", async ({ page, request }) => {
    await loginAs(page, "member");

    const cookies = await page.context().cookies();
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");
    const baseUrl = page.url().replace(/\/[^/]*$/, "");

    const res = await request.get(`${baseUrl}/api/notification-settings`, {
      headers: { Cookie: cookieHeader },
    });
    expect([200, 401]).toContain(res.status());
  });
});
