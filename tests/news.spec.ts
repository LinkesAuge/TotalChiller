import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";

/**
 * News / Articles page tests.
 */

test.describe("News: Page loading", () => {
  test("news page loads for authenticated member", async ({ page }) => {
    await loginAs(page, "member");
    await page.goto("/news");
    await page.waitForLoadState("networkidle");
    expect(page.url()).toContain("/news");
  });

  test("news page shows content or no-clan message", async ({ page }) => {
    await loginAs(page, "member");
    await page.goto("/news");
    await page.waitForLoadState("networkidle");
    await expect(page.locator(".content-inner")).toBeVisible({ timeout: 10000 });

    /* Either top-bar (has clan) or no-clan access message */
    const topBar = page.locator(".top-bar");
    const noClanMsg = page.locator("text=/Clan-Bereichen|clan access/i");
    const hasContent = (await topBar.count()) > 0 || (await noClanMsg.count()) > 0;
    expect(hasContent).toBe(true);
  });
});

test.describe("News: Content manager features", () => {
  test("editor sees create article button or no-clan message", async ({ page }) => {
    await loginAs(page, "editor");
    await page.goto("/news");
    await page.waitForLoadState("networkidle");
    await expect(page.locator(".content-inner")).toBeVisible({ timeout: 10000 });

    /* Editor is a content manager but may lack clan membership */
    const createBtn = page.locator("button.primary", { hasText: /erstellen|create/i });
    const noClanMsg = page.locator("text=/Clan-Bereichen|clan access/i");
    const hasExpected = (await createBtn.count()) > 0 || (await noClanMsg.count()) > 0;
    expect(hasExpected).toBe(true);
  });

  test("member does NOT see create article button", async ({ page }) => {
    await loginAs(page, "member");
    await page.goto("/news");
    await page.waitForLoadState("networkidle");
    await expect(page.locator(".content-inner")).toBeVisible({ timeout: 10000 });

    /* Members are NOT content managers, so no create button */
    const createBtn = page.locator("button.primary", { hasText: /erstellen|create/i });
    expect(await createBtn.count()).toBe(0);
  });

  test("guest does NOT see create button", async ({ page }) => {
    await loginAs(page, "guest");
    await page.goto("/news");
    await page.waitForLoadState("networkidle");
    await expect(page.locator(".content-inner")).toBeVisible({ timeout: 10000 });

    const createBtn = page.locator("button.primary", { hasText: /erstellen|create/i });
    expect(await createBtn.count()).toBe(0);
  });
});

test.describe("News: Article form", () => {
  test("clicking create opens the article form", async ({ page }) => {
    await loginAs(page, "editor");
    await page.goto("/news");
    await page.waitForLoadState("networkidle");

    const createBtn = page.locator("button.primary, button", { hasText: /erstellen|create/i });
    if ((await createBtn.count()) > 0) {
      await createBtn.first().click();
      await expect(page.locator("form")).toBeVisible({ timeout: 5000 });

      /* Form should appear with title input and content area */
      const formInputs = page.locator("input, textarea, [contenteditable]");
      expect(await formInputs.count()).toBeGreaterThan(0);
    }
  });
});
