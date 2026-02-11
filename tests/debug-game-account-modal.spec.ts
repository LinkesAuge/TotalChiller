/**
 * Regression tests for game-account modal positioning bugs:
 *
 * 1. `.card:hover { transform }` was creating a containing block that broke
 *    `position: fixed` on descendant modal backdrops.
 * 2. `.select-content` z-index (200) was below `.modal-backdrop` (300), so
 *    Radix Select dropdowns rendered behind the modal.
 *
 * Uses public /home page (no auth required) since it contains .card elements.
 */
import { test, expect } from "@playwright/test";

test.describe("Modal positioning regressions", () => {
  test("card:hover has no transform property", async ({ page }) => {
    await page.goto("/home");
    await page.waitForLoadState("networkidle");

    const card = page.locator(".card").first();
    await expect(card).toBeVisible({ timeout: 15000 });

    await card.hover();
    await page.waitForTimeout(300);

    const transformValue = await card.evaluate((el) => window.getComputedStyle(el).transform);
    expect(transformValue).toBe("none");
  });

  test("position:fixed inside a hovered card covers full viewport", async ({ page }) => {
    await page.goto("/home");
    await page.waitForLoadState("networkidle");

    const card = page.locator(".card").first();
    await expect(card).toBeVisible({ timeout: 15000 });

    await card.hover();
    await page.waitForTimeout(300);

    const result = await page.evaluate(() => {
      const el = document.querySelector(".card");
      if (!el) return null;
      const probe = document.createElement("div");
      probe.style.position = "fixed";
      probe.style.inset = "0";
      el.appendChild(probe);
      const rect = probe.getBoundingClientRect();
      probe.remove();
      return { x: rect.x, y: rect.y, w: rect.width, h: rect.height, vw: window.innerWidth, vh: window.innerHeight };
    });

    if (!result) {
      test.skip(true, "No .card element found");
      return;
    }

    expect(Math.abs(result.x)).toBeLessThan(2);
    expect(Math.abs(result.y)).toBeLessThan(2);
    expect(Math.abs(result.w - result.vw)).toBeLessThan(2);
    expect(Math.abs(result.h - result.vh)).toBeLessThan(2);
  });

  test("select-content z-index exceeds modal-backdrop z-index", async ({ page }) => {
    await page.goto("/home");
    await page.waitForLoadState("networkidle");

    const zIndexes = await page.evaluate(() => {
      const rules: Record<string, string> = {};
      for (const sheet of document.styleSheets) {
        try {
          for (const rule of sheet.cssRules) {
            if (rule instanceof CSSStyleRule) {
              if (rule.selectorText === ".select-content") {
                rules.selectContent = rule.style.zIndex;
              }
              if (rule.selectorText === ".modal-backdrop") {
                rules.modalBackdrop = rule.style.zIndex;
              }
            }
          }
        } catch {
          /* cross-origin sheet — ignore */
        }
      }
      return rules;
    });

    const selectZ = parseInt(zIndexes.selectContent ?? "0", 10);
    const modalZ = parseInt(zIndexes.modalBackdrop ?? "0", 10);
    expect(selectZ).toBeGreaterThan(modalZ);
  });
});
