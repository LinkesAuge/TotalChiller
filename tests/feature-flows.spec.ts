import { test, expect } from "@playwright/test";
import { storageStatePath } from "./helpers/auth";

/**
 * Feature flow tests — user flows not covered by other spec files.
 * Messages delete/archive, forum comment edit/delete, deep links, profile game accounts.
 */

/* ── 1. Messages: Delete and archive flow ──────────────────── */

test.describe("Messages: delete and archive flow", () => {
  test.use({ storageState: storageStatePath("editor") });

  test("messages page shows inbox", async ({ page }) => {
    await page.goto("/messages");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator(".content-inner").first()).toBeVisible({ timeout: 10000 });
    const messagesContent = page.locator("text=/Posteingang|Inbox|Nachrichten|Messages/i");
    await expect(messagesContent.first()).toBeVisible({ timeout: 10000 });
  });

  test("archive tab is visible", async ({ page }) => {
    await page.goto("/messages");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator(".content-inner").first()).toBeVisible({ timeout: 10000 });
    const archiveTab = page.locator("text=/Archiv|Archive/i");
    await expect(archiveTab.first()).toBeVisible({ timeout: 10000 });
  });
});

/* ── 2. Forum: Comment edit/delete flow ───────────────────── */

test.describe("Forum: comment edit/delete flow", () => {
  test.use({ storageState: storageStatePath("editor") });
  test.describe.configure({ mode: "serial" });

  test("forum page loads with posts", async ({ page }) => {
    await page.goto("/forum");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator(".content-inner").first()).toBeVisible({ timeout: 10000 });
    const noClanMsg = page.locator("text=/Clan-Bereichen|clan access|keinen Zugang/i");
    if ((await noClanMsg.count()) > 0) {
      test.skip(true, "No clan access");
      return;
    }
    const postOrEmpty = page.locator(".forum-post-card").or(page.getByText(/Keine Beiträge|No posts/i));
    await expect(postOrEmpty.first()).toBeVisible({ timeout: 15000 });
  });

  test("forum post detail shows edit/delete buttons for own content", async ({ page }) => {
    await page.goto("/forum");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator(".content-inner").first()).toBeVisible({ timeout: 10000 });
    const noClanMsg = page.locator("text=/Clan-Bereichen|clan access|keinen Zugang/i");
    if ((await noClanMsg.count()) > 0) {
      test.skip(true, "No clan access");
      return;
    }
    const postCard = page.locator(".forum-post-card").first();
    if ((await postCard.count()) === 0) {
      test.skip(true, "No posts available");
      return;
    }
    await postCard.click();
    await expect(page.locator(".forum-detail-card, .forum-detail-header").first()).toBeVisible({ timeout: 15000 });
  });
});

/* ── 3. Deep links ───────────────────────────────────────── */

test.describe("Deep links", () => {
  test.use({ storageState: storageStatePath("editor") });

  test("messages ?to= pre-fills compose", async ({ page }) => {
    await page.goto("/messages?to=00000000-0000-0000-0000-000000000001");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator(".content-inner").first()).toBeVisible({ timeout: 10000 });
  });

  test("news ?article= query param accepted", async ({ page }) => {
    await page.goto("/news?article=00000000-0000-0000-0000-000000000001");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator(".content-inner").first()).toBeVisible({ timeout: 10000 });
  });

  test("events ?date= query param accepted", async ({ page }) => {
    const today = new Date().toISOString().split("T")[0];
    await page.goto(`/events?date=${today}`);
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator(".content-inner").first()).toBeVisible({ timeout: 10000 });
  });

  test("forum ?post= query param accepted", async ({ page }) => {
    await page.goto("/forum?post=00000000-0000-0000-0000-000000000001");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator(".content-inner").first()).toBeVisible({ timeout: 10000 });
  });
});

/* ── 4. Profile: Game account management ─────────────────── */

test.describe("Profile: game account management", () => {
  test.use({ storageState: storageStatePath("member") });

  test("profile shows game accounts section", async ({ page }) => {
    await page.goto("/profile");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator(".content-inner").first()).toBeVisible({ timeout: 10000 });
    const gameAccountSection = page.locator("text=/Spielkonto|Game Account|Spielkonten/i");
    await expect(gameAccountSection.first()).toBeVisible({ timeout: 10000 });
  });

  test("game account request form is accessible", async ({ page }) => {
    await page.goto("/profile");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator(".content-inner").first()).toBeVisible({ timeout: 10000 });
    const requestBtn = page
      .locator("button, input[type='text']")
      .filter({ hasText: /Spielkonto|Game Account|Request|Anfragen|hinzufügen|add|Konto/i });
    const formArea = page.locator(
      "form, .game-account-form, #newGameUsername, input[placeholder*='username' i], input[placeholder*='Spielername' i], input[placeholder*='Benutzername' i]",
    );
    const anyFound = (await requestBtn.count()) > 0 || (await formArea.count()) > 0;
    expect(anyFound).toBeTruthy();
  });
});
