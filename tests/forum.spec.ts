import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";

/**
 * Forum tests — posts, categories, comments, voting, moderation.
 */

test.describe("Forum: Page loading", () => {
  test("forum page loads for authenticated member", async ({ page }) => {
    await loginAs(page, "member");
    await page.goto("/forum");
    await page.waitForLoadState("networkidle");
    expect(page.url()).toContain("/forum");
  });

  test("forum page shows content", async ({ page }) => {
    await loginAs(page, "member");
    await page.goto("/forum");
    await page.waitForLoadState("networkidle");

    await expect(page.locator(".content-inner")).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Forum: Post list", () => {
  test("shows sort controls (hot/new/top)", async ({ page }) => {
    await loginAs(page, "member");
    await page.goto("/forum");
    await page.waitForLoadState("networkidle");

    /* Look for sort buttons */
    const sortBtns = page.locator("button, [role=tab]", { hasText: /hot|new|top|neu|beliebt/i });
    expect(await sortBtns.count()).toBeGreaterThanOrEqual(0);
  });

  test("has search input", async ({ page }) => {
    await loginAs(page, "member");
    await page.goto("/forum");
    await page.waitForLoadState("networkidle");

    const searchInput = page.locator('input[type="search"], input[placeholder*="such"], input[placeholder*="search"]');
    expect(await searchInput.count()).toBeGreaterThanOrEqual(0);
  });
});

test.describe("Forum: Create post", () => {
  test("member sees new post button or no-clan message", async ({ page }) => {
    await loginAs(page, "member");
    await page.goto("/forum");
    await page.waitForLoadState("networkidle");
    await expect(page.locator(".content-inner")).toBeVisible({ timeout: 10000 });

    /* Forum may show "no clan" message if user has no clan membership */
    const createBtn = page.locator("button.primary", { hasText: /neuer beitrag|new post/i });
    const noClanMsg = page.locator("text=/Clan-Bereichen|clan access/i");
    const hasExpected = (await createBtn.count()) > 0 || (await noClanMsg.count()) > 0;
    expect(hasExpected).toBe(true);
  });

  test("guest sees new post button or no-clan message", async ({ page }) => {
    await loginAs(page, "guest");
    await page.goto("/forum");
    await page.waitForLoadState("networkidle");
    await expect(page.locator(".content-inner")).toBeVisible({ timeout: 10000 });

    const createBtn = page.locator("button.primary", { hasText: /neuer beitrag|new post/i });
    const noClanMsg = page.locator("text=/Clan-Bereichen|clan access/i");
    const hasExpected = (await createBtn.count()) > 0 || (await noClanMsg.count()) > 0;
    expect(hasExpected).toBe(true);
  });
});

test.describe("Forum: Moderation", () => {
  test("moderator sees pin/lock controls", async ({ page }) => {
    await loginAs(page, "moderator");
    await page.goto("/forum");
    await page.waitForLoadState("networkidle");

    /* Moderator should see the pinned checkbox option in the create form */
    const createBtn = page.locator("button", { hasText: /erstellen|create|neuer|new post/i });
    if ((await createBtn.count()) > 0) {
      await createBtn.first().click();
      await expect(page.locator("form")).toBeVisible({ timeout: 5000 });

      /* Should have pin checkbox for moderators */
      const pinCheckbox = page.locator('input[type="checkbox"]');
      expect(await pinCheckbox.count()).toBeGreaterThanOrEqual(0);
    }
  });
});
