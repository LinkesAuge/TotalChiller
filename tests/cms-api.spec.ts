import { test, expect } from "@playwright/test";

/**
 * Test 4: CMS API Endpoints
 * Verifies the API endpoints return correct responses.
 */

test.describe("CMS API Endpoints", () => {

  test("GET /api/site-content returns array for valid page", async ({ request }) => {
    const res = await request.get("/api/site-content?page=home");
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  test("GET /api/site-content requires page parameter", async ({ request }) => {
    const res = await request.get("/api/site-content");
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  test("GET /api/site-content returns correct structure", async ({ request }) => {
    const res = await request.get("/api/site-content?page=home");
    const data = await res.json();
    if (data.length > 0) {
      const row = data[0];
      expect(row).toHaveProperty("page");
      expect(row).toHaveProperty("section_key");
      expect(row).toHaveProperty("field_key");
      expect(row).toHaveProperty("content_de");
      expect(row).toHaveProperty("content_en");
    }
  });

  test("GET /api/site-list-items returns array for valid page", async ({ request }) => {
    const res = await request.get("/api/site-list-items?page=home");
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  test("GET /api/site-list-items requires page parameter", async ({ request }) => {
    const res = await request.get("/api/site-list-items");
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  test("GET /api/site-list-items returns correct structure", async ({ request }) => {
    const res = await request.get("/api/site-list-items?page=home");
    const data = await res.json();
    if (data.length > 0) {
      const item = data[0];
      expect(item).toHaveProperty("id");
      expect(item).toHaveProperty("page");
      expect(item).toHaveProperty("section_key");
      expect(item).toHaveProperty("sort_order");
      expect(item).toHaveProperty("text_de");
      expect(item).toHaveProperty("text_en");
    }
  });

  test("PATCH /api/site-content requires authentication", async ({ request }) => {
    const res = await request.patch("/api/site-content", {
      data: {
        page: "home",
        section_key: "test",
        field_key: "test",
        content_de: "test",
        content_en: "test",
      },
    });
    expect(res.status()).toBe(401);
  });

  test("PATCH /api/site-list-items requires authentication", async ({ request }) => {
    const res = await request.patch("/api/site-list-items", {
      data: {
        action: "create",
        page: "home",
        section_key: "test",
        text_de: "test",
        text_en: "test",
      },
    });
    expect(res.status()).toBe(401);
  });

  test("GET /api/site-content returns empty array for non-existent page", async ({ request }) => {
    const res = await request.get("/api/site-content?page=nonexistent_page_xyz");
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(0);
  });
});
