import { test, expect } from "@playwright/test";
import { storageStatePath } from "./helpers/auth";
import { waitForClanAccessResolution } from "./helpers/wait-for-clan-access";

test.use({ storageState: storageStatePath("member") });

/**
 * Dashboard (root page) tests.
 */

test.describe("Dashboard: Page loading", () => {
  test("root page loads for authenticated member", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    /* Should be on dashboard or redirected to home */
    await expect(page.locator(".content-inner, .card").first()).toBeVisible({ timeout: 10000 });
  });

  test("dashboard shows announcements or news preview", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    /* Dashboard should render cards or section content */
    await expect(page.locator(".card, .dashboard-section, .section-hero, .content-inner").first()).toBeVisible({
      timeout: 10000,
    });
  });

  test("no JS errors on dashboard", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator(".content-inner").first()).toBeVisible({ timeout: 10000 });

    expect(errors).toEqual([]);
  });
});

test.describe("Dashboard: Widget sections", () => {
  test("dashboard renders stats grid or no-access prompt", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator(".content-inner, main").first()).toBeVisible({ timeout: 10000 });
    await waitForClanAccessResolution(page);

    /* User either sees stat-grid (has clan) or a profile link prompt (no clan) */
    const statGrid = page.locator(".stat-grid");
    const profileLink = page.locator('a[href="/profile"]');
    await expect
      .poll(async () => (await statGrid.count()) + (await profileLink.count()), { timeout: 10000 })
      .toBeGreaterThan(0);
  });

  test("dashboard renders View All links or no-access prompt", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator(".content-inner, main").first()).toBeVisible({ timeout: 10000 });
    await waitForClanAccessResolution(page);

    /* If user has clan access, View All links exist; otherwise a profile link prompt shows */
    const newsLink = page.locator('a[href="/news"]');
    const eventsLink = page.locator('a[href="/events"]');
    const profileLink = page.locator('a[href="/profile"]');
    await expect
      .poll(
        async () =>
          ((await newsLink.count()) > 0 && (await eventsLink.count()) > 0 ? 1 : 0) + (await profileLink.count()),
        {
          timeout: 10000,
        },
      )
      .toBeGreaterThan(0);
  });
});

test.describe("Dashboard: Members page", () => {
  test("members page loads content or no-access prompt", async ({ page }) => {
    await page.goto("/members");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator(".content-inner, main").first()).toBeVisible({ timeout: 10000 });

    /* User either sees the member directory table (has clan) or a profile link prompt (no clan) */
    const memberDir = page.locator(".member-dir, .member-dir-heading, section.table");
    const noClanCard = page.locator(".card");
    const profileLink = page.locator('a[href="/profile"]');
    const hasMembers = (await memberDir.count()) > 0;
    const hasCard = (await noClanCard.count()) > 0;
    const hasPrompt = (await profileLink.count()) > 0;
    expect(hasMembers || hasCard || hasPrompt).toBe(true);
  });

  test("members page has no JS errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/members");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator(".content-inner, main").first()).toBeVisible({ timeout: 10000 });

    expect(errors).toEqual([]);
  });
});
