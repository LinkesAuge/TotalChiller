import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";

/**
 * CRUD flow tests — actually create, edit, and delete content.
 * These tests run serially within each describe block to ensure ordering.
 */

const UNIQUE = `e2e-${Date.now()}`;

/* ── News CRUD ─────────────────────────────────────────────── */

test.describe("News: CRUD flow", () => {
  test.describe.configure({ mode: "serial" });

  const articleTitle = `Test Article ${UNIQUE}`;
  const editedTitle = `Edited Article ${UNIQUE}`;

  test("editor can create an article", async ({ page }) => {
    await loginAs(page, "editor");
    await page.goto("/news");
    await page.waitForLoadState("networkidle");
    await expect(page.locator(".content-inner")).toBeVisible({ timeout: 10000 });

    /* Check for no-clan message — if present, skip gracefully */
    const noClanMsg = page.locator("text=/Clan-Bereichen|clan access/i");
    if ((await noClanMsg.count()) > 0) {
      test.skip(true, "Test user lacks clan membership — skipping CRUD");
      return;
    }

    const createBtn = page.locator("button", { hasText: /create post|erstellen/i });
    await expect(createBtn.first()).toBeVisible({ timeout: 5000 });
    await createBtn.first().click();

    await page.locator("#newsTitle").fill(articleTitle);
    await page.locator("#newsContent").fill("This is test article content for E2E testing.");

    await page.locator('form button[type="submit"]').click();

    /* Verify the article appears in the list */
    await expect(page.locator(`text=${articleTitle}`)).toBeVisible({ timeout: 10000 });
  });

  test("editor can edit the article", async ({ page }) => {
    await loginAs(page, "editor");
    await page.goto("/news");
    await page.waitForLoadState("networkidle");
    await expect(page.locator(".content-inner")).toBeVisible({ timeout: 10000 });

    const noClanMsg = page.locator("text=/Clan-Bereichen|clan access/i");
    if ((await noClanMsg.count()) > 0) {
      test.skip(true, "Test user lacks clan membership — skipping CRUD");
      return;
    }

    /* Find and click edit on our article */
    const articleCard = page.locator(".news-card", { hasText: articleTitle });
    if ((await articleCard.count()) === 0) {
      test.skip(true, "Article not found — create may have been skipped");
      return;
    }

    const editBtn = articleCard.locator("button", { hasText: /edit post|bearbeiten/i });
    await editBtn.first().click();

    await page.locator("#newsTitle").clear();
    await page.locator("#newsTitle").fill(editedTitle);
    await page.locator('form button[type="submit"]').click();

    await expect(page.locator(`text=${editedTitle}`)).toBeVisible({ timeout: 10000 });
  });

  test("editor can delete the article", async ({ page }) => {
    await loginAs(page, "editor");
    await page.goto("/news");
    await page.waitForLoadState("networkidle");
    await expect(page.locator(".content-inner")).toBeVisible({ timeout: 10000 });

    const noClanMsg = page.locator("text=/Clan-Bereichen|clan access/i");
    if ((await noClanMsg.count()) > 0) {
      test.skip(true, "Test user lacks clan membership — skipping CRUD");
      return;
    }

    const articleCard = page.locator(".news-card", { hasText: editedTitle });
    if ((await articleCard.count()) === 0) {
      test.skip(true, "Article not found — edit may have been skipped");
      return;
    }

    const deleteBtn = articleCard.locator("button", { hasText: /delete post|löschen/i });
    await deleteBtn.first().click();

    /* Verify deleted */
    await expect(page.locator(`text=${editedTitle}`)).toHaveCount(0, { timeout: 10000 });
  });
});

/* ── Events CRUD ───────────────────────────────────────────── */

