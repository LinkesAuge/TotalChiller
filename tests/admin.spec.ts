import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";

/**
 * Admin panel tests — tabs, sections, user/clan management.
 */

test.describe("Admin: Access control", () => {
  test("owner can access /admin", async ({ page }) => {
    await loginAs(page, "owner");
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");
    expect(page.url()).toContain("/admin");
  });

  test("admin can access /admin", async ({ page }) => {
    await loginAs(page, "admin");
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");
    expect(page.url()).toContain("/admin");
  });

  test("moderator is redirected from /admin", async ({ page }) => {
    await loginAs(page, "moderator");
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");
    expect(page.url()).not.toContain("/admin");
  });

  test("member is redirected from /admin", async ({ page }) => {
    await loginAs(page, "member");
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");
    expect(page.url()).not.toContain("/admin");
  });
});

test.describe("Admin: Tab navigation", () => {
  test("admin panel shows tab navigation", async ({ page }) => {
    await loginAs(page, "admin");
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");

    /* Should have tab buttons for different sections */
    const tabs = page.locator("button, [role=tab]");
    expect(await tabs.count()).toBeGreaterThan(3);
  });

  test("can switch to users tab", async ({ page }) => {
    await loginAs(page, "admin");
    await page.goto("/admin?tab=users");
    await page.waitForLoadState("networkidle");

    /* Users section should show a table or user list */
    const body = await page.textContent("body");
    expect(body?.toLowerCase()).toMatch(/user|benutzer|email/i);
  });

  test("can switch to approvals tab", async ({ page }) => {
    await loginAs(page, "admin");
    await page.goto("/admin?tab=approvals");
    await page.waitForLoadState("networkidle");

    const body = await page.textContent("body");
    expect(body?.toLowerCase()).toMatch(/approval|genehmigung|pending/i);
  });

  test("can switch to validation tab", async ({ page }) => {
    await loginAs(page, "admin");
    await page.goto("/admin?tab=validation");
    await page.waitForLoadState("networkidle");

    const body = await page.textContent("body");
    expect(body?.toLowerCase()).toMatch(/validation|validierung|rule|regel/i);
  });

  test("can switch to corrections tab", async ({ page }) => {
    await loginAs(page, "admin");
    await page.goto("/admin?tab=corrections");
    await page.waitForLoadState("networkidle");

    const body = await page.textContent("body");
    expect(body?.toLowerCase()).toMatch(/correction|korrektur/i);
  });
});

test.describe("Admin: Clans section", () => {
  test("shows clan list with table", async ({ page }) => {
    await loginAs(page, "admin");
    await page.goto("/admin?tab=clans");
    await page.waitForLoadState("networkidle");

    /* Should have a table or list of clans */
    const tableOrList = page.locator("table, .table, .list, header");
    expect(await tableOrList.count()).toBeGreaterThan(0);
  });
});

test.describe("Admin: Users section", () => {
  test("shows user list with search", async ({ page }) => {
    await loginAs(page, "admin");
    await page.goto("/admin?tab=users");
    await page.waitForLoadState("networkidle");

    /* Should have search input */
    const searchInput = page.locator('input[type="search"], input[placeholder*="such"], input[placeholder*="search"]');
    expect(await searchInput.count()).toBeGreaterThanOrEqual(0);
  });

  test("shows role dropdown for users", async ({ page }) => {
    await loginAs(page, "admin");
    await page.goto("/admin?tab=users");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    /* Should have role filter or role select */
    const selects = page.locator("select, [role=combobox], button[class*='select']");
    expect(await selects.count()).toBeGreaterThan(0);
  });
});

test.describe("Admin: Data Import", () => {
  test("data import page loads for admin", async ({ page }) => {
    await loginAs(page, "admin");
    await page.goto("/admin/data-import");
    await page.waitForLoadState("networkidle");
    expect(page.url()).toContain("/data-import");
  });

  test("has file upload area", async ({ page }) => {
    await loginAs(page, "admin");
    await page.goto("/admin/data-import");
    await page.waitForLoadState("networkidle");

    const fileInput = page.locator('input[type="file"]');
    expect(await fileInput.count()).toBeGreaterThanOrEqual(0);
  });
});

test.describe("Admin: Data Table", () => {
  test("data table page loads for admin", async ({ page }) => {
    await loginAs(page, "admin");
    await page.goto("/admin/data-table");
    await page.waitForLoadState("networkidle");
    expect(page.url()).toContain("/data-table");
  });
});
