import { test, expect } from "@playwright/test";

/**
 * Test 3: Responsive Design
 * Verifies CMS pages render correctly at different viewport sizes.
 */

const viewports = [
  { name: "mobile", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
];

for (const viewport of viewports) {
  test.describe(`CMS @ ${viewport.name} (${viewport.width}px)`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test("homepage renders without horizontal overflow", async ({ page }) => {
      await page.goto("/home");
      await page.waitForLoadState("networkidle");

      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      expect(bodyWidth).toBeLessThanOrEqual(viewport.width + 1);
    });

    test("all cards are visible", async ({ page }) => {
      await page.goto("/home");
      await page.waitForLoadState("networkidle");

      const cards = page.locator(".card");
      const count = await cards.count();
      expect(count).toBeGreaterThanOrEqual(4);

      for (let i = 0; i < count; i++) {
        await expect(cards.nth(i)).toBeVisible();
      }
    });

    test("hero banner is visible", async ({ page }) => {
      await page.goto("/home");
      await page.waitForLoadState("networkidle");

      await expect(page.locator(".hero-banner")).toBeVisible();
    });

    test("about page renders correctly", async ({ page }) => {
      await page.goto("/about");
      await page.waitForLoadState("networkidle");

      const cards = page.locator(".card");
      expect(await cards.count()).toBeGreaterThanOrEqual(3);

      // No horizontal overflow
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      expect(bodyWidth).toBeLessThanOrEqual(viewport.width + 1);
    });
  });
}
