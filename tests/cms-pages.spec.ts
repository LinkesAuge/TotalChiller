import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";

/**
 * CMS Pages tests — home, about, contact, privacy policy.
 * Verifies public visibility, inline editing for admins.
 */

/* ── Public access (no login) ── */

const CMS_PAGES = [
  { path: "/home", name: "Home" },
  { path: "/about", name: "About" },
  { path: "/contact", name: "Contact" },
  { path: "/privacy-policy", name: "Privacy Policy" },
];

test.describe("CMS Pages: Public rendering", () => {
  for (const { path, name } of CMS_PAGES) {
    test(`${name} page renders CMS content`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");

      /* Should have cards or sections */
      const cards = page.locator(".card, section, article");
      expect(await cards.count()).toBeGreaterThan(0);
    });

    test(`${name} page shows no edit buttons when unauthenticated`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");

      /* No editable pencil buttons */
      const editBtns = page.locator(".editable-text-pencil, .editable-list-add, [aria-label='edit']");
      expect(await editBtns.count()).toBe(0);
    });
  }
});

/* ── Admin editing ── */

test.describe("CMS Pages: Admin edit controls", () => {
  for (const { path, name } of CMS_PAGES) {
    test(`${name} shows edit buttons for admin`, async ({ page }) => {
      await loginAs(page, "admin");
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      /* Admin should see editable pencil icons */
      const editBtns = page.locator(".editable-text-pencil, .pencil-icon, button[aria-label*='edit']");
      expect(await editBtns.count()).toBeGreaterThan(0);
    });
  }

  test("member does NOT see edit buttons on /home", async ({ page }) => {
    await loginAs(page, "member");
    await page.goto("/home");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const editBtns = page.locator(".editable-text-pencil, .pencil-icon, button[aria-label*='edit']");
    expect(await editBtns.count()).toBe(0);
  });
});
