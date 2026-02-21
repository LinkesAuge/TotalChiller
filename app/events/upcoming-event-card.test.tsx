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

import UpcomingEventCard from "./upcoming-event-card";

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

describe("UpcomingEventCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders card with title, time, location, organizer", () => {
    render(<UpcomingEventCard {...makeProps()} />);
    expect(screen.getByText("Test Event")).toBeDefined();
    expect(screen.getByText("12:00")).toBeDefined();
    expect(screen.getByText("Test Location")).toBeDefined();
    expect(screen.getByText("TestOrg")).toBeDefined();
  });

  it("shows banner when banner_url is set", () => {
    render(<UpcomingEventCard {...makeProps({ entry: makeEvent({ banner_url: "/banner.png" }) })} />);
    const imgs = screen.getAllByRole("img");
    expect(imgs.length).toBeGreaterThanOrEqual(1);
    expect(imgs[0]!.getAttribute("src")).toBe("/banner.png");
  });

  it("shows recurrence label when recurrence_type !== 'none'", () => {
    render(<UpcomingEventCard {...makeProps({ entry: makeEvent({ recurrence_type: "weekly" }) })} />);
    expect(screen.getByText("weekly")).toBeDefined();
  });

  it("calls onSelectEvent on click", () => {
    const onSelectEvent = vi.fn();
    const entry = makeEvent();
    render(<UpcomingEventCard {...makeProps({ onSelectEvent, entry })} />);
    fireEvent.click(screen.getByText("Test Event").closest("article")!);
    expect(onSelectEvent).toHaveBeenCalledWith(entry);
  });

  it("calls onEditEvent on edit button click", () => {
    const onEditEvent = vi.fn();
    render(<UpcomingEventCard {...makeProps({ canManage: true, onEditEvent })} />);
    fireEvent.click(screen.getByLabelText("editEvent"));
    expect(onEditEvent).toHaveBeenCalledWith("evt-1");
  });

  it("calls onDeleteEvent on delete button click", () => {
    const onDeleteEvent = vi.fn();
    render(<UpcomingEventCard {...makeProps({ canManage: true, onDeleteEvent })} />);
    fireEvent.click(screen.getByLabelText("deleteEvent"));
    expect(onDeleteEvent).toHaveBeenCalledWith("evt-1");
  });

  it("calls onTogglePin on pin button click", () => {
    const onTogglePin = vi.fn();
    render(<UpcomingEventCard {...makeProps({ canManage: true, onTogglePin })} />);
    fireEvent.click(screen.getByLabelText("pinEvent"));
    expect(onTogglePin).toHaveBeenCalledWith("evt-1", false);
  });

  it("shows manage actions when canManage=true", () => {
    render(<UpcomingEventCard {...makeProps({ canManage: true })} />);
    expect(screen.getByLabelText("editEvent")).toBeDefined();
    expect(screen.getByLabelText("deleteEvent")).toBeDefined();
    expect(screen.getByLabelText("pinEvent")).toBeDefined();
  });

  it("hides manage actions when canManage=false", () => {
    render(<UpcomingEventCard {...makeProps({ canManage: false })} />);
    expect(screen.queryByLabelText("editEvent")).toBeNull();
    expect(screen.queryByLabelText("deleteEvent")).toBeNull();
    expect(screen.queryByLabelText("pinEvent")).toBeNull();
  });

  it("shows forum thread link when forum_post_id is set", () => {
    render(<UpcomingEventCard {...makeProps({ entry: makeEvent({ forum_post_id: "fp-1" }) })} />);
    expect(screen.getByLabelText("goToThread")).toBeDefined();
    expect(screen.getByLabelText("goToThread").getAttribute("href")).toBe("/forum?post=fp-1");
  });

  it("shows author with edited indicator", () => {
    const { container } = render(
      <UpcomingEventCard
        {...makeProps({
          entry: makeEvent({
            author_name: "Author",
            created_at: "2025-06-01T10:00:00Z",
            updated_at: "2025-06-02T10:00:00Z",
          }),
        })}
      />,
    );
    expect(screen.getByText("createdBy")).toBeDefined();
    expect(container.querySelector(".upcoming-event-edited")).not.toBeNull();
  });
});
