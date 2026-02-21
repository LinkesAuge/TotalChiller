// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("next-intl", () => ({
  useTranslations: vi.fn(() => vi.fn((key: string) => key)),
  useLocale: vi.fn(() => "de"),
}));
vi.mock("next/dynamic", () => ({
  __esModule: true,
  default: () => {
    const React = require("react");
    return ({ _userId, _api }: any) => React.createElement("div", { "data-testid": "messages-compose" });
  },
}));
vi.mock("../components/ui/game-button", () => ({
  __esModule: true,
  default: ({ children, ...props }: any) => {
    const React = require("react");
    return React.createElement("button", props, children);
  },
}));

const mockUseMessages = vi.fn();
vi.mock("./use-messages", () => ({
  useMessages: (...args: any[]) => mockUseMessages(...args),
}));
vi.mock("./messages-inbox", () => ({
  MessagesInbox: ({ api: _api }: any) => {
    const React = require("react");
    return React.createElement("div", { "data-testid": "messages-inbox" });
  },
}));
vi.mock("./messages-thread", () => ({
  MessagesThread: ({ userId: _userId, api: _api }: any) => {
    const React = require("react");
    return React.createElement("div", { "data-testid": "messages-thread" });
  },
}));

import MessagesClient from "./messages-client";

function baseMessagesApi(overrides: Record<string, any> = {}) {
  return {
    isComposeOpen: false,
    setIsComposeOpen: vi.fn(),
    resetCompose: vi.fn(),
    selectedThreadId: "",
    selectedSentMsgId: "",
    ...overrides,
  };
}

describe("MessagesClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMessages.mockReturnValue(baseMessagesApi());
  });

  it("renders new message button when compose is closed", () => {
    render(<MessagesClient userId="u1" />);
    expect(screen.getByText("newMessage")).toBeInTheDocument();
  });

  it("renders cancel button when compose is open", () => {
    mockUseMessages.mockReturnValue(baseMessagesApi({ isComposeOpen: true }));
    render(<MessagesClient userId="u1" />);
    expect(screen.getByText("cancel")).toBeInTheDocument();
  });

  it("renders compose component when isComposeOpen is true", () => {
    mockUseMessages.mockReturnValue(baseMessagesApi({ isComposeOpen: true }));
    render(<MessagesClient userId="u1" />);
    expect(screen.getByTestId("messages-compose")).toBeInTheDocument();
  });

  it("does not render compose component when isComposeOpen is false", () => {
    render(<MessagesClient userId="u1" />);
    expect(screen.queryByTestId("messages-compose")).not.toBeInTheDocument();
  });

  it("renders inbox component", () => {
    render(<MessagesClient userId="u1" />);
    expect(screen.getByTestId("messages-inbox")).toBeInTheDocument();
  });

  it("renders empty thread placeholder when no thread is selected", () => {
    render(<MessagesClient userId="u1" />);
    expect(screen.getByText("selectMessage")).toBeInTheDocument();
  });

  it("renders thread panel when a thread is selected", () => {
    mockUseMessages.mockReturnValue(baseMessagesApi({ selectedThreadId: "t1" }));
    render(<MessagesClient userId="u1" />);
    expect(screen.getByTestId("messages-thread")).toBeInTheDocument();
  });

  it("renders thread panel when a sent message is selected", () => {
    mockUseMessages.mockReturnValue(baseMessagesApi({ selectedSentMsgId: "s1" }));
    render(<MessagesClient userId="u1" />);
    expect(screen.getByTestId("messages-thread")).toBeInTheDocument();
  });

  it("adds thread-active class when thread is selected", () => {
    mockUseMessages.mockReturnValue(baseMessagesApi({ selectedThreadId: "t1" }));
    const { container } = render(<MessagesClient userId="u1" />);
    expect(container.querySelector(".thread-active")).toBeTruthy();
  });

  it("calls setIsComposeOpen on new message click", () => {
    const setIsComposeOpen = vi.fn();
    mockUseMessages.mockReturnValue(baseMessagesApi({ setIsComposeOpen }));
    render(<MessagesClient userId="u1" />);
    fireEvent.click(screen.getByText("newMessage"));
    expect(setIsComposeOpen).toHaveBeenCalledWith(true);
  });

  it("calls resetCompose and setIsComposeOpen on cancel click", () => {
    const resetCompose = vi.fn();
    const setIsComposeOpen = vi.fn();
    mockUseMessages.mockReturnValue(baseMessagesApi({ isComposeOpen: true, resetCompose, setIsComposeOpen }));
    render(<MessagesClient userId="u1" />);
    fireEvent.click(screen.getByText("cancel"));
    expect(resetCompose).toHaveBeenCalled();
    expect(setIsComposeOpen).toHaveBeenCalledWith(false);
  });
});
