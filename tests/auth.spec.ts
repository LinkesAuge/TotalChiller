import { test, expect } from "@playwright/test";

/**
 * Authentication flow tests.
 * Tests the login, register, forgot password, and update password pages.
 */

test.describe("Auth: Login page", () => {
  test("renders login form with all fields", async ({ page }) => {
    await page.goto("/auth/login");
    await page.waitForLoadState("domcontentloaded");

    /* Identifier field (email or username) */
    const identifierInput = page.locator("#identifier").first();
    await expect(identifierInput).toBeVisible();

    /* Password field */
    const passwordInput = page.locator("#password").first();
    await expect(passwordInput).toBeVisible();

    /* Submit button */
    const submitBtn = page.locator('button[type="submit"]').first();
    await expect(submitBtn).toBeVisible();
  });

  test("shows error for invalid credentials", async ({ page }) => {
    await page.goto("/auth/login");
    await page.waitForLoadState("domcontentloaded");

    await page.locator("#identifier").first().fill("invalid@nonexistent.com");
    await page.locator("#password").first().fill("wrongpassword");
    await page.locator('button[type="submit"]').first().click();

    /* Wait for error/status message to appear */
    await expect(page.locator(".text-muted")).toBeVisible({ timeout: 10000 });
  });

  test("has link to forgot password page", async ({ page }) => {
    await page.goto("/auth/login");
    await page.waitForLoadState("domcontentloaded");

    const forgotLink = page.locator('a[href="/auth/forgot"]').first();
    await expect(forgotLink).toBeVisible();
  });

  test("has link to register page", async ({ page }) => {
    await page.goto("/auth/login");
    await page.waitForLoadState("domcontentloaded");

    const registerLink = page.locator('a[href="/auth/register"]').first();
    await expect(registerLink).toBeVisible();
  });
});

test.describe("Auth: Register page", () => {
  test("renders registration form", async ({ page }) => {
    await page.goto("/auth/register");
    await page.waitForLoadState("domcontentloaded");

    /* Email field */
    const emailInput = page.locator('input[type="email"]').first();
    await expect(emailInput).toBeVisible();

    /* Password field(s) */
    const passwordInputs = page.locator('input[type="password"]');
    expect(await passwordInputs.count()).toBeGreaterThanOrEqual(1);

    /* Submit button */
    const submitBtn = page.locator('button[type="submit"]').first();
    await expect(submitBtn).toBeVisible();
  });

  test("validates empty form submission", async ({ page }) => {
    await page.goto("/auth/register");
    await page.waitForLoadState("domcontentloaded");

    await page.locator('button[type="submit"]').first().click();

    /* Browser validation should prevent submission or show error */
    /* Still on register page */
    expect(page.url()).toContain("/auth/register");
  });

  test("has link to login page", async ({ page }) => {
    await page.goto("/auth/register");
    await page.waitForLoadState("domcontentloaded");

    const loginLink = page.locator('a[href*="/auth/login"]').first();
    await expect(loginLink).toBeVisible();
  });
});

test.describe("Auth: Forgot password page", () => {
  test("renders forgot password form", async ({ page }) => {
    await page.goto("/auth/forgot");
    await page.waitForLoadState("domcontentloaded");

    const emailInput = page.locator('input[type="email"]').first();
    await expect(emailInput).toBeVisible();

    const submitBtn = page.locator('button[type="submit"]').first();
    await expect(submitBtn).toBeVisible();
  });

  test("submitting with valid email shows status message", async ({ page }) => {
    await page.goto("/auth/forgot");
    await page.waitForLoadState("domcontentloaded");

    await page.locator('input[type="email"]').first().fill("test@example.com");
    await page.locator('button[type="submit"]').first().click();

    /* Should show a confirmation message (password reset email sent or similar).
       Use .first() because the page may contain multiple elements matching the pattern. */
    await expect(page.locator("text=/sent|check|email|link|reset/i").first()).toBeVisible({ timeout: 10000 });
  });

  test("has link back to login", async ({ page }) => {
    await page.goto("/auth/forgot");
    await page.waitForLoadState("domcontentloaded");

    const loginLink = page.locator('a[href="/auth/login"]').first();
    await expect(loginLink).toBeVisible();
  });
});

test.describe("Auth: Update password page", () => {
  test("renders password update form", async ({ page }) => {
    await page.goto("/auth/update");
    await page.waitForLoadState("domcontentloaded");

    /* Should have password input(s) */
    const passwordInputs = page.locator('input[type="password"]');
    expect(await passwordInputs.count()).toBeGreaterThanOrEqual(1);
  });
});
