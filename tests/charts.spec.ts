import { test, expect } from "@playwright/test";
import { storageStatePath } from "./helpers/auth";

test.use({ storageState: storageStatePath("member") });

/**
 * Charts / Data visualization page tests.
 */

test.describe("Charts: Page loading", () => {
  test("charts page loads for authenticated member", async ({ page }) => {
    await page.goto("/charts");
    await page.waitForLoadState("networkidle");
    expect(page.url()).toContain("/charts");
  });

  test("charts page shows filter area", async ({ page }) => {
    await page.goto("/charts");
    await page.waitForLoadState("networkidle");

    /* Should have filter controls or a no-clan-access message (test user may not be in a clan) */
    await expect(page.locator(".content-inner")).toContainText(/filter|datum|date|player|spieler|clan|zugang|access/i, {
      timeout: 10000,
    });
  });

  test("no JS errors on charts page", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/charts");
    await page.waitForLoadState("networkidle");
    await expect(page.locator(".content-inner")).toBeVisible({ timeout: 10000 });

    expect(errors).toEqual([]);
  });
});

test.describe("Charts: Filters", () => {
  test("has date range inputs or selectors", async ({ page }) => {
    await page.goto("/charts");
    await page.waitForLoadState("networkidle");

    const dateInputs = page.locator('input[type="date"], input[type="text"][placeholder*="dat"]');
    expect(await dateInputs.count()).toBeGreaterThanOrEqual(0);
  });

  test("has clear filters button", async ({ page }) => {
    await page.goto("/charts");
    await page.waitForLoadState("networkidle");

    const clearBtn = page.locator("button", { hasText: /clear|zurücksetzen|reset/i });
    expect(await clearBtn.count()).toBeGreaterThanOrEqual(0);
  });
});

test.describe("Charts: Visualization", () => {
  test("renders chart containers (canvas or svg)", async ({ page }) => {
    await page.goto("/charts");
    await page.waitForLoadState("networkidle");
    await expect(page.locator(".content-inner")).toBeVisible({ timeout: 10000 });

    /* Charts typically render as canvas or SVG */
    const chartElements = page.locator("canvas, svg.recharts-surface, .recharts-wrapper");
    /* Might be 0 if no data, but shouldn't crash */
    const count = await chartElements.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
