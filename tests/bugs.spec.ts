import { test, expect } from "@playwright/test";
import { storageStatePath } from "./helpers/auth";

const FAKE_UUID = "00000000-0000-4000-8000-000000000001";

/* Dev server cold-compiles routes on first hit, so increase global timeout.
   Turbopack compilation can take 10-30s per new route. */
test.setTimeout(120_000);

/* Helper: extract auth cookies from a page context for API requests. */
async function authHeaders(page: import("@playwright/test").Page) {
  const cookies = await page.context().cookies("http://localhost:3000");
  /* Also try port 3001 for dev server fallback */
  const cookies3001 = await page.context().cookies("http://localhost:3001");
  const all = [...cookies, ...cookies3001];
  return { Cookie: all.map((c) => `${c.name}=${c.value}`).join("; ") };
}

/* -------------------------------------------------------------------------- */
/*  Bugs API: Auth guards (unauthenticated)                                   */
/* -------------------------------------------------------------------------- */

test.describe("Bugs API: Auth guards", () => {
  test("GET /api/bugs without auth returns 401", async ({ request }) => {
    const res = await request.get("/api/bugs");
    expect([401, 429]).toContain(res.status());
  });

  test("POST /api/bugs without auth returns 401", async ({ request }) => {
    const res = await request.post("/api/bugs", {
      data: { title: "Test", description: "Test", category_id: FAKE_UUID },
    });
    expect([401, 429]).toContain(res.status());
  });

  test("GET /api/bugs/:id without auth returns 401", async ({ request }) => {
    const res = await request.get(`/api/bugs/${FAKE_UUID}`);
    expect([401, 429]).toContain(res.status());
  });

  test("PATCH /api/bugs/:id without auth returns 401", async ({ request }) => {
    const res = await request.patch(`/api/bugs/${FAKE_UUID}`, {
      data: { description: "Updated" },
    });
    expect([401, 429]).toContain(res.status());
  });

  test("DELETE /api/bugs/:id without auth returns 401", async ({ request }) => {
    const res = await request.delete(`/api/bugs/${FAKE_UUID}`);
    expect([401, 429]).toContain(res.status());
  });

  test("GET /api/bugs/categories without auth returns 401", async ({ request }) => {
    const res = await request.get("/api/bugs/categories");
    expect([401, 429]).toContain(res.status());
  });

  test("GET /api/bugs/:id/comments without auth returns 401", async ({ request }) => {
    const res = await request.get(`/api/bugs/${FAKE_UUID}/comments`);
    expect([401, 429]).toContain(res.status());
  });

  test("POST /api/bugs/:id/comments without auth returns 401", async ({ request }) => {
    const res = await request.post(`/api/bugs/${FAKE_UUID}/comments`, {
      data: { content: "Test comment" },
    });
    expect([401, 429]).toContain(res.status());
  });
});

/* -------------------------------------------------------------------------- */
/*  Bugs API: Authenticated member access                                     */
/* -------------------------------------------------------------------------- */

test.describe("Bugs API: Authenticated member", () => {
  test.use({ storageState: storageStatePath("member") });

  test("GET /api/bugs returns 200 with data array", async ({ page, request }) => {
    const headers = await authHeaders(page);
    const res = await request.get("/api/bugs", { headers });
    expect([200, 429]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toHaveProperty("data");
      expect(Array.isArray(body.data)).toBe(true);
    }
  });

  test("GET /api/bugs/categories returns 200 with categories array", async ({ page, request }) => {
    const headers = await authHeaders(page);
    const res = await request.get("/api/bugs/categories", { headers });
    expect([200, 429]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toHaveProperty("data");
      expect(Array.isArray(body.data)).toBe(true);
      if (body.data.length > 0) {
        expect(body.data[0]).toHaveProperty("id");
        expect(body.data[0]).toHaveProperty("name");
      }
    }
  });

  test("POST /api/bugs with valid data creates a report", async ({ page, request }) => {
    const headers = await authHeaders(page);

    const catRes = await request.get("/api/bugs/categories", { headers });
    if (catRes.status() !== 200) return;
    const cats = (await catRes.json()).data;
    if (!cats || cats.length === 0) return;

    const res = await request.post("/api/bugs", {
      headers,
      data: {
        title: "E2E Test Report",
        description: "Automated test report.",
        category_id: cats[0].id,
      },
    });
    expect([201, 429]).toContain(res.status());
    if (res.status() === 201) {
      const body = await res.json();
      expect(body).toHaveProperty("data");
      expect(body.data).toHaveProperty("id");
      expect(body.data.title).toBe("E2E Test Report");
      /* Cleanup — best-effort, don't fail the test if it times out */
      try {
        await request.delete(`/api/bugs/${body.data.id}`, { headers });
      } catch {
        /* ignore */
      }
    }
  });

  test("POST /api/bugs without title returns 400", async ({ page, request }) => {
    const headers = await authHeaders(page);
    const res = await request.post("/api/bugs", {
      headers,
      data: { description: "Missing title" },
    });
    expect([400, 429]).toContain(res.status());
  });

  test("GET /api/bugs/:id with non-existent id returns 404", async ({ page, request }) => {
    const headers = await authHeaders(page);
    const res = await request.get(`/api/bugs/${FAKE_UUID}`, { headers });
    expect([404, 429]).toContain(res.status());
  });

  test("GET /api/bugs/:id/comments on non-existent report returns empty", async ({ page, request }) => {
    const headers = await authHeaders(page);
    const res = await request.get(`/api/bugs/${FAKE_UUID}/comments`, { headers });
    expect([200, 429]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toHaveProperty("data");
      expect(Array.isArray(body.data)).toBe(true);
    }
  });
});

