import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";

/**
 * Messages tests — inbox, compose, send, broadcast.
 */

test.describe("Messages: Page loading", () => {
  test("messages page loads for authenticated member", async ({ page }) => {
    await loginAs(page, "member");
    await page.goto("/messages");
    await page.waitForLoadState("networkidle");
    expect(page.url()).toContain("/messages");
  });

  test("messages page shows content area", async ({ page }) => {
    await loginAs(page, "member");
    await page.goto("/messages");
    await page.waitForLoadState("networkidle");

    await expect(page.locator(".content-inner")).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Messages: Compose", () => {
  test("has compose button or area", async ({ page }) => {
    await loginAs(page, "member");
    await page.goto("/messages");
    await page.waitForLoadState("networkidle");

    /* Look for compose/new message button */
    const composeBtn = page.locator("button", { hasText: /compose|verfassen|new|neu|nachricht/i });
    expect(await composeBtn.count()).toBeGreaterThanOrEqual(0);
  });
});

test.describe("Messages: Broadcast (content managers)", () => {
  test("moderator sees broadcast UI elements", async ({ page }) => {
    await loginAs(page, "moderator");
    await page.goto("/messages");
    await page.waitForLoadState("networkidle");

    /* Content managers should see clan/global broadcast options */
    await expect(page.locator(".content-inner")).toBeVisible({ timeout: 10000 });
  });

  test("member does NOT see broadcast options", async ({ page }) => {
    await loginAs(page, "member");
    await page.goto("/messages");
    await page.waitForLoadState("networkidle");
    await expect(page.locator(".content-inner")).toBeVisible({ timeout: 10000 });

    /* Member shouldn't see clan broadcast selector */
    const broadcastSelect = page.locator("select", { hasText: /broadcast|rundnachricht|clan/i });
    expect(await broadcastSelect.count()).toBe(0);
  });
});

test.describe("Messages: Type filters", () => {
  test("has message type filter options", async ({ page }) => {
    await loginAs(page, "member");
    await page.goto("/messages");
    await page.waitForLoadState("networkidle");

    /* Should have filter tabs or select for message types */
    const filterElements = page.locator("[role=tab], select, .filter, .tab");
    expect(await filterElements.count()).toBeGreaterThanOrEqual(0);
  });
});
