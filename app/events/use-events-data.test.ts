// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { createMockSupabase, createChainableMock, setChainResult } from "@/test/mocks/supabase";

const mockPushToast = vi.fn();

vi.mock("next-intl", () => ({
  useTranslations: vi.fn(() => vi.fn((key: string) => key)),
  useLocale: vi.fn(() => "de"),
}));

let mockSupabase: ReturnType<typeof createMockSupabase>;

vi.mock("@/app/hooks/use-supabase", () => ({
  useSupabase: vi.fn(() => mockSupabase.supabase),
}));

import { useEventsData } from "./use-events-data";

const MOCK_EVENT_ROW = {
  id: "evt-1",
  title: "Test Event",
  description: "A test event",
  location: "Online",
  starts_at: new Date(Date.now() + 86400000).toISOString(),
  ends_at: new Date(Date.now() + 90000000).toISOString(),
  created_at: new Date().toISOString(),
  updated_at: null,
  created_by: "user-1",
  organizer: "Org1",
  recurrence_type: "none",
  recurrence_end_date: null,
  banner_url: null,
  is_pinned: false,
  forum_post_id: null,
  author: { display_name: "TestUser", username: "testuser" },
};

const MOCK_GAME_ACCOUNT_ROW = {
  game_account_id: "ga-1",
  game_accounts: { id: "ga-1", game_username: "Player1" },
};

describe("useEventsData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabase();
  });

  it("starts in loading state", () => {
    const eventsChain = createChainableMock({ data: [], error: null });
    const gameAccountsChain = createChainableMock({ data: [], error: null });

    let _callCount = 0;
    mockSupabase.mockFrom.mockImplementation((table: string) => {
      if (table === "events") return eventsChain;
      if (table === "game_account_clan_memberships") return gameAccountsChain;
      _callCount++;
      return createChainableMock();
    });

    const { result } = renderHook(() => useEventsData(mockSupabase.supabase, "clan-1", mockPushToast));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.events).toEqual([]);
  });

  it("loads events and game accounts on mount", async () => {
    const eventsChain = createChainableMock({
      data: [MOCK_EVENT_ROW],
      error: null,
    });
    const gameAccountsChain = createChainableMock({
      data: [MOCK_GAME_ACCOUNT_ROW],
      error: null,
    });

    mockSupabase.mockFrom.mockImplementation((table: string) => {
      if (table === "events") return eventsChain;
      if (table === "game_account_clan_memberships") return gameAccountsChain;
      return createChainableMock();
    });

    const { result } = renderHook(() => useEventsData(mockSupabase.supabase, "clan-1", mockPushToast));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.events).toHaveLength(1);
    expect(result.current.events[0]!.title).toBe("Test Event");
    expect(result.current.events[0]!.author_name).toBe("TestUser");
    expect(result.current.gameAccounts).toHaveLength(1);
    expect(result.current.gameAccounts[0]!.game_username).toBe("Player1");
  });

  it("sets empty arrays when clanId is undefined", async () => {
    const { result } = renderHook(() => useEventsData(mockSupabase.supabase, undefined, mockPushToast));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.events).toEqual([]);
    expect(result.current.gameAccounts).toEqual([]);
  });

  it("shows error toast when events fetch fails", async () => {
    const eventsChain = createChainableMock({
      data: null,
      error: { message: "DB error", code: "500", details: "", hint: "" },
    });
    const gameAccountsChain = createChainableMock({ data: [], error: null });

    mockSupabase.mockFrom.mockImplementation((table: string) => {
      if (table === "events") return eventsChain;
      if (table === "game_account_clan_memberships") return gameAccountsChain;
      return createChainableMock();
    });

    const { result } = renderHook(() => useEventsData(mockSupabase.supabase, "clan-1", mockPushToast));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockPushToast).toHaveBeenCalled();
    expect(result.current.events).toEqual([]);
  });

  it("reloads events via reloadEvents", async () => {
    const eventsChain = createChainableMock({
      data: [MOCK_EVENT_ROW],
      error: null,
    });
    const gameAccountsChain = createChainableMock({ data: [], error: null });

    mockSupabase.mockFrom.mockImplementation((table: string) => {
      if (table === "events") return eventsChain;
      if (table === "game_account_clan_memberships") return gameAccountsChain;
      return createChainableMock();
    });

    const { result } = renderHook(() => useEventsData(mockSupabase.supabase, "clan-1", mockPushToast));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const updatedEvent = { ...MOCK_EVENT_ROW, title: "Updated Event" };
    setChainResult(eventsChain, { data: [updatedEvent], error: null });

    await result.current.reloadEvents();

    await waitFor(() => {
      expect(result.current.events[0]!.title).toBe("Updated Event");
    });
  });
});