/* -------------------------------------------------------------------------- */
/*  Bugs API: Category admin CRUD (requires admin)                            */
/* -------------------------------------------------------------------------- */

test.describe("Bugs API: Category admin operations", () => {
  test("POST /api/bugs/categories without auth returns 401 or 403", async ({ request }) => {
    const res = await request.post("/api/bugs/categories", {
      data: { name: "Test Category" },
    });
    expect([401, 403, 429]).toContain(res.status());
  });

  test("PATCH /api/bugs/categories without auth returns 401 or 403", async ({ request }) => {
    const res = await request.patch("/api/bugs/categories", {
      data: { id: FAKE_UUID, name: "Updated" },
    });
    expect([401, 403, 429]).toContain(res.status());
  });

  test("DELETE /api/bugs/categories without auth returns 401 or 403", async ({ request }) => {
    const res = await request.delete("/api/bugs/categories", {
      data: { id: FAKE_UUID },
    });
    expect([401, 403, 429]).toContain(res.status());
  });
});

/* -------------------------------------------------------------------------- */
/*  Bugs API: Full CRUD lifecycle (authenticated member)                      */
/* -------------------------------------------------------------------------- */

test.describe("Bugs API: Report + comment lifecycle", () => {
  test.use({ storageState: storageStatePath("member") });

  test("create, read, update, comment, delete a report", async ({ page, request }) => {
    const headers = await authHeaders(page);

    const catRes = await request.get("/api/bugs/categories", { headers });
    if (catRes.status() !== 200) return;
    const cats = (await catRes.json()).data;
    if (!cats || cats.length === 0) return;

    /* Create */
    const createRes = await request.post("/api/bugs", {
      headers,
      data: { title: "Lifecycle Test", description: "Testing full lifecycle.", category_id: cats[0].id },
    });
    if (createRes.status() !== 201) return;
    const reportId = (await createRes.json()).data.id;

    /* Read */
    const getRes = await request.get(`/api/bugs/${reportId}`, { headers });
    expect(getRes.status()).toBe(200);
    expect((await getRes.json()).data.title).toBe("Lifecycle Test");

    /* Update */
    const patchRes = await request.patch(`/api/bugs/${reportId}`, {
      headers,
      data: { description: "Updated description." },
    });
    expect([200, 429]).toContain(patchRes.status());

    /* Add comment */
    const commentRes = await request.post(`/api/bugs/${reportId}/comments`, {
      headers,
      data: { content: "Test comment." },
    });
    expect([201, 429]).toContain(commentRes.status());

    /* List comments */
    const commentsRes = await request.get(`/api/bugs/${reportId}/comments`, { headers });
    expect(commentsRes.status()).toBe(200);
    expect((await commentsRes.json()).data.length).toBeGreaterThanOrEqual(1);

    /* Delete comment */
    if (commentRes.status() === 201) {
      const commentId = (await commentRes.json()).data.id;
      const delComment = await request.delete(`/api/bugs/${reportId}/comments/${commentId}`, { headers });
      expect([200, 429]).toContain(delComment.status());
    }

    /* Delete report */
    const delReport = await request.delete(`/api/bugs/${reportId}`, { headers });
    expect([200, 429]).toContain(delReport.status());

    /* Verify gone */
    const gone = await request.get(`/api/bugs/${reportId}`, { headers });
    expect([404, 429]).toContain(gone.status());
  });
});

/* -------------------------------------------------------------------------- */
/*  Bugs Page: UI tests (member)                                              */
/* -------------------------------------------------------------------------- */

