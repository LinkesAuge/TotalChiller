import { test, expect } from "@playwright/test";
import { storageStatePath } from "./helpers/auth";

/**
 * Navigation tests — sidebar links, page transitions, redirects.
 */

test.describe("Navigation: Public page links", () => {
  test("home page has navigation links to about and contact", async ({ page }) => {
    await page.goto("/home");
    await page.waitForLoadState("domcontentloaded");

    const aboutLink = page.locator('a[href*="/about"]');
    expect(await aboutLink.count()).toBeGreaterThan(0);

    const contactLink = page.locator('a[href*="/contact"]');
    expect(await contactLink.count()).toBeGreaterThan(0);
  });

  test("login page links work", async ({ page }) => {
    await page.goto("/auth/login");
    await page.waitForLoadState("domcontentloaded");

    /* Click forgot password link (use .first() since there are multiple) */
    const forgotLink = page.locator('a[href="/auth/forgot"]').first();
    await Promise.all([page.waitForURL((url) => url.pathname === "/auth/forgot"), forgotLink.click()]);
    expect(page.url()).toContain("/auth/forgot");

    /* Navigate back and click register */
    await page.goto("/auth/login");
    await page.waitForLoadState("domcontentloaded");
    const registerLink = page.locator('a[href="/auth/register"]').first();
    await Promise.all([page.waitForURL((url) => url.pathname === "/auth/register"), registerLink.click()]);
    expect(page.url()).toContain("/auth/register");
  });
});

test.describe("Navigation: Authenticated sidebar (member)", () => {
  test.use({ storageState: storageStatePath("member") });
  test("sidebar shows nav links for authenticated member", async ({ page }) => {
    /* Navigate to a protected page */
    await page.goto("/news");
    await page.waitForLoadState("domcontentloaded");

    /* Sidebar should contain nav links to main sections */
    const nav = page.locator("nav, aside");
    expect(await nav.count()).toBeGreaterThan(0);
  });

  test("sidebar shows core navigation links for authenticated member", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator(".sidebar, aside")).toBeVisible({ timeout: 10000 });
    const coreLink = page.locator(
      'nav a[href="/"], nav a[href="/home"], nav a[href="/news"], aside a[href="/"], aside a[href="/home"], aside a[href="/news"]',
    );
    await expect(coreLink.first()).toBeVisible({ timeout: 10000 });
  });

  test("member does NOT see admin link in sidebar", async ({ page }) => {
    await page.goto("/news");
    await page.waitForLoadState("domcontentloaded");

    /* Wait for sidebar to fully load */
    await expect(page.locator(".sidebar, aside")).toBeVisible({ timeout: 10000 });
    const adminLink = page.locator('nav a[href="/admin"], aside a[href="/admin"]');
    expect(await adminLink.count()).toBe(0);
  });
});

test.describe("Navigation: Authenticated sidebar (admin)", () => {
  test.use({ storageState: storageStatePath("admin") });
  test("admin can access admin route", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForLoadState("domcontentloaded");
    await expect(page).toHaveURL(/\/admin/);
  });
});

test.describe("Navigation: Not-authorized page", () => {
  test("shows error message and home link", async ({ page }) => {
    await page.goto("/not-authorized");
    await page.waitForLoadState("domcontentloaded");

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
