// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { createMockSupabase, createChainableMock } from "@/test/mocks/supabase";

let mockSupabase: ReturnType<typeof createMockSupabase>;
const mockPushToast = vi.fn();

const stableT = vi.fn((key: string) => key);
vi.mock("next-intl", () => ({
  useTranslations: vi.fn(() => stableT),
  useLocale: vi.fn(() => "de"),
}));

vi.mock("@/app/hooks/use-supabase", () => ({
  useSupabase: vi.fn(() => mockSupabase.supabase),
}));

vi.mock("@/app/components/toast-provider", () => ({
  useToast: vi.fn(() => ({ pushToast: mockPushToast })),
}));

vi.mock("@/lib/hooks/use-user-role", () => ({
  useUserRole: vi.fn(() => ({ isContentManager: false, isAnyAdmin: false })),
}));

vi.mock("@/lib/messages/profile-utils", () => ({
  resolveMessageProfileLabel: vi.fn(
    (profile: { display_name?: string; username?: string } | undefined, fallback: string) =>
      profile?.display_name ?? profile?.username ?? fallback,
  ),
}));

import { useMessages } from "./use-messages";
import type { InboxThread, SentMessage } from "@/lib/types/domain";

const MOCK_INBOX_THREAD: InboxThread = {
  thread_id: "thread-1",
  latest_message: {
    id: "msg-latest-1",
    sender_id: "user-2",
    subject: null,
    content: "Latest message",
    message_type: "private",
    thread_id: "thread-1",
    parent_id: null,
    created_at: "2026-01-15T10:00:00Z",
  },
  unread_count: 2,
  message_type: "private",
  sender_id: "user-2",
  message_count: 3,
};

const MOCK_INBOX_THREAD_2: InboxThread = {
  thread_id: "thread-2",
  latest_message: {
    id: "msg-latest-2",
    sender_id: "user-3",
    subject: null,
    content: "Hello",
    message_type: "private",
    thread_id: "thread-2",
    parent_id: null,
    created_at: "2026-01-16T10:00:00Z",
  },
  unread_count: 0,
  message_type: "private",
  sender_id: "user-3",
  message_count: 1,
};

const MOCK_SENT_MESSAGE: SentMessage = {
  id: "msg-1",
  sender_id: "test-user",
  subject: "Sent Message",
  content: "Sent content",
  message_type: "private",
  thread_id: "thread-1",
  parent_id: null,
  created_at: "2026-01-15T10:00:00Z",
  recipient_count: 1,
  recipients: [{ id: "user-2", label: "User2" }],
};

function setupFetch() {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
      if (typeof url === "string" && url.includes("/api/messages/sent")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              data: [MOCK_SENT_MESSAGE],
              profiles: { "user-2": { display_name: "User2", username: "user2" } },
            }),
        });
      }
      if (typeof url === "string" && url.includes("/api/messages/archive")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [], profiles: {} }),
        });
      }
      if (typeof url === "string" && url.includes("/api/messages/thread/")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              data: [
                {
                  id: "msg-1",
                  sender_id: "user-2",
                  content: "Thread message",
                  created_at: "2026-01-15T10:00:00Z",
                  message_type: "private",
                  recipients: [{ id: "test-user", label: "Me" }],
                },
              ],
              profiles: { "user-2": { display_name: "User2" } },
              meta: null,
            }),
        });
      }
      if (typeof url === "string" && url.includes("/api/messages/search-recipients")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              data: [{ id: "user-3", display_name: "User3", username: "user3" }],
            }),
        });
      }
      if (typeof url === "string" && url.includes("/api/notifications")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [] }),
        });
      }
      if (opts?.method === "DELETE" && typeof url === "string" && url.includes("/api/messages/")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      }
      if (opts?.method === "POST" && typeof url === "string" && url.includes("/api/messages")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: { thread_id: "thread-new" } }),
        });
      }
      if (typeof url === "string" && url.includes("/api/messages")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              data: [MOCK_INBOX_THREAD, MOCK_INBOX_THREAD_2],
              profiles: { "user-2": { display_name: "User2", username: "user2" }, "user-3": { display_name: "User3" } },
            }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    }),
  );
}

