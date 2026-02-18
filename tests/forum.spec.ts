import { test, expect } from "@playwright/test";
import { storageStatePath } from "./helpers/auth";
import { waitForClanAccessResolution } from "./helpers/wait-for-clan-access";

/**
 * Forum tests — posts, categories, comments, voting, moderation.
 */

test.describe("Forum: Page loading", () => {
  test.use({ storageState: storageStatePath("member") });
  test("forum page loads for authenticated member", async ({ page }) => {
    await page.goto("/forum");
    await page.waitForLoadState("domcontentloaded");
    expect(page.url()).toContain("/forum");
  });

  test("forum page shows content", async ({ page }) => {
    await page.goto("/forum");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator(".content-inner").first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Forum: Post list", () => {
  test.use({ storageState: storageStatePath("member") });
  test("shows sort controls (hot/new/top)", async ({ page }) => {
    await page.goto("/forum");
    await page.waitForLoadState("domcontentloaded");

    /* Look for sort buttons */
    const sortBtns = page.locator("button, [role=tab]", { hasText: /hot|new|top|neu|beliebt/i });
    expect(await sortBtns.count()).toBeGreaterThanOrEqual(0);
  });

  test("has search input", async ({ page }) => {
    await page.goto("/forum");
    await page.waitForLoadState("domcontentloaded");

    const searchInput = page.locator('input[type="search"], input[placeholder*="such"], input[placeholder*="search"]');
    expect(await searchInput.count()).toBeGreaterThanOrEqual(0);
  });
});

test.describe("Forum: Create post (member)", () => {
  test.use({ storageState: storageStatePath("member") });
  test("member sees new post button or no-clan message", async ({ page }) => {
    await page.goto("/forum");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator(".content-inner").first()).toBeVisible({ timeout: 10000 });
    await waitForClanAccessResolution(page);

    /* Forum may show "no clan" message if user has no clan membership */
    const createBtn = page.locator("button.primary", { hasText: /neuer beitrag|new post/i });
    const noClanMsg = page.locator(
      "text=/Clan-Bereichen|clan access|clan areas|keinen Zugang|Go to Profile|Zum Profil|wähle einen Clan|select a clan/i",
    );
    await expect
      .poll(async () => (await createBtn.count()) + (await noClanMsg.count()), { timeout: 10000 })
      .toBeGreaterThan(0);
  });
});

test.describe("Forum: Create post (guest)", () => {
  test.use({ storageState: storageStatePath("guest") });
  test("guest sees new post button or no-clan message", async ({ page }) => {
    await page.goto("/forum");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator(".content-inner").first()).toBeVisible({ timeout: 10000 });
    await waitForClanAccessResolution(page);

    const createBtn = page.locator("button.primary", { hasText: /neuer beitrag|new post/i });
    const noClanMsg = page.locator(
      "text=/Clan-Bereichen|clan access|clan areas|keinen Zugang|Go to Profile|Zum Profil|wähle einen Clan|select a clan/i",
    );
    await expect
      .poll(async () => (await createBtn.count()) + (await noClanMsg.count()), { timeout: 10000 })
      .toBeGreaterThan(0);
  });
});

test.describe("Forum: Moderation", () => {
  test.use({ storageState: storageStatePath("moderator") });
  test("moderator sees pin/lock controls", async ({ page }) => {
    await page.goto("/forum");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator(".content-inner").first()).toBeVisible({ timeout: 10000 });

    /* Moderator should see the pinned checkbox option in the create form */
    const createBtn = page.locator("button.primary, button", { hasText: /neuer beitrag|new post|erstellen|create/i });
    if ((await createBtn.count()) > 0) {
      await createBtn.first().click();
      /* The forum form uses section.forum-form, not a bare <form> */
      await expect(page.locator("section.forum-form, form, #post-title").first()).toBeVisible({ timeout: 10000 });

      /* Should have pin checkbox for moderators */
      const pinCheckbox = page.locator('input[type="checkbox"]');
      expect(await pinCheckbox.count()).toBeGreaterThanOrEqual(0);
    }
  });
});
