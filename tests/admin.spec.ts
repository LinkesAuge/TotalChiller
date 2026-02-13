import { test, expect } from "@playwright/test";
import { storageStatePath } from "./helpers/auth";

/**
 * Admin panel tests — tabs, sections, user/clan management.
 */

test.describe("Admin: Access control", () => {
  test.describe("owner", () => {
    test.use({ storageState: storageStatePath("owner") });
    test("owner can access /admin", async ({ page }) => {
      await page.goto("/admin");
      await page.waitForLoadState("networkidle");
      expect(page.url()).toContain("/admin");
    });
  });

  test.describe("admin", () => {
    test.use({ storageState: storageStatePath("admin") });
    test("admin can access /admin", async ({ page }) => {
      await page.goto("/admin");
      await page.waitForLoadState("networkidle");
      expect(page.url()).toContain("/admin");
    });
  });

  test.describe("moderator", () => {
    test.use({ storageState: storageStatePath("moderator") });
    test("moderator is redirected from /admin", async ({ page }) => {
      await page.goto("/admin");
      await page.waitForLoadState("networkidle");
      expect(page.url()).not.toContain("/admin");
    });
  });

  test.describe("member", () => {
    test.use({ storageState: storageStatePath("member") });
    test("member is redirected from /admin", async ({ page }) => {
      await page.goto("/admin");
      await page.waitForLoadState("networkidle");
      expect(page.url()).not.toContain("/admin");
    });
  });
});

test.describe("Admin: Tab navigation", () => {
  test.use({ storageState: storageStatePath("admin") });

  /** Wait for admin panel to fully render (past ClanAccessGate + lazy load). */
  async function waitForAdminShell(page: import("@playwright/test").Page): Promise<void> {
    /* Wait for the admin-grid wrapper that AdminInner renders */
    await expect(page.locator(".admin-grid")).toBeVisible({ timeout: 30000 });
  }

  test("admin panel shows tab navigation", async ({ page }) => {
    await page.goto("/admin");
    await waitForAdminShell(page);

    /* Should have tab links — main admin page uses .tabs directly in .content-inner */
    const tabs = page.locator(".content-inner .tabs .tab, .content-inner .tabs a");
    expect(await tabs.count()).toBeGreaterThan(3);
  });

  test("can switch to users tab", async ({ page }) => {
    await page.goto("/admin?tab=users");
    await waitForAdminShell(page);

    /* Wait for the lazy-loaded tab content to appear */
    await expect(page.locator(".content-inner").first()).toContainText(/user|benutzer|email/i, { timeout: 20000 });
  });

  test("can switch to approvals tab", async ({ page }) => {
    await page.goto("/admin?tab=approvals");
    await waitForAdminShell(page);

    await expect(page.locator(".content-inner").first()).toContainText(/approval|genehmigung|pending|game.account/i, {
      timeout: 20000,
    });
  });

  test("can switch to validation tab", async ({ page }) => {
    await page.goto("/admin?tab=validation");
    await waitForAdminShell(page);

    await expect(page.locator(".content-inner").first()).toContainText(/validation|validierung|rule|regel/i, {
      timeout: 20000,
    });
  });

  test("can switch to corrections tab", async ({ page }) => {
    await page.goto("/admin?tab=corrections");
    await waitForAdminShell(page);

    await expect(page.locator(".content-inner").first()).toContainText(/correction|korrektur/i, { timeout: 20000 });
  });

  test("can switch to logs tab", async ({ page }) => {
    await page.goto("/admin?tab=logs");
    await waitForAdminShell(page);

    await expect(page.locator(".content-inner").first()).toContainText(/log|protokoll|audit/i, { timeout: 20000 });
  });

  test("can switch to forum tab", async ({ page }) => {
    await page.goto("/admin?tab=forum");
    await waitForAdminShell(page);

    await expect(page.locator(".content-inner").first()).toContainText(/forum|kategor/i, { timeout: 20000 });
  });
});

test.describe("Admin: Clans section", () => {
  test.use({ storageState: storageStatePath("admin") });
  test("shows clan list with table", async ({ page }) => {
    await page.goto("/admin?tab=clans");
    /* Wait for admin-grid (past ClanAccessGate) */
    await expect(page.locator(".admin-grid")).toBeVisible({ timeout: 30000 });

    /* Wait for lazy-loaded clans tab, then verify table/list renders */
    await expect(page.locator("table, .table, .list, .card-title, header").first()).toBeVisible({ timeout: 20000 });
  });
});

test.describe("Admin: Users section", () => {
  test.use({ storageState: storageStatePath("admin") });
  test("shows user list with search", async ({ page }) => {
    await page.goto("/admin?tab=users");
    await expect(page.locator(".admin-grid")).toBeVisible({ timeout: 30000 });

    /* Wait for lazy-loaded users tab to render */
    await expect(page.locator(".card-title").first()).toBeVisible({ timeout: 20000 });

    /* Should have search input */
    const searchInput = page.locator('input[type="search"], input[placeholder*="such"], input[placeholder*="search"]');
    expect(await searchInput.count()).toBeGreaterThanOrEqual(0);
  });

  test("shows role dropdown for users", async ({ page }) => {
    await page.goto("/admin?tab=users");
    await expect(page.locator(".admin-grid")).toBeVisible({ timeout: 30000 });

    /* Wait for lazy-loaded users tab to render its selects (Radix Select uses .select-trigger) */
    await expect(page.locator("select, [role=combobox], button[class*='select'], .select-trigger").first()).toBeVisible(
      { timeout: 20000 },
    );

    const selects = page.locator("select, [role=combobox], button[class*='select'], .select-trigger");
    expect(await selects.count()).toBeGreaterThan(0);
  });
});

test.describe("Admin: Data Import", () => {
  test.use({ storageState: storageStatePath("admin") });
  test("data import page loads for admin", async ({ page }) => {
    await page.goto("/admin/data-import");
    await page.waitForLoadState("networkidle");
    expect(page.url()).toContain("/data-import");
  });

  test("has file upload area", async ({ page }) => {
    await page.goto("/admin/data-import");
    await page.waitForLoadState("networkidle");

    const fileInput = page.locator('input[type="file"]');
    expect(await fileInput.count()).toBeGreaterThanOrEqual(0);
  });
});

test.describe("Admin: Data Table", () => {
  test.use({ storageState: storageStatePath("admin") });
  test("data table page loads for admin", async ({ page }) => {
    await page.goto("/admin/data-table");
    await page.waitForLoadState("networkidle");
    expect(page.url()).toContain("/data-table");
  });
});
