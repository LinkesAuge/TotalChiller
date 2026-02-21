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
/*  GET /api/design-system/ui-elements                                 */
/* ------------------------------------------------------------------ */

describe("GET /api/design-system/ui-elements", () => {
  let mockAuth: ReturnType<typeof createMockAuth>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth = createMockAuth();
    vi.mocked(requireAuth).mockResolvedValue(mockAuth.authResult);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireAuth).mockResolvedValue(createUnauthorizedResult() as never);
    const req = createTestRequest("/api/design-system/ui-elements");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid query params", async () => {
    const req = createTestRequest("/api/design-system/ui-elements", {
      searchParams: { search: "a".repeat(201) },
    });
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("returns elements on success", async () => {
    const chain = createChainableMock({
      data: [{ id: VALID_UUID, name: "Button", category: "inputs", status: "active" }],
      error: null,
      count: 1,
    });
    mockFrom.mockReturnValue(chain);

    const req = createTestRequest("/api/design-system/ui-elements");
    const { status, body } = await parseResponse(await GET(req));
    expect(status).toBe(200);
    const result = body as { data: unknown[]; count: number };
    expect(result.data).toHaveLength(1);
    expect(result.count).toBe(1);
  });

  it("applies category, status, render_type, and search filters", async () => {
    const chain = createChainableMock({ data: [], error: null, count: 0 });
    mockFrom.mockReturnValue(chain);

    const req = createTestRequest("/api/design-system/ui-elements", {
      searchParams: { category: "inputs", status: "active", render_type: "css" },
    });
    const { status } = await parseResponse(await GET(req));
    expect(status).toBe(200);
    expect(chain.eq).toHaveBeenCalledWith("category", "inputs");
    expect(chain.eq).toHaveBeenCalledWith("status", "active");
    expect(chain.eq).toHaveBeenCalledWith("render_type", "css");
  });

  it("applies search filter using or()", async () => {
    const chain = createChainableMock({ data: [], error: null, count: 0 });
    mockFrom.mockReturnValue(chain);

    const req = createTestRequest("/api/design-system/ui-elements", {
      searchParams: { search: "button" },
    });
    const { status } = await parseResponse(await GET(req));
    expect(status).toBe(200);
    expect(chain.or).toHaveBeenCalled();
  });

  it("returns 500 when DB query fails", async () => {
    const chain = createChainableMock({ data: null, error: { message: "DB error" }, count: undefined });
    mockFrom.mockReturnValue(chain);

    const req = createTestRequest("/api/design-system/ui-elements");
    const res = await GET(req);
    expect(res.status).toBe(500);
  });
});

/* ------------------------------------------------------------------ */
/*  POST /api/design-system/ui-elements                                */
/* ------------------------------------------------------------------ */

