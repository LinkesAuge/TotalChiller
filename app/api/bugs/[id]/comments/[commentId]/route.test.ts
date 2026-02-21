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
import { PATCH, DELETE } from "./route";

const REPORT_ID = "550e8400-e29b-41d4-a716-446655440000";
const COMMENT_ID = "660e8400-e29b-41d4-a716-446655440001";
const OTHER_USER = "770e8400-e29b-41d4-a716-446655440002";

function makeContext(id: string, commentId: string) {
  return { params: Promise.resolve({ id, commentId }) };
}

/* ------------------------------------------------------------------ */
/*  PATCH /api/bugs/[id]/comments/[commentId]                          */
/* ------------------------------------------------------------------ */

describe("PATCH /api/bugs/[id]/comments/[commentId]", () => {
  let mockAuth: ReturnType<typeof createMockAuth>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth = createMockAuth();
    vi.mocked(requireAuth).mockResolvedValue(mockAuth.authResult);
    vi.mocked(getIsContentManager).mockResolvedValue(false);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireAuth).mockResolvedValue(createUnauthorizedResult() as never);
    const req = createTestRequest(`/api/bugs/${REPORT_ID}/comments/${COMMENT_ID}`, {
      method: "PATCH",
      body: { content: "Updated" },
    });
    const res = await PATCH(req, makeContext(REPORT_ID, COMMENT_ID));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid IDs", async () => {
    const req = createTestRequest("/api/bugs/bad/comments/bad", {
      method: "PATCH",
      body: { content: "Updated" },
    });
    const res = await PATCH(req, makeContext("bad", "bad"));
    expect(res.status).toBe(400);
  });

  it("returns 400 for empty content", async () => {
    const req = createTestRequest(`/api/bugs/${REPORT_ID}/comments/${COMMENT_ID}`, {
      method: "PATCH",
      body: { content: "" },
    });
    const res = await PATCH(req, makeContext(REPORT_ID, COMMENT_ID));
    expect(res.status).toBe(400);
  });

  it("returns 404 when comment not found", async () => {
    const chain = createChainableMock();
    setChainResult(chain, { data: null, error: null });
    mockFrom.mockReturnValue(chain);

    const req = createTestRequest(`/api/bugs/${REPORT_ID}/comments/${COMMENT_ID}`, {
      method: "PATCH",
      body: { content: "Updated" },
    });
    const res = await PATCH(req, makeContext(REPORT_ID, COMMENT_ID));
    expect(res.status).toBe(404);
  });

  it("returns 403 when non-author non-admin tries to edit", async () => {
    const chain = createChainableMock();
    setChainResult(chain, { data: { author_id: OTHER_USER }, error: null });
    mockFrom.mockReturnValue(chain);

    const req = createTestRequest(`/api/bugs/${REPORT_ID}/comments/${COMMENT_ID}`, {
      method: "PATCH",
      body: { content: "Updated" },
    });
    const res = await PATCH(req, makeContext(REPORT_ID, COMMENT_ID));
    expect(res.status).toBe(403);
  });

  it("allows author to update comment", async () => {
    const existingChain = createChainableMock();
    setChainResult(existingChain, { data: { author_id: "test-user-id" }, error: null });

    const updateChain = createChainableMock();
    setChainResult(updateChain, {
      data: { id: COMMENT_ID, content: "Updated", updated_at: "2025-01-01" },
      error: null,
    });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? existingChain : updateChain;
    });

    const req = createTestRequest(`/api/bugs/${REPORT_ID}/comments/${COMMENT_ID}`, {
      method: "PATCH",
      body: { content: "Updated" },
    });
    const { status, body } = await parseResponse(await PATCH(req, makeContext(REPORT_ID, COMMENT_ID)));
    expect(status).toBe(200);
    expect((body as { data: { content: string } }).data.content).toBe("Updated");
  });

  it("allows admin to update any comment", async () => {
    vi.mocked(getIsContentManager).mockResolvedValue(true);

    const existingChain = createChainableMock();
    setChainResult(existingChain, { data: { author_id: OTHER_USER }, error: null });

    const updateChain = createChainableMock();
    setChainResult(updateChain, {
      data: { id: COMMENT_ID, content: "Admin edit", updated_at: "2025-01-01" },
      error: null,
    });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? existingChain : updateChain;
    });

    const req = createTestRequest(`/api/bugs/${REPORT_ID}/comments/${COMMENT_ID}`, {
      method: "PATCH",
      body: { content: "Admin edit" },
    });
    const { status } = await parseResponse(await PATCH(req, makeContext(REPORT_ID, COMMENT_ID)));
    expect(status).toBe(200);
  });

  it("returns 500 when update fails", async () => {
    const existingChain = createChainableMock();
    setChainResult(existingChain, { data: { author_id: "test-user-id" }, error: null });

    const updateChain = createChainableMock();
    setChainResult(updateChain, { data: null, error: { message: "Update error" } });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? existingChain : updateChain;
    });

    const req = createTestRequest(`/api/bugs/${REPORT_ID}/comments/${COMMENT_ID}`, {
      method: "PATCH",
      body: { content: "Updated" },
    });
    const res = await PATCH(req, makeContext(REPORT_ID, COMMENT_ID));
    expect(res.status).toBe(500);
  });
});

