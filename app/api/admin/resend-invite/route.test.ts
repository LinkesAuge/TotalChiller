import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockAuth, createForbiddenResult } from "@/test";

vi.mock("@/lib/api/require-admin");
vi.mock("@/lib/api/logger", () => ({ captureApiError: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({
  strictLimiter: { check: vi.fn().mockReturnValue(null) },
  standardLimiter: { check: vi.fn().mockReturnValue(null) },
  relaxedLimiter: { check: vi.fn().mockReturnValue(null) },
}));

const mockMaybeSingle = vi.fn();
const mockInviteUserByEmail = vi.fn();
vi.mock("@/lib/supabase/service-role-client", () => ({
  default: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: mockMaybeSingle,
        }),
      }),
    })),
    auth: { admin: { inviteUserByEmail: mockInviteUserByEmail } },
  })),
}));

import { requireAdmin } from "@/lib/api/require-admin";
import { POST } from "./route";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/admin/resend-invite", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/admin/resend-invite", () => {
  let mockAuth: ReturnType<typeof createMockAuth>;

  beforeEach(() => {
    mockAuth = createMockAuth();
    vi.mocked(requireAdmin).mockResolvedValue(mockAuth.authResult);
    mockMaybeSingle.mockReset();
    mockInviteUserByEmail.mockReset();
  });

  it("returns 403 when user is not admin", async () => {
    vi.mocked(requireAdmin).mockResolvedValue(createForbiddenResult() as never);
    const res = await POST(makeRequest({ email: "user@example.com" }));
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid email", async () => {
    const res = await POST(makeRequest({ email: "not-an-email" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Valid email is required.");
  });

  it("returns 400 for missing body", async () => {
    const res = await POST(makeRequest(null));
    expect(res.status).toBe(400);
  });

  it("returns 404 when user not found", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    const res = await POST(makeRequest({ email: "unknown@example.com" }));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("No user found with that email.");
  });

  it("resends invite and returns success", async () => {
    mockMaybeSingle.mockResolvedValue({ data: { id: "user-123" }, error: null });
    mockInviteUserByEmail.mockResolvedValue({ error: null });
    const res = await POST(makeRequest({ email: "User@Example.com" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.success).toBe(true);
    expect(mockInviteUserByEmail).toHaveBeenCalledWith("user@example.com");
  });

  it("returns 500 when invite fails", async () => {
    mockMaybeSingle.mockResolvedValue({ data: { id: "user-123" }, error: null });
    mockInviteUserByEmail.mockResolvedValue({ error: { message: "Service error" } });
    const res = await POST(makeRequest({ email: "user@example.com" }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to resend invite.");
  });
});
