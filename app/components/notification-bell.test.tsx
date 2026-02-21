// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, fireEvent, waitFor } from "@testing-library/react";
import NotificationBell from "./notification-bell";

const mockPush = vi.fn();
vi.mock("next-intl", () => ({
  useTranslations: vi.fn(() =>
    vi.fn((key: string, params?: Record<string, unknown>) => (params ? `${key}(${JSON.stringify(params)})` : key)),
  ),
  useLocale: vi.fn(() => "de"),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));
vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, ...props }: any) => {
    const React = require("react");
    return React.createElement("a", props, children);
  },
}));
vi.mock("@/lib/date-format", () => ({
  formatTimeAgo: vi.fn(() => "5m ago"),
}));

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

const NOTIF_READ = {
  id: "n-1",
  type: "message",
  title: "New Message",
  body: "Hey there",
  is_read: true,
  created_at: "2026-01-01T00:00:00Z",
};
const NOTIF_UNREAD = {
  id: "n-2",
  type: "news",
  title: "News Update",
  body: null,
  is_read: false,
  created_at: "2026-01-02T00:00:00Z",
};
const NOTIF_EVENT = {
  id: "n-3",
  type: "event",
  title: "Event Coming",
  body: "Join us",
  is_read: false,
  created_at: "2026-01-03T00:00:00Z",
};
const NOTIF_UNKNOWN = {
  id: "n-4",
  type: "other",
  title: "System Alert",
  body: null,
  is_read: false,
  created_at: "2026-01-04T00:00:00Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ data: [] }),
  });
});

const defaultProps = {
  isOpen: false,
  onToggle: vi.fn(),
  onClose: vi.fn(),
};

