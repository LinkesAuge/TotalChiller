// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("next-intl", () => ({
  useTranslations: vi.fn(() => vi.fn((key: string) => key)),
  useLocale: vi.fn(() => "de"),
}));

vi.mock("../hooks/use-supabase", () => ({
  useSupabase: vi.fn(() => ({})),
}));

vi.mock("../components/ui/radix-select", () => ({
  __esModule: true,
  default: ({ value, onValueChange, options, ariaLabel }: any) => {
    const React = require("react");
    return React.createElement(
      "select",
      { value, onChange: (e: any) => onValueChange(e.target.value), "aria-label": ariaLabel },
      options?.map((o: any) => React.createElement("option", { key: o.value, value: o.value }, o.label)),
    );
  },
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

vi.mock("../components/ui/game-button", () => ({
  __esModule: true,
  default: ({ children, ...props }: any) => {
    const React = require("react");
    return React.createElement("button", props, children);
  },
}));

vi.mock("./rank-filter", () => ({
  RankFilter: (props: any) => {
    const React = require("react");
    return React.createElement("div", { "data-testid": "rank-filter" });
  },
}));

vi.mock("@/lib/constants", () => ({ MESSAGE_IMAGES_BUCKET: "message-images" }));

import { MessagesCompose } from "./messages-compose";

function makeApi(overrides: any = {}): any {
  return {
    isComposeOpen: true,
    composeMode: "direct",
    setComposeMode: vi.fn(),
    composeRecipients: [],
    composeClanId: "",
    setComposeClanId: vi.fn(),
    composeSubject: "",
    setComposeSubject: vi.fn(),
    composeContent: "",
    setComposeContent: vi.fn(),
    composeStatus: "",
    composeModeOptions: [
      { value: "direct", label: "Direct" },
      { value: "clan", label: "Clan" },
      { value: "global", label: "Global" },
    ],
    composeTargetRanks: [],
    setComposeTargetRanks: vi.fn(),
    composeIncludeWebmaster: false,
    setComposeIncludeWebmaster: vi.fn(),
    recipientSearch: "",
    setRecipientSearch: vi.fn(),
    recipientResults: [],
    isSearching: false,
    isSearchDropdownOpen: false,
    setIsSearchDropdownOpen: vi.fn(),
    searchWrapperRef: { current: null },
    clans: [],
    addRecipient: vi.fn(),
    removeRecipient: vi.fn(),
    resetCompose: vi.fn(),
    handleCompose: vi.fn((e: any) => e.preventDefault()),
    ...overrides,
  };
}

describe("MessagesCompose", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty fragment when isComposeOpen=false", () => {
    const api = makeApi({ isComposeOpen: false });
    const { container } = render(<MessagesCompose userId="u1" api={api} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders compose form with title", () => {
    const api = makeApi();
    render(<MessagesCompose userId="u1" api={api} />);
    expect(screen.getByText("newMessage")).toBeTruthy();
  });

  it("shows mode tabs when multiple options", () => {
    const api = makeApi();
    render(<MessagesCompose userId="u1" api={api} />);
    expect(screen.getByText("Direct")).toBeTruthy();
    expect(screen.getByText("Clan")).toBeTruthy();
    expect(screen.getByText("Global")).toBeTruthy();
  });

  it("shows recipient search in direct mode", () => {
    const api = makeApi({ composeMode: "direct" });
    render(<MessagesCompose userId="u1" api={api} />);
    expect(screen.getByText("to")).toBeTruthy();
    expect(screen.getByPlaceholderText("searchRecipient")).toBeTruthy();
  });

  it("shows clan selector in clan mode", () => {
    const api = makeApi({
      composeMode: "clan",
      clans: [{ id: "c1", name: "Alpha" }],
    });
    render(<MessagesCompose userId="u1" api={api} />);
    expect(screen.getByRole("combobox", { name: "clan" })).toBeTruthy();
  });

  it("shows rank filter in clan/global mode", () => {
    const api = makeApi({ composeMode: "clan" });
    const { rerender } = render(<MessagesCompose userId="u1" api={api} />);
    expect(screen.getByTestId("rank-filter")).toBeTruthy();

    const apiGlobal = makeApi({ composeMode: "global" });
    rerender(<MessagesCompose userId="u1" api={apiGlobal} />);
    expect(screen.getByTestId("rank-filter")).toBeTruthy();
  });

  it("shows subject and content fields", () => {
    const api = makeApi();
    render(<MessagesCompose userId="u1" api={api} />);
    expect(screen.getByText("subject")).toBeTruthy();
    expect(screen.getByPlaceholderText("subjectPlaceholder")).toBeTruthy();
    expect(screen.getByTestId("md-editor-composeContent")).toBeTruthy();
  });

  it("shows submit button with send label for direct mode", () => {
    const api = makeApi({ composeMode: "direct" });
    render(<MessagesCompose userId="u1" api={api} />);
    expect(screen.getByText("send")).toBeTruthy();
  });

  it("shows submit button with sendBroadcast for non-direct mode", () => {
    const api = makeApi({ composeMode: "clan" });
    render(<MessagesCompose userId="u1" api={api} />);
    expect(screen.getByText("sendBroadcast")).toBeTruthy();
  });

  it("shows compose status when set", () => {
    const api = makeApi({ composeStatus: "Sending..." });
    render(<MessagesCompose userId="u1" api={api} />);
    expect(screen.getByText("Sending...")).toBeTruthy();
  });

  it("shows recipient chips when composeRecipients has items", () => {
    const api = makeApi({
      composeRecipients: [
        { id: "r1", label: "Alice" },
        { id: "r2", label: "Bob" },
      ],
    });
    render(<MessagesCompose userId="u1" api={api} />);
    expect(screen.getByText("Alice")).toBeTruthy();
    expect(screen.getByText("Bob")).toBeTruthy();
  });

  it("removes recipient chip on x button click", () => {
    const removeRecipient = vi.fn();
    const api = makeApi({
      composeRecipients: [{ id: "r1", label: "Alice" }],
      removeRecipient,
    });
    render(<MessagesCompose userId="u1" api={api} />);
    const removeButtons = screen.getAllByRole("button", { name: "removeRecipient" });
    fireEvent.click(removeButtons[0]!);
    expect(removeRecipient).toHaveBeenCalledWith("r1");
  });
});