/* ------------------------------------------------------------------ */
/*  DELETE /api/bugs/[id]/comments/[commentId]                         */
/* ------------------------------------------------------------------ */

describe("DELETE /api/bugs/[id]/comments/[commentId]", () => {
  let mockAuth: ReturnType<typeof createMockAuth>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth = createMockAuth();
    vi.mocked(requireAuth).mockResolvedValue(mockAuth.authResult);
    vi.mocked(getIsContentManager).mockResolvedValue(false);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireAuth).mockResolvedValue(createUnauthorizedResult() as never);
    const req = createTestRequest(`/api/bugs/${REPORT_ID}/comments/${COMMENT_ID}`, { method: "DELETE" });
    const res = await DELETE(req, makeContext(REPORT_ID, COMMENT_ID));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid IDs", async () => {
    const req = createTestRequest("/api/bugs/bad/comments/bad", { method: "DELETE" });
    const res = await DELETE(req, makeContext("bad", "bad"));
    expect(res.status).toBe(400);
  });

  it("returns 404 when comment not found", async () => {
    const chain = createChainableMock();
    setChainResult(chain, { data: null, error: null });
    mockFrom.mockReturnValue(chain);

    const req = createTestRequest(`/api/bugs/${REPORT_ID}/comments/${COMMENT_ID}`, { method: "DELETE" });
    const res = await DELETE(req, makeContext(REPORT_ID, COMMENT_ID));
    expect(res.status).toBe(404);
  });

  it("returns 403 when non-author non-admin tries to delete", async () => {
    const chain = createChainableMock();
    setChainResult(chain, { data: { author_id: OTHER_USER }, error: null });
    mockFrom.mockReturnValue(chain);

    const req = createTestRequest(`/api/bugs/${REPORT_ID}/comments/${COMMENT_ID}`, { method: "DELETE" });
    const res = await DELETE(req, makeContext(REPORT_ID, COMMENT_ID));
    expect(res.status).toBe(403);
  });

  it("deletes comment when user is author", async () => {
    const existingChain = createChainableMock();
    setChainResult(existingChain, { data: { author_id: "test-user-id" }, error: null });

    const deleteChain = createChainableMock({ data: [{ id: COMMENT_ID }], error: null });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? existingChain : deleteChain;
    });

    const req = createTestRequest(`/api/bugs/${REPORT_ID}/comments/${COMMENT_ID}`, { method: "DELETE" });
    const { status, body } = await parseResponse(await DELETE(req, makeContext(REPORT_ID, COMMENT_ID)));
    expect(status).toBe(200);
    expect((body as { data: { id: string } }).data.id).toBe(COMMENT_ID);
  });

  it("returns 500 when delete fails", async () => {
    const existingChain = createChainableMock();
    setChainResult(existingChain, { data: { author_id: "test-user-id" }, error: null });

    const deleteChain = createChainableMock({ data: null, error: { message: "Delete error" } });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? existingChain : deleteChain;
    });

    const req = createTestRequest(`/api/bugs/${REPORT_ID}/comments/${COMMENT_ID}`, { method: "DELETE" });
    const res = await DELETE(req, makeContext(REPORT_ID, COMMENT_ID));
    expect(res.status).toBe(500);
  });
});
