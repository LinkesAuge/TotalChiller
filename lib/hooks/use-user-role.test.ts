// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { createMockSupabase, createChainableMock } from "@/test/mocks/supabase";

let mockAuthStateContextValue: unknown = null;

vi.mock("@/lib/hooks/auth-state-context", () => ({
  useAuthStateContext: vi.fn(() => mockAuthStateContextValue),
}));

import { useUserRole } from "./use-user-role";

describe("useUserRole", () => {
  let mockSupabase: ReturnType<typeof createMockSupabase>["supabase"];
  let mockFrom: ReturnType<typeof createMockSupabase>["mockFrom"];

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthStateContextValue = null;
    const mock = createMockSupabase();
    mockSupabase = mock.supabase;
    mockFrom = mock.mockFrom;
  });

  it("defaults to guest role while loading", () => {
    (mockSupabase.auth.getUser as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useUserRole(mockSupabase));

    expect(result.current.role).toBe("guest");
    expect(result.current.loading).toBe(true);
  });

  it("fetches and resolves role from user_roles table", async () => {
    (mockSupabase.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });

    const roleChain = createChainableMock({
      data: { role: "admin" },
      error: null,
    });
    mockFrom.mockReturnValue(roleChain);

    const { result } = renderHook(() => useUserRole(mockSupabase));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.role).toBe("admin");
    expect(mockFrom).toHaveBeenCalledWith("user_roles");
    expect(roleChain.eq).toHaveBeenCalledWith("user_id", "user-123");
    expect(roleChain.maybeSingle).toHaveBeenCalled();
  });

  it("stays guest when no user is authenticated", async () => {
    (mockSupabase.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const { result } = renderHook(() => useUserRole(mockSupabase));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.role).toBe("guest");
  });

  it("stays guest when user_roles query returns no data", async () => {
    (mockSupabase.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });

    const roleChain = createChainableMock({ data: null, error: null });
    mockFrom.mockReturnValue(roleChain);

    const { result } = renderHook(() => useUserRole(mockSupabase));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.role).toBe("guest");
  });

  it("stays guest when user_roles query errors", async () => {
    (mockSupabase.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });

    const roleChain = createChainableMock({
      data: null,
      error: { message: "query failed" },
    });
    mockFrom.mockReturnValue(roleChain);

    const { result } = renderHook(() => useUserRole(mockSupabase));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.role).toBe("guest");
  });

  it("provides correct permission helpers for admin role", async () => {
    (mockSupabase.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });

    const roleChain = createChainableMock({
      data: { role: "admin" },
      error: null,
    });
    mockFrom.mockReturnValue(roleChain);

    const { result } = renderHook(() => useUserRole(mockSupabase));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isAdmin).toBe(true);
    expect(result.current.isOwner).toBe(false);
    expect(result.current.isContentManager).toBe(true);
    expect(result.current.hasPermission("article:create")).toBe(true);
    expect(result.current.canDo("article:create", "event:create")).toBe(true);
  });

  it("provides correct permission helpers for member role", async () => {
    (mockSupabase.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });

    const roleChain = createChainableMock({
      data: { role: "member" },
      error: null,
    });
    mockFrom.mockReturnValue(roleChain);

    const { result } = renderHook(() => useUserRole(mockSupabase));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.role).toBe("member");
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isOwner).toBe(false);
    expect(result.current.isContentManager).toBe(false);
    expect(result.current.hasPermission("article:create")).toBe(true);
    expect(result.current.hasPermission("article:edit:any")).toBe(false);
  });

  it("provides correct permission helpers for owner role", async () => {
    (mockSupabase.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });

    const roleChain = createChainableMock({
      data: { role: "owner" },
      error: null,
    });
    mockFrom.mockReturnValue(roleChain);

    const { result } = renderHook(() => useUserRole(mockSupabase));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isOwner).toBe(true);
    expect(result.current.isAdmin).toBe(true);
    expect(result.current.isContentManager).toBe(true);
  });

  it("uses AuthStateContext values when available", () => {
    mockAuthStateContextValue = {
      userId: "context-user",
      isAuthenticated: true,
      isLoading: false,
      role: "moderator",
      isRoleLoading: false,
    };

    const { result } = renderHook(() => useUserRole(mockSupabase));

    expect(result.current.role).toBe("moderator");
    expect(result.current.loading).toBe(false);
    expect(result.current.isContentManager).toBe(true);
    expect(result.current.isAdmin).toBe(false);
    expect(mockSupabase.auth.getUser).not.toHaveBeenCalled();
  });

  it("reflects combined loading from AuthStateContext", () => {
    mockAuthStateContextValue = {
      userId: null,
      isAuthenticated: false,
      isLoading: false,
      role: "guest",
      isRoleLoading: true,
    };

    const { result } = renderHook(() => useUserRole(mockSupabase));

    expect(result.current.loading).toBe(true);
  });

  it("normalizes unknown role strings to guest", async () => {
    (mockSupabase.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });

    const roleChain = createChainableMock({
      data: { role: "superadmin" },
      error: null,
    });
    mockFrom.mockReturnValue(roleChain);

    const { result } = renderHook(() => useUserRole(mockSupabase));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.role).toBe("guest");
  });
});
