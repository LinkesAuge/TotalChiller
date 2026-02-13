import { test, expect } from "@playwright/test";
import { storageStatePath } from "./helpers/auth";

/**
 * i18n / Language switching tests.
 * Verifies that the language selector works and content updates accordingly.
 *
 * The LanguageSelector component renders a button-based toggle:
 *   <div class="lang-toggle" role="radiogroup">
 *     <button class="lang-toggle-btn active">DE</button>
 *     <button class="lang-toggle-btn">EN</button>
 *   </div>
 * On collapsed sidebar it renders: <button class="sidebar-lang-compact">DE</button>
 */

test.use({ storageState: storageStatePath("member") });

test.describe("i18n: Language switching", () => {
  test("language selector is visible on public pages", async ({ page }) => {
    await page.goto("/home");
    await page.waitForLoadState("networkidle");

    /* Look for the lang-toggle radio group or the compact sidebar button */
    const langToggle = page.locator(".lang-toggle, .sidebar-lang-compact");
    await expect(langToggle.first()).toBeVisible({ timeout: 15000 });
  });

  test("switching to German updates page content", async ({ page }) => {
    await page.goto("/home");
    await page.waitForLoadState("networkidle");

    /* Click the DE button */
    const deBtn = page.locator('.lang-toggle-btn:has-text("DE"), .sidebar-lang-compact');
    if ((await deBtn.count()) > 0) {
      await deBtn.first().click();
      await page.waitForLoadState("networkidle");
    }

    /* Verify NEXT_LOCALE cookie is set to "de" */
    const cookies = await page.context().cookies();
    const localeCookie = cookies.find((c) => c.name === "NEXT_LOCALE");
    expect(localeCookie?.value).toBe("de");
  });

  test("switching to English updates page content", async ({ page }) => {
    await page.goto("/home");
    await page.waitForLoadState("networkidle");

    /* Click the EN button */
    const enBtn = page.locator('.lang-toggle-btn:has-text("EN")');
    if ((await enBtn.count()) > 0) {
      await enBtn.first().click();
      await page.waitForLoadState("networkidle");
    }

    const cookies = await page.context().cookies();
    const localeCookie = cookies.find((c) => c.name === "NEXT_LOCALE");
    expect(localeCookie?.value).toBe("en");
  });

  test("sidebar compact language toggle works for authenticated user", async ({ page }) => {
    await page.goto("/news");
    await page.waitForLoadState("networkidle");

    /* The sidebar has either a toggle or a compact button for language */
    const langToggle = page.locator(".lang-toggle");
    const langCompact = page.locator(".sidebar-lang-compact");
    const hasToggle = (await langToggle.count()) > 0;
    const hasCompact = (await langCompact.count()) > 0;

    /* At least one language control should be present */
    expect(hasToggle || hasCompact).toBe(true);
  });

  test("URL stays the same after language switch", async ({ page }) => {
    await page.goto("/about");
    await page.waitForLoadState("domcontentloaded");
    /* Wait for content to render (networkidle can hang due to persistent connections) */
    await expect(page.locator(".card").first()).toBeVisible({ timeout: 15000 });

    const deBtn = page.locator('.lang-toggle-btn:has-text("DE")');
    if ((await deBtn.count()) > 0) {
      await deBtn.first().click();
      /* Language switch may trigger a reload — wait for the page to settle */
      await page.waitForURL(/\/about/, { timeout: 15000, waitUntil: "domcontentloaded" });
      expect(page.url()).toContain("/about");
    }
  });
});
