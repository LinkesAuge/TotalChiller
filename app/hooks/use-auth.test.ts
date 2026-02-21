// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { createMockSupabase } from "@/test/mocks/supabase";

let mockAuthStateContextValue: unknown = null;

vi.mock("@/lib/hooks/auth-state-context", () => ({
  useAuthStateContext: vi.fn(() => mockAuthStateContextValue),
}));

const { supabase: mockSupabase } = createMockSupabase();

vi.mock("./use-supabase", () => ({
  useSupabase: vi.fn(() => mockSupabase),
}));

import { useAuth } from "./use-auth";

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthStateContextValue = null;
  });

  it("starts in a loading state", () => {
    (mockSupabase.auth.getUser as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useAuth());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.userId).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("resolves to authenticated state when user exists", async () => {
    (mockSupabase.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.userId).toBe("user-123");
    expect(result.current.isAuthenticated).toBe(true);
  });

  it("resolves to unauthenticated state when no user", async () => {
    (mockSupabase.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.userId).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("subscribes to auth state changes and unsubscribes on unmount", async () => {
    const unsubscribeMock = vi.fn();
    (mockSupabase.auth.onAuthStateChange as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { subscription: { unsubscribe: unsubscribeMock } },
    });
    (mockSupabase.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });

    const { unmount } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(mockSupabase.auth.onAuthStateChange).toHaveBeenCalled();
    });

    unmount();
    expect(unsubscribeMock).toHaveBeenCalled();
  });

  it("re-fetches user when auth state change fires", async () => {
    let authChangeCallback: (() => void) | undefined;
    (mockSupabase.auth.onAuthStateChange as ReturnType<typeof vi.fn>).mockImplementation((cb: () => void) => {
      authChangeCallback = cb;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    (mockSupabase.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.userId).toBe("user-123");
    });

    (mockSupabase.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { user: { id: "user-456" } },
      error: null,
    });

    await act(async () => {
      authChangeCallback?.();
    });

    await waitFor(() => {
      expect(result.current.userId).toBe("user-456");
    });
  });

  it("uses AuthStateContext values when available", () => {
    mockAuthStateContextValue = {
      userId: "context-user",
      isAuthenticated: true,
      isLoading: false,
      role: "admin",
      isRoleLoading: false,
    };

    const { result } = renderHook(() => useAuth());

    expect(result.current.userId).toBe("context-user");
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });
});
