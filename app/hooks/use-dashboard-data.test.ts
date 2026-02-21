// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { createMockSupabase, createChainableMock } from "@/test/mocks/supabase";

const { supabase: mockSupabase, mockFrom } = createMockSupabase();

vi.mock("./use-supabase", () => ({
  useSupabase: vi.fn(() => mockSupabase),
}));

import { useDashboardData } from "./use-dashboard-data";

describe("useDashboardData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets empty data and not loading when clanId is undefined", async () => {
    const { result } = renderHook(() => useDashboardData({ clanId: undefined }));

    await waitFor(() => {
      expect(result.current.isLoadingAnnouncements).toBe(false);
      expect(result.current.isLoadingEvents).toBe(false);
    });

    expect(result.current.announcements).toEqual([]);
    expect(result.current.events).toEqual([]);
    expect(result.current.announcementsError).toBeNull();
    expect(result.current.eventsError).toBeNull();
  });

  it("starts in loading state", () => {
    const articlesChain = createChainableMock();
    articlesChain.then.mockImplementation(() => new Promise(() => {}));
    const eventsChain = createChainableMock();
    eventsChain.then.mockImplementation(() => new Promise(() => {}));

    mockFrom.mockImplementation((table: string) => {
      if (table === "articles") return articlesChain;
      if (table === "events") return eventsChain;
      return createChainableMock();
    });

    const { result } = renderHook(() => useDashboardData({ clanId: "clan-1" }));

    expect(result.current.isLoadingAnnouncements).toBe(true);
    expect(result.current.isLoadingEvents).toBe(true);
  });

  it("loads announcements and events successfully", async () => {
    const articlesChain = createChainableMock({
      data: [
        {
          id: "a1",
          title: "News",
          content: "Body",
          type: "announcement",
          is_pinned: false,
          status: "published",
          tags: ["tag1"],
          created_at: "2025-01-01",
          created_by: "u1",
          forum_post_id: null,
          author: { display_name: "Alice", username: "alice" },
        },
      ],
      error: null,
    });

    const eventsChain = createChainableMock({
      data: [
        {
          id: "e1",
          title: "Raid Night",
          description: "Weekly raid",
          location: "Discord",
          starts_at: "2025-06-01T20:00:00Z",
          ends_at: "2025-06-01T23:00:00Z",
          created_by: "u1",
          forum_post_id: null,
          author: { display_name: "Bob", username: "bob" },
        },
      ],
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "articles") return articlesChain;
      if (table === "events") return eventsChain;
      return createChainableMock();
    });

    const { result } = renderHook(() => useDashboardData({ clanId: "clan-1" }));

    await waitFor(() => {
      expect(result.current.isLoadingAnnouncements).toBe(false);
      expect(result.current.isLoadingEvents).toBe(false);
    });

    expect(result.current.announcements).toHaveLength(1);
    expect(result.current.announcements[0]).toMatchObject({
      id: "a1",
      title: "News",
      author_name: "Alice",
    });

    expect(result.current.events).toHaveLength(1);
    expect(result.current.events[0]).toMatchObject({
      id: "e1",
      title: "Raid Night",
      author_name: "Bob",
    });
  });

  it("handles announcements error", async () => {
    const articlesChain = createChainableMock({
      data: null,
      error: { message: "fetch failed" },
    });
    const eventsChain = createChainableMock({ data: [], error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === "articles") return articlesChain;
      if (table === "events") return eventsChain;
      return createChainableMock();
    });

    const { result } = renderHook(() => useDashboardData({ clanId: "clan-1" }));

    await waitFor(() => {
      expect(result.current.isLoadingAnnouncements).toBe(false);
    });

    expect(result.current.announcementsError).toBe("fetch failed");
    expect(result.current.announcements).toEqual([]);
  });

  it("handles events error", async () => {
    const articlesChain = createChainableMock({ data: [], error: null });
    const eventsChain = createChainableMock({
      data: null,
      error: { message: "events failed" },
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "articles") return articlesChain;
      if (table === "events") return eventsChain;
      return createChainableMock();
    });

    const { result } = renderHook(() => useDashboardData({ clanId: "clan-1" }));

    await waitFor(() => {
      expect(result.current.isLoadingEvents).toBe(false);
    });

    expect(result.current.eventsError).toBe("events failed");
    expect(result.current.events).toEqual([]);
  });

  it("extracts author_name falling back to username", async () => {
    const articlesChain = createChainableMock({
      data: [
        {
          id: "a2",
          title: "T",
          content: "C",
          type: "announcement",
          is_pinned: false,
          status: "published",
          tags: [],
          created_at: "2025-01-01",
          created_by: "u1",
          forum_post_id: null,
          author: { display_name: null, username: "fallback_user" },
        },
      ],
      error: null,
    });
    const eventsChain = createChainableMock({ data: [], error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === "articles") return articlesChain;
      if (table === "events") return eventsChain;
      return createChainableMock();
    });

    const { result } = renderHook(() => useDashboardData({ clanId: "clan-1" }));

    await waitFor(() => {
      expect(result.current.isLoadingAnnouncements).toBe(false);
    });

    expect(result.current.announcements[0]!.author_name).toBe("fallback_user");
  });
});