describe("NotificationBell", () => {
  it("renders bell trigger button", async () => {
    await act(async () => {
      render(<NotificationBell {...defaultProps} />);
    });
    const trigger = screen.getByRole("button");
    expect(trigger).toBeDefined();
  });

  it("shows no badge when unread count is 0", async () => {
    await act(async () => {
      render(<NotificationBell {...defaultProps} />);
    });
    expect(screen.queryByText(/\d+/)).toBeNull();
  });

  it("does not show panel when isOpen=false", async () => {
    await act(async () => {
      render(<NotificationBell {...defaultProps} />);
    });
    expect(screen.queryByText("title")).toBeNull();
  });

  it("shows panel with title when isOpen=true", async () => {
    await act(async () => {
      render(<NotificationBell {...defaultProps} isOpen />);
    });
    expect(screen.getByText("title")).toBeDefined();
  });

  it("shows empty state when no notifications", async () => {
    await act(async () => {
      render(<NotificationBell {...defaultProps} isOpen />);
    });
    expect(screen.getByText("noNotifications")).toBeDefined();
  });

  it('shows "viewAllMessages" link in footer', async () => {
    await act(async () => {
      render(<NotificationBell {...defaultProps} isOpen />);
    });
    expect(screen.getByText("viewAllMessages")).toBeDefined();
  });

  it("calls onToggle when bell clicked", async () => {
    const onToggle = vi.fn();
    await act(async () => {
      render(<NotificationBell {...defaultProps} onToggle={onToggle} />);
    });
    fireEvent.click(screen.getByRole("button"));
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it("displays unread badge when there are unread notifications", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [NOTIF_UNREAD, NOTIF_EVENT, NOTIF_UNKNOWN] }),
    });
    await act(async () => {
      render(<NotificationBell {...defaultProps} />);
    });
    expect(screen.getByText("3")).toBeDefined();
  });

  it("shows 99+ when unread count exceeds 99", async () => {
    const manyUnread = Array.from({ length: 100 }, (_, i) => ({
      id: `n-${i}`,
      type: "message",
      title: `Notification ${i}`,
      body: null,
      is_read: false,
      created_at: "2026-01-01T00:00:00Z",
    }));
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: manyUnread }),
    });
    await act(async () => {
      render(<NotificationBell {...defaultProps} />);
    });
    expect(screen.getByText("99+")).toBeDefined();
  });

  it("renders notification items when panel is open", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [NOTIF_READ, NOTIF_UNREAD] }),
    });
    await act(async () => {
      render(<NotificationBell {...defaultProps} isOpen />);
    });
    expect(screen.getByText("New Message")).toBeDefined();
    expect(screen.getByText("News Update")).toBeDefined();
  });

  it("renders notification body when present", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [NOTIF_READ] }),
    });
    await act(async () => {
      render(<NotificationBell {...defaultProps} isOpen />);
    });
    expect(screen.getByText("Hey there")).toBeDefined();
  });

  it("does not render body when null", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [NOTIF_UNREAD] }),
    });
    await act(async () => {
      render(<NotificationBell {...defaultProps} isOpen />);
    });
    expect(screen.queryByText("Hey there")).toBeNull();
  });

  it("shows markAllRead button when there are unread notifications", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [NOTIF_UNREAD] }),
    });
    await act(async () => {
      render(<NotificationBell {...defaultProps} isOpen />);
    });
    expect(screen.getByText("markAllRead")).toBeDefined();
  });

  it("hides markAllRead button when all are read", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [NOTIF_READ] }),
    });
    await act(async () => {
      render(<NotificationBell {...defaultProps} isOpen />);
    });
    expect(screen.queryByText("markAllRead")).toBeNull();
  });

  it("shows deleteAll button when there are notifications", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [NOTIF_READ] }),
    });
    await act(async () => {
      render(<NotificationBell {...defaultProps} isOpen />);
    });
    expect(screen.getByText("deleteAll")).toBeDefined();
  });

  it("calls mark all read API on click", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [NOTIF_UNREAD] }),
    });
    await act(async () => {
      render(<NotificationBell {...defaultProps} isOpen />);
    });
    await act(async () => {
      fireEvent.click(screen.getByText("markAllRead"));
    });
    expect(mockFetch).toHaveBeenCalledWith("/api/notifications/mark-all-read", { method: "POST" });
  });

  it("calls delete-all API on click", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [NOTIF_READ] }),
    });
    await act(async () => {
      render(<NotificationBell {...defaultProps} isOpen />);
    });
    await act(async () => {
      fireEvent.click(screen.getByText("deleteAll"));
    });
    expect(mockFetch).toHaveBeenCalledWith("/api/notifications/delete-all", { method: "POST" });
  });

  it("deletes a single notification when delete button clicked", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [NOTIF_READ] }),
    });
    await act(async () => {
      render(<NotificationBell {...defaultProps} isOpen />);
    });
    const deleteBtn = screen.getByLabelText("deleteNotification");
    await act(async () => {
      fireEvent.click(deleteBtn);
    });
    expect(mockFetch).toHaveBeenCalledWith("/api/notifications/n-1", { method: "DELETE" });
  });

  it("marks notification as read and navigates on click", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [NOTIF_UNREAD] }),
    });
    const onClose = vi.fn();
    await act(async () => {
      render(<NotificationBell {...defaultProps} isOpen onClose={onClose} />);
    });
    await act(async () => {
      fireEvent.click(screen.getByText("News Update"));
    });
    expect(mockFetch).toHaveBeenCalledWith("/api/notifications/n-2", { method: "PATCH" });
    expect(onClose).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/news");
  });

  it("navigates to correct route for event type", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [NOTIF_EVENT] }),
    });
    await act(async () => {
      render(<NotificationBell {...defaultProps} isOpen />);
    });
    await act(async () => {
      fireEvent.click(screen.getByText("Event Coming"));
    });
    expect(mockPush).toHaveBeenCalledWith("/events");
  });

  it("navigates to /messages for unknown type", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [NOTIF_UNKNOWN] }),
    });
    await act(async () => {
      render(<NotificationBell {...defaultProps} isOpen />);
    });
    await act(async () => {
      fireEvent.click(screen.getByText("System Alert"));
    });
    expect(mockPush).toHaveBeenCalledWith("/messages");
  });

  it("does not call PATCH for already-read notification click", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [NOTIF_READ] }),
    });
    await act(async () => {
      render(<NotificationBell {...defaultProps} isOpen />);
    });
    mockFetch.mockClear();
    await act(async () => {
      fireEvent.click(screen.getByText("New Message"));
    });
    const patchCalls = mockFetch.mock.calls.filter(
      ([url, opts]: any[]) =>
        typeof url === "string" && url.includes("/api/notifications/n-1") && opts?.method === "PATCH",
    );
    expect(patchCalls).toHaveLength(0);
  });

  it("handles keyboard Enter on notification item", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [NOTIF_UNREAD] }),
    });
    await act(async () => {
      render(<NotificationBell {...defaultProps} isOpen />);
    });
    const item = screen.getByText("News Update").closest("[role='button']") as HTMLElement;
    await act(async () => {
      fireEvent.keyDown(item, { key: "Enter" });
    });
    expect(mockPush).toHaveBeenCalledWith("/news");
  });

  it("opens settings panel when gear button clicked", async () => {
    await act(async () => {
      render(<NotificationBell {...defaultProps} isOpen />);
    });
    const gearBtn = screen.getByLabelText("settingsAriaLabel");
    await act(async () => {
      fireEvent.click(gearBtn);
    });
    expect(screen.getByText("messages")).toBeDefined();
    expect(screen.getByText("news")).toBeDefined();
    expect(screen.getByText("events")).toBeDefined();
    expect(screen.getByText("system")).toBeDefined();
  });

  it("toggles a notification preference", async () => {
    mockFetch.mockImplementation(async (url: string, opts?: any) => {
      if (url === "/api/notification-settings" && !opts?.method) {
        return {
          ok: true,
          json: async () => ({
            data: {
              messages_enabled: true,
              news_enabled: true,
              events_enabled: true,
              system_enabled: true,
              bugs_email_enabled: false,
            },
          }),
        };
      }
      if (url === "/api/notification-settings" && opts?.method === "PATCH") {
        return { ok: true };
      }
      return { ok: true, json: async () => ({ data: [] }) };
    });
    await act(async () => {
      render(<NotificationBell {...defaultProps} isOpen />);
    });
    const gearBtn = screen.getByLabelText("settingsAriaLabel");
    await act(async () => {
      fireEvent.click(gearBtn);
    });
    await waitFor(() => {
      expect(screen.getByRole("checkbox", { name: "messages" })).toBeDefined();
    });
    const messagesToggle = screen.getByRole("checkbox", { name: "messages" }) as HTMLInputElement;
    expect(messagesToggle.checked).toBe(true);
    await act(async () => {
      fireEvent.click(messagesToggle);
    });
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/notification-settings",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ messages_enabled: false }),
      }),
    );
  });

  it("reverts preference on failed PATCH", async () => {
    mockFetch.mockImplementation(async (url: string, opts?: any) => {
      if (url === "/api/notification-settings" && !opts?.method) {
        return {
          ok: true,
          json: async () => ({
            data: {
              messages_enabled: true,
              news_enabled: true,
              events_enabled: true,
              system_enabled: true,
              bugs_email_enabled: false,
            },
          }),
        };
      }
      if (url === "/api/notification-settings" && opts?.method === "PATCH") {
        return { ok: false };
      }
      return { ok: true, json: async () => ({ data: [] }) };
    });
    await act(async () => {
      render(<NotificationBell {...defaultProps} isOpen />);
    });
    const gearBtn = screen.getByLabelText("settingsAriaLabel");
    await act(async () => {
      fireEvent.click(gearBtn);
    });
    await waitFor(() => {
      expect(screen.getByRole("checkbox", { name: "messages" })).toBeDefined();
    });
    const toggle = screen.getByRole("checkbox", { name: "messages" }) as HTMLInputElement;
    expect(toggle.checked).toBe(true);
    await act(async () => {
      fireEvent.click(toggle);
    });
    await waitFor(() => {
      const updated = screen.getByRole("checkbox", { name: "messages" }) as HTMLInputElement;
      expect(updated.checked).toBe(true);
    });
  });

  it("loads preferences when panel opens", async () => {
    mockFetch.mockImplementation(async (url: string) => {
      if (url === "/api/notification-settings") {
        return {
          ok: true,
          json: async () => ({
            data: {
              messages_enabled: false,
              news_enabled: true,
              events_enabled: false,
              system_enabled: true,
              bugs_email_enabled: false,
            },
          }),
        };
      }
      return { ok: true, json: async () => ({ data: [] }) };
    });
    await act(async () => {
      render(<NotificationBell {...defaultProps} isOpen />);
    });
    expect(mockFetch).toHaveBeenCalledWith("/api/notification-settings");
  });

  it("fetches notifications on mount", async () => {
    await act(async () => {
      render(<NotificationBell {...defaultProps} />);
    });
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/notifications",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("handles fetch error gracefully", async () => {
    mockFetch.mockImplementation(async (url: string) => {
      if (url === "/api/notification-settings") {
        return { ok: true, json: async () => ({ data: null }) };
      }
      throw new Error("Network error");
    });
    await act(async () => {
      render(<NotificationBell {...defaultProps} isOpen />);
    });
    await waitFor(() => {
      expect(screen.getByText("noNotifications")).toBeDefined();
    });
  });

  it("renders all notification type icons", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [NOTIF_READ, NOTIF_UNREAD, NOTIF_EVENT, NOTIF_UNKNOWN] }),
    });
    await act(async () => {
      render(<NotificationBell {...defaultProps} isOpen />);
    });
    const icons = document.querySelectorAll(".notification-bell__icon svg");
    expect(icons.length).toBe(4);
  });

  it("applies unread class to unread items", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [NOTIF_READ, NOTIF_UNREAD] }),
    });
    await act(async () => {
      render(<NotificationBell {...defaultProps} isOpen />);
    });
    const items = document.querySelectorAll(".notification-bell__item");
    expect(items.length).toBe(2);
    expect(items[0]?.className).not.toContain("unread");
    expect(items[1]?.className).toContain("unread");
  });

  it("viewAllMessages links to /messages?tab=notifications", async () => {
    await act(async () => {
      render(<NotificationBell {...defaultProps} isOpen />);
    });
    const link = screen.getByText("viewAllMessages").closest("a");
    expect(link?.getAttribute("href")).toBe("/messages?tab=notifications");
  });
});
