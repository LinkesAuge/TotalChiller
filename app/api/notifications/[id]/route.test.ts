import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockAuth, createUnauthorizedResult, createChainableMock, setChainResult } from "@/test";

vi.mock("@/lib/api/require-auth");
vi.mock("@/lib/api/logger", () => ({ captureApiError: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({
  strictLimiter: { check: vi.fn().mockReturnValue(null) },
  standardLimiter: { check: vi.fn().mockReturnValue(null) },
  relaxedLimiter: { check: vi.fn().mockReturnValue(null) },
}));

import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api/require-auth";
import { PATCH, DELETE } from "./route";

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

function makeRequest(method: string): NextRequest {
  return new NextRequest(new URL(`/api/notifications/${VALID_UUID}`, "http://localhost:3000"), { method });
}

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("PATCH /api/notifications/[id]", () => {
  let mockAuth: ReturnType<typeof createMockAuth>;

  beforeEach(() => {
    mockAuth = createMockAuth();
    vi.mocked(requireAuth).mockResolvedValue(mockAuth.authResult);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireAuth).mockResolvedValue(createUnauthorizedResult() as never);
    const res = await PATCH(makeRequest("PATCH"), makeContext(VALID_UUID));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid UUID", async () => {
    const res = await PATCH(makeRequest("PATCH"), makeContext("not-a-uuid"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Invalid notification ID");
  });

  it("marks notification as read successfully", async () => {
    const chain = createChainableMock();
    setChainResult(chain, { data: null, error: null });
    mockAuth.mockFrom.mockReturnValue(chain);

    const res = await PATCH(makeRequest("PATCH"), makeContext(VALID_UUID));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual({ id: VALID_UUID, is_read: true });
  });

  it("returns 500 when update fails", async () => {
    const chain = createChainableMock();
    setChainResult(chain, { data: null, error: { message: "DB error" } });
    mockAuth.mockFrom.mockReturnValue(chain);

    const res = await PATCH(makeRequest("PATCH"), makeContext(VALID_UUID));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain("Failed to update");
  });

  it("returns 500 on unexpected exception", async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error("boom"));
    const res = await PATCH(makeRequest("PATCH"), makeContext(VALID_UUID));
    expect(res.status).toBe(500);
  });
});

describe("DELETE /api/notifications/[id]", () => {
  let mockAuth: ReturnType<typeof createMockAuth>;

  beforeEach(() => {
    mockAuth = createMockAuth();
    vi.mocked(requireAuth).mockResolvedValue(mockAuth.authResult);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireAuth).mockResolvedValue(createUnauthorizedResult() as never);
    const res = await DELETE(makeRequest("DELETE"), makeContext(VALID_UUID));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid UUID", async () => {
    const res = await DELETE(makeRequest("DELETE"), makeContext("not-a-uuid"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Invalid notification ID");
  });

  it("deletes notification successfully", async () => {
    const chain = createChainableMock();
    setChainResult(chain, { data: null, error: null });
    mockAuth.mockFrom.mockReturnValue(chain);

    const res = await DELETE(makeRequest("DELETE"), makeContext(VALID_UUID));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual({ id: VALID_UUID, deleted: true });
  });

  it("returns 500 when delete fails", async () => {
    const chain = createChainableMock();
    setChainResult(chain, { data: null, error: { message: "DB error" } });
    mockAuth.mockFrom.mockReturnValue(chain);

    const res = await DELETE(makeRequest("DELETE"), makeContext(VALID_UUID));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain("Failed to delete");
  });

  it("returns 500 on unexpected exception", async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error("boom"));
    const res = await DELETE(makeRequest("DELETE"), makeContext(VALID_UUID));
    expect(res.status).toBe(500);
  });
});
