import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockAuth, createForbiddenResult } from "@/test";

vi.mock("@/lib/api/require-admin");
vi.mock("@/lib/api/logger", () => ({ captureApiError: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({
  strictLimiter: { check: vi.fn().mockReturnValue(null) },
  standardLimiter: { check: vi.fn().mockReturnValue(null) },
  relaxedLimiter: { check: vi.fn().mockReturnValue(null) },
}));

const mockListUsers = vi.fn();
const mockUpdateUserById = vi.fn();
vi.mock("@/lib/supabase/service-role-client", () => ({
  default: vi.fn(() => ({
    from: vi.fn(),
    auth: {
      admin: {
        listUsers: mockListUsers,
        updateUserById: mockUpdateUserById,
      },
    },
  })),
}));

import { requireAdmin } from "@/lib/api/require-admin";
import { GET, POST } from "./route";

function makeGETRequest(): Request {
  return new Request("http://localhost/api/admin/email-confirmations", { method: "GET" });
}

function makePOSTRequest(body: unknown): Request {
  return new Request("http://localhost/api/admin/email-confirmations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/admin/email-confirmations", () => {
  let mockAuth: ReturnType<typeof createMockAuth>;

  beforeEach(() => {
    mockAuth = createMockAuth();
    vi.mocked(requireAdmin).mockResolvedValue(mockAuth.authResult);
    mockListUsers.mockReset();
    mockUpdateUserById.mockReset();
  });

  it("returns 403 when user is not admin", async () => {
    vi.mocked(requireAdmin).mockResolvedValue(createForbiddenResult() as never);
    const res = await GET(makeGETRequest());
    expect(res.status).toBe(403);
  });

  it("returns confirmation map on success", async () => {
    mockListUsers.mockResolvedValue({
      data: {
        users: [
          { id: "user-1", email_confirmed_at: "2024-01-01T00:00:00Z" },
          { id: "user-2", email_confirmed_at: null },
        ],
      },
      error: null,
    });
    const res = await GET(makeGETRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data["user-1"]).toBe("2024-01-01T00:00:00Z");
    expect(body.data["user-2"]).toBeNull();
  });

  it("returns 500 when listUsers fails", async () => {
    mockListUsers.mockResolvedValue({ data: null, error: { message: "Auth API error" } });
    const res = await GET(makeGETRequest());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to fetch confirmation status.");
  });
});

describe("POST /api/admin/email-confirmations", () => {
  let mockAuth: ReturnType<typeof createMockAuth>;

  beforeEach(() => {
    mockAuth = createMockAuth();
    vi.mocked(requireAdmin).mockResolvedValue(mockAuth.authResult);
    mockListUsers.mockReset();
    mockUpdateUserById.mockReset();
  });

  it("returns 403 when user is not admin", async () => {
    vi.mocked(requireAdmin).mockResolvedValue(createForbiddenResult() as never);
    const res = await POST(makePOSTRequest({ userId: "550e8400-e29b-41d4-a716-446655440000" }));
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid userId", async () => {
    const res = await POST(makePOSTRequest({ userId: "not-a-uuid" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Valid user ID is required.");
  });

  it("returns 400 for missing body", async () => {
    const res = await POST(makePOSTRequest(null));
    expect(res.status).toBe(400);
  });

  it("confirms user and returns success", async () => {
    mockUpdateUserById.mockResolvedValue({
      data: { user: { email_confirmed_at: "2024-06-15T12:00:00Z" } },
      error: null,
    });
    const res = await POST(makePOSTRequest({ userId: "550e8400-e29b-41d4-a716-446655440000" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.confirmed).toBe(true);
    expect(body.data.email_confirmed_at).toBe("2024-06-15T12:00:00Z");
    expect(mockUpdateUserById).toHaveBeenCalledWith("550e8400-e29b-41d4-a716-446655440000", {
      email_confirm: true,
    });
  });

  it("returns 500 when updateUserById fails", async () => {
    mockUpdateUserById.mockResolvedValue({ data: null, error: { message: "Update failed" } });
    const res = await POST(makePOSTRequest({ userId: "550e8400-e29b-41d4-a716-446655440000" }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to confirm user.");
  });
});
