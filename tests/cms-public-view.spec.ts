import { test, expect } from "@playwright/test";

/**
 * Test 2: Public Visibility
 * Verifies that all CMS content is visible without login
 * and that no edit buttons are shown to non-admin users.
 */

test.describe("CMS Public View (no login)", () => {
  test("homepage loads all sections", async ({ page }) => {
    await page.goto("/home");
    await page.waitForLoadState("networkidle");

    // Top bar title should be visible
    await expect(page.locator(".top-bar-title")).toBeVisible();

    // Hero banner should exist
    await expect(page.locator(".hero-banner")).toBeVisible();

    // All main sections should be present
    const cards = page.locator(".card");
    expect(await cards.count()).toBeGreaterThanOrEqual(4);
  });

  test("no edit buttons visible for unauthenticated users", async ({ page }) => {
    await page.goto("/home");
    await page.waitForLoadState("networkidle");

    // No pencil edit buttons should be visible
    const editButtons = page.locator(".editable-text-pencil");
    expect(await editButtons.count()).toBe(0);

    // No list add buttons should be visible
    const addButtons = page.locator(".editable-list-add");
    expect(await addButtons.count()).toBe(0);

    // No list edit/remove buttons
    const listActions = page.locator(".editable-list-actions");
    expect(await listActions.count()).toBe(0);
  });

  test("about page loads CMS content", async ({ page }) => {
    await page.goto("/about");
    await page.waitForLoadState("networkidle");

    // Should not show loading skeleton (allow time for API calls to complete)
    await expect(page.locator(".cms-loading-skeleton")).not.toBeVisible({ timeout: 15000 });

    // Should have card sections
    const cards = page.locator(".card");
    await expect(cards.first()).toBeVisible({ timeout: 10000 });
    expect(await cards.count()).toBeGreaterThanOrEqual(3);
  });

  test("contact page loads CMS content", async ({ page }) => {
    await page.goto("/contact");
    await page.waitForLoadState("networkidle");

    await expect(page.locator(".cms-loading-skeleton")).not.toBeVisible();

    const cards = page.locator(".card");
    expect(await cards.count()).toBeGreaterThanOrEqual(3);
  });

  test("privacy page loads CMS content", async ({ page }) => {
    await page.goto("/privacy-policy");
    await page.waitForLoadState("networkidle");

    await expect(page.locator(".cms-loading-skeleton")).not.toBeVisible();

    const cards = page.locator(".card");
    expect(await cards.count()).toBeGreaterThanOrEqual(1);
  });

  test("no error banners on any page", async ({ page }) => {
    for (const pagePath of ["/home", "/about", "/contact", "/privacy-policy"]) {
      await page.goto(pagePath);
      await page.waitForLoadState("networkidle");

      /* Wait a moment for any async error banners to appear */
      await page.waitForTimeout(500);

      const errorBanner = page.locator(".cms-error-banner");
      const bannerCount = await errorBanner.count();
      if (bannerCount > 0) {
        /* Log which page has the error for debugging */
        const text = await errorBanner.first().textContent();
        console.warn(`Error banner on ${pagePath}: ${text}`);
      }
      expect(bannerCount).toBe(0);
    }
  });

  test("same content for logged-out and fresh session", async ({ page, context }) => {
    // Clear all cookies/storage to ensure fresh session
    await context.clearCookies();

    await page.goto("/home");
    await page.waitForLoadState("networkidle");

    // The API should return JSON (not HTML redirect)
    const response = await page.request.get("/api/site-content?page=home");
    /* May be rate-limited (429) in fast test runs */
    expect([200, 429]).toContain(response.status());
    if (response.status() === 200) {
      const contentType = response.headers()["content-type"] || "";
      expect(contentType).toContain("application/json");
    }
  });

  test("site-list-items API returns JSON for unauthenticated users", async ({ page, context }) => {
    await context.clearCookies();

    const response = await page.request.get("/api/site-list-items?page=home");
    /* May be rate-limited (429) in fast test runs */
    expect([200, 429]).toContain(response.status());
    if (response.status() === 200) {
      const contentType = response.headers()["content-type"] || "";
      expect(contentType).toContain("application/json");
    }
  });
});
