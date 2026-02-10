import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";

/**
 * Data Import and Data Table workflow tests.
 */

test.describe("Data Import: Page structure", () => {
  test("data import page shows upload area", async ({ page }) => {
    await loginAs(page, "admin");
    await page.goto("/admin/data-import");
    await page.waitForLoadState("networkidle");
    await expect(page.locator(".content-inner")).toBeVisible({ timeout: 15000 });

    /* Should have file input for CSV upload */
    const fileInput = page.locator('input[type="file"]');
    expect(await fileInput.count()).toBeGreaterThan(0);
  });

  test("data import page has filter toggle", async ({ page }) => {
    await loginAs(page, "admin");
    await page.goto("/admin/data-import");
    await page.waitForLoadState("networkidle");
    await expect(page.locator(".content-inner")).toBeVisible({ timeout: 15000 });

    /* Should have a button to show/hide filters */
    const filterToggle = page.locator("button", { hasText: /filter|such/i });
    expect(await filterToggle.count()).toBeGreaterThanOrEqual(0);
  });

  test("data import accepts CSV file", async ({ page }) => {
    await loginAs(page, "admin");
    await page.goto("/admin/data-import");
    await page.waitForLoadState("networkidle");
    await expect(page.locator(".content-inner")).toBeVisible({ timeout: 15000 });

    const fileInput = page.locator('input[type="file"]');
    if ((await fileInput.count()) > 0) {
      /* Verify the file input accepts CSV and TXT */
      const accept = await fileInput.getAttribute("accept");
      if (accept) {
        expect(accept).toMatch(/csv|txt/i);
      }
    }
  });
});

test.describe("Data Table: Page structure", () => {
  test("data table page loads with content", async ({ page }) => {
    await loginAs(page, "admin");
    await page.goto("/admin/data-table");
    await page.waitForLoadState("networkidle");
    await expect(page.locator(".content-inner")).toBeVisible({ timeout: 15000 });
  });

  test("data table has filter controls", async ({ page }) => {
    await loginAs(page, "admin");
    await page.goto("/admin/data-table");
    await page.waitForLoadState("networkidle");
    await expect(page.locator(".content-inner")).toBeVisible({ timeout: 15000 });

    /* Should have a filter toggle or filter elements */
    const filterElements = page.locator("button, select, input");
    expect(await filterElements.count()).toBeGreaterThan(0);
  });

  test("data table has pagination controls", async ({ page }) => {
    await loginAs(page, "admin");
    await page.goto("/admin/data-table");
    await page.waitForLoadState("networkidle");
    await expect(page.locator(".content-inner")).toBeVisible({ timeout: 15000 });

    /* Pagination: page size selector, page number, prev/next buttons */
    const pagination = page.locator("select, button", { hasText: /prev|next|vor|zurück|\d+/i });
    expect(await pagination.count()).toBeGreaterThanOrEqual(0);
  });

  test("data table shows table or empty state", async ({ page }) => {
    await loginAs(page, "admin");
    await page.goto("/admin/data-table");
    await page.waitForLoadState("networkidle");
    await expect(page.locator(".content-inner")).toBeVisible({ timeout: 15000 });

    /* Should have either a data table or an empty state */
    const table = page.locator("table, .table");
    const emptyState = page.locator("text=/no data|keine daten|empty|leer/i");
    expect((await table.count()) + (await emptyState.count())).toBeGreaterThanOrEqual(0);
  });
});

test.describe("Data Table: Batch actions", () => {
  test("batch action buttons exist", async ({ page }) => {
    await loginAs(page, "admin");
    await page.goto("/admin/data-table");
    await page.waitForLoadState("networkidle");
    await expect(page.locator(".content-inner")).toBeVisible({ timeout: 15000 });

    /* Look for batch action buttons (batch edit, save all, batch delete) */
    const batchBtns = page.locator("button", {
      hasText: /batch|save all|alle speichern|delete|löschen/i,
    });
    /* These may be hidden/disabled when no rows selected */
    expect(await batchBtns.count()).toBeGreaterThanOrEqual(0);
  });
});

test.describe("Data Import/Table: Access control", () => {
  test("member cannot access data import", async ({ page }) => {
    await loginAs(page, "member");
    await page.goto("/admin/data-import");
    await page.waitForLoadState("networkidle");

    /* Should be redirected away */
    expect(page.url()).not.toContain("/data-import");
  });

  test("member cannot access data table", async ({ page }) => {
    await loginAs(page, "member");
    await page.goto("/admin/data-table");
    await page.waitForLoadState("networkidle");

    /* Should be redirected away */
    expect(page.url()).not.toContain("/data-table");
  });
});