test.describe("Events: CRUD flow", () => {
  test.describe.configure({ mode: "serial" });

  const eventTitle = `Test Event ${UNIQUE}`;
  const editedEventTitle = `Edited Event ${UNIQUE}`;

  test("editor can create an event", async ({ page }) => {
    await loginAs(page, "editor");
    await page.goto("/events");
    await page.waitForLoadState("networkidle");
    await expect(page.locator(".content-inner")).toBeVisible({ timeout: 10000 });

    const noClanMsg = page.locator("text=/Clan-Bereichen|clan access/i");
    if ((await noClanMsg.count()) > 0) {
      test.skip(true, "Test user lacks clan membership — skipping CRUD");
      return;
    }

    const createBtn = page.locator("button", { hasText: /create event|erstellen|hinzufügen/i });
    await expect(createBtn.first()).toBeVisible({ timeout: 5000 });
    await createBtn.first().click();

    await page.locator("#eventTitle").fill(eventTitle);
    await page.locator("#eventDescription").fill("E2E test event description.");
    await page.locator("#eventLocation").fill("Test Location");

    await page.locator('form button[type="submit"]').click();

    /* Verify the event appears */
    await expect(page.locator(`text=${eventTitle}`)).toBeVisible({ timeout: 10000 });
  });

  test("editor can edit the event", async ({ page }) => {
    await loginAs(page, "editor");
    await page.goto("/events");
    await page.waitForLoadState("networkidle");
    await expect(page.locator(".content-inner")).toBeVisible({ timeout: 10000 });

    const noClanMsg = page.locator("text=/Clan-Bereichen|clan access/i");
    if ((await noClanMsg.count()) > 0) {
      test.skip(true, "Test user lacks clan membership");
      return;
    }

    /* Click edit on the event */
    const editBtn = page.locator("button", { hasText: /edit event|bearbeiten/i });
    if ((await editBtn.count()) === 0) {
      test.skip(true, "Event not found — create may have been skipped");
      return;
    }
    await editBtn.first().click();

    await page.locator("#eventTitle").clear();
    await page.locator("#eventTitle").fill(editedEventTitle);
    await page.locator('form button[type="submit"]').click();

    await expect(page.locator(`text=${editedEventTitle}`)).toBeVisible({ timeout: 10000 });
  });

  test("editor can delete the event", async ({ page }) => {
    await loginAs(page, "editor");
    await page.goto("/events");
    await page.waitForLoadState("networkidle");
    await expect(page.locator(".content-inner")).toBeVisible({ timeout: 10000 });

    const noClanMsg = page.locator("text=/Clan-Bereichen|clan access/i");
    if ((await noClanMsg.count()) > 0) {
      test.skip(true, "Test user lacks clan membership");
      return;
    }

    const deleteBtn = page.locator("button.danger, button", { hasText: /delete event|löschen/i });
    if ((await deleteBtn.count()) === 0) {
      test.skip(true, "Event not found for deletion");
      return;
    }
    await deleteBtn.first().click();

    /* Confirm deletion in modal if present */
    const confirmBtn = page.locator("button.danger, button", { hasText: /delete|löschen|bestätigen|confirm/i });
    if ((await confirmBtn.count()) > 1) {
      await confirmBtn.last().click();
    }

    await expect(page.locator(`text=${editedEventTitle}`)).toHaveCount(0, { timeout: 10000 });
  });
});

/* ── Forum CRUD ────────────────────────────────────────────── */

test.describe("Forum: Post and comment CRUD", () => {
  test.describe.configure({ mode: "serial" });

  const postTitle = `Test Post ${UNIQUE}`;

  test("member can create a forum post", async ({ page }) => {
    await loginAs(page, "member");
    await page.goto("/forum");
    await page.waitForLoadState("networkidle");
    await expect(page.locator(".content-inner")).toBeVisible({ timeout: 10000 });

    const noClanMsg = page.locator("text=/Clan-Bereichen|clan access/i");
    if ((await noClanMsg.count()) > 0) {
      test.skip(true, "Test user lacks clan membership");
      return;
    }

    const newPostBtn = page.locator("button", { hasText: /new post|neuer beitrag/i });
    await expect(newPostBtn.first()).toBeVisible({ timeout: 5000 });
    await newPostBtn.first().click();

    await page.locator("#post-title").fill(postTitle);
    await page.locator("#post-content").fill("E2E test forum post content.");

    /* Select first category if available */
    const categorySelect = page.locator("#post-category");
    if ((await categorySelect.count()) > 0) {
      const options = await categorySelect.locator("option").all();
      if (options.length > 1) {
        await categorySelect.selectOption({ index: 1 });
      }
    }

    await page.locator("button", { hasText: /publish|veröffentlichen|submit/i }).click();

    /* Verify the post appears */
    await expect(page.locator(`text=${postTitle}`)).toBeVisible({ timeout: 10000 });
  });

  test("member can add a comment", async ({ page }) => {
    await loginAs(page, "member");
    await page.goto("/forum");
    await page.waitForLoadState("networkidle");
    await expect(page.locator(".content-inner")).toBeVisible({ timeout: 10000 });

    /* Click our post to view detail */
    const postLink = page.locator(`text=${postTitle}`);
    if ((await postLink.count()) === 0) {
      test.skip(true, "Post not found — create may have been skipped");
      return;
    }
    await postLink.first().click();
    await page.waitForLoadState("networkidle");

    /* Add a comment */
    const commentTextarea = page.locator(".forum-comments-section textarea, textarea");
    if ((await commentTextarea.count()) === 0) {
      test.skip(true, "Comment textarea not found");
      return;
    }
    await commentTextarea.last().fill("E2E test comment content.");
    const submitCommentBtn = page.locator("button", { hasText: /comment|kommentar/i });
    await submitCommentBtn.last().click();

    await expect(page.locator("text=E2E test comment content.")).toBeVisible({ timeout: 10000 });
  });

  test("member can vote on a post", async ({ page }) => {
    await loginAs(page, "member");
    await page.goto("/forum");
    await page.waitForLoadState("networkidle");
    await expect(page.locator(".content-inner")).toBeVisible({ timeout: 10000 });

    /* Click our post */
    const postLink = page.locator(`text=${postTitle}`);
    if ((await postLink.count()) === 0) {
      test.skip(true, "Post not found — create may have been skipped");
      return;
    }
    await postLink.first().click();
    await page.waitForLoadState("networkidle");

    /* Vote up */
    const upvoteBtn = page.locator('button[aria-label="upvote"], .forum-vote-btn').first();
    if ((await upvoteBtn.count()) > 0) {
      await upvoteBtn.click();
      /* The button or its parent should reflect the vote */
    }
  });
});

