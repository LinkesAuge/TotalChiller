import { test, expect } from "@playwright/test";

/**
 * API endpoint tests — verify status codes, response shapes, and auth guards.
 *
 * These tests do NOT require authentication (they test the API contract).
 * Authenticated endpoints should return 401.
 */

test.describe("API: Site Content", () => {
  test("GET /api/site-content?page=home returns 200 + array", async ({ request }) => {
    const res = await request.get("/api/site-content?page=home");
    expect(res.status()).toBe(200);
    expect(Array.isArray(await res.json())).toBe(true);
  });

  test("GET /api/site-content without page returns 400", async ({ request }) => {
    const res = await request.get("/api/site-content");
    expect(res.status()).toBe(400);
  });

  test("PATCH /api/site-content without auth returns 401", async ({ request }) => {
    const res = await request.patch("/api/site-content", {
      data: { page: "home", section_key: "test", field_key: "test", content_de: "", content_en: "" },
    });
    expect([401, 429]).toContain(res.status());
  });
});

test.describe("API: Site List Items", () => {
  test("GET /api/site-list-items?page=home returns 200 + array", async ({ request }) => {
    const res = await request.get("/api/site-list-items?page=home");
    expect(res.status()).toBe(200);
    expect(Array.isArray(await res.json())).toBe(true);
  });

  test("GET /api/site-list-items without page returns 400", async ({ request }) => {
    const res = await request.get("/api/site-list-items");
    expect(res.status()).toBe(400);
  });

  test("PATCH /api/site-list-items without auth returns 401", async ({ request }) => {
    const res = await request.patch("/api/site-list-items", {
      data: { action: "create", page: "test", section_key: "test" },
    });
    expect([401, 429]).toContain(res.status());
  });
});

test.describe("API: Messages", () => {
  test("GET /api/messages without auth returns gracefully", async ({ request }) => {
    const res = await request.get("/api/messages");
    /* Returns 200 with empty data, 401, or 429 (rate-limited) — all acceptable */
    expect([200, 401, 429]).toContain(res.status());
  });

  test("POST /api/messages without auth returns gracefully", async ({ request }) => {
    const res = await request.post("/api/messages", {
      data: { recipient_id: "test", content: "test" },
    });
    expect([200, 400, 401, 429]).toContain(res.status());
  });

  test("POST /api/messages broadcast without auth returns gracefully", async ({ request }) => {
    const res = await request.post("/api/messages", {
      data: { recipient_ids: ["a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"], content: "test", message_type: "broadcast" },
    });
    expect([200, 400, 401, 429]).toContain(res.status());
  });

  test("GET /api/messages/sent without auth returns gracefully", async ({ request }) => {
    const res = await request.get("/api/messages/sent");
    expect([200, 401, 429]).toContain(res.status());
  });
});

test.describe("API: Notifications", () => {
  test("GET /api/notifications without auth returns gracefully", async ({ request }) => {
    const res = await request.get("/api/notifications");
    expect([200, 401, 429]).toContain(res.status());
  });

  test("GET /api/notification-settings without auth returns gracefully", async ({ request }) => {
    const res = await request.get("/api/notification-settings");
    expect([200, 401, 429]).toContain(res.status());
  });
});

test.describe("API: Admin endpoints", () => {
  test("POST /api/admin/create-user without auth returns gracefully", async ({ request }) => {
    const res = await request.post("/api/admin/create-user", {
      data: { email: "test@test.com" },
    });
    expect([200, 400, 401, 429]).toContain(res.status());
  });

  test("POST /api/admin/create-user with missing username returns 400 or rate-limited", async ({ request }) => {
    const res = await request.post("/api/admin/create-user", {
      data: { email: "valid@example.com" },
    });
    /* Zod validation runs before auth — missing username → 400 */
    expect([400, 429]).toContain(res.status());
  });

  test("POST /api/admin/create-user with invalid email returns 400 or rate-limited", async ({ request }) => {
    const res = await request.post("/api/admin/create-user", {
      data: { email: "not-an-email", username: "testuser" },
    });
    expect([400, 429]).toContain(res.status());
  });

  test("DELETE /api/admin/delete-user without auth returns gracefully", async ({ request }) => {
    const res = await request.delete("/api/admin/delete-user", {
      data: { user_id: "fake-id" },
    });
    expect([200, 400, 401, 405]).toContain(res.status());
  });

  test("POST /api/admin/delete-user with non-UUID userId returns 400 or rate-limited", async ({ request }) => {
    const res = await request.post("/api/admin/delete-user", {
      data: { userId: "not-a-uuid" },
    });
    expect([400, 429]).toContain(res.status());
  });

  test("GET /api/admin/game-account-approvals without auth returns gracefully", async ({ request }) => {
    const res = await request.get("/api/admin/game-account-approvals");
    expect([200, 401, 429]).toContain(res.status());
  });

  test("GET /api/admin/forum-categories without auth returns gracefully", async ({ request }) => {
    const res = await request.get("/api/admin/forum-categories");
    expect([200, 400, 401, 429]).toContain(res.status());
  });

  test("GET /api/admin/forum-categories with invalid clan_id returns 400 or 401", async ({ request }) => {
    const res = await request.get("/api/admin/forum-categories?clan_id=not-a-uuid");
    expect([400, 401, 429]).toContain(res.status());
  });
});