describe("useMessages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabase();

    mockSupabase.mockFrom.mockImplementation((table: string) => {
      if (table === "clans") {
        return createChainableMock({ data: [], error: null });
      }
      if (table === "game_account_clan_memberships") {
        return createChainableMock({ data: [], error: null });
      }
      if (table === "profiles") {
        return createChainableMock({
          data: { id: "user-2", display_name: "User2", username: "user2" },
          error: null,
        });
      }
      return createChainableMock();
    });

    setupFetch();
  });

  it("starts with inbox view and loading state", () => {
    const { result } = renderHook(() => useMessages({ userId: "test-user" }));

    expect(result.current.viewMode).toBe("inbox");
    expect(result.current.isInboxLoading).toBe(true);
  });

  it("loads inbox threads on mount", async () => {
    const { result } = renderHook(() => useMessages({ userId: "test-user" }));

    await waitFor(() => {
      expect(result.current.isInboxLoading).toBe(false);
    });

    expect(result.current.inboxThreads).toHaveLength(2);
    expect(result.current.inboxThreads[0]!.thread_id).toBe("thread-1");
    expect(result.current.totalInboxUnread).toBe(2);
  });

  it("switches view mode and loads corresponding data", async () => {
    const { result } = renderHook(() => useMessages({ userId: "test-user" }));

    await waitFor(() => {
      expect(result.current.isInboxLoading).toBe(false);
    });

    act(() => {
      result.current.handleViewModeChange("sent");
    });

    expect(result.current.viewMode).toBe("sent");

    await waitFor(() => {
      expect(result.current.isSentLoading).toBe(false);
    });

    expect(result.current.sentMessages).toHaveLength(1);
  });

  it("selects an inbox thread and loads thread messages", async () => {
    const { result } = renderHook(() => useMessages({ userId: "test-user" }));

    await waitFor(() => {
      expect(result.current.isInboxLoading).toBe(false);
    });

    act(() => {
      result.current.handleSelectInboxThread("thread-1");
    });

    expect(result.current.selectedThreadId).toBe("thread-1");

    await waitFor(() => {
      expect(result.current.isThreadLoading).toBe(false);
    });

    expect(result.current.threadMessages).toHaveLength(1);
  });

  it("selects a sent message", async () => {
    const { result } = renderHook(() => useMessages({ userId: "test-user" }));

    await waitFor(() => {
      expect(result.current.isInboxLoading).toBe(false);
    });

    act(() => {
      result.current.handleViewModeChange("sent");
    });

    await waitFor(() => {
      expect(result.current.isSentLoading).toBe(false);
    });

    act(() => {
      result.current.handleSelectSentMessage("msg-1");
    });

    expect(result.current.selectedSentMsgId).toBe("msg-1");
    expect(result.current.selectedSentMessage).toBeDefined();
    expect(result.current.selectedSentMessage?.subject).toBe("Sent Message");
  });

  it("opens and resets compose", async () => {
    const { result } = renderHook(() => useMessages({ userId: "test-user" }));

    await waitFor(() => {
      expect(result.current.isInboxLoading).toBe(false);
    });

    act(() => {
      result.current.setIsComposeOpen(true);
      result.current.setComposeSubject("Test Subject");
      result.current.setComposeContent("Test content");
    });

    expect(result.current.isComposeOpen).toBe(true);
    expect(result.current.composeSubject).toBe("Test Subject");

    act(() => {
      result.current.resetCompose();
    });

    expect(result.current.composeSubject).toBe("");
    expect(result.current.composeContent).toBe("");
    expect(result.current.composeRecipients).toEqual([]);
  });

  it("adds and removes recipients", async () => {
    const { result } = renderHook(() => useMessages({ userId: "test-user" }));

    await waitFor(() => {
      expect(result.current.isInboxLoading).toBe(false);
    });

    act(() => {
      result.current.addRecipient({ id: "user-3", label: "User3" });
    });

    expect(result.current.composeRecipients).toHaveLength(1);
    expect(result.current.composeRecipients[0]!.id).toBe("user-3");

    act(() => {
      result.current.removeRecipient("user-3");
    });

    expect(result.current.composeRecipients).toHaveLength(0);
  });

  it("sends a direct message", async () => {
    const { result } = renderHook(() => useMessages({ userId: "test-user" }));

    await waitFor(() => {
      expect(result.current.isInboxLoading).toBe(false);
    });

    act(() => {
      result.current.addRecipient({ id: "user-2", label: "User2" });
      result.current.setComposeContent("Hello!");
    });

    const fakeEvent = { preventDefault: vi.fn() } as unknown as React.FormEvent<HTMLFormElement>;

    await act(async () => {
      await result.current.handleCompose(fakeEvent);
    });

    expect(result.current.viewMode).toBe("sent");
  });

  it("shows error when composing without content", async () => {
    const { result } = renderHook(() => useMessages({ userId: "test-user" }));

    await waitFor(() => {
      expect(result.current.isInboxLoading).toBe(false);
    });

    const fakeEvent = { preventDefault: vi.fn() } as unknown as React.FormEvent<HTMLFormElement>;

    await act(async () => {
      await result.current.handleCompose(fakeEvent);
    });

    expect(result.current.composeStatus).toBe("messageRequired");
  });

  it("shows error when composing direct without recipient", async () => {
    const { result } = renderHook(() => useMessages({ userId: "test-user" }));

    await waitFor(() => {
      expect(result.current.isInboxLoading).toBe(false);
    });

    act(() => {
      result.current.setComposeContent("Hello!");
    });

    const fakeEvent = { preventDefault: vi.fn() } as unknown as React.FormEvent<HTMLFormElement>;

    await act(async () => {
      await result.current.handleCompose(fakeEvent);
    });

    expect(result.current.composeStatus).toBe("recipientRequired");
  });

  it("clears selection", async () => {
    const { result } = renderHook(() => useMessages({ userId: "test-user" }));

    await waitFor(() => {
      expect(result.current.isInboxLoading).toBe(false);
    });

    act(() => {
      result.current.handleSelectInboxThread("thread-1");
    });

    act(() => {
      result.current.clearSelection();
    });

    expect(result.current.selectedThreadId).toBe("");
    expect(result.current.selectedSentMsgId).toBe("");
  });

  it("deletes a message", async () => {
    const { result } = renderHook(() => useMessages({ userId: "test-user" }));

    await waitFor(() => {
      expect(result.current.isInboxLoading).toBe(false);
    });

    await act(async () => {
      await result.current.handleDeleteMessage("msg-1");
    });

    expect(global.fetch).toHaveBeenCalledWith("/api/messages/msg-1", expect.objectContaining({ method: "DELETE" }));
  });

  it("handles delete message failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string, options?: RequestInit) => {
        if (options?.method === "DELETE" && typeof url === "string" && url.includes("/api/messages/")) {
          return Promise.resolve({ ok: false });
        }
        if (typeof url === "string" && url.includes("/api/messages")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: [MOCK_INBOX_THREAD], profiles: {} }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      }),
    );

    const { result } = renderHook(() => useMessages({ userId: "test-user" }));

    await waitFor(() => {
      expect(result.current.isInboxLoading).toBe(false);
    });

    await act(async () => {
      await result.current.handleDeleteMessage("msg-1");
    });

    expect(mockPushToast).toHaveBeenCalledWith("failedToDelete");
  });

  it("opens reply panel", async () => {
    const { result } = renderHook(() => useMessages({ userId: "test-user" }));

    await waitFor(() => {
      expect(result.current.isInboxLoading).toBe(false);
    });

    act(() => {
      result.current.openReplyToMessage();
    });

    expect(result.current.isReplyOpen).toBe(true);

    act(() => {
      result.current.resetReply();
    });

    expect(result.current.isReplyOpen).toBe(false);
    expect(result.current.replyContent).toBe("");
  });

  it("handles delete notification", async () => {
    const { result } = renderHook(() => useMessages({ userId: "test-user" }));

    await waitFor(() => {
      expect(result.current.isInboxLoading).toBe(false);
    });

    await act(async () => {
      await result.current.handleDeleteNotification("notif-1");
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/notifications/notif-1",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("toggles checked ids for multi-select", async () => {
    const { result } = renderHook(() => useMessages({ userId: "test-user" }));

    await waitFor(() => {
      expect(result.current.isInboxLoading).toBe(false);
    });

    act(() => {
      result.current.toggleChecked("thread-1");
    });

    expect(result.current.checkedIds.has("thread-1")).toBe(true);

    act(() => {
      result.current.toggleChecked("thread-1");
    });

    expect(result.current.checkedIds.has("thread-1")).toBe(false);
  });

  it("respects initialTab parameter", () => {
    const { result } = renderHook(() => useMessages({ userId: "test-user", initialTab: "sent" }));

    expect(result.current.viewMode).toBe("sent");
  });

  it("provides compose mode options", async () => {
    const { result } = renderHook(() => useMessages({ userId: "test-user" }));

    await waitFor(() => {
      expect(result.current.isInboxLoading).toBe(false);
    });

    expect(result.current.composeModeOptions.length).toBeGreaterThanOrEqual(1);
    expect(result.current.composeModeOptions[0]!.value).toBe("direct");
  });

  it("handles inbox load failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (typeof url === "string" && url.includes("/api/messages")) {
          return Promise.resolve({ ok: false });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      }),
    );

    const { result } = renderHook(() => useMessages({ userId: "test-user" }));

    await waitFor(() => {
      expect(result.current.isInboxLoading).toBe(false);
    });

    expect(mockPushToast).toHaveBeenCalledWith("failedToLoad");
  });

  it("switches to archive view", async () => {
    const { result } = renderHook(() => useMessages({ userId: "test-user" }));

    await waitFor(() => {
      expect(result.current.isInboxLoading).toBe(false);
    });

    act(() => {
      result.current.handleViewModeChange("archive");
    });

    expect(result.current.viewMode).toBe("archive");

    await waitFor(() => {
      expect(result.current.isArchiveLoading).toBe(false);
    });
  });

  it("switches to notifications view", async () => {
    const { result } = renderHook(() => useMessages({ userId: "test-user" }));

    await waitFor(() => {
      expect(result.current.isInboxLoading).toBe(false);
    });

    act(() => {
      result.current.handleViewModeChange("notifications");
    });

    expect(result.current.viewMode).toBe("notifications");
  });

  it("sets type filter", async () => {
    const { result } = renderHook(() => useMessages({ userId: "test-user" }));

    await waitFor(() => {
      expect(result.current.isInboxLoading).toBe(false);
    });

    act(() => {
      result.current.setTypeFilter("private");
    });

    expect(result.current.typeFilter).toBe("private");
  });

  it("sets search term", async () => {
    const { result } = renderHook(() => useMessages({ userId: "test-user" }));

    await waitFor(() => {
      expect(result.current.isInboxLoading).toBe(false);
    });

    act(() => {
      result.current.setSearch("hello");
    });

    expect(result.current.search).toBe("hello");
  });

  it("sets compose mode", async () => {
    const { result } = renderHook(() => useMessages({ userId: "test-user" }));

    await waitFor(() => {
      expect(result.current.isInboxLoading).toBe(false);
    });

    act(() => {
      result.current.setComposeMode("clan");
    });

    expect(result.current.composeMode).toBe("clan");
  });

  it("sets compose clan id", async () => {
    const { result } = renderHook(() => useMessages({ userId: "test-user" }));

    await waitFor(() => {
      expect(result.current.isInboxLoading).toBe(false);
    });

    act(() => {
      result.current.setComposeClanId("clan-1");
    });

    expect(result.current.composeClanId).toBe("clan-1");
  });

  it("sets reply content", async () => {
    const { result } = renderHook(() => useMessages({ userId: "test-user" }));

    await waitFor(() => {
      expect(result.current.isInboxLoading).toBe(false);
    });

    act(() => {
      result.current.setReplyContent("My reply");
    });

    expect(result.current.replyContent).toBe("My reply");
  });

  it("handles delete all notifications", async () => {
    const { result } = renderHook(() => useMessages({ userId: "test-user" }));

    await waitFor(() => {
      expect(result.current.isInboxLoading).toBe(false);
    });

    await act(async () => {
      await result.current.handleDeleteAllNotifications();
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/notifications/delete-all",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("handles mark notification read", async () => {
    const { result } = renderHook(() => useMessages({ userId: "test-user" }));

    await waitFor(() => {
      expect(result.current.isInboxLoading).toBe(false);
    });

    await act(async () => {
      await result.current.handleMarkNotificationRead("notif-1");
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/notifications/notif-1",
      expect.objectContaining({ method: "PATCH" }),
    );
  });

  it("sets compose target ranks", async () => {
    const { result } = renderHook(() => useMessages({ userId: "test-user" }));

    await waitFor(() => {
      expect(result.current.isInboxLoading).toBe(false);
    });

    act(() => {
      result.current.setComposeTargetRanks(["leader", "officer"]);
    });

    expect(result.current.composeTargetRanks).toEqual(["leader", "officer"]);
  });

  it("sets compose include webmaster", async () => {
    const { result } = renderHook(() => useMessages({ userId: "test-user" }));

    await waitFor(() => {
      expect(result.current.isInboxLoading).toBe(false);
    });

    act(() => {
      result.current.setComposeIncludeWebmaster(false);
    });

    expect(result.current.composeIncludeWebmaster).toBe(false);
  });

  it("clears checked ids", async () => {
    const { result } = renderHook(() => useMessages({ userId: "test-user" }));

    await waitFor(() => {
      expect(result.current.isInboxLoading).toBe(false);
    });

    act(() => {
      result.current.toggleChecked("thread-1");
      result.current.toggleChecked("thread-2");
    });

    expect(result.current.checkedIds.size).toBe(2);

    act(() => {
      result.current.clearChecked();
    });

    expect(result.current.checkedIds.size).toBe(0);
  });

  it("prevents duplicate recipients", async () => {
    const { result } = renderHook(() => useMessages({ userId: "test-user" }));

    await waitFor(() => {
      expect(result.current.isInboxLoading).toBe(false);
    });

    act(() => {
      result.current.addRecipient({ id: "user-3", label: "User3" });
      result.current.addRecipient({ id: "user-3", label: "User3" });
    });

    expect(result.current.composeRecipients).toHaveLength(1);
  });

  it("defaults to inbox for invalid initialTab", () => {
    const { result } = renderHook(() => useMessages({ userId: "test-user", initialTab: "invalid" }));

    expect(result.current.viewMode).toBe("inbox");
  });

  it("provides getProfileLabel helper", async () => {
    const { result } = renderHook(() => useMessages({ userId: "test-user" }));

    await waitFor(() => {
      expect(result.current.isInboxLoading).toBe(false);
    });

    const label = result.current.getProfileLabel("user-2");
    expect(typeof label).toBe("string");
  });

  it("provides getMessageTypeLabel helper", async () => {
    const { result } = renderHook(() => useMessages({ userId: "test-user" }));

    const label = result.current.getMessageTypeLabel("private");
    expect(typeof label).toBe("string");
  });

  it("exposes canReply boolean", async () => {
    const { result } = renderHook(() => useMessages({ userId: "test-user" }));

    expect(typeof result.current.canReply).toBe("boolean");
  });

  it("exposes selectedInboxThread", async () => {
    const { result } = renderHook(() => useMessages({ userId: "test-user" }));

    await waitFor(() => {
      expect(result.current.isInboxLoading).toBe(false);
    });

    act(() => {
      result.current.handleSelectInboxThread("thread-1");
    });

    expect(result.current.selectedInboxThread?.thread_id).toBe("thread-1");
  });
});