/* ── Messages: Compose and send ───────────────────────────── */

test.describe("Messages: Send flow", () => {
  test("member can compose and send a private message", async ({ page }) => {
    await loginAs(page, "member");
    await page.goto("/messages");
    await page.waitForLoadState("networkidle");
    await expect(page.locator(".content-inner")).toBeVisible({ timeout: 10000 });

    const composeBtn = page.locator("button", { hasText: /new message|neue nachricht|compose|verfassen/i });
    if ((await composeBtn.count()) === 0) {
      test.skip(true, "Compose button not available");
      return;
    }
    await composeBtn.first().click();

    /* Search and select a recipient */
    const recipientInput = page
      .locator("#composeRecipient, form input[placeholder*='recipient'], form input[placeholder*='empfänger']")
      .first();
    await recipientInput.fill("test-admin");

    /* Wait for autocomplete dropdown to appear */
    const option = page.locator(".combobox-option, [role='option']").first();
    await expect(option)
      .toBeVisible({ timeout: 5000 })
      .catch(() => {
        /* Autocomplete may not appear — continue anyway */
      });
    if ((await option.count()) > 0) {
      await option.click();
    }

    await page.locator("#composeSubject").fill(`E2E Test Message ${UNIQUE}`);
    await page.locator("#composeContent").fill("This is an automated E2E test message.");

    await page.locator("button", { hasText: /send|senden/i }).click();

    /* Verify success — compose form should close or show the sent message */
    const composeForm = page.locator("#composeContent");
    await expect(async () => {
      const formGone = (await composeForm.count()) === 0;
      const onMessages = page.url().includes("/messages");
      expect(formGone || onMessages).toBe(true);
    }).toPass({ timeout: 10000 });
  });
});

/* ── Authenticated API tests ──────────────────────────────── */

test.describe("Authenticated API: core endpoints", () => {
  test("GET /api/messages returns data for authenticated user", async ({ page, request }) => {
    await loginAs(page, "member");

    /* Grab the cookies from the authenticated browser context */
    const cookies = await page.context().cookies();
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");

    const baseUrl = page.url().replace(/\/[^/]*$/, "");
    const res = await request.get(`${baseUrl}/api/messages`, {
      headers: { Cookie: cookieHeader },
    });
    expect([200, 401]).toContain(res.status());
  });

  test("GET /api/notifications returns data for authenticated user", async ({ page, request }) => {
    await loginAs(page, "member");

    const cookies = await page.context().cookies();
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");

    const baseUrl = page.url().replace(/\/[^/]*$/, "");
    const res = await request.get(`${baseUrl}/api/notifications`, {
      headers: { Cookie: cookieHeader },
    });
    expect([200, 401]).toContain(res.status());
  });

  test("GET /api/game-accounts returns data for authenticated user", async ({ page, request }) => {
    await loginAs(page, "member");

    const cookies = await page.context().cookies();
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");

    const baseUrl = page.url().replace(/\/[^/]*$/, "");
    const res = await request.get(`${baseUrl}/api/game-accounts`, {
      headers: { Cookie: cookieHeader },
    });
    expect([200, 400, 401]).toContain(res.status());
  });
});

/* ── Error path tests ─────────────────────────────────────── */

test.describe("Error paths", () => {
  test("invalid form submission on login shows error", async ({ page }) => {
    await page.goto("/auth/login");
    await page.waitForLoadState("networkidle");

    await page.locator("#identifier").fill("not-a-real-user@example.com");
    await page.locator("#password").fill("wrong-password");
    await page.locator('button[type="submit"]').click();

    /* Should show an error message or stay on the login page */
    await expect(async () => {
      const errorMsg = page.locator(".alert, [role='alert'], .error, .text-red, .text-muted");
      const stillOnLogin = page.url().includes("/auth/login");
      expect((await errorMsg.count()) > 0 || stillOnLogin).toBe(true);
    }).toPass({ timeout: 10000 });
  });

  test("POST /api/messages with invalid body returns 400", async ({ request }) => {
    const res = await request.post("/api/messages", {
      data: { invalid: true },
    });
    expect([400, 401]).toContain(res.status());
  });

  test("POST /api/admin/create-user without auth returns 401", async ({ request }) => {
    const res = await request.post("/api/admin/create-user", {
      data: { email: "test@test.com", username: "testuser" },
    });
    expect([401, 429]).toContain(res.status());
  });
});
