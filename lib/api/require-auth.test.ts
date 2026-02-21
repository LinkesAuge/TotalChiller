import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSupabaseClient } = vi.hoisted(() => {
  const mockSupabaseClient = {
    auth: { getUser: vi.fn() },
    from: vi.fn(),
    rpc: vi.fn(),
  };
  return { mockSupabaseClient };
});

vi.mock("../supabase/server-client", () => ({
  default: vi.fn().mockResolvedValue(mockSupabaseClient),
}));

vi.mock("../supabase/config", () => ({
  getSupabaseUrl: () => "https://test.supabase.co",
  getSupabaseAnonKey: () => "test-anon-key",
}));

import { requireAuth, requireAuthWithBearer } from "./require-auth";

describe("requireAuth", () => {
  beforeEach(() => {
    mockSupabaseClient.auth.getUser.mockReset();
  });

  it("returns userId and supabase on successful auth", async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });

    const result = await requireAuth();
    expect(result.error).toBeUndefined();
    expect(result.userId).toBe("user-123");
    expect(result.supabase).toBeDefined();
  });

  it("returns 401 error when authError is present", async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "No session" },
    });

    const result = await requireAuth();
    expect(result.error).toBeDefined();
    const body = await result.error!.json();
    expect(body.error).toBe("Unauthorized");
    expect(result.error!.status).toBe(401);
  });

  it("returns 401 error when user is null without error", async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const result = await requireAuth();
    expect(result.error).toBeDefined();
    expect(result.error!.status).toBe(401);
  });
});

describe("requireAuthWithBearer", () => {
  beforeEach(() => {
    mockSupabaseClient.auth.getUser.mockReset();
  });

  it("falls back to cookie auth when no Authorization header", async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: "cookie-user" } },
      error: null,
    });

    const request = new Request("http://localhost/api/test");
    const result = await requireAuthWithBearer(request as never);
    expect(result.userId).toBe("cookie-user");
  });

  it("treats trimmed 'Bearer' header (no token) as cookie auth fallback", async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const request = new Request("http://localhost/api/test", {
      headers: { Authorization: "Bearer" },
    });

    const result = await requireAuthWithBearer(request as never);
    expect(result.error).toBeDefined();
    expect(result.error!.status).toBe(401);
  });

  it("falls back to cookie auth for non-Bearer Authorization", async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: "cookie-user" } },
      error: null,
    });

    const request = new Request("http://localhost/api/test", {
      headers: { Authorization: "Basic abc123" },
    });
    const result = await requireAuthWithBearer(request as never);
    expect(result.userId).toBe("cookie-user");
  });
});
