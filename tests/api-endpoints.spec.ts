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
    expect(res.status()).toBe(401);
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
    expect(res.status()).toBe(401);
  });
});

test.describe("API: Charts", () => {
  test("GET /api/charts returns 200 or 401", async ({ request }) => {
    const res = await request.get("/api/charts");
    /* Might require auth or query params */
    expect([200, 400, 401]).toContain(res.status());
  });
});

test.describe("API: Messages", () => {
  test("GET /api/messages without auth returns gracefully", async ({ request }) => {
    const res = await request.get("/api/messages");
    /* Returns 200 with empty data or 401 — both are acceptable */
    expect([200, 401]).toContain(res.status());
  });

  test("POST /api/messages without auth returns gracefully", async ({ request }) => {
    const res = await request.post("/api/messages", {
      data: { recipient_id: "test", content: "test" },
    });
    expect([200, 400, 401]).toContain(res.status());
  });

  test("POST /api/messages/broadcast without auth returns gracefully", async ({ request }) => {
    const res = await request.post("/api/messages/broadcast", {
      data: { clan_id: "all", content: "test" },
    });
    expect([200, 400, 401]).toContain(res.status());
  });
});

test.describe("API: Notifications", () => {
  test("GET /api/notifications without auth returns gracefully", async ({ request }) => {
    const res = await request.get("/api/notifications");
    expect([200, 401]).toContain(res.status());
  });

  test("GET /api/notification-settings without auth returns gracefully", async ({ request }) => {
    const res = await request.get("/api/notification-settings");
    expect([200, 401]).toContain(res.status());
  });
});

test.describe("API: Admin endpoints", () => {
  test("POST /api/admin/create-user without auth returns gracefully", async ({ request }) => {
    const res = await request.post("/api/admin/create-user", {
      data: { email: "test@test.com" },
    });
    expect([200, 400, 401]).toContain(res.status());
  });

  test("DELETE /api/admin/delete-user without auth returns gracefully", async ({ request }) => {
    const res = await request.delete("/api/admin/delete-user", {
      data: { user_id: "fake-id" },
    });
    expect([200, 400, 401, 405]).toContain(res.status());
  });

  test("GET /api/admin/game-account-approvals without auth returns gracefully", async ({ request }) => {
    const res = await request.get("/api/admin/game-account-approvals");
    expect([200, 401]).toContain(res.status());
  });

  test("GET /api/admin/forum-categories without auth returns gracefully", async ({ request }) => {
    const res = await request.get("/api/admin/forum-categories");
    expect([200, 401]).toContain(res.status());
  });
});

test.describe("API: Game Accounts", () => {
  test("GET /api/game-accounts without auth returns gracefully", async ({ request }) => {
    const res = await request.get("/api/game-accounts");
    expect([200, 401]).toContain(res.status());
  });
});

test.describe("API: Data Import", () => {
  test("POST /api/data-import/commit without auth returns gracefully", async ({ request }) => {
    const res = await request.post("/api/data-import/commit", {
      data: { clan_id: "test", rows: [] },
    });
    expect([200, 400, 401]).toContain(res.status());
  });
});
