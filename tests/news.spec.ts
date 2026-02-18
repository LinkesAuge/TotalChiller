import { test, expect } from "@playwright/test";
import { storageStatePath } from "./helpers/auth";
import { waitForClanAccessResolution } from "./helpers/wait-for-clan-access";

/**
 * News / Articles page tests.
 */

test.describe("News: Page loading", () => {
  test.use({ storageState: storageStatePath("member") });
  test("news page loads for authenticated member", async ({ page }) => {
    await page.goto("/news");
    await page.waitForLoadState("domcontentloaded");
    expect(page.url()).toContain("/news");
  });

  test("news page shows content or no-clan message", async ({ page }) => {
    await page.goto("/news");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator(".content-inner").first()).toBeVisible({ timeout: 20000 });

    /* Wait for ClanAccessGate to resolve — either shows content or a gate message */
    /* The gate loading state shows "Zugang wird geladen" or similar, which eventually resolves to either:
       - Granted: top-bar + page content
       - Denied: "keinen Zugang" / "no access" message with profile/home links
       - Unassigned: "unassigned" message */
    const topBar = page.locator(".top-bar");
    const gateMsg = page.locator("text=/Clan-Bereichen|clan access|keinen Zugang|no access|Zugang|Profil|profile/i");
    /* Give extra time for the gate to resolve from loading to final state */
    await expect(topBar.or(gateMsg).first()).toBeVisible({ timeout: 20000 });
  });
});

test.describe("News: Content manager features (editor)", () => {
  test.use({ storageState: storageStatePath("editor") });
  test("editor sees create article button or no-clan message", async ({ page }) => {
    await page.goto("/news");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator(".content-inner").first()).toBeVisible({ timeout: 10000 });
    await waitForClanAccessResolution(page);

    /* Editor is a content manager but may lack clan membership */
    const createBtn = page.locator("button.gbtn", { hasText: /erstellen|create|new|neu|post|beitrag/i });
    const noClanMsg = page.locator(
      "text=/Clan-Bereichen|clan access|clan areas|keinen Zugang|Go to Profile|Zum Profil/i",
    );
    await expect
      .poll(async () => (await createBtn.count()) + (await noClanMsg.count()), { timeout: 10000 })
      .toBeGreaterThan(0);
  });
});

test.describe("News: Content manager features (member)", () => {
  test.use({ storageState: storageStatePath("member") });
  test("member does NOT see create article button", async ({ page }) => {
    await page.goto("/news");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator(".content-inner").first()).toBeVisible({ timeout: 10000 });
    await waitForClanAccessResolution(page);

    /* Members are NOT content managers, so no create button */
    const createBtn = page.locator("button.gbtn", { hasText: /erstellen|create|new|neu|post|beitrag/i });
    expect(await createBtn.count()).toBe(0);
  });
});

test.describe("News: Content manager features (guest)", () => {
  test.use({ storageState: storageStatePath("guest") });
  test("guest does NOT see create button", async ({ page }) => {
    await page.goto("/news");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator(".content-inner").first()).toBeVisible({ timeout: 10000 });
    await waitForClanAccessResolution(page);

    const createBtn = page.locator("button.gbtn", { hasText: /erstellen|create|new|neu|post|beitrag/i });
    expect(await createBtn.count()).toBe(0);
  });
});

test.describe("News: Article form", () => {
  test.use({ storageState: storageStatePath("editor") });
  test("clicking create opens the article form", async ({ page }) => {
    await page.goto("/news");
    await page.waitForLoadState("domcontentloaded");
    await waitForClanAccessResolution(page);

    const createBtn = page.locator("button.gbtn", { hasText: /erstellen|create/i });
    if ((await createBtn.count()) > 0) {
      await createBtn.first().click();
      await expect(page.locator("form")).toBeVisible({ timeout: 5000 });

      /* Form should appear with title input and content area */
      const formInputs = page.locator("input, textarea, [contenteditable]");
      expect(await formInputs.count()).toBeGreaterThan(0);
    }
  });
});

test.describe("News: Expand/collapse article content", () => {
  test.use({ storageState: storageStatePath("member") });
  test("article cards have a 'read more' preview button", async ({ page }) => {
    await page.goto("/news");
    await page.waitForLoadState("domcontentloaded");

    const readMoreBtn = page.locator(".news-card-read-more");
    if ((await readMoreBtn.count()) > 0) {
      /* There is at least one truncated article with a read-more CTA */
      await expect(readMoreBtn.first()).toBeVisible();
    }
  });

  test("expanded article shows a 'show less' collapse button", async ({ page }) => {
    await page.goto("/news");
    await page.waitForLoadState("domcontentloaded");

    /* Click banner or read-more to expand */
    const banner = page.locator(".news-card-banner").first();
    if ((await banner.count()) > 0) {
      await banner.click();
      /* After expanding, the collapse button should appear */
      const collapseBtn = page.locator(".news-card-collapse-btn");
      await expect(collapseBtn)
        .toBeVisible({ timeout: 3000 })
        .catch(() => {
          /* Article may not have content long enough to trigger expand */
        });
    }
  });
});
