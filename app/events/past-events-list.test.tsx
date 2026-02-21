// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { DisplayEvent, EventRow } from "./events-types";

vi.mock("next/dynamic", () => ({
  __esModule: true,
  default: (_loader: any) => {
    const Component = (props: any) => {
      const React = require("react");
      return React.createElement("div", { "data-testid": "dynamic-component" }, props.content || "dynamic");
    };
    Component.displayName = "DynamicMock";
    return Component;
  },
}));

vi.mock("../../lib/date-format", () => ({
  formatLocalDateTime: vi.fn(() => "01.01.2025 12:00"),
}));

vi.mock("./events-utils", () => ({
  formatDuration: vi.fn(() => "2h"),
  formatDateRange: vi.fn(() => "Jan 1 - Jan 2"),
  isMultiDayEvent: vi.fn(() => false),
  getDateBadgeParts: vi.fn(() => ({ weekday: "Mon", day: "1", month: "Jan" })),
  getShortTimeString: vi.fn(() => "12:00"),
  getRecurrenceLabel: vi.fn((type: string) => type),
  sortPinnedFirst: vi.fn((events: any[]) => events),
  sortBannerEvents: vi.fn((events: any[]) => events),
  formatDurationFromHours: vi.fn(() => "2h 30m"),
}));

vi.mock("../components/ui/game-button", () => ({
  __esModule: true,
  default: ({ children, ...props }: any) => {
    const React = require("react");
    return React.createElement("button", props, children);
  },
}));

import { PastEventsList } from "./past-events-list";

function makeEvent(overrides: Partial<DisplayEvent> = {}): DisplayEvent {
  return {
    id: "evt-1",
    displayKey: "evt-1-dk",
    title: "Past Event",
    description: "A past event",
    location: "Test Location",
    starts_at: "2025-01-15T12:00:00Z",
    ends_at: "2025-01-15T14:00:00Z",
    created_at: "2025-01-01T10:00:00Z",
    updated_at: null,
    organizer: "TestOrg",
    author_name: "Author",
    recurrence_type: "none",
    recurrence_end_date: null,
    banner_url: null,
    is_pinned: false,
    forum_post_id: null,
    isVirtual: false,
    ...overrides,
  };
}

function makeSourceEvent(overrides: Partial<EventRow> = {}): EventRow {
  return {
    id: "evt-1",
    title: "Past Event",
    description: "A past event",
    location: "Test Location",
    starts_at: "2025-01-15T12:00:00Z",
    ends_at: "2025-01-15T14:00:00Z",
    created_at: "2025-01-01T10:00:00Z",
    updated_at: null,
    created_by: "user-1",
    organizer: "TestOrg",
    author_name: "Author",
    recurrence_type: "none",
    recurrence_end_date: null,
    banner_url: null,
    is_pinned: false,
    forum_post_id: null,
    ...overrides,
  };
}

function makeProps(overrides: Record<string, any> = {}) {
  return {
    pastEvents: [makeEvent()] as DisplayEvent[],
    sourceEvents: [makeSourceEvent()] as EventRow[],
    isExpanded: false,
    onToggleExpand: vi.fn(),
    onEditEvent: vi.fn(),
    onDeleteEvent: vi.fn(),
    onSaveAsTemplate: vi.fn(),
    isSavingTemplate: false,
    canManage: false,
    locale: "de",
    t: vi.fn((key: string) => key),
    ...overrides,
  };
}

describe("PastEventsList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders past events count and toggle button", () => {
    render(<PastEventsList {...makeProps()} />);
    expect(screen.getByText("past (1)")).toBeDefined();
    expect(screen.getByText("show")).toBeDefined();
  });

  it("shows events when expanded", () => {
    render(<PastEventsList {...makeProps({ isExpanded: true })} />);
    expect(screen.getByText("Past Event")).toBeDefined();
  });

  it("hides events when collapsed", () => {
    render(<PastEventsList {...makeProps({ isExpanded: false })} />);
    expect(screen.queryByText("Past Event")).toBeNull();
  });

  it("calls onToggleExpand when toggle button clicked", () => {
    const onToggleExpand = vi.fn();
    render(<PastEventsList {...makeProps({ onToggleExpand })} />);
    fireEvent.click(screen.getByText("show"));
    expect(onToggleExpand).toHaveBeenCalled();
  });

  it("shows manage buttons when canManage=true and expanded", () => {
    render(<PastEventsList {...makeProps({ isExpanded: true, canManage: true })} />);
    expect(screen.getByText("editEvent")).toBeDefined();
    expect(screen.getByText("deleteEvent")).toBeDefined();
  });

  it("hides manage buttons when canManage=false and expanded", () => {
    render(<PastEventsList {...makeProps({ isExpanded: true, canManage: false })} />);
    expect(screen.queryByText("editEvent")).toBeNull();
    expect(screen.queryByText("deleteEvent")).toBeNull();
  });

  it("shows save as template button when canManage=true and sourceEvent exists", () => {
    render(<PastEventsList {...makeProps({ isExpanded: true, canManage: true })} />);
    expect(screen.getByText("saveAsTemplate")).toBeDefined();
  });

  it("shows edited indicator when updated_at !== created_at", () => {
    const { container } = render(
      <PastEventsList
        {...makeProps({
          isExpanded: true,
          pastEvents: [
            makeEvent({
              created_at: "2025-01-01T10:00:00Z",
              updated_at: "2025-01-02T10:00:00Z",
            }),
          ],
        })}
      />,
    );
    expect(container.querySelector(".past-event-edited")).not.toBeNull();
  });
});
