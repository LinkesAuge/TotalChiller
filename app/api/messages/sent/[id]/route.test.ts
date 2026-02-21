import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockAuth, createUnauthorizedResult, createChainableMock, setChainResult } from "@/test";
import { NextRequest } from "next/server";

vi.mock("@/lib/api/require-auth");
vi.mock("@/lib/api/logger", () => ({ captureApiError: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({
  strictLimiter: { check: vi.fn().mockReturnValue(null) },
  standardLimiter: { check: vi.fn().mockReturnValue(null) },
  relaxedLimiter: { check: vi.fn().mockReturnValue(null) },
}));

const mockSvcFrom = vi.fn();
vi.mock("@/lib/supabase/service-role-client", () => ({
  default: vi.fn(() => ({ from: mockSvcFrom })),
}));

import { requireAuth } from "@/lib/api/require-auth";
import { DELETE } from "./route";

const validUuid = "550e8400-e29b-41d4-a716-446655440000";

function makeRequest(): NextRequest {
  return new NextRequest(new URL(`/api/messages/sent/${validUuid}`, "http://localhost:3000"), {
    method: "DELETE",
  });
}

function makeContext(id: string = validUuid) {
  return { params: Promise.resolve({ id }) };
}

describe("DELETE /api/messages/sent/[id]", () => {
  let mockAuth: ReturnType<typeof createMockAuth>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth = createMockAuth();
    vi.mocked(requireAuth).mockResolvedValue(mockAuth.authResult);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireAuth).mockResolvedValue(createUnauthorizedResult() as never);
    const res = await DELETE(makeRequest(), makeContext());
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid ID format", async () => {
    const res = await DELETE(makeRequest(), makeContext("bad-id"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Invalid message ID");
  });

  it("soft-deletes sent message successfully", async () => {
    const chain = createChainableMock();
    setChainResult(chain, { data: { id: validUuid }, error: null });

    mockSvcFrom.mockReturnValue(chain);

    const res = await DELETE(makeRequest(), makeContext());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.deleted).toBe(true);
    expect(body.data.id).toBe(validUuid);
  });

  it("returns 404 when message not found", async () => {
    const chain = createChainableMock();
    setChainResult(chain, { data: null, error: null });

    mockSvcFrom.mockReturnValue(chain);

    const res = await DELETE(makeRequest(), makeContext());
    expect(res.status).toBe(404);
  });

  it("returns 500 when update fails", async () => {
    const chain = createChainableMock();
    setChainResult(chain, { data: null, error: { message: "DB error" } });

    mockSvcFrom.mockReturnValue(chain);

    const res = await DELETE(makeRequest(), makeContext());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain("Failed to delete");
  });

  it("returns 500 on unexpected error", async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error("boom"));
    const res = await DELETE(makeRequest(), makeContext());
    expect(res.status).toBe(500);
  });
});
