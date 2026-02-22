import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockAuth, createForbiddenResult, createChainableMock } from "@/test";

vi.mock("@/lib/api/require-admin");
vi.mock("@/lib/api/logger", () => ({ captureApiError: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({
  strictLimiter: { check: vi.fn().mockReturnValue(null) },
  standardLimiter: { check: vi.fn().mockReturnValue(null) },
  relaxedLimiter: { check: vi.fn().mockReturnValue(null) },
}));

const mockDeleteUser = vi.fn();
const mockServiceFrom = vi.fn();
vi.mock("@/lib/supabase/service-role-client", () => ({
  default: vi.fn(() => ({
    auth: { admin: { deleteUser: mockDeleteUser } },
    from: mockServiceFrom,
  })),
}));

import { requireAdmin } from "@/lib/api/require-admin";
import { POST } from "./route";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/admin/delete-user", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/admin/delete-user", () => {
  let mockAuth: ReturnType<typeof createMockAuth>;

  beforeEach(() => {
    mockAuth = createMockAuth();
    vi.mocked(requireAdmin).mockResolvedValue(mockAuth.authResult);
    mockDeleteUser.mockReset();
    mockServiceFrom.mockReset();
    const roleChain = createChainableMock({ data: null, error: null });
    mockServiceFrom.mockReturnValue(roleChain);
  });

  it("returns 403 when user is not admin", async () => {
    vi.mocked(requireAdmin).mockResolvedValue(createForbiddenResult() as never);
    const res = await POST(makeRequest({ userId: "550e8400-e29b-41d4-a716-446655440000" }));
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid userId format", async () => {
    const res = await POST(makeRequest({ userId: "not-a-uuid" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid input.");
  });

  it("returns 400 for missing body", async () => {
    const res = await POST(makeRequest(null));
    expect(res.status).toBe(400);
  });

  it("deletes user and returns success", async () => {
    mockDeleteUser.mockResolvedValue({ error: null });
    const res = await POST(makeRequest({ userId: "550e8400-e29b-41d4-a716-446655440000" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.success).toBe(true);
    expect(mockDeleteUser).toHaveBeenCalledWith("550e8400-e29b-41d4-a716-446655440000");
  });

  it("returns 500 when Supabase delete fails", async () => {
    mockDeleteUser.mockResolvedValue({ error: { message: "DB error" } });
    const res = await POST(makeRequest({ userId: "550e8400-e29b-41d4-a716-446655440000" }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain("Failed to delete");
  });
});
