import { test, expect } from "@playwright/test";
import { loginAs, storageStatePath } from "./helpers/auth";

test.use({ storageState: storageStatePath("member") });

/**
 * Profile & Settings page tests.
 */

test.describe("Profile: Page loading", () => {
  test("profile page loads for authenticated member", async ({ page }) => {
    await page.goto("/profile");
    await page.waitForLoadState("domcontentloaded");
    expect(page.url()).toContain("/profile");
  });

  test("profile page shows user info", async ({ page }) => {
    await page.goto("/profile");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator(".content-inner").first()).toBeVisible({ timeout: 10000 });

    /* Should show cards with account info */
    const cards = page.locator(".card");
    await expect.poll(async () => await cards.count(), { timeout: 10000 }).toBeGreaterThan(0);
  });

  test("profile shows role badge", async ({ page }) => {
    await page.goto("/profile");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator(".content-inner").first()).toBeVisible({ timeout: 10000 });

    const badge = page.locator(".badge");
    await expect.poll(async () => await badge.count(), { timeout: 10000 }).toBeGreaterThan(0);
  });
});

test.describe("Profile: Game accounts section", () => {
  test("profile displays game accounts area", async ({ page }) => {
    await page.goto("/profile");
    await page.waitForLoadState("domcontentloaded");

    /* Should have some section for game accounts or memberships */
    await expect(page.locator(".content-inner").first()).toContainText(/game|account|konto|spiel|clan/i, {
      timeout: 10000,
    });
  });
});

test.describe("Settings: Page loading", () => {
  test("settings page loads for authenticated member", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("domcontentloaded");
    expect(page.url()).toContain("/settings");
  });

  test("settings page shows form fields", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("domcontentloaded");

    const inputs = page.locator("input");
    expect(await inputs.count()).toBeGreaterThan(0);
  });
});

test.describe("Settings: Sections", () => {
  test("has email section", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("domcontentloaded");

    const emailInput = page.locator('input[type="email"]');
    expect(await emailInput.count()).toBeGreaterThan(0);
  });

  test("has password section", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("domcontentloaded");

    const passwordInput = page.locator('input[type="password"]');
    expect(await passwordInput.count()).toBeGreaterThan(0);
  });

  test("has display name field", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator(".content-inner").first()).toContainText(/display|anzeigename|nickname/i, {
      timeout: 10000,
    });
  });

  test("has notification toggles", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("domcontentloaded");

    /* Look for toggle/checkbox elements */
    const toggles = page.locator('input[type="checkbox"], [role="switch"], .toggle');
    expect(await toggles.count()).toBeGreaterThan(0);
  });

  test("has language selector", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator(".content-inner").first()).toContainText(/language|sprache/i, { timeout: 10000 });
  });
});

test.describe("Settings: Username (admin only)", () => {
  test("admin can edit username field", async ({ page }) => {
    await loginAs(page, "admin");
    await page.goto("/settings");
    /* Don't wait for networkidle — settings page may have persistent connections */
    await expect(page.locator(".content-inner").first()).toBeVisible({ timeout: 20000 });

    /* Username input should be enabled for admins */
    const usernameInput = page.locator('input[placeholder*="username"], input[minlength="2"]');
    await expect(usernameInput.first()).toBeVisible({ timeout: 15000 });
    await expect(usernameInput.first()).toBeEnabled();
  });

  test("member has disabled username field", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("domcontentloaded");

    const usernameInput = page.locator('input[placeholder*="username"], input[minlength="2"]');
    if ((await usernameInput.count()) > 0) {
      await expect(usernameInput.first()).toBeDisabled();
    }
  });
});
