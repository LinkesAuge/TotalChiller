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

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";
const VALID_UUID_2 = "660e8400-e29b-41d4-a716-446655440000";

function makeGetRequest(page?: string): NextRequest {
  const url = new URL("/api/site-list-items", "http://localhost:3000");
  if (page) url.searchParams.set("page", page);
  return new NextRequest(url);
}

function makePatchRequest(body: unknown): NextRequest {
  return new NextRequest(new URL("/api/site-list-items", "http://localhost:3000"), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/site-list-items", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for missing page param", async () => {
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(400);
  });

  it("returns list items for a valid page", async () => {
    const items = [
      { id: VALID_UUID, page: "home", section_key: "features", sort_order: 0, text_de: "A", text_en: "A" },
    ];
    const chain = createChainableMock();
    setChainResult(chain, { data: items, error: null });
    mockServiceFrom.mockReturnValue(chain);

    const res = await GET(makeGetRequest("home"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(items);
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

describe("PATCH /api/site-list-items", () => {
  let mockAuth: ReturnType<typeof createMockAuth>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth = createMockAuth();
    vi.mocked(requireAdmin).mockResolvedValue(mockAuth.authResult);
  });

  it("returns 403 when not admin", async () => {
    vi.mocked(requireAdmin).mockResolvedValue(createForbiddenResult() as never);
    const res = await PATCH(makePatchRequest({ action: "delete", id: VALID_UUID }));
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid body", async () => {
    const res = await PATCH(makePatchRequest(null));
    expect(res.status).toBe(400);
  });

  it("returns 400 for unknown action", async () => {
    const res = await PATCH(makePatchRequest({ action: "unknown" }));
    expect(res.status).toBe(400);
  });

  /* ── Create action ── */

  it("creates an item successfully", async () => {
    const lastItemChain = createChainableMock();
    setChainResult(lastItemChain, { data: { sort_order: 2 }, error: null });

    const insertedItem = { id: VALID_UUID, page: "home", section_key: "features", sort_order: 3 };
    const insertChain = createChainableMock();
    setChainResult(insertChain, { data: insertedItem, error: null });

    let callCount = 0;
    mockServiceFrom.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? lastItemChain : insertChain;
    });

    const res = await PATCH(
      makePatchRequest({ action: "create", page: "home", section_key: "features", text_de: "Neu", text_en: "New" }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.success).toBe(true);
    expect(body.data.item).toBeTruthy();
  });

  it("returns 500 when create insert fails", async () => {
    const lastItemChain = createChainableMock();
    setChainResult(lastItemChain, { data: null, error: null });

    const insertChain = createChainableMock();
    setChainResult(insertChain, { data: null, error: { message: "DB error" } });

    let callCount = 0;
    mockServiceFrom.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? lastItemChain : insertChain;
    });

    const res = await PATCH(makePatchRequest({ action: "create", page: "home", section_key: "features" }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain("Failed to create");
  });

  /* ── Update action ── */

  it("updates an item successfully", async () => {
    const updatedItem = { id: VALID_UUID, text_de: "Updated" };
    const chain = createChainableMock();
    setChainResult(chain, { data: updatedItem, error: null });
    mockServiceFrom.mockReturnValue(chain);

    const res = await PATCH(makePatchRequest({ action: "update", id: VALID_UUID, text_de: "Updated" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.success).toBe(true);
  });

  it("returns 500 when update fails", async () => {
    const chain = createChainableMock();
    setChainResult(chain, { data: null, error: { message: "DB error" } });
    mockServiceFrom.mockReturnValue(chain);

    const res = await PATCH(makePatchRequest({ action: "update", id: VALID_UUID, text_de: "Updated" }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain("Failed to update");
  });

  /* ── Delete action ── */

  it("deletes an item successfully", async () => {
    const chain = createChainableMock();
    setChainResult(chain, { data: null, error: null });
    mockServiceFrom.mockReturnValue(chain);

    const res = await PATCH(makePatchRequest({ action: "delete", id: VALID_UUID }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.deleted).toBe(true);
  });

  it("returns 500 when delete fails", async () => {
    const chain = createChainableMock();
    setChainResult(chain, { data: null, error: { message: "DB error" } });
    mockServiceFrom.mockReturnValue(chain);

    const res = await PATCH(makePatchRequest({ action: "delete", id: VALID_UUID }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain("Failed to delete");
  });

  /* ── Reorder action ── */

  it("reorders items successfully", async () => {
    const chain = createChainableMock();
    setChainResult(chain, { data: null, error: null });
    mockServiceFrom.mockReturnValue(chain);

    const res = await PATCH(
      makePatchRequest({
        action: "reorder",
        items: [
          { id: VALID_UUID, sort_order: 1 },
          { id: VALID_UUID_2, sort_order: 0 },
        ],
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.success).toBe(true);
  });

  it("returns 500 when reorder partially fails", async () => {
    const successChain = createChainableMock();
    setChainResult(successChain, { data: null, error: null });

    const failChain = createChainableMock();
    setChainResult(failChain, { data: null, error: { message: "DB error" } });

    let callCount = 0;
    mockServiceFrom.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? successChain : failChain;
    });

    const res = await PATCH(
      makePatchRequest({
        action: "reorder",
        items: [
          { id: VALID_UUID, sort_order: 1 },
          { id: VALID_UUID_2, sort_order: 0 },
        ],
      }),
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain("partially failed");
  });

  it("returns 500 on unexpected exception", async () => {
    mockServiceFrom.mockImplementation(() => {
      throw new Error("boom");
    });

    const res = await PATCH(makePatchRequest({ action: "delete", id: VALID_UUID }));
    expect(res.status).toBe(500);
  });
});
