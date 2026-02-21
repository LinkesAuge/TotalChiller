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
import { GET, PATCH } from "./route";

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

/* ------------------------------------------------------------------ */
/*  GET /api/design-system/assets                                      */
/* ------------------------------------------------------------------ */

describe("GET /api/design-system/assets", () => {
  let mockAuth: ReturnType<typeof createMockAuth>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth = createMockAuth();
    vi.mocked(requireAuth).mockResolvedValue(mockAuth.authResult);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireAuth).mockResolvedValue(createUnauthorizedResult() as never);
    const req = createTestRequest("/api/design-system/assets");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid query params", async () => {
    const req = createTestRequest("/api/design-system/assets", {
      searchParams: { search: "a".repeat(201) },
    });
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("returns assets on success", async () => {
    const chain = createChainableMock({
      data: [{ id: VALID_UUID, filename: "icon.png", category: "icons" }],
      error: null,
      count: 1,
    });
    mockFrom.mockReturnValue(chain);

    const req = createTestRequest("/api/design-system/assets");
    const { status, body } = await parseResponse(await GET(req));
    expect(status).toBe(200);
    const result = body as { data: unknown[]; count: number };
    expect(result.data).toHaveLength(1);
    expect(result.count).toBe(1);
  });

  it("applies category and search filters", async () => {
    const chain = createChainableMock({ data: [], error: null, count: 0 });
    mockFrom.mockReturnValue(chain);

    const req = createTestRequest("/api/design-system/assets", {
      searchParams: { category: "icons", search: "logo" },
    });
    const { status } = await parseResponse(await GET(req));
    expect(status).toBe(200);
    expect(chain.eq).toHaveBeenCalledWith("category", "icons");
    expect(chain.ilike).toHaveBeenCalled();
  });

  it("returns 500 when DB query fails", async () => {
    const chain = createChainableMock({ data: null, error: { message: "DB error" }, count: null });
    mockFrom.mockReturnValue(chain);

    const req = createTestRequest("/api/design-system/assets");
    const res = await GET(req);
    expect(res.status).toBe(500);
  });
});

/* ------------------------------------------------------------------ */
/*  PATCH /api/design-system/assets                                    */
/* ------------------------------------------------------------------ */

describe("PATCH /api/design-system/assets", () => {
  let mockAuth: ReturnType<typeof createMockAuth>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth = createMockAuth();
    vi.mocked(requireAdmin).mockResolvedValue(mockAuth.authResult);
  });

  it("returns 403 when not admin", async () => {
    vi.mocked(requireAdmin).mockResolvedValue(createForbiddenResult() as never);
    const req = createTestRequest("/api/design-system/assets", {
      method: "PATCH",
      body: { id: VALID_UUID, category: "updated" },
    });
    const res = await PATCH(req);
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid input", async () => {
    const req = createTestRequest("/api/design-system/assets", {
      method: "PATCH",
      body: { category: "updated" },
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
  });

  it("updates asset on success", async () => {
    const chain = createChainableMock();
    setChainResult(chain, {
      data: { id: VALID_UUID, filename: "icon.png", category: "updated" },
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    const req = createTestRequest("/api/design-system/assets", {
      method: "PATCH",
      body: { id: VALID_UUID, category: "updated" },
    });
    const { status, body } = await parseResponse(await PATCH(req));
    expect(status).toBe(200);
    expect((body as { data: { category: string } }).data.category).toBe("updated");
  });

  it("returns 500 when update fails", async () => {
    const chain = createChainableMock();
    setChainResult(chain, { data: null, error: { message: "Update error" } });
    mockFrom.mockReturnValue(chain);

    const req = createTestRequest("/api/design-system/assets", {
      method: "PATCH",
      body: { id: VALID_UUID, category: "updated" },
    });
    const res = await PATCH(req);
    expect(res.status).toBe(500);
  });
});
