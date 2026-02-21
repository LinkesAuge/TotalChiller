// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { createMockSupabase, createChainableMock } from "@/test/mocks/supabase";

let mockSupabase: ReturnType<typeof createMockSupabase>;

const stableT = vi.fn((key: string) => key);

vi.mock("next-intl", () => ({
  useTranslations: vi.fn(() => stableT),
  useLocale: vi.fn(() => "de"),
}));

const stableSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => stableSearchParams,
  usePathname: () => "/",
}));

vi.mock("@/app/hooks/use-supabase", () => ({
  useSupabase: vi.fn(() => mockSupabase.supabase),
}));

const stableAuth = { userId: "test-user", isAuthenticated: true, isLoading: false };
vi.mock("@/app/hooks/use-auth", () => ({
  useAuth: vi.fn(() => stableAuth),
}));

const stableToast = { pushToast: vi.fn() };
vi.mock("@/app/components/toast-provider", () => ({
  useToast: vi.fn(() => stableToast),
}));

const stableClanContext = { clanId: "clan-1", clanName: "TestClan" };
vi.mock("@/app/hooks/use-clan-context", () => ({
  __esModule: true,
  default: vi.fn(() => stableClanContext),
}));

const stableUserRole = { isContentManager: true, isAnyAdmin: false };
vi.mock("@/lib/hooks/use-user-role", () => ({
  useUserRole: vi.fn(() => stableUserRole),
}));

vi.mock("@/lib/supabase/error-utils", () => ({
  classifySupabaseError: vi.fn(() => "unknown"),
  getErrorMessageKey: vi.fn(() => "genericError"),
}));

vi.mock("@/lib/forum-thread-sync", () => ({
  createLinkedForumPost: vi.fn().mockResolvedValue({ forumPostId: null, error: null }),
}));

vi.mock("@/lib/hooks/use-banner-upload", () => ({
  useBannerUpload: vi.fn(() => ({
    handleBannerUpload: vi.fn(),
    isBannerUploading: false,
  })),
}));

import { useEvents } from "./use-events";

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
  organizer: null,
  recurrence_type: "none",
  recurrence_end_date: null,
  banner_url: null,
  is_pinned: false,
  forum_post_id: null,
  author: { display_name: "TestUser", username: "testuser" },
};