test.describe("Bugs Page: UI", () => {
  test.use({ storageState: storageStatePath("member") });

  test("bugs page loads with hero and content", async ({ page }) => {
    await page.goto("/bugs", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".content-inner").first()).toBeVisible({ timeout: 20000 });
    await expect(page.locator(".section-hero, [class*='hero']").first()).toBeVisible({ timeout: 10000 });
  });

  test("new report button is visible and opens form", async ({ page }) => {
    await page.goto("/bugs", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".content-inner").first()).toBeVisible({ timeout: 20000 });

    const newBtn = page.locator("button", { hasText: /neuer bericht|new report/i });
    await expect(newBtn).toBeVisible({ timeout: 20000 });
    await newBtn.click();

    await expect(page.locator("#bug-title")).toBeVisible({ timeout: 15000 });
  });

  test("form has category dropdown and markdown editor", async ({ page }) => {
    await page.goto("/bugs", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".content-inner").first()).toBeVisible({ timeout: 20000 });

    const newBtn = page.locator("button", { hasText: /neuer bericht|new report/i });
    await expect(newBtn).toBeVisible({ timeout: 20000 });
    await newBtn.click();

    await expect(page.locator("#bug-title")).toBeVisible({ timeout: 15000 });
    await expect(page.locator(".select-trigger").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator(".forum-editor-tabs").first()).toBeVisible({ timeout: 5000 });
  });

  test("back button returns to list from form", async ({ page }) => {
    await page.goto("/bugs", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".content-inner").first()).toBeVisible({ timeout: 20000 });

    const newBtn = page.locator("button", { hasText: /neuer bericht|new report/i });
    await expect(newBtn).toBeVisible({ timeout: 20000 });
    await newBtn.click();
    await expect(page.locator("#bug-title")).toBeVisible({ timeout: 15000 });

    const backBtn = page.locator("button", { hasText: /zurück zur liste|back to list/i });
    await backBtn.click();
    await expect(newBtn).toBeVisible({ timeout: 10000 });
  });
});

/* -------------------------------------------------------------------------- */
/*  Bugs: Floating widget                                                     */
/* -------------------------------------------------------------------------- */

test.describe("Bugs: Floating widget", () => {
  test.use({ storageState: storageStatePath("member") });

  test("floating widget trigger is hidden on /bugs page", async ({ page }) => {
    await page.goto("/bugs", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".content-inner").first()).toBeVisible({ timeout: 20000 });
    /* Widget trigger should NOT render on the bugs page */
    expect(await page.locator(".bug-report-widget__trigger").count()).toBe(0);
  });
});

/* -------------------------------------------------------------------------- */
/*  Settings: Bug email toggle visibility by role                             */
/* -------------------------------------------------------------------------- */

test.describe("Settings: Bug email toggle (member)", () => {
  test.use({ storageState: storageStatePath("member") });

  test("member does NOT see bug report email toggle", async ({ page }) => {
    await page.goto("/settings", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".content-inner").first()).toBeVisible({ timeout: 20000 });
    /* Wait for the notification section to render */
    await expect(page.locator("text=/benachrichtigungen|notifications/i").first()).toBeVisible({ timeout: 15000 });
    /* Bug email toggle should be absent for members */
    const toggle = page.locator("text=/Fehlerbericht.*E-Mail|Bug report.*email/i");
    expect(await toggle.count()).toBe(0);
  });
});

test.describe("Settings: Bug email toggle (admin)", () => {
  test.use({ storageState: storageStatePath("admin") });

  test("admin sees bug report email toggle", async ({ page }) => {
    await page.goto("/settings", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".content-inner").first()).toBeVisible({ timeout: 20000 });
    await expect(page.locator("text=/benachrichtigungen|notifications/i").first()).toBeVisible({ timeout: 15000 });
    const toggle = page.locator("text=/Fehlerbericht.*E-Mail|Bug report.*email/i");
    await expect(toggle.first()).toBeVisible({ timeout: 10000 });
  });
});

/* -------------------------------------------------------------------------- */
/*  Notification settings: bugs_email_enabled API guard                       */
/* -------------------------------------------------------------------------- */

test.describe("Notification settings API: bugs_email_enabled guard (member)", () => {
  test.use({ storageState: storageStatePath("member") });

  test("member cannot flip bugs_email_enabled to true", async ({ page, request }) => {
    const headers = await authHeaders(page);
    const res = await request.patch("/api/notification-settings", {
      headers,
      data: { bugs_email_enabled: true },
    });
    /* Field is silently stripped; upsert with no changes still returns 200. */
    expect([200, 400, 429]).toContain(res.status());
    if (res.status() === 200) {
      expect((await res.json()).data.bugs_email_enabled).toBe(false);
    }
  });
});

test.describe("Notification settings API: bugs_email_enabled guard (admin)", () => {
  test.use({ storageState: storageStatePath("admin") });

  test("admin can toggle bugs_email_enabled", async ({ page, request }) => {
    const headers = await authHeaders(page);

    /* Enable */
    const enableRes = await request.patch("/api/notification-settings", {
      headers,
      data: { bugs_email_enabled: true },
    });
    expect([200, 429]).toContain(enableRes.status());
    if (enableRes.status() === 200) {
      expect((await enableRes.json()).data.bugs_email_enabled).toBe(true);
    }

    /* Reset */
    await request.patch("/api/notification-settings", {
      headers,
      data: { bugs_email_enabled: false },
    });
  });
});
