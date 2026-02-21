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

vi.mock("next/dynamic", () => ({
  __esModule: true,
  default: () => {
    const Component = (props: any) => {
      const React = require("react");
      return React.createElement("div", { "data-testid": "app-markdown" }, props.content);
    };
    Component.displayName = "DynamicMock";
    return Component;
  },
}));

vi.mock("../hooks/use-supabase", () => ({
  useSupabase: vi.fn(() => ({})),
}));

vi.mock("../components/markdown-editor", () => ({
  __esModule: true,
  default: (props: any) => {
    const React = require("react");
    return React.createElement("textarea", {
      "data-testid": `md-editor-${props.id}`,
      value: props.value,
      onChange: (e: any) => props.onChange(e.target.value),
    });
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

vi.mock("../components/ui/game-button", () => ({
  __esModule: true,
  default: ({ children, ...props }: any) => {
    const React = require("react");
    return React.createElement("button", props, children);
  },
}));

vi.mock("@/lib/date-format", () => ({
  formatLocalDateTime: vi.fn(() => "01.01.2025 12:00"),
}));

vi.mock("@/lib/constants", () => ({ MESSAGE_IMAGES_BUCKET: "message-images" }));

import { MessagesThread } from "./messages-thread";

function makeApi(overrides: any = {}): any {
  return {
    viewMode: "inbox",
    selectedThreadId: null,
    selectedSentMsgId: null,
    threadMessages: [],
    isThreadLoading: false,
    selectedSentMessage: null,
    canReply: false,
    isReplyOpen: false,
    replyContent: "",
    setReplyContent: vi.fn(),
    replyStatus: "",
    openReplyToMessage: vi.fn(),
    handleSendReply: vi.fn((e: any) => e.preventDefault()),
    resetReply: vi.fn(),
    handleDeleteMessage: vi.fn(),
    getProfileLabel: vi.fn((id: string) => `User-${id}`),
    formatRecipientLabel: vi.fn(() => "To: Someone"),
    clearSelection: vi.fn(),
    threadMeta: null,
    ...overrides,
  };
}

describe("MessagesThread", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("shows selectMessage placeholder when no thread/sent selected", () => {
    const api = makeApi();
    render(<MessagesThread userId="u1" api={api} />);
    expect(screen.getByText("selectMessage")).toBeTruthy();
  });

  it("shows thread timeline when selectedThreadId is set", () => {
    const api = makeApi({
      selectedThreadId: "t1",
      threadMessages: [
        {
          id: "m1",
          sender_id: "u2",
          subject: "Hello",
          content: "Hi there",
          created_at: "2025-01-01T12:00:00Z",
          message_type: "direct",
        },
        {
          id: "m2",
          sender_id: "u1",
          subject: "Hello",
          content: "Hey back",
          created_at: "2025-01-01T12:05:00Z",
          message_type: "direct",
        },
      ],
    });
    render(<MessagesThread userId="u1" api={api} />);
    expect(screen.getByText("Hello")).toBeTruthy();
    expect(screen.getAllByTestId("app-markdown")).toHaveLength(2);
    expect(screen.getByText("User-u2")).toBeTruthy();
    expect(screen.getByText("you")).toBeTruthy();
  });

  it("shows back button that calls clearSelection", () => {
    const clearSelection = vi.fn();
    const api = makeApi({
      selectedThreadId: "t1",
      threadMessages: [
        {
          id: "m1",
          sender_id: "u2",
          subject: "Test",
          content: "msg",
          created_at: "2025-01-01T12:00:00Z",
          message_type: "direct",
        },
      ],
      clearSelection,
    });
    render(<MessagesThread userId="u1" api={api} />);
    const backBtn = screen.getByText("backToInbox");
    fireEvent.click(backBtn);
    expect(clearSelection).toHaveBeenCalled();
  });

  it("shows reply button when canReply is true", () => {
    const openReplyToMessage = vi.fn();
    const api = makeApi({
      selectedThreadId: "t1",
      threadMessages: [
        {
          id: "m1",
          sender_id: "u2",
          subject: "Test",
          content: "msg",
          created_at: "2025-01-01T12:00:00Z",
          message_type: "direct",
        },
      ],
      canReply: true,
      openReplyToMessage,
    });
    render(<MessagesThread userId="u1" api={api} />);
    const replyBtn = screen.getByText("reply");
    expect(replyBtn).toBeTruthy();
    fireEvent.click(replyBtn);
    expect(openReplyToMessage).toHaveBeenCalled();
  });

  it("shows reply form when isReplyOpen is true", () => {
    const api = makeApi({
      selectedThreadId: "t1",
      threadMessages: [
        {
          id: "m1",
          sender_id: "u2",
          subject: "Test",
          content: "msg",
          created_at: "2025-01-01T12:00:00Z",
          message_type: "direct",
        },
      ],
      canReply: true,
      isReplyOpen: true,
    });
    render(<MessagesThread userId="u1" api={api} />);
    expect(screen.getByTestId("md-editor-replyContent")).toBeTruthy();
    expect(screen.getByText("send")).toBeTruthy();
    expect(screen.getByText("cancel")).toBeTruthy();
  });

  it("shows sent message detail when selectedSentMsgId is set", () => {
    const api = makeApi({
      viewMode: "sent",
      selectedSentMsgId: "s1",
      selectedSentMessage: {
        id: "s1",
        subject: "Sent Subject",
        content: "Sent content",
        created_at: "2025-01-01T12:00:00Z",
        recipient_count: 1,
        recipients: [{ id: "r1", label: "Alice" }],
      },
    });
    render(<MessagesThread userId="u1" api={api} />);
    expect(screen.getByText("Sent Subject")).toBeTruthy();
    expect(screen.getByText("To: Someone")).toBeTruthy();
  });

  it("shows broadcast recipient info when recipient_count > 1", () => {
    const api = makeApi({
      viewMode: "sent",
      selectedSentMsgId: "s1",
      selectedSentMessage: {
        id: "s1",
        subject: "Broadcast",
        content: "Broadcast content",
        created_at: "2025-01-01T12:00:00Z",
        recipient_count: 3,
        recipients: [
          { id: "r1", label: "Alice" },
          { id: "r2", label: "Bob" },
          { id: "r3", label: "Charlie" },
        ],
      },
    });
    render(<MessagesThread userId="u1" api={api} />);
    expect(screen.getByText("Alice, Bob, Charlie")).toBeTruthy();
  });
});
