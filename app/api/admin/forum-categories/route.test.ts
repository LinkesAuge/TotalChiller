import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createMockAuth, createForbiddenResult } from "@/test";

vi.mock("@/lib/api/require-admin");
vi.mock("@/lib/api/logger", () => ({ captureApiError: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({
  strictLimiter: { check: vi.fn().mockReturnValue(null) },
  standardLimiter: { check: vi.fn().mockReturnValue(null) },
  relaxedLimiter: { check: vi.fn().mockReturnValue(null) },
}));

const mockFrom = vi.fn();
vi.mock("@/lib/supabase/service-role-client", () => ({
  default: vi.fn(() => ({ from: mockFrom })),
}));

import { requireAdmin } from "@/lib/api/require-admin";
import { GET, POST, PATCH, DELETE } from "./route";

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

function makeChain(result: { data: unknown; error: unknown } = { data: null, error: null }) {
  const c: Record<string, ReturnType<typeof vi.fn>> = {};
  const methods = ["select", "insert", "update", "upsert", "delete", "eq", "neq", "in", "order", "limit"];
  for (const m of methods) {
    c[m] = vi.fn().mockReturnValue(c);
  }
  c.single = vi.fn().mockResolvedValue(result);
  c.maybeSingle = vi.fn().mockResolvedValue(result);
  Object.defineProperty(c, "then", {
    value: (res?: ((v: unknown) => unknown) | null, rej?: ((v: unknown) => unknown) | null) =>
      Promise.resolve(result).then(res, rej),
    writable: true,
    enumerable: false,
    configurable: true,
  });
  return c;
}

function makeGETRequest(params?: Record<string, string>): NextRequest {
  const url = new URL("http://localhost/api/admin/forum-categories");
  if (params) for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url);
}

function makeJSONRequest(method: string, body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/forum-categories", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeDELETERequest(params?: Record<string, string>): NextRequest {
  const url = new URL("http://localhost/api/admin/forum-categories");
  if (params) for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url, { method: "DELETE" });
}

/* ─── GET ─── */

