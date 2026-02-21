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
import { GET, POST, DELETE } from "./route";

const ELEMENT_UUID = "550e8400-e29b-41d4-a716-446655440000";
const ASSET_UUID = "660e8400-e29b-41d4-a716-446655440001";
const ASSIGNMENT_UUID = "770e8400-e29b-41d4-a716-446655440002";

/* ------------------------------------------------------------------ */
/*  GET /api/design-system/assignments                                 */
/* ------------------------------------------------------------------ */

describe("GET /api/design-system/assignments", () => {
  let mockAuth: ReturnType<typeof createMockAuth>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth = createMockAuth();
    vi.mocked(requireAuth).mockResolvedValue(mockAuth.authResult);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireAuth).mockResolvedValue(createUnauthorizedResult() as never);
    const req = createTestRequest("/api/design-system/assignments");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns assignments on success", async () => {
    const chain = createChainableMock({
      data: [{ id: ASSIGNMENT_UUID, ui_element_id: ELEMENT_UUID, asset_id: ASSET_UUID }],
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    const req = createTestRequest("/api/design-system/assignments");
    const { status, body } = await parseResponse(await GET(req));
    expect(status).toBe(200);
    expect((body as { data: unknown[] }).data).toHaveLength(1);
  });

  it("filters by ui_element_id", async () => {
    const chain = createChainableMock({ data: [], error: null });
    mockFrom.mockReturnValue(chain);

    const req = createTestRequest("/api/design-system/assignments", {
      searchParams: { ui_element_id: ELEMENT_UUID },
    });
    const { status } = await parseResponse(await GET(req));
    expect(status).toBe(200);
    expect(chain.eq).toHaveBeenCalledWith("ui_element_id", ELEMENT_UUID);
  });

  it("filters by asset_id", async () => {
    const chain = createChainableMock({ data: [], error: null });
    mockFrom.mockReturnValue(chain);

    const req = createTestRequest("/api/design-system/assignments", {
      searchParams: { asset_id: ASSET_UUID },
    });
    const { status } = await parseResponse(await GET(req));
    expect(status).toBe(200);
    expect(chain.eq).toHaveBeenCalledWith("asset_id", ASSET_UUID);
  });

  it("returns 500 when DB query fails", async () => {
    const chain = createChainableMock({ data: null, error: { message: "DB error" } });
    mockFrom.mockReturnValue(chain);

    const req = createTestRequest("/api/design-system/assignments");
    const res = await GET(req);
    expect(res.status).toBe(500);
  });
});

/* ------------------------------------------------------------------ */
/*  POST /api/design-system/assignments                                */
/* ------------------------------------------------------------------ */

describe("POST /api/design-system/assignments", () => {
  let mockAuth: ReturnType<typeof createMockAuth>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth = createMockAuth();
    vi.mocked(requireAdmin).mockResolvedValue(mockAuth.authResult);
  });

  it("returns 403 when not admin", async () => {
    vi.mocked(requireAdmin).mockResolvedValue(createForbiddenResult() as never);
    const req = createTestRequest("/api/design-system/assignments", {
      method: "POST",
      body: { ui_element_id: ELEMENT_UUID, asset_id: ASSET_UUID },
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid input", async () => {
    const req = createTestRequest("/api/design-system/assignments", {
      method: "POST",
      body: { ui_element_id: "bad" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("creates assignment and returns 201", async () => {
    const chain = createChainableMock();
    setChainResult(chain, {
      data: { id: ASSIGNMENT_UUID, ui_element_id: ELEMENT_UUID, asset_id: ASSET_UUID, role: "default" },
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    const req = createTestRequest("/api/design-system/assignments", {
      method: "POST",
      body: { ui_element_id: ELEMENT_UUID, asset_id: ASSET_UUID },
    });
    const { status, body } = await parseResponse(await POST(req));
    expect(status).toBe(201);
    expect((body as { data: { id: string } }).data.id).toBe(ASSIGNMENT_UUID);
  });

  it("returns 500 when upsert fails", async () => {
    const chain = createChainableMock();
    setChainResult(chain, { data: null, error: { message: "Upsert error" } });
    mockFrom.mockReturnValue(chain);

    const req = createTestRequest("/api/design-system/assignments", {
      method: "POST",
      body: { ui_element_id: ELEMENT_UUID, asset_id: ASSET_UUID },
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});

/* ------------------------------------------------------------------ */
/*  DELETE /api/design-system/assignments                              */
/* ------------------------------------------------------------------ */

describe("DELETE /api/design-system/assignments", () => {
  let mockAuth: ReturnType<typeof createMockAuth>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth = createMockAuth();
    vi.mocked(requireAdmin).mockResolvedValue(mockAuth.authResult);
  });

  it("returns 403 when not admin", async () => {
    vi.mocked(requireAdmin).mockResolvedValue(createForbiddenResult() as never);
    const req = createTestRequest("/api/design-system/assignments", {
      method: "DELETE",
      body: { id: ASSIGNMENT_UUID },
    });
    const res = await DELETE(req);
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid input", async () => {
    const req = createTestRequest("/api/design-system/assignments", {
      method: "DELETE",
      body: { id: "not-a-uuid" },
    });
    const res = await DELETE(req);
    expect(res.status).toBe(400);
  });

  it("deletes assignment on success", async () => {
    const chain = createChainableMock({ data: null, error: null });
    mockFrom.mockReturnValue(chain);

    const req = createTestRequest("/api/design-system/assignments", {
      method: "DELETE",
      body: { id: ASSIGNMENT_UUID },
    });
    const { status, body } = await parseResponse(await DELETE(req));
    expect(status).toBe(200);
    expect((body as { data: { success: boolean } }).data.success).toBe(true);
  });

  it("returns 500 when delete fails", async () => {
    const chain = createChainableMock({ data: null, error: { message: "Delete error" } });
    mockFrom.mockReturnValue(chain);

    const req = createTestRequest("/api/design-system/assignments", {
      method: "DELETE",
      body: { id: ASSIGNMENT_UUID },
    });
    const res = await DELETE(req);
    expect(res.status).toBe(500);
  });
});