describe("useEvents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabase();

    const eventsChain = createChainableMock({ data: [MOCK_EVENT_ROW], error: null });
    const templatesChain = createChainableMock({ data: [], error: null });
    const gameAccountsChain = createChainableMock({ data: [], error: null });

    mockSupabase.mockFrom.mockImplementation((table: string) => {
      if (table === "events") return eventsChain;
      if (table === "event_templates") return templatesChain;
      if (table === "game_account_clan_memberships") return gameAccountsChain;
      return createChainableMock();
    });

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) }));
  });

  it("returns isLoading=true initially then resolves", async () => {
    const { result } = renderHook(() => useEvents());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.events).toHaveLength(1);
    expect(result.current.currentUserId).toBe("test-user");
    expect(result.current.canManage).toBe(true);
    expect(result.current.locale).toBe("de");
  });

  it("provides calendar days for current month", async () => {
    const { result } = renderHook(() => useEvents());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.calendarDays).toHaveLength(42);
    const todayDay = result.current.calendarDays.find((d) => d.isToday);
    expect(todayDay).toBeDefined();
  });

  it("shifts calendar month forward and backward", async () => {
    const { result } = renderHook(() => useEvents());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const initialMonth = result.current.calendarMonth.getMonth();

    act(() => {
      result.current.shiftCalendarMonth(1);
    });

    expect(result.current.calendarMonth.getMonth()).toBe((initialMonth + 1) % 12);

    act(() => {
      result.current.shiftCalendarMonth(-1);
    });

    expect(result.current.calendarMonth.getMonth()).toBe(initialMonth);
  });

  it("jumps to today", async () => {
    const { result } = renderHook(() => useEvents());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.shiftCalendarMonth(3);
    });

    act(() => {
      result.current.jumpToToday();
    });

    const now = new Date();
    expect(result.current.calendarMonth.getMonth()).toBe(now.getMonth());
    expect(result.current.calendarMonth.getFullYear()).toBe(now.getFullYear());
  });

  it("handles date selection", async () => {
    const { result } = renderHook(() => useEvents());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const day = result.current.calendarDays[15]!;

    act(() => {
      result.current.handleDateSelect(day.key, day);
    });

    expect(result.current.selectedDateKey).toBe(day.key);
  });

  it("provides upcoming and past events", async () => {
    const { result } = renderHook(() => useEvents());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.upcomingEvents).toBeDefined();
    expect(result.current.pastEvents).toBeDefined();
    expect(Array.isArray(result.current.upcomingEvents)).toBe(true);
    expect(Array.isArray(result.current.pastEvents)).toBe(true);
  });

  it("delegates form state from useEventsForm", async () => {
    const { result } = renderHook(() => useEvents());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isFormOpen).toBe(false);
    expect(typeof result.current.handleOpenCreate).toBe("function");
    expect(typeof result.current.handleSubmit).toBe("function");
    expect(typeof result.current.confirmDeleteEvent).toBe("function");
  });

  it("delegates template state from useEventsTemplates", async () => {
    const { result } = renderHook(() => useEvents());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isTemplatesOpen).toBe(false);
    expect(typeof result.current.handleSaveEventAsTemplate).toBe("function");
    expect(typeof result.current.confirmDeleteTemplate).toBe("function");
  });

  it("selects a date from a different month and switches calendar", async () => {
    const { result } = renderHook(() => useEvents());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const outOfMonthDay = result.current.calendarDays.find((d) => !d.isCurrentMonth);
    if (outOfMonthDay) {
      act(() => {
        result.current.handleDateSelect(outOfMonthDay.key, outOfMonthDay);
      });
      expect(result.current.selectedDateKey).toBe(outOfMonthDay.key);
      expect(result.current.calendarMonth.getMonth()).toBe(outOfMonthDay.date.getMonth());
    }
  });

  it("provides selectedDateLabel for the selected date", async () => {
    const { result } = renderHook(() => useEvents());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.selectedDateLabel).toBeTruthy();
    expect(typeof result.current.selectedDateLabel).toBe("string");
  });

  it("handles selecting an upcoming event", async () => {
    const { result } = renderHook(() => useEvents());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    if (result.current.upcomingEvents.length > 0) {
      const event = result.current.upcomingEvents[0]!;
      act(() => {
        result.current.handleSelectUpcomingEvent(event);
      });
      expect(result.current.highlightEventId).toBe(event.id);
    }
  });

  it("exposes todayKey as a date string", async () => {
    const { result } = renderHook(() => useEvents());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.todayKey).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("manages past expanded state", async () => {
    const { result } = renderHook(() => useEvents());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isPastExpanded).toBe(false);

    act(() => {
      result.current.setIsPastExpanded(true);
    });

    expect(result.current.isPastExpanded).toBe(true);
  });

  it("manages upcoming page state", async () => {
    const { result } = renderHook(() => useEvents());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.upcomingPage).toBe(1);

    act(() => {
      result.current.setUpcomingPage(2);
    });

    expect(result.current.upcomingPage).toBe(2);
  });

  it("opens and resets the create form", async () => {
    const { result } = renderHook(() => useEvents());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.handleOpenCreate();
    });

    expect(result.current.isFormOpen).toBe(true);
    expect(result.current.editingId).toBe("");

    act(() => {
      result.current.resetForm();
    });

    expect(result.current.isFormOpen).toBe(false);
  });

  it("increments dateSelectNonce on date selection", async () => {
    const { result } = renderHook(() => useEvents());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const initialNonce = result.current.dateSelectNonce;
    const day = result.current.calendarDays[10]!;

    act(() => {
      result.current.handleDateSelect(day.key, day);
    });

    expect(result.current.dateSelectNonce).toBe(initialNonce + 1);
  });
});
