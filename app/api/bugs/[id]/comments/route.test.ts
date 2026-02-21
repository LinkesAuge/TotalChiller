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

const mockFrom = vi.fn();
vi.mock("@/lib/supabase/service-role-client", () => ({
  default: vi.fn(() => ({ from: mockFrom })),
}));

import { requireAuth } from "@/lib/api/require-auth";
import { GET, POST } from "./route";

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";
const OTHER_USER = "660e8400-e29b-41d4-a716-446655440001";

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

/* ------------------------------------------------------------------ */
/*  GET /api/bugs/[id]/comments                                        */
/* ------------------------------------------------------------------ */

describe("GET /api/bugs/[id]/comments", () => {
  let mockAuth: ReturnType<typeof createMockAuth>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth = createMockAuth();
    vi.mocked(requireAuth).mockResolvedValue(mockAuth.authResult);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireAuth).mockResolvedValue(createUnauthorizedResult() as never);
    const req = createTestRequest(`/api/bugs/${VALID_UUID}/comments`);
    const res = await GET(req, makeContext(VALID_UUID));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid report ID", async () => {
    const req = createTestRequest("/api/bugs/bad-id/comments");
    const res = await GET(req, makeContext("bad-id"));
    expect(res.status).toBe(400);
  });

  it("returns comments on success", async () => {
    const chain = createChainableMock({
      data: [
        {
          id: "c1",
          content: "Nice bug",
          profiles: { username: "user1", display_name: "User One" },
        },
      ],
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    const req = createTestRequest(`/api/bugs/${VALID_UUID}/comments`);
    const { status, body } = await parseResponse(await GET(req, makeContext(VALID_UUID)));
    expect(status).toBe(200);
    const data = (body as { data: unknown[] }).data;
    expect(data).toHaveLength(1);
    expect((data[0] as Record<string, unknown>).author).toEqual({ username: "user1", display_name: "User One" });
  });

  it("returns 500 when DB query fails", async () => {
    const chain = createChainableMock({ data: null, error: { message: "DB error" } });
    mockFrom.mockReturnValue(chain);

    const req = createTestRequest(`/api/bugs/${VALID_UUID}/comments`);
    const res = await GET(req, makeContext(VALID_UUID));
    expect(res.status).toBe(500);
  });
});

/* ------------------------------------------------------------------ */
/*  POST /api/bugs/[id]/comments                                       */
/* ------------------------------------------------------------------ */

describe("POST /api/bugs/[id]/comments", () => {
  let mockAuth: ReturnType<typeof createMockAuth>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth = createMockAuth();
    vi.mocked(requireAuth).mockResolvedValue(mockAuth.authResult);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireAuth).mockResolvedValue(createUnauthorizedResult() as never);
    const req = createTestRequest(`/api/bugs/${VALID_UUID}/comments`, {
      method: "POST",
      body: { content: "Hello" },
    });
    const res = await POST(req, makeContext(VALID_UUID));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid report ID", async () => {
    const req = createTestRequest("/api/bugs/bad-id/comments", {
      method: "POST",
      body: { content: "Hello" },
    });
    const res = await POST(req, makeContext("bad-id"));
    expect(res.status).toBe(400);
  });

  it("returns 400 for empty content", async () => {
    const req = createTestRequest(`/api/bugs/${VALID_UUID}/comments`, {
      method: "POST",
      body: { content: "" },
    });
    const res = await POST(req, makeContext(VALID_UUID));
    expect(res.status).toBe(400);
  });

  it("returns 404 when report not found", async () => {
    const chain = createChainableMock();
    setChainResult(chain, { data: null, error: null });
    mockFrom.mockReturnValue(chain);

    const req = createTestRequest(`/api/bugs/${VALID_UUID}/comments`, {
      method: "POST",
      body: { content: "Hello" },
    });
    const res = await POST(req, makeContext(VALID_UUID));
    expect(res.status).toBe(404);
  });

  it("creates comment and returns 201", async () => {
    const reportChain = createChainableMock();
    setChainResult(reportChain, { data: { id: VALID_UUID, reporter_id: "test-user-id" }, error: null });

    const insertChain = createChainableMock();
    setChainResult(insertChain, {
      data: { id: "c1", report_id: VALID_UUID, author_id: "test-user-id", content: "Hello", created_at: "2025-01-01" },
      error: null,
    });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return reportChain;
      return insertChain;
    });

    const req = createTestRequest(`/api/bugs/${VALID_UUID}/comments`, {
      method: "POST",
      body: { content: "Hello" },
    });
    const { status, body } = await parseResponse(await POST(req, makeContext(VALID_UUID)));
    expect(status).toBe(201);
    expect((body as { data: { id: string } }).data.id).toBe("c1");
  });

  it("sends notification when commenter is not the reporter", async () => {
    const reportChain = createChainableMock();
    setChainResult(reportChain, { data: { id: VALID_UUID, reporter_id: OTHER_USER }, error: null });

    const insertChain = createChainableMock();
    setChainResult(insertChain, {
      data: { id: "c1", report_id: VALID_UUID, author_id: "test-user-id", content: "Hello", created_at: "2025-01-01" },
      error: null,
    });

    const profileChain = createChainableMock();
    setChainResult(profileChain, {
      data: { display_name: "Commenter", username: "commenter", email: "c@test.com" },
      error: null,
    });

    const notifChain = createChainableMock();
    setChainResult(notifChain, { data: null, error: null });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return reportChain;
      if (callCount === 2) return insertChain;
      if (callCount === 3) return profileChain;
      return notifChain;
    });

    const req = createTestRequest(`/api/bugs/${VALID_UUID}/comments`, {
      method: "POST",
      body: { content: "Hello" },
    });
    const { status } = await parseResponse(await POST(req, makeContext(VALID_UUID)));
    expect(status).toBe(201);
    expect(notifChain.insert).toHaveBeenCalled();
  });

  it("returns 500 when insert fails", async () => {
    const reportChain = createChainableMock();
    setChainResult(reportChain, { data: { id: VALID_UUID, reporter_id: "test-user-id" }, error: null });

    const insertChain = createChainableMock();
    setChainResult(insertChain, { data: null, error: { message: "Insert error" } });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? reportChain : insertChain;
    });

    const req = createTestRequest(`/api/bugs/${VALID_UUID}/comments`, {
      method: "POST",
      body: { content: "Hello" },
    });
    const res = await POST(req, makeContext(VALID_UUID));
    expect(res.status).toBe(500);
  });
});
