import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createMockAuth,
  createUnauthorizedResult,
  createChainableMock,
  setChainResult,
  createTestRequest,
  parseResponse,
} from "@/test";

vi.mock("@/lib/api/require-auth");
vi.mock("@/lib/api/logger", () => ({ captureApiError: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({
  strictLimiter: { check: vi.fn().mockReturnValue(null) },
  standardLimiter: { check: vi.fn().mockReturnValue(null) },
  relaxedLimiter: { check: vi.fn().mockReturnValue(null) },
}));
vi.mock("@/lib/supabase/role-access", () => ({ default: vi.fn() }));

const mockFrom = vi.fn();
vi.mock("@/lib/supabase/service-role-client", () => ({
  default: vi.fn(() => ({ from: mockFrom })),
}));

import { requireAuth } from "@/lib/api/require-auth";
import getIsContentManager from "@/lib/supabase/role-access";
import { GET, PATCH, DELETE } from "./route";

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";
const OTHER_UUID = "660e8400-e29b-41d4-a716-446655440001";

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

/* ------------------------------------------------------------------ */
/*  GET /api/bugs/[id]                                                 */
/* ------------------------------------------------------------------ */

describe("GET /api/bugs/[id]", () => {
  let mockAuth: ReturnType<typeof createMockAuth>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth = createMockAuth();
    vi.mocked(requireAuth).mockResolvedValue(mockAuth.authResult);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireAuth).mockResolvedValue(createUnauthorizedResult() as never);
    const req = createTestRequest(`/api/bugs/${VALID_UUID}`);
    const res = await GET(req, makeContext(VALID_UUID));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid UUID", async () => {
    const req = createTestRequest("/api/bugs/not-a-uuid");
    const res = await GET(req, makeContext("not-a-uuid"));
    expect(res.status).toBe(400);
  });

  it("returns 404 when report not found", async () => {
    const reportChain = createChainableMock();
    setChainResult(reportChain, { data: null, error: null });
    mockFrom.mockReturnValue(reportChain);

    const req = createTestRequest(`/api/bugs/${VALID_UUID}`);
    const res = await GET(req, makeContext(VALID_UUID));
    expect(res.status).toBe(404);
  });

  it("returns report with screenshots on success", async () => {
    const reportChain = createChainableMock();
    setChainResult(reportChain, {
      data: {
        id: VALID_UUID,
        title: "Bug",
        bug_report_categories: { name: "UI", slug: "ui" },
        profiles: { username: "user", display_name: "User" },
      },
      error: null,
    });
    const screenshotsChain = createChainableMock({
      data: [
        { id: "ss1", report_id: VALID_UUID, storage_path: "path", file_name: "file.png", created_at: "2025-01-01" },
      ],
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "bug_reports") return reportChain;
      if (table === "bug_report_screenshots") return screenshotsChain;
      return createChainableMock();
    });

    const req = createTestRequest(`/api/bugs/${VALID_UUID}`);
    const { status, body } = await parseResponse(await GET(req, makeContext(VALID_UUID)));
    expect(status).toBe(200);
    const data = (body as { data: Record<string, unknown> }).data;
    expect(data.category_name).toBe("UI");
    expect(data.screenshots).toHaveLength(1);
  });

  it("returns 500 when DB query fails", async () => {
    const failChain = createChainableMock();
    setChainResult(failChain, { data: null, error: { message: "DB error" } });
    mockFrom.mockReturnValue(failChain);

    const req = createTestRequest(`/api/bugs/${VALID_UUID}`);
    const res = await GET(req, makeContext(VALID_UUID));
    expect(res.status).toBe(500);
  });
});

/* ------------------------------------------------------------------ */
/*  PATCH /api/bugs/[id]                                               */
/* ------------------------------------------------------------------ */