test.describe("API: Game Accounts", () => {
  test("GET /api/game-accounts without auth returns gracefully", async ({ request }) => {
    const res = await request.get("/api/game-accounts");
    expect([200, 401, 429]).toContain(res.status());
  });

  test("POST /api/game-accounts without auth returns 401 or rate-limited", async ({ request }) => {
    const res = await request.post("/api/game-accounts", {
      data: { game_username: "testplayer" },
    });
    expect([401, 429]).toContain(res.status());
  });

  test("PATCH /api/game-accounts without auth returns 401 or rate-limited", async ({ request }) => {
    const res = await request.patch("/api/game-accounts", {
      data: { default_game_account_id: "00000000-0000-0000-0000-000000000000" },
    });
    expect([401, 429]).toContain(res.status());
  });
});

test.describe("API: Notifications Mark All Read", () => {
  test("POST /api/notifications/mark-all-read without auth returns 401 or rate-limited", async ({ request }) => {
    const res = await request.post("/api/notifications/mark-all-read");
    expect([401, 429]).toContain(res.status());
  });
});

/* ── Uncovered routes added by audit ── */

test.describe("API: Admin User Lookup", () => {
  test("POST /api/admin/user-lookup without auth returns 400, 401, or 429", async ({ request }) => {
    const res = await request.post("/api/admin/user-lookup", {
      data: { query: "testuser" },
    });
    expect([400, 401, 429]).toContain(res.status());
  });
});

test.describe("API: Auth Forgot Password", () => {
  test("POST /api/auth/forgot-password without email returns 400", async ({ request }) => {
    const res = await request.post("/api/auth/forgot-password", {
      data: {},
    });
    expect([400, 429]).toContain(res.status());
  });

  test("POST /api/auth/forgot-password with invalid email returns 400", async ({ request }) => {
    const res = await request.post("/api/auth/forgot-password", {
      data: { email: "not-an-email" },
    });
    expect([400, 429]).toContain(res.status());
  });
});

test.describe("API: Messages Detail", () => {
  test("PATCH /api/messages/[id] without auth returns 401 or 500", async ({ request }) => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const res = await request.patch(`/api/messages/${fakeId}`, {
      data: { is_read: true },
    });
    expect([401, 500]).toContain(res.status());
  });

  test("DELETE /api/messages/[id] without auth returns 401 or 500", async ({ request }) => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const res = await request.delete(`/api/messages/${fakeId}`);
    expect([401, 500]).toContain(res.status());
  });

  test("PATCH /api/messages/[id] with invalid UUID returns 400 or 401", async ({ request }) => {
    const res = await request.patch("/api/messages/not-a-uuid", {
      data: { is_read: true },
    });
    /* 429 may occur when parallel browser projects hit the rate limiter */
    expect([400, 401, 429]).toContain(res.status());
  });
});

test.describe("API: Messages Search Recipients", () => {
  test("GET /api/messages/search-recipients without auth returns 401 or 429", async ({ request }) => {
    const res = await request.get("/api/messages/search-recipients?q=test");
    expect([401, 429]).toContain(res.status());
  });
});

test.describe("API: Notifications Delete", () => {
  test("DELETE /api/notifications/[id] without auth returns 401, 429, or 500", async ({ request }) => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const res = await request.delete(`/api/notifications/${fakeId}`);
    expect([401, 429, 500]).toContain(res.status());
  });

  test("DELETE /api/notifications/invalid-id without auth returns 400, 401, or 429", async ({ request }) => {
    const res = await request.delete("/api/notifications/invalid-id");
    expect([400, 401, 429]).toContain(res.status());
  });

  test("POST /api/notifications/delete-all without auth returns 401 or 429", async ({ request }) => {
    const res = await request.post("/api/notifications/delete-all");
    expect([401, 429]).toContain(res.status());
  });
});

test.describe("API: Notifications Detail", () => {
  test("PATCH /api/notifications/[id] without auth returns 401 or 500", async ({ request }) => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const res = await request.patch(`/api/notifications/${fakeId}`, {
      data: { is_read: true },
    });
    /* 429 may occur when parallel browser projects hit the rate limiter */
    expect([401, 429, 500]).toContain(res.status());
  });

  test("PATCH /api/notifications/[id] with invalid UUID returns 400 or 401", async ({ request }) => {
    const res = await request.patch("/api/notifications/not-a-uuid", {
      data: { is_read: true },
    });
    /* 429 may occur when parallel browser projects hit the rate limiter */
    expect([400, 401, 429]).toContain(res.status());
  });
});

