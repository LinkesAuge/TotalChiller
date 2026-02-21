import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createMockAuth,
  createUnauthorizedResult,
  createForbiddenResult,
  createChainableMock,
  setChainResult,
  createTestRequest,
  parseResponse,
} from "@/test";

vi.mock("@/lib/api/require-auth");
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

import { requireAuth } from "@/lib/api/require-auth";
import { requireAdmin } from "@/lib/api/require-admin";
import { GET, POST, PATCH, DELETE } from "./route";

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

/* ------------------------------------------------------------------ */
/*  GET /api/bugs/categories                                           */
/* ------------------------------------------------------------------ */

describe("GET /api/bugs/categories", () => {
  let mockAuth: ReturnType<typeof createMockAuth>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth = createMockAuth();
    vi.mocked(requireAuth).mockResolvedValue(mockAuth.authResult);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireAuth).mockResolvedValue(createUnauthorizedResult() as never);
    const req = createTestRequest("/api/bugs/categories");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns categories on success", async () => {
    const chain = createChainableMock({
      data: [{ id: VALID_UUID, name: "UI", slug: "ui", sort_order: 0, created_at: "2025-01-01" }],
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    const req = createTestRequest("/api/bugs/categories");
    const { status, body } = await parseResponse(await GET(req));
    expect(status).toBe(200);
    expect((body as { data: unknown[] }).data).toHaveLength(1);
  });

  it("returns 500 when DB query fails", async () => {
    const chain = createChainableMock({ data: null, error: { message: "DB error" } });
    mockFrom.mockReturnValue(chain);

    const req = createTestRequest("/api/bugs/categories");
    const res = await GET(req);
    expect(res.status).toBe(500);
  });
});

/* ------------------------------------------------------------------ */
/*  POST /api/bugs/categories                                          */
/* ------------------------------------------------------------------ */

describe("POST /api/bugs/categories", () => {
  let mockAuth: ReturnType<typeof createMockAuth>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth = createMockAuth();
    vi.mocked(requireAdmin).mockResolvedValue(mockAuth.authResult);
  });

  it("returns 403 when not admin", async () => {
    vi.mocked(requireAdmin).mockResolvedValue(createForbiddenResult() as never);
    const req = createTestRequest("/api/bugs/categories", {
      method: "POST",
      body: { name: "Category" },
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid body", async () => {
    const req = createTestRequest("/api/bugs/categories", {
      method: "POST",
      body: { name: "" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("creates category and returns 201", async () => {
    const chain = createChainableMock();
    setChainResult(chain, {
      data: { id: VALID_UUID, name: "New Cat", slug: "new-cat", sort_order: 0, created_at: "2025-01-01" },
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    const req = createTestRequest("/api/bugs/categories", {
      method: "POST",
      body: { name: "New Cat" },
    });
    const { status, body } = await parseResponse(await POST(req));
    expect(status).toBe(201);
    expect((body as { data: { name: string } }).data.name).toBe("New Cat");
  });

  it("returns 500 when insert fails", async () => {
    const chain = createChainableMock();
    setChainResult(chain, { data: null, error: { message: "Insert error" } });
    mockFrom.mockReturnValue(chain);

    const req = createTestRequest("/api/bugs/categories", {
      method: "POST",
      body: { name: "New Cat" },
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});

/* ------------------------------------------------------------------ */
/*  PATCH /api/bugs/categories                                         */
/* ------------------------------------------------------------------ */

describe("PATCH /api/bugs/categories", () => {
  let mockAuth: ReturnType<typeof createMockAuth>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth = createMockAuth();
    vi.mocked(requireAdmin).mockResolvedValue(mockAuth.authResult);
  });

  it("returns 403 when not admin", async () => {
    vi.mocked(requireAdmin).mockResolvedValue(createForbiddenResult() as never);
    const req = createTestRequest("/api/bugs/categories", {
      method: "PATCH",
      body: { id: VALID_UUID, name: "Updated" },
    });
    const res = await PATCH(req);
    expect(res.status).toBe(403);
  });

  it("returns 400 for missing ID", async () => {
    const req = createTestRequest("/api/bugs/categories", {
      method: "PATCH",
      body: { name: "Updated" },
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when no fields to update", async () => {
    const req = createTestRequest("/api/bugs/categories", {
      method: "PATCH",
      body: { id: VALID_UUID },
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
  });

  it("updates category on success", async () => {
    const chain = createChainableMock();
    setChainResult(chain, {
      data: { id: VALID_UUID, name: "Updated", slug: "updated", sort_order: 1, created_at: "2025-01-01" },
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    const req = createTestRequest("/api/bugs/categories", {
      method: "PATCH",
      body: { id: VALID_UUID, name: "Updated", sort_order: 1 },
    });
    const { status, body } = await parseResponse(await PATCH(req));
    expect(status).toBe(200);
    expect((body as { data: { name: string } }).data.name).toBe("Updated");
  });

  it("returns 500 when update fails", async () => {
    const chain = createChainableMock();
    setChainResult(chain, { data: null, error: { message: "Update error" } });
    mockFrom.mockReturnValue(chain);

    const req = createTestRequest("/api/bugs/categories", {
      method: "PATCH",
      body: { id: VALID_UUID, name: "Updated" },
    });
    const res = await PATCH(req);
    expect(res.status).toBe(500);
  });
});

/* ------------------------------------------------------------------ */
/*  DELETE /api/bugs/categories                                        */
/* ------------------------------------------------------------------ */

describe("DELETE /api/bugs/categories", () => {
  let mockAuth: ReturnType<typeof createMockAuth>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth = createMockAuth();
    vi.mocked(requireAdmin).mockResolvedValue(mockAuth.authResult);
  });

  it("returns 403 when not admin", async () => {
    vi.mocked(requireAdmin).mockResolvedValue(createForbiddenResult() as never);
    const req = createTestRequest("/api/bugs/categories", {
      method: "DELETE",
      body: { id: VALID_UUID },
    });
    const res = await DELETE(req);
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid ID", async () => {
    const req = createTestRequest("/api/bugs/categories", {
      method: "DELETE",
      body: { id: "not-a-uuid" },
    });
    const res = await DELETE(req);
    expect(res.status).toBe(400);
  });

  it("deletes category on success", async () => {
    const chain = createChainableMock({ data: null, error: null });
    mockFrom.mockReturnValue(chain);

    const req = createTestRequest("/api/bugs/categories", {
      method: "DELETE",
      body: { id: VALID_UUID },
    });
    const { status, body } = await parseResponse(await DELETE(req));
    expect(status).toBe(200);
    expect((body as { success: boolean }).success).toBe(true);
  });

  it("returns 500 when delete fails", async () => {
    const chain = createChainableMock({ data: null, error: { message: "Delete error" } });
    mockFrom.mockReturnValue(chain);

    const req = createTestRequest("/api/bugs/categories", {
      method: "DELETE",
      body: { id: VALID_UUID },
    });
    const res = await DELETE(req);
    expect(res.status).toBe(500);
  });
});
