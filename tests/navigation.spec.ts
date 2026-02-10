import { test, expect } from "@playwright/test";
import { storageStatePath } from "./helpers/auth";

/**
 * Navigation tests — sidebar links, page transitions, redirects.
 */

test.describe("Navigation: Public page links", () => {
  test("home page has navigation links to about and contact", async ({ page }) => {
    await page.goto("/home");
    await page.waitForLoadState("networkidle");

    const aboutLink = page.locator('a[href*="/about"]');
    expect(await aboutLink.count()).toBeGreaterThan(0);

    const contactLink = page.locator('a[href*="/contact"]');
    expect(await contactLink.count()).toBeGreaterThan(0);
  });

  test("login page links work", async ({ page }) => {
    await page.goto("/auth/login");
    await page.waitForLoadState("networkidle");

    /* Click forgot password link (use .first() since there are multiple) */
    const forgotLink = page.locator('a[href="/auth/forgot"]').first();
    await forgotLink.click();
    await page.waitForLoadState("networkidle");
    expect(page.url()).toContain("/auth/forgot");

    /* Navigate back and click register */
    await page.goto("/auth/login");
    await page.waitForLoadState("networkidle");
    const registerLink = page.locator('a[href="/auth/register"]').first();
    await registerLink.click();
    await page.waitForLoadState("networkidle");
    expect(page.url()).toContain("/auth/register");
  });
});

test.describe("Navigation: Authenticated sidebar (member)", () => {
  test.use({ storageState: storageStatePath("member") });
  test("sidebar shows nav links for authenticated member", async ({ page }) => {
    /* Navigate to a protected page */
    await page.goto("/news");
    await page.waitForLoadState("networkidle");

    /* Sidebar should contain nav links to main sections */
    const nav = page.locator("nav, aside");
    expect(await nav.count()).toBeGreaterThan(0);
  });

  test("member does NOT see admin link in sidebar", async ({ page }) => {
    await page.goto("/news");
    await page.waitForLoadState("networkidle");

    /* Wait for sidebar to fully load */
    await expect(page.locator(".sidebar, aside")).toBeVisible({ timeout: 10000 });
    const adminLink = page.locator('nav a[href="/admin"], aside a[href="/admin"]');
    expect(await adminLink.count()).toBe(0);
  });
});

test.describe("Navigation: Authenticated sidebar (admin)", () => {
  test.use({ storageState: storageStatePath("admin") });
  test("admin sees admin link in sidebar", async ({ page }) => {
    await page.goto("/news");
    await page.waitForLoadState("networkidle");

    const adminLink = page.locator('a[href*="/admin"]');
    expect(await adminLink.count()).toBeGreaterThan(0);
  });
});

test.describe("Navigation: Not-authorized page", () => {
  test("shows error message and home link", async ({ page }) => {
    await page.goto("/not-authorized");
    await page.waitForLoadState("networkidle");

    /* Should have some error/not authorized text (EN or DE) */
    await expect(page.locator("main, .content")).toContainText(
      /not authorized|access denied|no permission|zugriff|autorisiert|nicht autorisiert/i,
      { timeout: 10000 },
    );

    /* Should have a link/button to go home */
    const homeLink = page.locator('a[href*="/home"], a[href="/"]');
    expect(await homeLink.count()).toBeGreaterThan(0);
  });
});