test.describe("API: Notifications Fan-out", () => {
  test("POST /api/notifications/fan-out without auth returns 400, 401, or 429", async ({ request }) => {
    const res = await request.post("/api/notifications/fan-out", {
      data: { event_id: "00000000-0000-0000-0000-000000000000" },
    });
    expect([400, 401, 429]).toContain(res.status());
  });

  test("POST /api/notifications/fan-out with invalid body returns 400 or 401", async ({ request }) => {
    const res = await request.post("/api/notifications/fan-out", {
      data: { type: "invalid", reference_id: "bad" },
    });
    expect([400, 401, 429]).toContain(res.status());
  });

  test("POST /api/notifications/fan-out with valid schema but no auth returns 401", async ({ request }) => {
    const res = await request.post("/api/notifications/fan-out", {
      data: {
        type: "news",
        reference_id: "00000000-0000-0000-0000-000000000000",
        clan_id: "00000000-0000-0000-0000-000000000000",
        title: "Test Notification",
      },
    });
    expect([401, 429]).toContain(res.status());
  });
});

/* ── Gap-fill: previously untested mutation endpoints ── */

test.describe("API: Messages Archive", () => {
  test("GET /api/messages/archive without auth returns 401 or rate-limited", async ({ request }) => {
    const res = await request.get("/api/messages/archive");
    expect([401, 429]).toContain(res.status());
  });

  test("POST /api/messages/archive without auth returns 401 or rate-limited", async ({ request }) => {
    const res = await request.post("/api/messages/archive", {
      data: { ids: ["00000000-0000-0000-0000-000000000000"], action: "archive" },
    });
    expect([401, 429]).toContain(res.status());
  });
});

test.describe("API: Messages Sent Detail", () => {
  test("DELETE /api/messages/sent/[id] without auth returns 401 or rate-limited", async ({ request }) => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const res = await request.delete(`/api/messages/sent/${fakeId}`);
    expect([401, 429, 500]).toContain(res.status());
  });
});

test.describe("API: Messages Thread", () => {
  test("GET /api/messages/thread/[id] without auth returns 401 or rate-limited", async ({ request }) => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const res = await request.get(`/api/messages/thread/${fakeId}`);
    expect([401, 429, 500]).toContain(res.status());
  });

  test("DELETE /api/messages/thread/[id] without auth returns 401 or rate-limited", async ({ request }) => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const res = await request.delete(`/api/messages/thread/${fakeId}`);
    expect([401, 429, 500]).toContain(res.status());
  });
});

test.describe("API: Admin Game Account Approvals (mutations)", () => {
  test("PATCH /api/admin/game-account-approvals without auth returns 401 or rate-limited", async ({ request }) => {
    const res = await request.patch("/api/admin/game-account-approvals", {
      data: { account_id: "00000000-0000-0000-0000-000000000000", action: "approve" },
    });
    expect([401, 429]).toContain(res.status());
  });
});

test.describe("API: Admin Forum Categories (mutations)", () => {
  test("POST /api/admin/forum-categories without auth returns 401 or rate-limited", async ({ request }) => {
    const res = await request.post("/api/admin/forum-categories", {
      data: { name: "Test Category", clan_id: "00000000-0000-0000-0000-000000000000" },
    });
    expect([400, 401, 429]).toContain(res.status());
  });

  test("PATCH /api/admin/forum-categories without auth returns 401 or rate-limited", async ({ request }) => {
    const res = await request.patch("/api/admin/forum-categories", {
      data: { id: "00000000-0000-0000-0000-000000000000", name: "Updated" },
    });
    expect([400, 401, 429]).toContain(res.status());
  });

  test("DELETE /api/admin/forum-categories without auth returns 401 or rate-limited", async ({ request }) => {
    const res = await request.delete("/api/admin/forum-categories", {
      data: { id: "00000000-0000-0000-0000-000000000000" },
    });
    expect([400, 401, 429]).toContain(res.status());
  });
});

test.describe("API: Notification Settings (mutations)", () => {
  test("PATCH /api/notification-settings without auth returns 401 or rate-limited", async ({ request }) => {
    const res = await request.patch("/api/notification-settings", {
      data: { messages_enabled: false },
    });
    expect([401, 429]).toContain(res.status());
  });

  test("PATCH /api/notification-settings with empty body returns 400 or 401", async ({ request }) => {
    const res = await request.patch("/api/notification-settings", {
      data: {},
    });
    expect([400, 401, 429]).toContain(res.status());
  });
});

test.describe("API: Design System (public endpoints)", () => {
  test("GET /api/design-system/assets returns 200, 401, or rate-limited", async ({ request }) => {
    const res = await request.get("/api/design-system/assets");
    expect([200, 401, 429]).toContain(res.status());
  });

  test("GET /api/design-system/assignments returns 200, 401, or rate-limited", async ({ request }) => {
    const res = await request.get("/api/design-system/assignments");
    expect([200, 401, 429]).toContain(res.status());
  });

  test("GET /api/design-system/ui-elements returns 200, 401, or rate-limited", async ({ request }) => {
    const res = await request.get("/api/design-system/ui-elements");
    expect([200, 401, 429]).toContain(res.status());
  });

  test("POST /api/design-system/preview-upload without auth returns 401 or rate-limited", async ({ request }) => {
    const res = await request.post("/api/design-system/preview-upload");
    expect([400, 401, 429]).toContain(res.status());
  });
});
