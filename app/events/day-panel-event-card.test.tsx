// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { DisplayEvent } from "./events-types";

vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: any) => {
    const React = require("react");
    return React.createElement("img", props);
  },
}));

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

import DayPanelEventCard from "./day-panel-event-card";

function makeEvent(overrides: Partial<DisplayEvent> = {}): DisplayEvent {
  return {
    id: "evt-1",
    displayKey: "evt-1-dk",
    title: "Test Event",
    description: "A test event",
    location: "Test Location",
    starts_at: "2025-06-15T12:00:00Z",
    ends_at: "2025-06-15T14:00:00Z",
    created_at: "2025-06-01T10:00:00Z",
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

function makeProps(overrides: Record<string, any> = {}) {
  return {
    entry: makeEvent(),
    isExpanded: false,
    onToggleExpand: vi.fn(),
    onEditEvent: vi.fn(),
    onDeleteEvent: vi.fn(),
    onTogglePin: vi.fn(),
    canManage: false,
    locale: "de",
    t: vi.fn((key: string) => key),
    ...overrides,
  };
}

describe("DayPanelEventCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders collapsed card with title, time, location, organizer", () => {
    render(<DayPanelEventCard {...makeProps()} />);
    expect(screen.getByText("Test Event")).toBeDefined();
    expect(screen.getByText("12:00")).toBeDefined();
    expect(screen.getByText("Test Location")).toBeDefined();
    expect(screen.getByText("TestOrg")).toBeDefined();
  });

  it("shows pinned badge when is_pinned=true", () => {
    render(<DayPanelEventCard {...makeProps({ entry: makeEvent({ is_pinned: true }) })} />);
    expect(screen.getByText("pinned")).toBeDefined();
  });

  it("shows recurrence badge when recurrence_type !== 'none'", () => {
    render(<DayPanelEventCard {...makeProps({ entry: makeEvent({ recurrence_type: "weekly" }) })} />);
    expect(screen.getByText("weekly")).toBeDefined();
  });

  it("shows banner when banner_url is set (collapsed)", () => {
    render(<DayPanelEventCard {...makeProps({ entry: makeEvent({ banner_url: "/banner.png" }) })} />);
    const imgs = screen.getAllByRole("img");
    expect(imgs.length).toBeGreaterThanOrEqual(1);
    expect(imgs[0]!.getAttribute("src")).toBe("/banner.png");
  });

  it("shows banner when banner_url is set (expanded)", () => {
    render(
      <DayPanelEventCard
        {...makeProps({
          isExpanded: true,
          entry: makeEvent({ banner_url: "/banner.png" }),
        })}
      />,
    );
    const imgs = screen.getAllByRole("img");
    expect(imgs.length).toBeGreaterThanOrEqual(1);
  });

  it("shows manage buttons when canManage=true", () => {
    render(<DayPanelEventCard {...makeProps({ canManage: true })} />);
    expect(screen.getByLabelText("editEvent")).toBeDefined();
    expect(screen.getByLabelText("deleteEvent")).toBeDefined();
    expect(screen.getByLabelText("pinEvent")).toBeDefined();
  });

  it("hides manage buttons when canManage=false", () => {
    render(<DayPanelEventCard {...makeProps({ canManage: false })} />);
    expect(screen.queryByLabelText("editEvent")).toBeNull();
    expect(screen.queryByLabelText("deleteEvent")).toBeNull();
    expect(screen.queryByLabelText("pinEvent")).toBeNull();
  });

  it("shows forum thread link when forum_post_id is set", () => {
    render(<DayPanelEventCard {...makeProps({ entry: makeEvent({ forum_post_id: "fp-1" }) })} />);
    expect(screen.getByLabelText("goToThread")).toBeDefined();
    expect(screen.getByLabelText("goToThread").getAttribute("href")).toBe("/forum?post=fp-1");
  });

  it("calls onToggleExpand when card row clicked", () => {
    const onToggleExpand = vi.fn();
    render(<DayPanelEventCard {...makeProps({ onToggleExpand })} />);
    fireEvent.click(screen.getByText("Test Event").closest("[role='button']")!);
    expect(onToggleExpand).toHaveBeenCalledWith("evt-1-dk");
  });

  it("calls onEditEvent on edit button click", () => {
    const onEditEvent = vi.fn();
    render(<DayPanelEventCard {...makeProps({ canManage: true, onEditEvent })} />);
    fireEvent.click(screen.getByLabelText("editEvent"));
    expect(onEditEvent).toHaveBeenCalledWith("evt-1");
  });

  it("calls onDeleteEvent on delete button click", () => {
    const onDeleteEvent = vi.fn();
    render(<DayPanelEventCard {...makeProps({ canManage: true, onDeleteEvent })} />);
    fireEvent.click(screen.getByLabelText("deleteEvent"));
    expect(onDeleteEvent).toHaveBeenCalledWith("evt-1");
  });

  it("calls onTogglePin on pin button click", () => {
    const onTogglePin = vi.fn();
    render(<DayPanelEventCard {...makeProps({ canManage: true, onTogglePin })} />);
    fireEvent.click(screen.getByLabelText("pinEvent"));
    expect(onTogglePin).toHaveBeenCalledWith("evt-1", false);
  });

  it("shows expanded content when isExpanded=true", () => {
    render(<DayPanelEventCard {...makeProps({ isExpanded: true, entry: makeEvent({ description: "Desc" }) })} />);
    expect(screen.getByText("hide")).toBeDefined();
    expect(screen.getByText("createdBy")).toBeDefined();
  });

  it("shows edited indicator when updated_at !== created_at", () => {
    const { container } = render(
      <DayPanelEventCard
        {...makeProps({
          isExpanded: true,
          entry: makeEvent({
            created_at: "2025-06-01T10:00:00Z",
            updated_at: "2025-06-02T10:00:00Z",
          }),
        })}
      />,
    );
    expect(container.querySelector(".day-panel-expanded-edited")).not.toBeNull();
  });
});
