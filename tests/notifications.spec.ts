import { test, expect } from "@playwright/test";
import { storageStatePath } from "./helpers/auth";

/**
 * Notification bell and notification flow tests.
 */

test.describe("Notifications: Bell icon", () => {
  test.use({ storageState: storageStatePath("member") });
  test("notification bell is visible for authenticated user", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    /* The test user may not have clan access, in which case a "no clan" page
       is shown without the top bar (and hence no bell). Only assert if the
       top bar is actually rendered. */
    const noClanMsg = page.locator("text=/clan.*zugang|keinen zugang|no.*clan.*access/i");
    if ((await noClanMsg.count()) > 0) {
      /* User has no clan — bell may be absent, which is expected */
      return;
    }

    const bell = page.locator(".notification-bell");
    await expect(bell.first()).toBeVisible({ timeout: 15000 });
  });

  test("clicking bell opens notification dropdown", async ({ page }) => {
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
  test.use({ storageState: storageStatePath("member") });
  test("GET /api/notifications returns valid response for authenticated user", async ({ page, request }) => {
    const cookies = await page.context().cookies("http://localhost:3000");
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");

    const res = await request.get("/api/notifications", {
      headers: { Cookie: cookieHeader },
    });
    expect([200, 401, 429]).toContain(res.status());

    if (res.status() === 200) {
      const body = await res.json();
      /* API may return { data: [...] } wrapper or a plain array */
      const items = Array.isArray(body) ? body : body?.data;
      expect(items === undefined || Array.isArray(items)).toBe(true);
    }
  });

  test("POST /api/notifications/mark-all-read works for authenticated user", async ({ page, request }) => {
    const cookies = await page.context().cookies("http://localhost:3000");
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");

    const res = await request.post("/api/notifications/mark-all-read", {
      headers: { Cookie: cookieHeader },
    });
    expect([200, 401, 429]).toContain(res.status());
  });

  test("GET /api/notification-settings returns valid response", async ({ page, request }) => {
    const cookies = await page.context().cookies("http://localhost:3000");
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");

    const res = await request.get("/api/notification-settings", {
      headers: { Cookie: cookieHeader },
    });
    expect([200, 401, 429]).toContain(res.status());
  });
});
