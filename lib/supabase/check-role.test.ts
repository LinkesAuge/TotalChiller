import { describe, it, expect, vi } from "vitest";
import { resolveUserRole } from "./check-role";

/* ------------------------------------------------------------------ */
/*  Mock Supabase client builder                                       */
/* ------------------------------------------------------------------ */

interface MockSupabaseOptions {
  readonly user?: { id: string } | null;
  readonly authError?: Error | null;
  readonly adminFlag?: boolean;
  readonly adminFlagError?: Error | null;
  readonly roleData?: { role: string } | null;
  readonly roleError?: Error | null;
}

function createMockSupabase(options: MockSupabaseOptions = {}) {
  const {
    user = { id: "user-123" },
    authError = null,
    adminFlag = false,
    adminFlagError = null,
    roleData = null,
    roleError = null,
  } = options;
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: authError,
      }),
    },
    rpc: vi.fn().mockResolvedValue({
      data: adminFlag,
      error: adminFlagError,
    }),
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: roleData,
            error: roleError,
          }),
        }),
      }),
    }),
  } as unknown as Parameters<typeof resolveUserRole>[0];
}

/* ------------------------------------------------------------------ */
/*  resolveUserRole                                                    */
/* ------------------------------------------------------------------ */

describe("resolveUserRole", () => {
  it("returns null when user is not authenticated", async () => {
    const supabase = createMockSupabase({ user: null });
    const result = await resolveUserRole(supabase);
    expect(result).toBeNull();
  });

  it("returns null on auth error", async () => {
    const supabase = createMockSupabase({ authError: new Error("Session expired") });
    const result = await resolveUserRole(supabase);
    expect(result).toBeNull();
  });

  it("returns 'admin' when is_any_admin RPC returns true", async () => {
    const supabase = createMockSupabase({ adminFlag: true });
    const result = await resolveUserRole(supabase);
    expect(result).toBe("admin");
  });

  it("falls back to user_roles table when RPC returns false", async () => {
    const supabase = createMockSupabase({
      adminFlag: false,
      roleData: { role: "moderator" },
    });
    const result = await resolveUserRole(supabase);
    expect(result).toBe("moderator");
  });

  it("falls back to user_roles table when RPC errors", async () => {
    const supabase = createMockSupabase({
      adminFlagError: new Error("RPC failed"),
      roleData: { role: "editor" },
    });
    const result = await resolveUserRole(supabase);
    expect(result).toBe("editor");
  });

  it("returns 'member' when user_roles has no row", async () => {
    const supabase = createMockSupabase({
      adminFlag: false,
      roleData: null,
    });
    const result = await resolveUserRole(supabase);
    expect(result).toBe("member");
  });

  it("returns 'member' when user_roles query errors", async () => {
    const supabase = createMockSupabase({
      adminFlag: false,
      roleError: new Error("DB error"),
    });
    const result = await resolveUserRole(supabase);
    expect(result).toBe("member");
  });

  it("normalises role string via toRole (case-insensitive)", async () => {
    const supabase = createMockSupabase({
      adminFlag: false,
      roleData: { role: "Editor" },
    });
    const result = await resolveUserRole(supabase);
    expect(result).toBe("editor");
  });

  it("defaults unknown role strings to 'guest' via toRole", async () => {
    const supabase = createMockSupabase({
      adminFlag: false,
      roleData: { role: "superadmin" },
    });
    const result = await resolveUserRole(supabase);
    expect(result).toBe("guest");
  });
});
