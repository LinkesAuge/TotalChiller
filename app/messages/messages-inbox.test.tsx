// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("next-intl", () => ({
  useTranslations: vi.fn(() => vi.fn((key: string) => key)),
  useLocale: vi.fn(() => "de"),
}));
vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: any) => {
    const React = require("react");
    return React.createElement("img", props);
  },
}));
vi.mock("../components/ui/search-input", () => ({
  __esModule: true,
  default: ({ id, value, onChange, placeholder }: any) => {
    const React = require("react");
    return React.createElement("input", {
      id,
      value,
      onChange: (e: any) => onChange(e.target.value),
      placeholder,
      "data-testid": "search-input",
    });
  },
}));
vi.mock("../components/confirm-modal", () => ({
  __esModule: true,
  default: ({ isOpen, title, onConfirm, onCancel }: any) => {
    if (!isOpen) return null;
    const React = require("react");
    return React.createElement(
      "div",
      { "data-testid": "confirm-modal" },
      React.createElement("span", null, title),
      React.createElement("button", { onClick: onConfirm, "data-testid": "confirm-btn" }, "Confirm"),
      React.createElement("button", { onClick: onCancel, "data-testid": "cancel-btn" }, "Cancel"),
    );
  },
}));
vi.mock("../components/data-state", () => ({
  __esModule: true,
  default: ({ children, isLoading, isEmpty, loadingNode, emptyNode }: any) => {
    const React = require("react");
    if (isLoading) return loadingNode || React.createElement("div", null, "Loading...");
    if (isEmpty) return emptyNode || React.createElement("div", null, "Empty");
    return React.createElement(React.Fragment, null, children);
  },
}));
vi.mock("@/lib/date-format", () => ({
  formatLocalDateTime: vi.fn(() => "01.01.2025 12:00"),
}));

import { MessagesInbox } from "./messages-inbox";

const makeThread = (id: string, overrides: any = {}) => ({
  thread_id: id,
  latest_message: {
    sender_id: "u1",
    subject: `Thread ${id}`,
    content: `Content for ${id}`,
    created_at: "2025-01-01T00:00:00Z",
    message_type: "private",
    ...(overrides.message || {}),
  },
  unread_count: 0,
  message_count: 1,
  message_type: "private",
  ...overrides,
});

const makeSentMsg = (id: string, overrides: any = {}) => ({
  id,
  subject: `Sent ${id}`,
  content: `Sent content ${id}`,
  created_at: "2025-01-01T00:00:00Z",
  message_type: "private",
  recipients: [],
  ...overrides,
});

const makeNotification = (id: string, overrides: any = {}) => ({
  id,
  type: "message",
  title: `Notif ${id}`,
  body: `Body ${id}`,
  is_read: false,
  created_at: "2025-01-01T00:00:00Z",
  ...overrides,
});

const makeArchivedItem = (id: string, source: "inbox" | "sent", overrides: any = {}) => ({
  id,
  source,
  subject: `Archived ${id}`,
  content: `Archived content ${id}`,
  created_at: "2025-01-01T00:00:00Z",
  message_type: "private",
  message_count: 1,
  sender_id: source === "inbox" ? "u2" : null,
  recipients: source === "sent" ? [{ label: "User1" }] : [],
  ...overrides,
});

function makeApi(overrides: any = {}): any {
  return {
    viewMode: "inbox",
    typeFilter: "all",
    setTypeFilter: vi.fn(),
    search: "",
    setSearch: vi.fn(),
    inboxThreads: [],
    isInboxLoading: false,
    sentMessages: [],
    isSentLoading: false,
    archivedItems: [],
    isArchiveLoading: false,
    selectedThreadId: null,
    selectedSentMsgId: null,
    totalInboxUnread: 0,
    handleViewModeChange: vi.fn(),
    handleSelectInboxThread: vi.fn(),
    handleSelectSentMessage: vi.fn(),
    handleSelectArchivedItem: vi.fn(),
    getProfileLabel: vi.fn((id: string) => `User-${id}`),
    formatRecipientLabel: vi.fn(() => "To: Someone"),
    getMessageTypeLabel: vi.fn(() => ""),
    deleteConfirm: null,
    setDeleteConfirm: vi.fn(),
    confirmDelete: vi.fn(),
    isDeleting: false,
    checkedIds: new Set<string>(),
    toggleChecked: vi.fn(),
    toggleAllChecked: vi.fn(),
    clearChecked: vi.fn(),
    requestBatchDelete: vi.fn(),
    requestBatchArchive: vi.fn(),
    handleArchive: vi.fn(),
    handleUnarchive: vi.fn(),
    notificationItems: [],
    isNotificationsLoading: false,
    handleDeleteNotification: vi.fn(),
    handleDeleteAllNotifications: vi.fn(),
    handleMarkNotificationRead: vi.fn(),
    ...overrides,
  };
}

