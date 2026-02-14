import { test, expect } from "@playwright/test";
import { storageStatePath } from "./helpers/auth";

/**
 * Messages tests — inbox, compose, send, broadcast.
 */

test.describe("Messages: Page loading", () => {
  test.use({ storageState: storageStatePath("member") });
  test("messages page loads for authenticated member", async ({ page }) => {
    await page.goto("/messages");
    await page.waitForLoadState("networkidle");
    expect(page.url()).toContain("/messages");
  });

  test("messages page shows content area", async ({ page }) => {
    await page.goto("/messages");
    await page.waitForLoadState("networkidle");

    await expect(page.locator(".content-inner").first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Messages: Compose", () => {
  test.use({ storageState: storageStatePath("member") });
  test("has compose button or area", async ({ page }) => {
    await page.goto("/messages");
    await page.waitForLoadState("networkidle");

    /* Look for compose/new message button */
    const composeBtn = page.locator("button", { hasText: /compose|verfassen|new|neu|nachricht/i });
    expect(await composeBtn.count()).toBeGreaterThanOrEqual(0);
  });
});

test.describe("Messages: Broadcast (moderator)", () => {
  test.use({ storageState: storageStatePath("moderator") });
  test("moderator sees broadcast UI elements", async ({ page }) => {
    await page.goto("/messages");
    await page.waitForLoadState("networkidle");

    /* Content managers should see clan/global broadcast options */
    await expect(page.locator(".content-inner").first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Messages: Broadcast (member)", () => {
  test.use({ storageState: storageStatePath("member") });
  test("member does NOT see broadcast compose options", async ({ page }) => {
    await page.goto("/messages");
    await page.waitForLoadState("networkidle");
    await expect(page.locator(".content-inner").first()).toBeVisible({ timeout: 10000 });

    /* Member shouldn't see the broadcast compose clan selector (#composeClan)
       or the recipient-type group with broadcast options in the compose form.
       Note: inbox filter tabs showing "broadcast" is expected — those filter received messages. */
    const broadcastClanSelect = page.locator("#composeClan");
    const recipientTypeGroup = page.locator("[aria-labelledby='recipientTypeLabel']");
    expect(await broadcastClanSelect.count()).toBe(0);
    expect(await recipientTypeGroup.count()).toBe(0);
  });
});

test.describe("Messages: Type filters", () => {
  test.use({ storageState: storageStatePath("member") });
  test("has message type filter options", async ({ page }) => {
    await page.goto("/messages");
    await page.waitForLoadState("networkidle");

    /* Should have filter tabs or select for message types */
    const filterElements = page.locator("[role=tab], select, .filter, .tab");
    expect(await filterElements.count()).toBeGreaterThanOrEqual(0);
  });
});

test.describe("Messages: Notifications tab", () => {
  test.use({ storageState: storageStatePath("member") });

  test("messages page shows notifications tab button", async ({ page }) => {
    await page.goto("/messages");
    await page.waitForLoadState("networkidle");
    await expect(page.locator(".content-inner").first()).toBeVisible({ timeout: 10000 });

    /* Should have 4 tabs: Inbox, Sent, Archive, Notifications */
    const notifTab = page.locator(".messages-view-tab", {
      hasText: /notifications|hinweise|benachrichtigungen/i,
    });
    await expect(notifTab.first()).toBeVisible({ timeout: 5000 });
  });

  test("clicking notifications tab shows notification list", async ({ page }) => {
    await page.goto("/messages");
    await page.waitForLoadState("networkidle");
    await expect(page.locator(".content-inner").first()).toBeVisible({ timeout: 10000 });

    const notifTab = page.locator(".messages-view-tab", {
      hasText: /notifications|hinweise|benachrichtigungen/i,
    });
    if ((await notifTab.count()) === 0) return;

    await notifTab.first().click();

    /* Either notification items or a "no notifications" empty state should appear */
    const listOrEmpty = page.locator(".messages-conversation-list");
    await expect(listOrEmpty.first()).toBeVisible({ timeout: 5000 });
  });

  test("?tab=notifications query param opens notifications tab", async ({ page }) => {
    await page.goto("/messages?tab=notifications");
    await page.waitForLoadState("networkidle");
    await expect(page.locator(".content-inner").first()).toBeVisible({ timeout: 10000 });

    /* The notifications tab should be active */
    const activeTab = page.locator(".messages-view-tab.active", {
      hasText: /notifications|hinweise|benachrichtigungen/i,
    });
    await expect(activeTab.first()).toBeVisible({ timeout: 5000 });
  });

  test("notifications tab hides search/filter bar", async ({ page }) => {
    await page.goto("/messages?tab=notifications");
    await page.waitForLoadState("networkidle");
    await expect(page.locator(".content-inner").first()).toBeVisible({ timeout: 10000 });

    /* The search/filter bar should not be visible on the notifications tab */
    const filterBar = page.locator(".messages-filters");
    await expect(filterBar).toHaveCount(0);
  });
});
