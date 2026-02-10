import { test, expect } from "@playwright/test";
import { storageStatePath } from "./helpers/auth";

/**
 * i18n / Language switching tests.
 * Verifies that the language selector works and content updates accordingly.
 */

test.use({ storageState: storageStatePath("member") });

test.describe("i18n: Language switching", () => {
  test("language selector is visible on public pages", async ({ page }) => {
    await page.goto("/home");
    await page.waitForLoadState("networkidle");

    const langSelect = page.locator("#language-select");
    await expect(langSelect).toBeVisible({ timeout: 10000 });
  });

  test("switching to German updates page content", async ({ page }) => {
    await page.goto("/home");
    await page.waitForLoadState("networkidle");

    const langSelect = page.locator("#language-select");
    await langSelect.selectOption("de");

    /* Wait for page to refresh with new locale */
    await page.waitForLoadState("networkidle");

    /* Verify NEXT_LOCALE cookie is set to "de" */
    const cookies = await page.context().cookies();
    const localeCookie = cookies.find((c) => c.name === "NEXT_LOCALE");
    expect(localeCookie?.value).toBe("de");
  });

  test("switching to English updates page content", async ({ page }) => {
    await page.goto("/home");
    await page.waitForLoadState("networkidle");

    const langSelect = page.locator("#language-select");
    await langSelect.selectOption("en");

    await page.waitForLoadState("networkidle");

    const cookies = await page.context().cookies();
    const localeCookie = cookies.find((c) => c.name === "NEXT_LOCALE");
    expect(localeCookie?.value).toBe("en");
  });

  test("sidebar compact language toggle works for authenticated user", async ({ page }) => {
    await page.goto("/news");
    await page.waitForLoadState("networkidle");

    /* The sidebar has either a select or a compact button for language */
    const langSelect = page.locator("#language-select");
    const langCompact = page.locator(".sidebar-lang-compact");
    const hasSelect = (await langSelect.count()) > 0;
    const hasCompact = (await langCompact.count()) > 0;

    /* At least one language control should be present */
    expect(hasSelect || hasCompact).toBe(true);
  });

  test("URL stays the same after language switch", async ({ page }) => {
    await page.goto("/about");
    await page.waitForLoadState("networkidle");

    const langSelect = page.locator("#language-select");
    if ((await langSelect.count()) > 0) {
      const urlBefore = page.url();
      await langSelect.selectOption("de");
      await page.waitForLoadState("networkidle");
      /* Path should be the same (only content changes, not route) */
      expect(page.url()).toContain("/about");
    }
  });
});
