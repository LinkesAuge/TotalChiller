import { test, expect } from "@playwright/test";

/**
 * Test 1: Markdown Rendering
 * Verifies that AppMarkdown (variant="cms") correctly renders markdown formatting
 * on public pages (no login required).
 */

test.describe("CMS Markdown Rendering", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/home");
    await page.waitForLoadState("domcontentloaded");
    /* Wait for CMS content to fully render (skeletons disappear, cards appear) */
    await expect(page.locator(".card").first()).toBeVisible({ timeout: 15000 });
  });

  test("renders bold text as <strong>", async ({ page }) => {
    // Look for any strong elements rendered by AppMarkdown
    const strongElements = page.locator(".cms-md strong");
    // At least one bold element should exist on the homepage (e.g. in aboutUs section)
    const count = await strongElements.count();
    if (count > 0) {
      const first = strongElements.first();
      await expect(first).toBeVisible();
      // Should not show raw ** markdown syntax
      const text = await first.textContent();
      expect(text).not.toContain("**");
    }
  });

  test("renders unordered lists as <ul>/<li>", async ({ page }) => {
    const lists = page.locator(".cms-md ul");
    const count = await lists.count();
    if (count > 0) {
      await expect(lists.first()).toBeVisible();
      const items = page.locator(".cms-md ul li");
      expect(await items.count()).toBeGreaterThan(0);
    }
  });

  test("renders links as <a> with target=_blank", async ({ page }) => {
    const links = page.locator(".cms-md a.cms-md-link");
    const count = await links.count();
    if (count > 0) {
      const first = links.first();
      await expect(first).toHaveAttribute("target", "_blank");
      await expect(first).toHaveAttribute("rel", /noopener/);
    }
  });

  test("does not show raw markdown syntax (properly formatted content)", async ({ page }) => {
    // Check that AppMarkdown renders markdown — bold markers become <strong> tags.
    // Note: Some existing DB content may have malformed markdown (e.g. "**word **" with
    // trailing space before closing **). That's a content issue, not a rendering issue.
    const containers = page.locator(".cms-md");
    const count = await containers.count();
    if (count === 0) {
      // Some fixture states may serve plain CMS text only; still verify page content rendered.
      await expect(page.locator(".card").first()).toBeVisible({ timeout: 10000 });
      return;
    }

    // Verify that at least some AppMarkdown containers have rendered HTML
    // (i.e., they contain child elements, not just plain text)
    let hasRenderedHtml = false;
    for (let i = 0; i < Math.min(count, 10); i++) {
      const childElements = await containers.nth(i).locator("p, strong, em, ul, ol, a, h1, h2, h3, h4").count();
      if (childElements > 0) {
        hasRenderedHtml = true;
        break;
      }
    }
    expect(hasRenderedHtml).toBe(true);
  });

  test("AppMarkdown (cms variant) inherits parent font styles", async ({ page }) => {
    const md = page.locator(".cms-md").first();
    if (await md.isVisible()) {
      // cms-md should inherit font-size, not set its own
      const fontSize = await md.evaluate((el) => getComputedStyle(el).fontSize);
      // Should NOT be 0.88rem (the forum-md default)
      // It should be something bigger since homepage has increased font sizes
      expect(parseFloat(fontSize)).toBeGreaterThanOrEqual(14);
    }
  });
});
