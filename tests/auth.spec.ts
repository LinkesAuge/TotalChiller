import { test, expect } from "@playwright/test";

/**
 * Authentication flow tests.
 * Tests the login, register, forgot password, and update password pages.
 */

test.describe("Auth: Login page", () => {
  test("renders login form with all fields", async ({ page }) => {
    await page.goto("/auth/login");
    await page.waitForLoadState("networkidle");

    /* Identifier field (email or username) */
    const identifierInput = page.locator("#identifier");
    await expect(identifierInput).toBeVisible();

    /* Password field */
    const passwordInput = page.locator("#password");
    await expect(passwordInput).toBeVisible();

    /* Submit button */
    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeVisible();
  });

  test("shows error for invalid credentials", async ({ page }) => {
    await page.goto("/auth/login");
    await page.waitForLoadState("networkidle");

    await page.locator("#identifier").fill("invalid@nonexistent.com");
    await page.locator("#password").fill("wrongpassword");
    await page.locator('button[type="submit"]').click();

    /* Wait for error/status message to appear */
    await page.waitForTimeout(3000);
    const statusMsg = page.locator(".text-muted");
    expect(await statusMsg.count()).toBeGreaterThan(0);
  });

  test("has link to forgot password page", async ({ page }) => {
    await page.goto("/auth/login");
    await page.waitForLoadState("networkidle");

    const forgotLink = page.locator('a[href="/auth/forgot"]').first();
    await expect(forgotLink).toBeVisible();
  });

  test("has link to register page", async ({ page }) => {
    await page.goto("/auth/login");
    await page.waitForLoadState("networkidle");

    const registerLink = page.locator('a[href="/auth/register"]').first();
    await expect(registerLink).toBeVisible();
  });
});

test.describe("Auth: Register page", () => {
  test("renders registration form", async ({ page }) => {
    await page.goto("/auth/register");
    await page.waitForLoadState("networkidle");

    /* Email field */
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();

    /* Password field(s) */
    const passwordInputs = page.locator('input[type="password"]');
    expect(await passwordInputs.count()).toBeGreaterThanOrEqual(1);

    /* Submit button */
    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeVisible();
  });

  test("validates empty form submission", async ({ page }) => {
    await page.goto("/auth/register");
    await page.waitForLoadState("networkidle");

    await page.locator('button[type="submit"]').click();

    /* Browser validation should prevent submission or show error */
    await page.waitForTimeout(1000);
    /* Still on register page */
    expect(page.url()).toContain("/auth/register");
  });

  test("has link to login page", async ({ page }) => {
    await page.goto("/auth/register");
    await page.waitForLoadState("networkidle");

    const loginLink = page.locator('a[href*="/auth/login"]');
    await expect(loginLink).toBeVisible();
  });
});

test.describe("Auth: Forgot password page", () => {
  test("renders forgot password form", async ({ page }) => {
    await page.goto("/auth/forgot");
    await page.waitForLoadState("networkidle");

    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();

    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeVisible();
  });

  test("submitting with valid email shows status message", async ({ page }) => {
    await page.goto("/auth/forgot");
    await page.waitForLoadState("networkidle");

    await page.locator('input[type="email"]').fill("test@example.com");
    await page.locator('button[type="submit"]').click();

    /* Should show a confirmation message (password reset email sent or similar) */
    await page.waitForTimeout(3000);
    const statusMsg = page.locator("text=/sent|check|email|link|reset/i");
    expect(await statusMsg.count()).toBeGreaterThan(0);
  });

  test("has link back to login", async ({ page }) => {
    await page.goto("/auth/forgot");
    await page.waitForLoadState("networkidle");

    const loginLink = page.locator('a[href="/auth/login"]').first();
    await expect(loginLink).toBeVisible();
  });
});

test.describe("Auth: Update password page", () => {
  test("renders password update form", async ({ page }) => {
    await page.goto("/auth/update");
    await page.waitForLoadState("networkidle");

    /* Should have password input(s) */
    const passwordInputs = page.locator('input[type="password"]');
    expect(await passwordInputs.count()).toBeGreaterThanOrEqual(1);
  });
});