describe("POST /api/design-system/ui-elements", () => {
  let mockAuth: ReturnType<typeof createMockAuth>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth = createMockAuth();
    vi.mocked(requireAdmin).mockResolvedValue(mockAuth.authResult);
  });

  it("returns 403 when not admin", async () => {
    vi.mocked(requireAdmin).mockResolvedValue(createForbiddenResult() as never);
    const req = createTestRequest("/api/design-system/ui-elements", {
      method: "POST",
      body: { name: "Button", category: "inputs" },
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid input", async () => {
    const req = createTestRequest("/api/design-system/ui-elements", {
      method: "POST",
      body: { name: "" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("creates element and returns 201", async () => {
    const chain = createChainableMock();
    setChainResult(chain, {
      data: { id: VALID_UUID, name: "Button", category: "inputs", status: "active" },
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    const req = createTestRequest("/api/design-system/ui-elements", {
      method: "POST",
      body: { name: "Button", category: "inputs" },
    });
    const { status, body } = await parseResponse(await POST(req));
    expect(status).toBe(201);
    expect((body as { data: { name: string } }).data.name).toBe("Button");
  });

  it("returns 500 when insert fails", async () => {
    const chain = createChainableMock();
    setChainResult(chain, { data: null, error: { message: "Insert error" } });
    mockFrom.mockReturnValue(chain);

    const req = createTestRequest("/api/design-system/ui-elements", {
      method: "POST",
      body: { name: "Button", category: "inputs" },
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});

/* ------------------------------------------------------------------ */
/*  PATCH /api/design-system/ui-elements                               */
/* ------------------------------------------------------------------ */

describe("PATCH /api/design-system/ui-elements", () => {
  let mockAuth: ReturnType<typeof createMockAuth>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth = createMockAuth();
    vi.mocked(requireAdmin).mockResolvedValue(mockAuth.authResult);
  });

  it("returns 403 when not admin", async () => {
    vi.mocked(requireAdmin).mockResolvedValue(createForbiddenResult() as never);
    const req = createTestRequest("/api/design-system/ui-elements", {
      method: "PATCH",
      body: { id: VALID_UUID, name: "Updated" },
    });
    const res = await PATCH(req);
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid input", async () => {
    const req = createTestRequest("/api/design-system/ui-elements", {
      method: "PATCH",
      body: { name: "Updated" },
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
  });

  it("updates element on success", async () => {
    const chain = createChainableMock();
    setChainResult(chain, {
      data: { id: VALID_UUID, name: "Updated Button", category: "inputs" },
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    const req = createTestRequest("/api/design-system/ui-elements", {
      method: "PATCH",
      body: { id: VALID_UUID, name: "Updated Button" },
    });
    const { status, body } = await parseResponse(await PATCH(req));
    expect(status).toBe(200);
    expect((body as { data: { name: string } }).data.name).toBe("Updated Button");
  });

  it("returns 500 when update fails", async () => {
    const chain = createChainableMock();
    setChainResult(chain, { data: null, error: { message: "Update error" } });
    mockFrom.mockReturnValue(chain);

    const req = createTestRequest("/api/design-system/ui-elements", {
      method: "PATCH",
      body: { id: VALID_UUID, name: "Updated" },
    });
    const res = await PATCH(req);
    expect(res.status).toBe(500);
  });
});

/* ------------------------------------------------------------------ */
/*  DELETE /api/design-system/ui-elements                              */
/* ------------------------------------------------------------------ */

describe("DELETE /api/design-system/ui-elements", () => {
  let mockAuth: ReturnType<typeof createMockAuth>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth = createMockAuth();
    vi.mocked(requireAdmin).mockResolvedValue(mockAuth.authResult);
  });

  it("returns 403 when not admin", async () => {
    vi.mocked(requireAdmin).mockResolvedValue(createForbiddenResult() as never);
    const req = createTestRequest("/api/design-system/ui-elements", {
      method: "DELETE",
      body: { id: VALID_UUID },
    });
    const res = await DELETE(req);
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid input", async () => {
    const req = createTestRequest("/api/design-system/ui-elements", {
      method: "DELETE",
      body: { id: "not-a-uuid" },
    });
    const res = await DELETE(req);
    expect(res.status).toBe(400);
  });

  it("deletes element on success", async () => {
    const chain = createChainableMock({ data: null, error: null });
    mockFrom.mockReturnValue(chain);

    const req = createTestRequest("/api/design-system/ui-elements", {
      method: "DELETE",
      body: { id: VALID_UUID },
    });
    const { status, body } = await parseResponse(await DELETE(req));
    expect(status).toBe(200);
    expect((body as { data: { success: boolean } }).data.success).toBe(true);
  });

  it("returns 500 when delete fails", async () => {
    const chain = createChainableMock({ data: null, error: { message: "Delete error" } });
    mockFrom.mockReturnValue(chain);

    const req = createTestRequest("/api/design-system/ui-elements", {
      method: "DELETE",
      body: { id: VALID_UUID },
    });
    const res = await DELETE(req);
    expect(res.status).toBe(500);
  });
});
