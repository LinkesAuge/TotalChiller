import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRpc = vi.fn();
const mockGetUser = vi.fn();

vi.mock("./require-auth", () => ({
  requireAuth: vi.fn(),
}));

import { requireAuth } from "./require-auth";
import { requireAdmin } from "./require-admin";

const mockedRequireAuth = vi.mocked(requireAuth);

describe("requireAdmin", () => {
  beforeEach(() => {
    mockedRequireAuth.mockReset();
    mockRpc.mockReset();
    mockGetUser.mockReset();
  });

  it("returns 401 when requireAuth fails", async () => {
    const { NextResponse } = await import("next/server");
    const errorResp = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    mockedRequireAuth.mockResolvedValue({ error: errorResp });

    const result = await requireAdmin();
    expect(result.error).toBeDefined();
    expect(result.error!.status).toBe(401);
  });

  it("returns 403 when user is not an admin", async () => {
    const mockSupabase = {
      rpc: mockRpc.mockResolvedValue({ data: false }),
      auth: { getUser: mockGetUser },
      from: vi.fn(),
    };
    mockedRequireAuth.mockResolvedValue({
      userId: "user-1",
      supabase: mockSupabase as never,
    });

    const result = await requireAdmin();
    expect(result.error).toBeDefined();
    const body = await result.error!.json();
    expect(body.error).toContain("Forbidden");
    expect(result.error!.status).toBe(403);
  });

  it("returns userId and supabase when user is admin", async () => {
    const mockSupabase = {
      rpc: mockRpc.mockResolvedValue({ data: true }),
      auth: { getUser: mockGetUser },
      from: vi.fn(),
    };
    mockedRequireAuth.mockResolvedValue({
      userId: "admin-1",
      supabase: mockSupabase as never,
    });

    const result = await requireAdmin();
    expect(result.error).toBeUndefined();
    expect(result.userId).toBe("admin-1");
    expect(result.supabase).toBeDefined();
  });

  it("calls rpc with 'is_any_admin'", async () => {
    const mockSupabase = {
      rpc: mockRpc.mockResolvedValue({ data: true }),
      auth: { getUser: mockGetUser },
      from: vi.fn(),
    };
    mockedRequireAuth.mockResolvedValue({
      userId: "admin-1",
      supabase: mockSupabase as never,
    });

    await requireAdmin();
    expect(mockRpc).toHaveBeenCalledWith("is_any_admin");
  });
});
