import { describe, it, expect, vi, beforeEach } from "vitest";
import { createForbiddenResult, createMockAuth, createChainableMock, setChainResult } from "@/test";

vi.mock("@/lib/api/require-admin");
vi.mock("@/lib/api/logger", () => ({ captureApiError: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({
  strictLimiter: { check: vi.fn().mockReturnValue(null) },
  standardLimiter: { check: vi.fn().mockReturnValue(null) },
  relaxedLimiter: { check: vi.fn().mockReturnValue(null) },
}));

const mockServiceFrom = vi.fn();
vi.mock("@/lib/supabase/service-role-client", () => ({
  default: vi.fn(() => ({ from: mockServiceFrom })),
}));

import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/api/require-admin";
import { GET, PATCH } from "./route";

function makeGetRequest(page?: string): NextRequest {
  const url = new URL("/api/site-content", "http://localhost:3000");
  if (page) url.searchParams.set("page", page);
  return new NextRequest(url);
}

function makePatchRequest(body: unknown): NextRequest {
  return new NextRequest(new URL("/api/site-content", "http://localhost:3000"), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/site-content", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for missing page param", async () => {
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(400);
  });

  it("returns content rows for a valid page", async () => {
    const rows = [{ page: "home", section_key: "hero", field_key: "title", content_de: "Hallo", content_en: "Hello" }];
    const chain = createChainableMock();
    setChainResult(chain, { data: rows, error: null });
    mockServiceFrom.mockReturnValue(chain);

    const res = await GET(makeGetRequest("home"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(rows);
    expect(res.headers.get("Cache-Control")).toContain("s-maxage");
  });

  it("returns empty array when query errors", async () => {
    const chain = createChainableMock();
    setChainResult(chain, { data: null, error: { message: "table not found" } });
    mockServiceFrom.mockReturnValue(chain);

    const res = await GET(makeGetRequest("home"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });

  it("returns empty array on unexpected exception", async () => {
    mockServiceFrom.mockImplementation(() => {
      throw new Error("boom");
    });

    const res = await GET(makeGetRequest("home"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });
});

describe("PATCH /api/site-content", () => {
  let mockAuth: ReturnType<typeof createMockAuth>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth = createMockAuth();
    vi.mocked(requireAdmin).mockResolvedValue(mockAuth.authResult);
  });

  it("returns 403 when not admin", async () => {
    vi.mocked(requireAdmin).mockResolvedValue(createForbiddenResult() as never);
    const res = await PATCH(makePatchRequest({ page: "home", section_key: "hero", field_key: "title" }));
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid body", async () => {
    const res = await PATCH(makePatchRequest(null));
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing required fields", async () => {
    const res = await PATCH(makePatchRequest({ page: "home" }));
    expect(res.status).toBe(400);
  });

  it("upserts content successfully", async () => {
    const chain = createChainableMock();
    setChainResult(chain, { data: null, error: null });
    mockServiceFrom.mockReturnValue(chain);

    const res = await PATCH(
      makePatchRequest({
        page: "home",
        section_key: "hero",
        field_key: "title",
        content_de: "Hallo",
        content_en: "Hello",
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.success).toBe(true);
  });

  it("deletes content when _delete is true", async () => {
    const chain = createChainableMock();
    setChainResult(chain, { data: null, error: null });
    mockServiceFrom.mockReturnValue(chain);

    const res = await PATCH(makePatchRequest({ page: "home", section_key: "hero", field_key: "title", _delete: true }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.deleted).toBe(true);
  });

  it("returns 500 when delete fails", async () => {
    const chain = createChainableMock();
    setChainResult(chain, { data: null, error: { message: "DB error" } });
    mockServiceFrom.mockReturnValue(chain);

    const res = await PATCH(makePatchRequest({ page: "home", section_key: "hero", field_key: "title", _delete: true }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain("Failed to delete");
  });

  it("returns 500 when upsert fails", async () => {
    const chain = createChainableMock();
    setChainResult(chain, { data: null, error: { message: "DB error" } });
    mockServiceFrom.mockReturnValue(chain);

    const res = await PATCH(
      makePatchRequest({ page: "home", section_key: "hero", field_key: "title", content_de: "Hallo" }),
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain("Failed to save");
  });

  it("returns 500 on unexpected exception", async () => {
    mockServiceFrom.mockImplementation(() => {
      throw new Error("boom");
    });

    const res = await PATCH(
      makePatchRequest({ page: "home", section_key: "hero", field_key: "title", content_de: "x" }),
    );
    expect(res.status).toBe(500);
  });
});
