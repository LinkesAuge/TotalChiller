import { describe, it, expect, vi } from "vitest";
import getIsAdminAccess from "./admin-access";

/* ------------------------------------------------------------------ */
/*  Mock resolveUserRole                                               */
/* ------------------------------------------------------------------ */

vi.mock("./check-role", () => ({
  resolveUserRole: vi.fn(),
}));

import { resolveUserRole } from "./check-role";

const mockResolveUserRole = vi.mocked(resolveUserRole);

/* ------------------------------------------------------------------ */
/*  getIsAdminAccess                                                   */
/* ------------------------------------------------------------------ */

describe("getIsAdminAccess", () => {
  const mockSupabase = {} as Parameters<typeof getIsAdminAccess>[0]["supabase"];

  it("returns true when user is 'owner'", async () => {
    mockResolveUserRole.mockResolvedValue("owner");
    const result = await getIsAdminAccess({ supabase: mockSupabase });
    expect(result).toBe(true);
  });

  it("returns true when user is 'admin'", async () => {
    mockResolveUserRole.mockResolvedValue("admin");
    const result = await getIsAdminAccess({ supabase: mockSupabase });
    expect(result).toBe(true);
  });

  it("returns false when user is 'moderator'", async () => {
    mockResolveUserRole.mockResolvedValue("moderator");
    const result = await getIsAdminAccess({ supabase: mockSupabase });
    expect(result).toBe(false);
  });

  it("returns false when user is 'editor'", async () => {
    mockResolveUserRole.mockResolvedValue("editor");
    const result = await getIsAdminAccess({ supabase: mockSupabase });
    expect(result).toBe(false);
  });

  it("returns false when user is 'member'", async () => {
    mockResolveUserRole.mockResolvedValue("member");
    const result = await getIsAdminAccess({ supabase: mockSupabase });
    expect(result).toBe(false);
  });

  it("returns false when user is 'guest'", async () => {
    mockResolveUserRole.mockResolvedValue("guest");
    const result = await getIsAdminAccess({ supabase: mockSupabase });
    expect(result).toBe(false);
  });

  it("returns false when user is not authenticated (null role)", async () => {
    mockResolveUserRole.mockResolvedValue(null);
    const result = await getIsAdminAccess({ supabase: mockSupabase });
    expect(result).toBe(false);
  });
});
