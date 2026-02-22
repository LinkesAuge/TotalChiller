// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { DisplayEvent } from "./events-types";

vi.mock("next/image", () => ({
  __esModule: true,
  default: ({ fill, priority, unoptimized, ...props }: any) => {
    const React = require("react");
    return React.createElement("img", props);
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

import { UpcomingEventsSidebar } from "./upcoming-events-sidebar";

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
    event_type_id: null,
    isVirtual: false,
    ...overrides,
  };
}

function makeProps(overrides: Record<string, any> = {}) {
  return {
    upcomingEvents: [] as DisplayEvent[],
    pageSize: 3,
    currentPage: 1,
    onPageChange: vi.fn(),
    onSelectEvent: vi.fn(),
    onEditEvent: vi.fn(),
    onDeleteEvent: vi.fn(),
    onTogglePin: vi.fn(),
    canManage: false,
    locale: "de",
    t: vi.fn((key: string) => key),
    ...overrides,
  };
}

describe("UpcomingEventsSidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders title and event count", () => {
    const events = [makeEvent(), makeEvent({ id: "evt-2", displayKey: "evt-2-dk", title: "Second" })];
    render(<UpcomingEventsSidebar {...makeProps({ upcomingEvents: events })} />);
    expect(screen.getByText("upcoming")).toBeDefined();
    expect(screen.getByText("2")).toBeDefined();
  });

  it("shows empty state when no events", () => {
    render(<UpcomingEventsSidebar {...makeProps({ upcomingEvents: [] })} />);
    expect(screen.getByText("noEvents")).toBeDefined();
  });

  it("renders event cards", () => {
    const events = [
      makeEvent({ title: "Event A" }),
      makeEvent({ id: "evt-2", displayKey: "evt-2-dk", title: "Event B" }),
    ];
    render(<UpcomingEventsSidebar {...makeProps({ upcomingEvents: events })} />);
    expect(screen.getByText("Event A")).toBeDefined();
    expect(screen.getByText("Event B")).toBeDefined();
  });

  it("shows pagination when totalPages > 1", () => {
    const events = Array.from({ length: 7 }, (_, i) =>
      makeEvent({ id: `evt-${i}`, displayKey: `evt-${i}-dk`, title: `Event ${i}` }),
    );
    render(<UpcomingEventsSidebar {...makeProps({ upcomingEvents: events, pageSize: 3 })} />);
    expect(screen.getByText("1 / 3")).toBeDefined();
  });

  it("next pagination button calls onPageChange", () => {
    const onPageChange = vi.fn();
    const events = Array.from({ length: 7 }, (_, i) =>
      makeEvent({ id: `evt-${i}`, displayKey: `evt-${i}-dk`, title: `Event ${i}` }),
    );
    render(<UpcomingEventsSidebar {...makeProps({ upcomingEvents: events, pageSize: 3, onPageChange })} />);
    fireEvent.click(screen.getByLabelText("next"));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("prev pagination button calls onPageChange", () => {
    const onPageChange = vi.fn();
    const events = Array.from({ length: 7 }, (_, i) =>
      makeEvent({ id: `evt-${i}`, displayKey: `evt-${i}-dk`, title: `Event ${i}` }),
    );
    render(
      <UpcomingEventsSidebar {...makeProps({ upcomingEvents: events, pageSize: 3, currentPage: 2, onPageChange })} />,
    );
    fireEvent.click(screen.getByLabelText("prev"));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it("prev button is disabled on page 1", () => {
    const events = Array.from({ length: 7 }, (_, i) =>
      makeEvent({ id: `evt-${i}`, displayKey: `evt-${i}-dk`, title: `Event ${i}` }),
    );
    render(<UpcomingEventsSidebar {...makeProps({ upcomingEvents: events, pageSize: 3, currentPage: 1 })} />);
    const prevBtn = screen.getByLabelText("prev");
    expect(prevBtn.hasAttribute("disabled")).toBe(true);
  });
});
