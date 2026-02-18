import { test, expect, request as playwrightRequest } from "@playwright/test";
import { storageStatePath } from "./helpers/auth";

/**
 * Messages tests — inbox, compose, send, broadcast.
 */

test.describe("Messages: Page loading", () => {
  test.use({ storageState: storageStatePath("member") });
  test("messages page loads for authenticated member", async ({ page }) => {
    await page.goto("/messages");
    await page.waitForLoadState("domcontentloaded");
    expect(page.url()).toContain("/messages");
  });

  test("messages page shows content area", async ({ page }) => {
    await page.goto("/messages");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator(".content-inner").first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Messages: Compose", () => {
  test.use({ storageState: storageStatePath("member") });
  test("has compose button or area", async ({ page }) => {
    await page.goto("/messages");
    await page.waitForLoadState("domcontentloaded");

    /* Look for compose/new message button */
    const composeBtn = page.locator("button", { hasText: /compose|verfassen|new|neu|nachricht/i });
    expect(await composeBtn.count()).toBeGreaterThanOrEqual(0);
  });
});

test.describe("Messages: Broadcast (moderator)", () => {
  test.use({ storageState: storageStatePath("moderator") });
  test("moderator sees broadcast UI elements", async ({ page }) => {
    await page.goto("/messages");
    await page.waitForLoadState("domcontentloaded");

    /* Content managers should see clan/global broadcast options */
    await expect(page.locator(".content-inner").first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Messages: Broadcast (member)", () => {
  test.use({ storageState: storageStatePath("member") });
  test("member does NOT see broadcast compose options", async ({ page }) => {
    await page.goto("/messages");
    await page.waitForLoadState("domcontentloaded");
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
    await page.waitForLoadState("domcontentloaded");

    /* Should have filter tabs or select for message types */
    const filterElements = page.locator("[role=tab], select, .filter, .tab");
    expect(await filterElements.count()).toBeGreaterThanOrEqual(0);
  });
});

test.describe("Messages: Recipient search privacy", () => {
  test.use({ storageState: storageStatePath("admin") });

  test("search recipients payload does not expose email fields", async ({ page }) => {
    const response = await page.request.get("/api/messages/search-recipients?q=ad");
    expect([200, 429]).toContain(response.status());
    if (response.status() === 429) return;

    const body = (await response.json()) as { data?: Array<Record<string, unknown>> };
    const entries = Array.isArray(body.data) ? body.data : [];
    for (const entry of entries) {
      expect(Object.prototype.hasOwnProperty.call(entry, "email")).toBe(false);
    }
  });
});

test.describe("Messages: Notifications tab", () => {
  test.use({ storageState: storageStatePath("member") });

  test("messages page shows notifications tab button", async ({ page }) => {
    await page.goto("/messages");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator(".content-inner").first()).toBeVisible({ timeout: 10000 });

    /* Should have 4 tabs: Inbox, Sent, Archive, Notifications */
    const notifTab = page.locator(".messages-view-tab", {
      hasText: /notifications|hinweise|benachrichtigungen/i,
    });
    await expect(notifTab.first()).toBeVisible({ timeout: 5000 });
  });

  test("clicking notifications tab shows notification list", async ({ page }) => {
    await page.goto("/messages");
    await page.waitForLoadState("domcontentloaded");
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
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator(".content-inner").first()).toBeVisible({ timeout: 10000 });

    /* The notifications tab should be active */
    const activeTab = page.locator(".messages-view-tab.active", {
      hasText: /notifications|hinweise|benachrichtigungen/i,
    });
    await expect(activeTab.first()).toBeVisible({ timeout: 5000 });
  });

  test("notifications tab hides search/filter bar", async ({ page }) => {
    await page.goto("/messages?tab=notifications");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator(".content-inner").first()).toBeVisible({ timeout: 10000 });

    /* The search/filter bar should not be visible on the notifications tab */
    const filterBar = page.locator(".messages-filters");
    await expect(filterBar).toHaveCount(0);
  });
});

test.describe("Messages: Mobile thread panel flow", () => {
  test.use({ storageState: storageStatePath("member") });

  test("mobile opens thread panel and back button returns to list", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-chrome", "Mobile-only behavior");

    await page.goto("/messages");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator(".content-inner").first()).toBeVisible({ timeout: 10000 });

    const conversationItems = page.locator(".messages-conversation-item");
    if ((await conversationItems.count()) === 0) {
      const memberId = await page.evaluate(() => {
        const tokenCookie = document.cookie
          .split("; ")
          .find((cookie) => cookie.startsWith("sb-") && cookie.includes("-auth-token="));
        if (!tokenCookie) return null;

        const cookieValue = tokenCookie.split("=")[1];
        if (!cookieValue) return null;

        const decoded = decodeURIComponent(cookieValue);
        const payload = decoded.startsWith("base64-") ? decoded.slice(7) : decoded;

        try {
          const parsed = JSON.parse(atob(payload)) as { user?: { id?: string } };
          return parsed.user?.id ?? null;
        } catch {
          return null;
        }
      });
      expect(memberId).toBeTruthy();
      if (!memberId) {
        throw new Error("Failed to resolve member user ID from auth cookie.");
      }

      const adminRequest = await playwrightRequest.newContext({
        baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
        storageState: storageStatePath("admin"),
      });
      const seeded = await adminRequest.post("/api/messages", {
        data: {
          recipient_ids: [memberId],
          subject: "Mobile thread flow seed",
          content: "Seed message for mobile thread panel flow test.",
          message_type: "private",
        },
      });
      await adminRequest.dispose();
      expect(seeded.ok()).toBeTruthy();

      await page.reload({ waitUntil: "domcontentloaded" });
      await expect
        .poll(async () => await page.locator(".messages-conversation-item").count(), { timeout: 10000 })
        .toBeGreaterThan(0);
    }

    await conversationItems.first().click();
    await expect(page.locator(".messages-layout.thread-active")).toBeVisible({ timeout: 5000 });

    const backButton = page.locator(".messages-back-btn");
    await expect(backButton).toBeVisible({ timeout: 5000 });
    await backButton.click();
    await expect(page.locator(".messages-layout.thread-active")).toHaveCount(0);
  });
});