describe("MessagesInbox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Tabs ──

  it("renders all four tabs", () => {
    render(<MessagesInbox api={makeApi()} />);
    expect(screen.getByText("inbox")).toBeInTheDocument();
    expect(screen.getByText("sent")).toBeInTheDocument();
    expect(screen.getByText("archive")).toBeInTheDocument();
    expect(screen.getByText("notifications")).toBeInTheDocument();
  });

  it("marks inbox tab as active by default", () => {
    const { container } = render(<MessagesInbox api={makeApi()} />);
    const inboxTab = container.querySelector(".messages-view-tab.active");
    expect(inboxTab?.textContent).toContain("inbox");
  });

  it("calls handleViewModeChange when tabs are clicked", () => {
    const api = makeApi();
    render(<MessagesInbox api={api} />);
    fireEvent.click(screen.getByText("sent"));
    expect(api.handleViewModeChange).toHaveBeenCalledWith("sent");
    fireEvent.click(screen.getByText("archive"));
    expect(api.handleViewModeChange).toHaveBeenCalledWith("archive");
    fireEvent.click(screen.getByText("notifications"));
    expect(api.handleViewModeChange).toHaveBeenCalledWith("notifications");
  });

  it("shows unread badge on inbox tab when totalInboxUnread > 0", () => {
    render(<MessagesInbox api={makeApi({ totalInboxUnread: 5 })} />);
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("does not show unread badge on inbox when totalInboxUnread is 0", () => {
    const { container } = render(<MessagesInbox api={makeApi()} />);
    const badges = container.querySelectorAll(".messages-tab-badge");
    expect(badges.length).toBe(0);
  });

  it("shows unread count badge on notifications tab", () => {
    render(<MessagesInbox api={makeApi({ notificationItems: [makeNotification("n1")] })} />);
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  // ── Inbox filters ──

  it("shows search and type filter in inbox view", () => {
    render(<MessagesInbox api={makeApi()} />);
    expect(screen.getByTestId("search-input")).toBeInTheDocument();
    expect(screen.getByText("all")).toBeInTheDocument();
    expect(screen.getByText("private")).toBeInTheDocument();
    expect(screen.getByText("clan")).toBeInTheDocument();
    expect(screen.getByText("broadcast")).toBeInTheDocument();
  });

  it("shows search and type filter in sent view", () => {
    render(<MessagesInbox api={makeApi({ viewMode: "sent" })} />);
    expect(screen.getByTestId("search-input")).toBeInTheDocument();
  });

  it("does not show filters in archive view", () => {
    render(<MessagesInbox api={makeApi({ viewMode: "archive" })} />);
    expect(screen.queryByTestId("search-input")).not.toBeInTheDocument();
  });

  it("does not show filters in notifications view", () => {
    render(<MessagesInbox api={makeApi({ viewMode: "notifications" })} />);
    expect(screen.queryByTestId("search-input")).not.toBeInTheDocument();
  });

  it("calls setTypeFilter when type tab is clicked", () => {
    const api = makeApi();
    render(<MessagesInbox api={api} />);
    fireEvent.click(screen.getByText("private"));
    expect(api.setTypeFilter).toHaveBeenCalledWith("private");
  });

  // ── Inbox empty / loading ──

  it("shows empty inbox message", () => {
    render(<MessagesInbox api={makeApi()} />);
    expect(screen.getByText("noMessages")).toBeInTheDocument();
  });

  it("shows loading messages in inbox", () => {
    render(<MessagesInbox api={makeApi({ isInboxLoading: true })} />);
    expect(screen.getByText("loadingMessages")).toBeInTheDocument();
  });

  // ── Inbox threads ──

  it("renders inbox thread items", () => {
    render(<MessagesInbox api={makeApi({ inboxThreads: [makeThread("t1")] })} />);
    expect(screen.getByText("Thread t1")).toBeInTheDocument();
    expect(screen.getByText("Content for t1")).toBeInTheDocument();
  });

  it("truncates long content to 80 chars", () => {
    const longContent = "A".repeat(100);
    render(
      <MessagesInbox api={makeApi({ inboxThreads: [makeThread("t1", { message: { content: longContent } })] })} />,
    );
    expect(screen.getByText("A".repeat(80) + "...")).toBeInTheDocument();
  });

  it("shows 'noSubject' when subject is empty", () => {
    render(<MessagesInbox api={makeApi({ inboxThreads: [makeThread("t1", { message: { subject: "" } })] })} />);
    expect(screen.getByText("noSubject")).toBeInTheDocument();
  });

  it("shows sender label", () => {
    render(<MessagesInbox api={makeApi({ inboxThreads: [makeThread("t1")] })} />);
    expect(screen.getByText(/User-u1/)).toBeInTheDocument();
  });

  it("shows system partner for system messages without sender", () => {
    render(
      <MessagesInbox
        api={makeApi({ inboxThreads: [makeThread("t1", { message: { sender_id: null, message_type: "system" } })] })}
      />,
    );
    expect(screen.getByText(/systemPartner/)).toBeInTheDocument();
  });

  it("shows unknown partner when no sender and not system", () => {
    render(
      <MessagesInbox
        api={makeApi({ inboxThreads: [makeThread("t1", { message: { sender_id: null, message_type: "private" } })] })}
      />,
    );
    expect(screen.getByText(/unknownPartner/)).toBeInTheDocument();
  });

  it("calls handleSelectInboxThread when thread is clicked", () => {
    const api = makeApi({ inboxThreads: [makeThread("t1")] });
    render(<MessagesInbox api={api} />);
    fireEvent.click(screen.getByText("Thread t1").closest("[role='button']")!);
    expect(api.handleSelectInboxThread).toHaveBeenCalledWith("t1");
  });

  it("shows unread badge for threads with unread_count > 0", () => {
    const { container } = render(
      <MessagesInbox api={makeApi({ inboxThreads: [makeThread("t1", { unread_count: 3 })] })} />,
    );
    const unreadItem = container.querySelector(".messages-conversation-item.unread");
    expect(unreadItem).toBeTruthy();
    const badges = unreadItem!.querySelectorAll(".badge");
    expect(badges.length).toBeGreaterThan(0);
  });

  it("shows message count badge for multi-message threads", () => {
    render(<MessagesInbox api={makeApi({ inboxThreads: [makeThread("t1", { message_count: 5 })] })} />);
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("marks active thread", () => {
    const { container } = render(
      <MessagesInbox api={makeApi({ inboxThreads: [makeThread("t1")], selectedThreadId: "t1" })} />,
    );
    expect(container.querySelector(".messages-conversation-item.active")).toBeTruthy();
  });

  // ── Thread actions ──

  it("shows archive and delete buttons for inbox threads", () => {
    render(<MessagesInbox api={makeApi({ inboxThreads: [makeThread("t1")] })} />);
    expect(screen.getByLabelText("archiveThread")).toBeInTheDocument();
    expect(screen.getByLabelText("deleteThread")).toBeInTheDocument();
  });

  it("calls handleArchive when archive button is clicked", () => {
    const api = makeApi({ inboxThreads: [makeThread("t1")] });
    render(<MessagesInbox api={api} />);
    fireEvent.click(screen.getByLabelText("archiveThread"));
    expect(api.handleArchive).toHaveBeenCalledWith("thread", ["t1"]);
  });

  it("calls setDeleteConfirm when delete button is clicked", () => {
    const api = makeApi({ inboxThreads: [makeThread("t1")] });
    render(<MessagesInbox api={api} />);
    fireEvent.click(screen.getByLabelText("deleteThread"));
    expect(api.setDeleteConfirm).toHaveBeenCalledWith({ type: "thread", ids: ["t1"] });
  });

  // ── Sent view ──

  it("shows empty sent message", () => {
    render(<MessagesInbox api={makeApi({ viewMode: "sent" })} />);
    expect(screen.getByText("noSentMessages")).toBeInTheDocument();
  });

  it("shows loading in sent view", () => {
    render(<MessagesInbox api={makeApi({ viewMode: "sent", isSentLoading: true })} />);
    expect(screen.getByText("loadingMessages")).toBeInTheDocument();
  });

  it("renders sent messages", () => {
    render(<MessagesInbox api={makeApi({ viewMode: "sent", sentMessages: [makeSentMsg("s1")] })} />);
    expect(screen.getByText("Sent s1")).toBeInTheDocument();
  });

  it("calls handleSelectSentMessage when sent item is clicked", () => {
    const api = makeApi({ viewMode: "sent", sentMessages: [makeSentMsg("s1")] });
    render(<MessagesInbox api={api} />);
    fireEvent.click(screen.getByText("Sent s1").closest("[role='button']")!);
    expect(api.handleSelectSentMessage).toHaveBeenCalledWith("s1");
  });

  it("shows archive and delete buttons for sent messages", () => {
    render(<MessagesInbox api={makeApi({ viewMode: "sent", sentMessages: [makeSentMsg("s1")] })} />);
    expect(screen.getByLabelText("archiveSentMessage")).toBeInTheDocument();
    expect(screen.getByLabelText("deleteSentMessage")).toBeInTheDocument();
  });

  it("calls handleArchive with 'sent' when sent archive button is clicked", () => {
    const api = makeApi({ viewMode: "sent", sentMessages: [makeSentMsg("s1")] });
    render(<MessagesInbox api={api} />);
    fireEvent.click(screen.getByLabelText("archiveSentMessage"));
    expect(api.handleArchive).toHaveBeenCalledWith("sent", ["s1"]);
  });

  it("calls setDeleteConfirm with type 'sent' when sent delete button is clicked", () => {
    const api = makeApi({ viewMode: "sent", sentMessages: [makeSentMsg("s1")] });
    render(<MessagesInbox api={api} />);
    fireEvent.click(screen.getByLabelText("deleteSentMessage"));
    expect(api.setDeleteConfirm).toHaveBeenCalledWith({ type: "sent", ids: ["s1"] });
  });

  it("calls handleSelectSentMessage on Enter keydown for sent item", () => {
    const api = makeApi({ viewMode: "sent", sentMessages: [makeSentMsg("s1")] });
    const { container } = render(<MessagesInbox api={api} />);
    const item = container.querySelector(".messages-conversation-item")!;
    fireEvent.keyDown(item, { key: "Enter" });
    expect(api.handleSelectSentMessage).toHaveBeenCalledWith("s1");
  });

  it("calls handleSelectSentMessage on Space keydown for sent item", () => {
    const api = makeApi({ viewMode: "sent", sentMessages: [makeSentMsg("s1")] });
    const { container } = render(<MessagesInbox api={api} />);
    const item = container.querySelector(".messages-conversation-item")!;
    fireEvent.keyDown(item, { key: " " });
    expect(api.handleSelectSentMessage).toHaveBeenCalledWith("s1");
  });

  it("shows message type badge for sent messages when getMessageTypeLabel returns a value", () => {
    const api = makeApi({
      viewMode: "sent",
      sentMessages: [makeSentMsg("s1")],
      getMessageTypeLabel: vi.fn(() => "BroadcastMsg"),
    });
    render(<MessagesInbox api={api} />);
    expect(screen.getByText("BroadcastMsg")).toBeInTheDocument();
  });

  it("calls toggleChecked when sent message checkbox is clicked", () => {
    const api = makeApi({ viewMode: "sent", sentMessages: [makeSentMsg("s1")] });
    render(<MessagesInbox api={api} />);
    fireEvent.click(screen.getByLabelText("selectMessage"));
    expect(api.toggleChecked).toHaveBeenCalledWith("s1");
  });

  // ── Archive view ──

  it("shows empty archive message", () => {
    render(<MessagesInbox api={makeApi({ viewMode: "archive" })} />);
    expect(screen.getByText("noArchivedMessages")).toBeInTheDocument();
  });

  it("shows loading in archive view", () => {
    render(<MessagesInbox api={makeApi({ viewMode: "archive", isArchiveLoading: true })} />);
    expect(screen.getByText("loadingMessages")).toBeInTheDocument();
  });

  it("renders archived items with source badge", () => {
    const { container } = render(
      <MessagesInbox api={makeApi({ viewMode: "archive", archivedItems: [makeArchivedItem("a1", "inbox")] })} />,
    );
    expect(screen.getByText("Archived a1")).toBeInTheDocument();
    const sourceBadge = container.querySelector(".messages-source-badge.inbox");
    expect(sourceBadge).toBeTruthy();
  });

  it("renders sent source badge for archived sent items", () => {
    const { container } = render(
      <MessagesInbox api={makeApi({ viewMode: "archive", archivedItems: [makeArchivedItem("a1", "sent")] })} />,
    );
    const sourceBadge = container.querySelector(".messages-source-badge.sent");
    expect(sourceBadge).toBeTruthy();
  });

  it("shows unarchive and delete buttons for archive items", () => {
    render(<MessagesInbox api={makeApi({ viewMode: "archive", archivedItems: [makeArchivedItem("a1", "inbox")] })} />);
    expect(screen.getByLabelText("unarchive")).toBeInTheDocument();
    expect(screen.getByLabelText("deleteMessage")).toBeInTheDocument();
  });

  it("calls handleUnarchive for inbox archive items", () => {
    const api = makeApi({ viewMode: "archive", archivedItems: [makeArchivedItem("a1", "inbox")] });
    render(<MessagesInbox api={api} />);
    fireEvent.click(screen.getByLabelText("unarchive"));
    expect(api.handleUnarchive).toHaveBeenCalledWith("thread", ["a1"]);
  });

  it("calls handleUnarchive with 'sent' for sent archive items", () => {
    const api = makeApi({ viewMode: "archive", archivedItems: [makeArchivedItem("a1", "sent")] });
    render(<MessagesInbox api={api} />);
    fireEvent.click(screen.getByLabelText("unarchive"));
    expect(api.handleUnarchive).toHaveBeenCalledWith("sent", ["a1"]);
  });

  it("calls handleSelectArchivedItem on Enter keydown for archive item", () => {
    const api = makeApi({ viewMode: "archive", archivedItems: [makeArchivedItem("a1", "inbox")] });
    const { container } = render(<MessagesInbox api={api} />);
    const item = container.querySelector(".messages-conversation-item")!;
    fireEvent.keyDown(item, { key: "Enter" });
    expect(api.handleSelectArchivedItem).toHaveBeenCalledWith(expect.objectContaining({ id: "a1", source: "inbox" }));
  });

  it("calls handleSelectArchivedItem on Space keydown for archive item", () => {
    const api = makeApi({ viewMode: "archive", archivedItems: [makeArchivedItem("a1", "sent")] });
    const { container } = render(<MessagesInbox api={api} />);
    const item = container.querySelector(".messages-conversation-item")!;
    fireEvent.keyDown(item, { key: " " });
    expect(api.handleSelectArchivedItem).toHaveBeenCalledWith(expect.objectContaining({ id: "a1", source: "sent" }));
  });

  it("calls handleSelectArchivedItem when archive item is clicked", () => {
    const api = makeApi({ viewMode: "archive", archivedItems: [makeArchivedItem("a1", "inbox")] });
    render(<MessagesInbox api={api} />);
    fireEvent.click(screen.getByText("Archived a1").closest("[role='button']")!);
    expect(api.handleSelectArchivedItem).toHaveBeenCalledWith(expect.objectContaining({ id: "a1", source: "inbox" }));
  });

  it("calls toggleChecked when archive item checkbox is clicked", () => {
    const api = makeApi({ viewMode: "archive", archivedItems: [makeArchivedItem("a1", "inbox")] });
    render(<MessagesInbox api={api} />);
    fireEvent.click(screen.getByLabelText("selectMessage"));
    expect(api.toggleChecked).toHaveBeenCalledWith("a1");
  });

  // ── Notifications view ──

  it("shows empty notifications message", () => {
    render(<MessagesInbox api={makeApi({ viewMode: "notifications" })} />);
    expect(screen.getByText("noNotifications")).toBeInTheDocument();
  });

  it("shows loading in notifications view", () => {
    render(<MessagesInbox api={makeApi({ viewMode: "notifications", isNotificationsLoading: true })} />);
    expect(screen.getByText("loadingMessages")).toBeInTheDocument();
  });

  it("renders notification items", () => {
    render(<MessagesInbox api={makeApi({ viewMode: "notifications", notificationItems: [makeNotification("n1")] })} />);
    expect(screen.getByText("Notif n1")).toBeInTheDocument();
    expect(screen.getByText("Body n1")).toBeInTheDocument();
  });

  it("shows delete all notifications button when there are items", () => {
    render(<MessagesInbox api={makeApi({ viewMode: "notifications", notificationItems: [makeNotification("n1")] })} />);
    expect(screen.getByText("deleteAllNotifications")).toBeInTheDocument();
  });

  it("does not show delete all button when no notifications", () => {
    render(<MessagesInbox api={makeApi({ viewMode: "notifications" })} />);
    expect(screen.queryByText("deleteAllNotifications")).not.toBeInTheDocument();
  });

  it("calls handleDeleteNotification when delete is clicked on notification", () => {
    const api = makeApi({ viewMode: "notifications", notificationItems: [makeNotification("n1")] });
    render(<MessagesInbox api={api} />);
    fireEvent.click(screen.getByLabelText("deleteMessage"));
    expect(api.handleDeleteNotification).toHaveBeenCalledWith("n1");
  });

  it("calls handleMarkNotificationRead when notification is clicked", () => {
    const api = makeApi({ viewMode: "notifications", notificationItems: [makeNotification("n1")] });
    render(<MessagesInbox api={api} />);
    fireEvent.click(screen.getByText("Notif n1").closest("[role='button']")!);
    expect(api.handleMarkNotificationRead).toHaveBeenCalledWith("n1");
  });

  it("applies unread class for unread notifications", () => {
    const { container } = render(
      <MessagesInbox
        api={makeApi({ viewMode: "notifications", notificationItems: [makeNotification("n1", { is_read: false })] })}
      />,
    );
    expect(container.querySelector(".messages-conversation-item.unread")).toBeTruthy();
  });

  it("does not apply unread class for read notifications", () => {
    const { container } = render(
      <MessagesInbox
        api={makeApi({ viewMode: "notifications", notificationItems: [makeNotification("n1", { is_read: true })] })}
      />,
    );
    expect(container.querySelector(".messages-conversation-item.unread")).not.toBeTruthy();
  });

  it("does not show notification body when body is null", () => {
    render(
      <MessagesInbox
        api={makeApi({ viewMode: "notifications", notificationItems: [makeNotification("n1", { body: null })] })}
      />,
    );
    expect(screen.queryByText("Body n1")).not.toBeInTheDocument();
  });

  // ── Batch actions ──

  it("shows batch action bar when checkedIds is non-empty", () => {
    const api = makeApi({ checkedIds: new Set(["t1"]), inboxThreads: [makeThread("t1")] });
    render(<MessagesInbox api={api} />);
    expect(screen.getByText("deleteSelected")).toBeInTheDocument();
    expect(screen.getByText("archiveSelected")).toBeInTheDocument();
    expect(screen.getByText("cancel")).toBeInTheDocument();
  });

  it("does not show batch bar when no items checked", () => {
    render(<MessagesInbox api={makeApi()} />);
    expect(screen.queryByText("deleteSelected")).not.toBeInTheDocument();
  });

  it("does not show batch bar in notifications view even with checked items", () => {
    render(<MessagesInbox api={makeApi({ viewMode: "notifications", checkedIds: new Set(["n1"]) })} />);
    expect(screen.queryByText("deleteSelected")).not.toBeInTheDocument();
  });

  it("shows 'unarchiveSelected' in archive view batch bar", () => {
    const api = makeApi({
      viewMode: "archive",
      checkedIds: new Set(["a1"]),
      archivedItems: [makeArchivedItem("a1", "inbox")],
    });
    render(<MessagesInbox api={api} />);
    expect(screen.getByText("unarchiveSelected")).toBeInTheDocument();
  });

  it("calls requestBatchDelete when batch delete is clicked", () => {
    const api = makeApi({ checkedIds: new Set(["t1"]), inboxThreads: [makeThread("t1")] });
    render(<MessagesInbox api={api} />);
    fireEvent.click(screen.getByText("deleteSelected"));
    expect(api.requestBatchDelete).toHaveBeenCalled();
  });

  it("calls requestBatchArchive when batch archive is clicked", () => {
    const api = makeApi({ checkedIds: new Set(["t1"]), inboxThreads: [makeThread("t1")] });
    render(<MessagesInbox api={api} />);
    fireEvent.click(screen.getByText("archiveSelected"));
    expect(api.requestBatchArchive).toHaveBeenCalled();
  });

  it("calls clearChecked when cancel is clicked in batch bar", () => {
    const api = makeApi({ checkedIds: new Set(["t1"]), inboxThreads: [makeThread("t1")] });
    render(<MessagesInbox api={api} />);
    fireEvent.click(screen.getByText("cancel"));
    expect(api.clearChecked).toHaveBeenCalled();
  });

  it("shows selected count text in batch bar", () => {
    const api = makeApi({ checkedIds: new Set(["t1", "t2"]), inboxThreads: [makeThread("t1"), makeThread("t2")] });
    render(<MessagesInbox api={api} />);
    expect(screen.getByText("selectedCount")).toBeInTheDocument();
  });

  // ── Archive item delete button ──

  it("calls setDeleteConfirm with type 'thread' when archive inbox item delete button is clicked", () => {
    const api = makeApi({
      viewMode: "archive",
      archivedItems: [makeArchivedItem("a1", "inbox")],
    });
    render(<MessagesInbox api={api} />);
    fireEvent.click(screen.getByLabelText("deleteMessage"));
    expect(api.setDeleteConfirm).toHaveBeenCalledWith({ type: "thread", ids: ["a1"] });
  });

  it("calls setDeleteConfirm with type 'sent' when archive sent item delete button is clicked", () => {
    const api = makeApi({
      viewMode: "archive",
      archivedItems: [makeArchivedItem("a1", "sent")],
    });
    render(<MessagesInbox api={api} />);
    fireEvent.click(screen.getByLabelText("deleteMessage"));
    expect(api.setDeleteConfirm).toHaveBeenCalledWith({ type: "sent", ids: ["a1"] });
  });

  // ── Archive item badges ──

  it("shows message count badge for archive items with count > 1", () => {
    const api = makeApi({
      viewMode: "archive",
      archivedItems: [makeArchivedItem("a1", "inbox", { message_count: 3 })],
    });
    render(<MessagesInbox api={api} />);
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("does not show message count badge for archive items with count = 1", () => {
    const api = makeApi({
      viewMode: "archive",
      archivedItems: [makeArchivedItem("a1", "inbox", { message_count: 1 })],
    });
    const { container } = render(<MessagesInbox api={api} />);
    const badges = container.querySelectorAll(".messages-meta .badge");
    const textContents = Array.from(badges).map((b) => b.textContent);
    expect(textContents).not.toContain("1");
  });

  it("shows message type badge for archive items when getMessageTypeLabel returns a value", () => {
    const api = makeApi({
      viewMode: "archive",
      archivedItems: [makeArchivedItem("a1", "inbox")],
      getMessageTypeLabel: vi.fn(() => "ClanMsg"),
    });
    render(<MessagesInbox api={api} />);
    expect(screen.getByText("ClanMsg")).toBeInTheDocument();
  });

  it("does not show message type badge for archive items when getMessageTypeLabel returns empty", () => {
    const api = makeApi({
      viewMode: "archive",
      archivedItems: [makeArchivedItem("a1", "inbox")],
      getMessageTypeLabel: vi.fn(() => ""),
    });
    const { container } = render(<MessagesInbox api={api} />);
    const badges = container.querySelectorAll(".messages-meta .badge");
    expect(badges.length).toBe(0);
  });

  // ── Delete all notifications ──

  it("calls handleDeleteAllNotifications when delete all button is clicked", () => {
    const api = makeApi({
      viewMode: "notifications",
      notificationItems: [makeNotification("n1")],
    });
    render(<MessagesInbox api={api} />);
    fireEvent.click(screen.getByText("deleteAllNotifications"));
    expect(api.handleDeleteAllNotifications).toHaveBeenCalled();
  });

  // ── Notification keyboard navigation ──

  it("marks notification as read on Enter keydown", () => {
    const api = makeApi({
      viewMode: "notifications",
      notificationItems: [makeNotification("n1")],
    });
    const { container } = render(<MessagesInbox api={api} />);
    const item = container.querySelector(".messages-conversation-item")!;
    fireEvent.keyDown(item, { key: "Enter" });
    expect(api.handleMarkNotificationRead).toHaveBeenCalledWith("n1");
  });

  it("marks notification as read on Space keydown", () => {
    const api = makeApi({
      viewMode: "notifications",
      notificationItems: [makeNotification("n1")],
    });
    const { container } = render(<MessagesInbox api={api} />);
    const item = container.querySelector(".messages-conversation-item")!;
    fireEvent.keyDown(item, { key: " " });
    expect(api.handleMarkNotificationRead).toHaveBeenCalledWith("n1");
  });

  it("does not mark notification as read on non-Enter/Space keydown", () => {
    const api = makeApi({
      viewMode: "notifications",
      notificationItems: [makeNotification("n1")],
    });
    const { container } = render(<MessagesInbox api={api} />);
    const item = container.querySelector(".messages-conversation-item")!;
    fireEvent.keyDown(item, { key: "Tab" });
    expect(api.handleMarkNotificationRead).not.toHaveBeenCalled();
  });

  // ── Delete confirm modal ──

  it("shows delete confirm modal when deleteConfirm is set", () => {
    render(<MessagesInbox api={makeApi({ deleteConfirm: { type: "thread", ids: ["t1"] } })} />);
    expect(screen.getByTestId("confirm-modal")).toBeInTheDocument();
  });

  it("does not show delete modal when deleteConfirm is null", () => {
    render(<MessagesInbox api={makeApi()} />);
    expect(screen.queryByTestId("confirm-modal")).not.toBeInTheDocument();
  });

  it("calls confirmDelete when confirm button is clicked", () => {
    const api = makeApi({ deleteConfirm: { type: "thread", ids: ["t1"] } });
    render(<MessagesInbox api={api} />);
    fireEvent.click(screen.getByTestId("confirm-btn"));
    expect(api.confirmDelete).toHaveBeenCalled();
  });

  it("calls setDeleteConfirm(null) when cancel button is clicked", () => {
    const api = makeApi({ deleteConfirm: { type: "thread", ids: ["t1"] } });
    render(<MessagesInbox api={api} />);
    fireEvent.click(screen.getByTestId("cancel-btn"));
    expect(api.setDeleteConfirm).toHaveBeenCalledWith(null);
  });

  // ── Checkbox ──

  it("renders checkboxes for inbox threads", () => {
    render(<MessagesInbox api={makeApi({ inboxThreads: [makeThread("t1")] })} />);
    const checkboxes = screen.getAllByLabelText("selectMessage");
    expect(checkboxes.length).toBeGreaterThan(0);
  });

  it("calls toggleChecked when checkbox is clicked", () => {
    const api = makeApi({ inboxThreads: [makeThread("t1")] });
    render(<MessagesInbox api={api} />);
    fireEvent.click(screen.getByLabelText("selectMessage"));
    expect(api.toggleChecked).toHaveBeenCalledWith("t1");
  });
});
