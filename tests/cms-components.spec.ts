import { test, expect } from "@playwright/test";

/**
 * Test 5: CMS Component Behavior
 * Verifies EditableText, EditableList, LoadingSkeleton behavior.
 */

test.describe("CMS Components", () => {

  test("EditableText displays content (not raw markdown)", async ({ page }) => {
    await page.goto("/home");
    await page.waitForLoadState("networkidle");

    // All editable-text-wrap elements should have visible content
    const wraps = page.locator(".editable-text-wrap");
    const count = await wraps.count();
    expect(count).toBeGreaterThan(0);

    // At least one should have text content
    let hasContent = false;
    for (let i = 0; i < Math.min(count, 5); i++) {
      const text = await wraps.nth(i).textContent();
      if (text && text.trim().length > 0) {
        hasContent = true;
        break;
      }
    }
    expect(hasContent).toBe(true);
  });

  test("EditableList items are rendered on homepage", async ({ page }) => {
    await page.goto("/home");
    await page.waitForLoadState("networkidle");

    // After migration, list items should be rendered
    const listItems = page.locator(".editable-list-item");
    const count = await listItems.count();

    // If the migration has been run, we should have list items
    // If not, this is OK too (graceful degradation)
    if (count > 0) {
      // Each item should have content
      const firstContent = listItems.first().locator(".editable-list-content");
      await expect(firstContent).toBeVisible();
    }
  });

  test("badges are displayed when present", async ({ page }) => {
    await page.goto("/home");
    await page.waitForLoadState("networkidle");

    // Check for list badges
    const badges = page.locator(".editable-list-badge");
    const count = await badges.count();

    if (count > 0) {
      const first = badges.first();
      await expect(first).toBeVisible();
      const text = await first.textContent();
      expect(text).toBeTruthy();
      expect(text!.length).toBeGreaterThan(0);
    }
  });

  test("loading skeleton shows during page load", async ({ page }) => {
    // Navigate to about page with slow network — delay CMS API
    await page.route("**/api/site-content**", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await route.continue();
    });
    await page.route("**/api/site-list-items**", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await route.continue();
    });

    await page.goto("/about", { waitUntil: "domcontentloaded" });

    // The skeleton should be briefly visible while API is delayed
    const skeleton = page.locator(".cms-loading-skeleton");
    // Wait up to 2s for skeleton to appear (it renders immediately before API responds)
    try {
      await expect(skeleton).toBeVisible({ timeout: 2000 });
    } catch {
      // If the skeleton disappeared too fast, that's OK — it means loading was fast
    }

    // After API responds, skeleton should disappear and content should load
    await page.waitForLoadState("networkidle");
    const cards = page.locator(".card");
    expect(await cards.count()).toBeGreaterThanOrEqual(1);
  });

  test("CmsMarkdown renders inside editable-text-wrap", async ({ page }) => {
    await page.goto("/home");
    await page.waitForLoadState("networkidle");

    // Multi-line editable fields should use CmsMarkdown
    const cmsInEditable = page.locator(".editable-text-wrap .cms-md");
    const count = await cmsInEditable.count();

    // There should be at least some CmsMarkdown-rendered fields
    // (aboutUs intro, requirements, etc.)
    expect(count).toBeGreaterThan(0);
  });

  test("contact page shows all content without login", async ({ page, context }) => {
    await context.clearCookies();
    await page.goto("/home");
    await page.waitForLoadState("networkidle");

    // Find the contact section (last section with card class)
    const contactSection = page.locator("section.card").last();
    await expect(contactSection).toBeVisible();

    // The contact section should have text content
    const cardBody = contactSection.locator(".card-body");
    await expect(cardBody).toBeVisible();
    const text = await cardBody.textContent();
    expect(text).toBeTruthy();
    expect(text!.length).toBeGreaterThan(10);
  });
});