describe("PATCH /api/bugs/[id]", () => {
  let mockAuth: ReturnType<typeof createMockAuth>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth = createMockAuth();
    vi.mocked(requireAuth).mockResolvedValue(mockAuth.authResult);
    vi.mocked(getIsContentManager).mockResolvedValue(false);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireAuth).mockResolvedValue(createUnauthorizedResult() as never);
    const req = createTestRequest(`/api/bugs/${VALID_UUID}`, {
      method: "PATCH",
      body: { status: "resolved" },
    });
    const res = await PATCH(req, makeContext(VALID_UUID));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid UUID", async () => {
    const req = createTestRequest("/api/bugs/bad-id", {
      method: "PATCH",
      body: { title: "Updated" },
    });
    const res = await PATCH(req, makeContext("bad-id"));
    expect(res.status).toBe(400);
  });

  it("returns 404 when report not found", async () => {
    const chain = createChainableMock();
    setChainResult(chain, { data: null, error: null });
    mockFrom.mockReturnValue(chain);

    const req = createTestRequest(`/api/bugs/${VALID_UUID}`, {
      method: "PATCH",
      body: { title: "Updated" },
    });
    const res = await PATCH(req, makeContext(VALID_UUID));
    expect(res.status).toBe(404);
  });

  it("returns 403 when non-admin tries to change status", async () => {
    const existingChain = createChainableMock();
    setChainResult(existingChain, { data: { reporter_id: OTHER_UUID, status: "open" }, error: null });
    mockFrom.mockReturnValue(existingChain);

    const req = createTestRequest(`/api/bugs/${VALID_UUID}`, {
      method: "PATCH",
      body: { status: "resolved" },
    });
    const res = await PATCH(req, makeContext(VALID_UUID));
    expect(res.status).toBe(403);
  });

  it("allows reporter to update their own description", async () => {
    const existingChain = createChainableMock();
    setChainResult(existingChain, { data: { reporter_id: "test-user-id", status: "open" }, error: null });

    const updateChain = createChainableMock();
    setChainResult(updateChain, {
      data: { id: VALID_UUID, status: "open", priority: null, updated_at: "2025-01-01" },
      error: null,
    });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? existingChain : updateChain;
    });

    const req = createTestRequest(`/api/bugs/${VALID_UUID}`, {
      method: "PATCH",
      body: { description: "Updated desc" },
    });
    const { status } = await parseResponse(await PATCH(req, makeContext(VALID_UUID)));
    expect(status).toBe(200);
  });

  it("allows admin to change status", async () => {
    vi.mocked(getIsContentManager).mockResolvedValue(true);

    const existingChain = createChainableMock();
    setChainResult(existingChain, { data: { reporter_id: OTHER_UUID, status: "open" }, error: null });

    const updateChain = createChainableMock();
    setChainResult(updateChain, {
      data: { id: VALID_UUID, status: "resolved", priority: null, updated_at: "2025-01-01" },
      error: null,
    });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? existingChain : updateChain;
    });

    const req = createTestRequest(`/api/bugs/${VALID_UUID}`, {
      method: "PATCH",
      body: { status: "resolved" },
    });
    const { status } = await parseResponse(await PATCH(req, makeContext(VALID_UUID)));
    expect(status).toBe(200);
  });

  it("returns 500 when update fails", async () => {
    const existingChain = createChainableMock();
    setChainResult(existingChain, { data: { reporter_id: "test-user-id", status: "open" }, error: null });

    const updateChain = createChainableMock();
    setChainResult(updateChain, { data: null, error: { message: "Update error" } });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? existingChain : updateChain;
    });

    const req = createTestRequest(`/api/bugs/${VALID_UUID}`, {
      method: "PATCH",
      body: { title: "Updated" },
    });
    const res = await PATCH(req, makeContext(VALID_UUID));
    expect(res.status).toBe(500);
  });
});

/* ------------------------------------------------------------------ */
/*  DELETE /api/bugs/[id]                                              */
/* ------------------------------------------------------------------ */

describe("DELETE /api/bugs/[id]", () => {
  let mockAuth: ReturnType<typeof createMockAuth>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth = createMockAuth();
    vi.mocked(requireAuth).mockResolvedValue(mockAuth.authResult);
    vi.mocked(getIsContentManager).mockResolvedValue(false);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireAuth).mockResolvedValue(createUnauthorizedResult() as never);
    const req = createTestRequest(`/api/bugs/${VALID_UUID}`, { method: "DELETE" });
    const res = await DELETE(req, makeContext(VALID_UUID));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid UUID", async () => {
    const req = createTestRequest("/api/bugs/bad-id", { method: "DELETE" });
    const res = await DELETE(req, makeContext("bad-id"));
    expect(res.status).toBe(400);
  });

  it("returns 404 when report not found", async () => {
    const chain = createChainableMock();
    setChainResult(chain, { data: null, error: null });
    mockFrom.mockReturnValue(chain);

    const req = createTestRequest(`/api/bugs/${VALID_UUID}`, { method: "DELETE" });
    const res = await DELETE(req, makeContext(VALID_UUID));
    expect(res.status).toBe(404);
  });

  it("returns 403 when non-reporter non-admin tries to delete", async () => {
    const chain = createChainableMock();
    setChainResult(chain, { data: { reporter_id: OTHER_UUID }, error: null });
    mockFrom.mockReturnValue(chain);

    const req = createTestRequest(`/api/bugs/${VALID_UUID}`, { method: "DELETE" });
    const res = await DELETE(req, makeContext(VALID_UUID));
    expect(res.status).toBe(403);
  });

  it("deletes report when user is reporter", async () => {
    const existingChain = createChainableMock();
    setChainResult(existingChain, { data: { reporter_id: "test-user-id" }, error: null });

    const deleteChain = createChainableMock({ data: [{ id: VALID_UUID }], error: null });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return existingChain;
      return deleteChain;
    });

    const req = createTestRequest(`/api/bugs/${VALID_UUID}`, { method: "DELETE" });
    const { status, body } = await parseResponse(await DELETE(req, makeContext(VALID_UUID)));
    expect(status).toBe(200);
    expect((body as { data: { id: string } }).data.id).toBe(VALID_UUID);
  });

  it("returns 500 when delete fails", async () => {
    const existingChain = createChainableMock();
    setChainResult(existingChain, { data: { reporter_id: "test-user-id" }, error: null });

    const deleteChain = createChainableMock({ data: null, error: { message: "Delete error" } });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return existingChain;
      return deleteChain;
    });

    const req = createTestRequest(`/api/bugs/${VALID_UUID}`, { method: "DELETE" });
    const res = await DELETE(req, makeContext(VALID_UUID));
    expect(res.status).toBe(500);
  });
});