describe("GET /api/admin/forum-categories", () => {
  let mockAuth: ReturnType<typeof createMockAuth>;

  beforeEach(() => {
    mockAuth = createMockAuth();
    vi.mocked(requireAdmin).mockResolvedValue(mockAuth.authResult);
    mockFrom.mockReset();
  });

  it("returns 403 when user is not admin", async () => {
    vi.mocked(requireAdmin).mockResolvedValue(createForbiddenResult() as never);
    const res = await GET(makeGETRequest({ clan_id: VALID_UUID }));
    expect(res.status).toBe(403);
  });

  it("returns 400 when clan_id is missing", async () => {
    const res = await GET(makeGETRequest());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("A valid clan_id is required.");
  });

  it("returns 400 when clan_id is not a uuid", async () => {
    const res = await GET(makeGETRequest({ clan_id: "not-a-uuid" }));
    expect(res.status).toBe(400);
  });

  it("returns categories on success", async () => {
    const chain = makeChain({
      data: [{ id: "cat-1", name: "General", slug: "general" }],
      error: null,
    });
    mockFrom.mockReturnValue(chain);
    const res = await GET(makeGETRequest({ clan_id: VALID_UUID }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].name).toBe("General");
  });

  it("returns 500 when query fails", async () => {
    const chain = makeChain({ data: null, error: { message: "DB error" } });
    mockFrom.mockReturnValue(chain);
    const res = await GET(makeGETRequest({ clan_id: VALID_UUID }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to load categories.");
  });
});

/* ─── POST ─── */

describe("POST /api/admin/forum-categories", () => {
  let mockAuth: ReturnType<typeof createMockAuth>;

  beforeEach(() => {
    mockAuth = createMockAuth();
    vi.mocked(requireAdmin).mockResolvedValue(mockAuth.authResult);
    mockFrom.mockReset();
  });

  it("returns 403 when user is not admin", async () => {
    vi.mocked(requireAdmin).mockResolvedValue(createForbiddenResult() as never);
    const res = await POST(makeJSONRequest("POST", { clan_id: VALID_UUID, name: "General" }));
    expect(res.status).toBe(403);
  });

  it("returns 400 for missing name", async () => {
    const res = await POST(makeJSONRequest("POST", { clan_id: VALID_UUID }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid input.");
  });

  it("returns 400 for invalid slug", async () => {
    const res = await POST(makeJSONRequest("POST", { clan_id: VALID_UUID, name: "Test", slug: "BAD SLUG!" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Slug must contain");
  });

  it("creates category and returns 201", async () => {
    const chain = makeChain({
      data: { id: "new-cat", clan_id: VALID_UUID, name: "News", slug: "news" },
      error: null,
    });
    mockFrom.mockReturnValue(chain);
    const res = await POST(makeJSONRequest("POST", { clan_id: VALID_UUID, name: "News" }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.name).toBe("News");
  });

  it("returns 500 when insert fails", async () => {
    const chain = makeChain({ data: null, error: { message: "insert error" } });
    mockFrom.mockReturnValue(chain);
    const res = await POST(makeJSONRequest("POST", { clan_id: VALID_UUID, name: "News" }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to create category.");
  });
});

/* ─── PATCH ─── */

describe("PATCH /api/admin/forum-categories", () => {
  let mockAuth: ReturnType<typeof createMockAuth>;

  beforeEach(() => {
    mockAuth = createMockAuth();
    vi.mocked(requireAdmin).mockResolvedValue(mockAuth.authResult);
    mockFrom.mockReset();
  });

  it("returns 403 when user is not admin", async () => {
    vi.mocked(requireAdmin).mockResolvedValue(createForbiddenResult() as never);
    const res = await PATCH(makeJSONRequest("PATCH", { id: VALID_UUID, name: "Updated" }));
    expect(res.status).toBe(403);
  });

  it("returns 400 for missing id", async () => {
    const res = await PATCH(makeJSONRequest("PATCH", { name: "Updated" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when nothing to update", async () => {
    const res = await PATCH(makeJSONRequest("PATCH", { id: VALID_UUID }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Nothing to update.");
  });

  it("returns 400 for invalid slug", async () => {
    const res = await PATCH(makeJSONRequest("PATCH", { id: VALID_UUID, slug: "BAD SLUG!" }));
    expect(res.status).toBe(400);
  });

  it("updates category successfully", async () => {
    const chain = makeChain({
      data: { id: VALID_UUID, name: "Updated", slug: "updated" },
      error: null,
    });
    mockFrom.mockReturnValue(chain);
    const res = await PATCH(makeJSONRequest("PATCH", { id: VALID_UUID, name: "Updated" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.name).toBe("Updated");
  });

  it("returns 500 when update fails", async () => {
    const chain = makeChain({ data: null, error: { message: "update error" } });
    mockFrom.mockReturnValue(chain);
    const res = await PATCH(makeJSONRequest("PATCH", { id: VALID_UUID, name: "Updated" }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to update category.");
  });
});

/* ─── DELETE ─── */

describe("DELETE /api/admin/forum-categories", () => {
  let mockAuth: ReturnType<typeof createMockAuth>;

  beforeEach(() => {
    mockAuth = createMockAuth();
    vi.mocked(requireAdmin).mockResolvedValue(mockAuth.authResult);
    mockFrom.mockReset();
  });

  it("returns 403 when user is not admin", async () => {
    vi.mocked(requireAdmin).mockResolvedValue(createForbiddenResult() as never);
    const res = await DELETE(makeDELETERequest({ id: VALID_UUID }));
    expect(res.status).toBe(403);
  });

  it("returns 400 when id is missing", async () => {
    const res = await DELETE(makeDELETERequest());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("A valid id is required.");
  });

  it("returns 400 when id is not a uuid", async () => {
    const res = await DELETE(makeDELETERequest({ id: "not-a-uuid" }));
    expect(res.status).toBe(400);
  });

  it("deletes category successfully", async () => {
    const chain = makeChain({ data: null, error: null });
    mockFrom.mockReturnValue(chain);
    const res = await DELETE(makeDELETERequest({ id: VALID_UUID }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.success).toBe(true);
  });

  it("returns 500 when delete fails", async () => {
    const chain = makeChain({ data: null, error: { message: "delete error" } });
    mockFrom.mockReturnValue(chain);
    const res = await DELETE(makeDELETERequest({ id: VALID_UUID }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to delete category.");
  });
});
