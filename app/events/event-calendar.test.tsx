// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: any) => {
    const React = require("react");
    return React.createElement("img", props);
  },
}));

vi.mock("./day-panel-event-card", () => ({
  __esModule: true,
  default: ({ entry }: any) => {
    const React = require("react");
    return React.createElement("div", { "data-testid": `event-card-${entry.id}` }, entry.title);
  },
}));
vi.mock("./events-utils", () => ({
  formatDuration: () => "1h",
  formatDateRange: () => "Jan 1 - Jan 2",
  isMultiDayEvent: () => false,
  sortPinnedFirst: (events: any[]) => events,
  getShortTimeString: () => "12:00",
  sortBannerEvents: (events: any[]) => events,
}));
vi.mock("@/lib/dashboard-utils", () => ({
  toDateString: (d: Date) => d.toISOString().slice(0, 10),
}));

import { EventCalendar, EventDayPanel } from "./event-calendar";
import type { CalendarDay, DisplayEvent } from "./events-types";

const t = vi.fn((key: string) => key);

function makeCalendarDay(overrides: Partial<CalendarDay> = {}): CalendarDay {
  return {
    key: "2025-01-15",
    date: new Date("2025-01-15"),
    isCurrentMonth: true,
    isToday: false,
    events: [],
    ...overrides,
  };
}

function makeEvent(overrides: Partial<DisplayEvent> = {}): DisplayEvent {
  return {
    id: "e1",
    displayKey: "e1-2025-01-15",
    title: "Test Event",
    starts_at: "2025-01-15T12:00:00Z",
    ends_at: "2025-01-15T14:00:00Z",
    location: "",
    organizer: "",
    description: "",
    is_pinned: false,
    banner_url: null,
    forum_post_id: null,
    created_by: "u1",
    ...overrides,
  } as DisplayEvent;
}

describe("EventCalendar", () => {
  const defaultProps = {
    calendarMonth: new Date("2025-01-01"),
    calendarDays: [] as CalendarDay[],
    selectedDateKey: "2025-01-15",
    todayKey: "2025-01-15",
    totalEventsCount: 0,
    onMonthShift: vi.fn(),
    onDateSelect: vi.fn(),
    onJumpToToday: vi.fn(),
    canManage: false,
    locale: "de",
    t,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the calendar card", () => {
    render(<EventCalendar {...defaultProps} />);
    expect(screen.getByText("monthlyOverview")).toBeInTheDocument();
  });

  it("displays total events count", () => {
    const { container } = render(<EventCalendar {...defaultProps} totalEventsCount={5} />);
    const badge = container.querySelector(".pin-badge");
    expect(badge).toBeTruthy();
    expect(badge!.textContent).toContain("5");
    expect(badge!.textContent).toContain("totalEvents");
  });

  it("renders weekday headers", () => {
    render(<EventCalendar {...defaultProps} />);
    expect(screen.getByText("weekMon")).toBeInTheDocument();
    expect(screen.getByText("weekSun")).toBeInTheDocument();
  });

  it("renders prev and next navigation buttons", () => {
    render(<EventCalendar {...defaultProps} />);
    const prevBtn = screen.getByLabelText("prev");
    const nextBtn = screen.getByLabelText("next");
    expect(prevBtn).toBeInTheDocument();
    expect(nextBtn).toBeInTheDocument();
  });

  it("calls onMonthShift when nav buttons are clicked", () => {
    const onMonthShift = vi.fn();
    render(<EventCalendar {...defaultProps} onMonthShift={onMonthShift} />);
    fireEvent.click(screen.getByLabelText("prev"));
    expect(onMonthShift).toHaveBeenCalledWith(-1);
    fireEvent.click(screen.getByLabelText("next"));
    expect(onMonthShift).toHaveBeenCalledWith(1);
  });

  it("calls onJumpToToday when today button is clicked", () => {
    const onJumpToToday = vi.fn();
    const { container } = render(<EventCalendar {...defaultProps} onJumpToToday={onJumpToToday} />);
    const todayBtn = container.querySelector(".calendar-today-btn") as HTMLElement;
    fireEvent.click(todayBtn);
    expect(onJumpToToday).toHaveBeenCalled();
  });

  it("renders day cells for calendar days", () => {
    const days = [makeCalendarDay({ key: "2025-01-15" })];
    render(<EventCalendar {...defaultProps} calendarDays={days} />);
    expect(screen.getByText("15")).toBeInTheDocument();
  });

  it("calls onDateSelect when a day cell is clicked", () => {
    const onDateSelect = vi.fn();
    const day = makeCalendarDay({ key: "2025-01-20", date: new Date("2025-01-20") });
    render(<EventCalendar {...defaultProps} calendarDays={[day]} onDateSelect={onDateSelect} />);
    fireEvent.click(screen.getByText("20"));
    expect(onDateSelect).toHaveBeenCalledWith("2025-01-20", day);
  });
});

describe("EventDayPanel", () => {
  const defaultProps = {
    selectedDateLabel: "15 Jan 2025",
    selectionNonce: 0,
    selectedDayEvents: [] as DisplayEvent[],
    onEditEvent: vi.fn(),
    onDeleteEvent: vi.fn(),
    onTogglePin: vi.fn(),
    canManage: false,
    locale: "de",
    t,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders selected day header", () => {
    render(<EventDayPanel {...defaultProps} />);
    expect(screen.getByText("selectedDay")).toBeInTheDocument();
    expect(screen.getByText("15 Jan 2025")).toBeInTheDocument();
  });

  it("renders empty message when no events", () => {
    render(<EventDayPanel {...defaultProps} />);
    expect(screen.getByText("noEventsOnDay")).toBeInTheDocument();
  });

  it("renders event cards when events are present", () => {
    const events = [makeEvent({ id: "e1", title: "Morning Event" })];
    render(<EventDayPanel {...defaultProps} selectedDayEvents={events} />);
    expect(screen.getByTestId("event-card-e1")).toBeInTheDocument();
    expect(screen.getByText("Morning Event")).toBeInTheDocument();
  });

  it("shows 'show more' button when more than 3 events", () => {
    const events = Array.from({ length: 5 }, (_, i) =>
      makeEvent({ id: `e${i}`, displayKey: `e${i}-d`, title: `Event ${i}` }),
    );
    render(<EventDayPanel {...defaultProps} selectedDayEvents={events} />);
    expect(screen.getByText(/show/)).toBeInTheDocument();
  });

  it("loads more events when 'show more' is clicked", () => {
    const events = Array.from({ length: 5 }, (_, i) =>
      makeEvent({ id: `e${i}`, displayKey: `e${i}-d`, title: `Event ${i}` }),
    );
    render(<EventDayPanel {...defaultProps} selectedDayEvents={events} />);
    fireEvent.click(screen.getByText(/show/));
    expect(screen.getByText("Event 4")).toBeInTheDocument();
  });

  it("renders multiple event cards for visible events", () => {
    const events = [
      makeEvent({ id: "e1", displayKey: "e1-d", title: "Morning" }),
      makeEvent({ id: "e2", displayKey: "e2-d", title: "Afternoon" }),
    ];
    render(<EventDayPanel {...defaultProps} selectedDayEvents={events} />);
    expect(screen.getByTestId("event-card-e1")).toBeInTheDocument();
    expect(screen.getByTestId("event-card-e2")).toBeInTheDocument();
  });

  it("resets visible count when selectionNonce changes", () => {
    const events = Array.from({ length: 5 }, (_, i) =>
      makeEvent({ id: `e${i}`, displayKey: `e${i}-d`, title: `Event ${i}` }),
    );
    const { rerender } = render(<EventDayPanel {...defaultProps} selectedDayEvents={events} selectionNonce={0} />);
    fireEvent.click(screen.getByText(/show/));
    expect(screen.getByText("Event 4")).toBeInTheDocument();

    rerender(<EventDayPanel {...defaultProps} selectedDayEvents={events} selectionNonce={1} />);
    expect(screen.queryByText("Event 4")).not.toBeInTheDocument();
  });

  it("uses highlightEventId to expand specific event", () => {
    const events = [
      makeEvent({ id: "e1", displayKey: "e1-d", title: "First" }),
      makeEvent({ id: "e2", displayKey: "e2-d", title: "Second" }),
    ];
    render(<EventDayPanel {...defaultProps} selectedDayEvents={events} highlightEventId="e2" />);
    expect(screen.getByTestId("event-card-e2")).toBeInTheDocument();
  });
});

describe("EventCalendar – day cells with events", () => {
  const t = vi.fn((key: string) => key);

  const defaultProps = {
    calendarMonth: new Date("2025-01-01"),
    calendarDays: [] as CalendarDay[],
    selectedDateKey: "2025-01-15",
    todayKey: "2025-01-15",
    totalEventsCount: 0,
    onMonthShift: vi.fn(),
    onDateSelect: vi.fn(),
    onJumpToToday: vi.fn(),
    canManage: false,
    locale: "de",
    t,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders colored dots for events without banners", () => {
    const day = makeCalendarDay({
      key: "2025-01-15",
      events: [makeEvent({ id: "e1", banner_url: null, title: "No Banner" })],
    });
    const { container } = render(<EventCalendar {...defaultProps} calendarDays={[day]} />);
    const dots = container.querySelectorAll(".calendar-dot");
    expect(dots.length).toBe(1);
  });

  it("renders event title and time for single event day", () => {
    const day = makeCalendarDay({
      key: "2025-01-15",
      events: [makeEvent({ id: "e1", title: "Team Meeting", banner_url: null })],
    });
    const { container } = render(<EventCalendar {...defaultProps} calendarDays={[day]} />);
    expect(container.querySelector(".calendar-day-title")?.textContent).toBe("Team Meeting");
    expect(container.querySelector(".calendar-day-time")).toBeTruthy();
  });

  it("renders 'X more' label for 2+ events", () => {
    const day = makeCalendarDay({
      key: "2025-01-15",
      events: [
        makeEvent({ id: "e1", title: "Event 1", banner_url: null }),
        makeEvent({ id: "e2", title: "Event 2", banner_url: null }),
      ],
    });
    const { container } = render(<EventCalendar {...defaultProps} calendarDays={[day]} />);
    const moreLabel = container.querySelector(".calendar-day-more-label");
    expect(moreLabel?.textContent).toContain("1");
    expect(moreLabel?.textContent).toContain("more");
  });

  it("renders split banner for exactly 2 events with banners", () => {
    const day = makeCalendarDay({
      key: "2025-01-15",
      events: [
        makeEvent({ id: "e1", title: "Banner1", banner_url: "https://example.com/a.png" }),
        makeEvent({ id: "e2", title: "Banner2", banner_url: "https://example.com/b.png" }),
      ],
    });
    const { container } = render(<EventCalendar {...defaultProps} calendarDays={[day]} />);
    expect(container.querySelector(".has-split-banner")).toBeTruthy();
    expect(container.querySelector(".calendar-split-top")).toBeTruthy();
    expect(container.querySelector(".calendar-split-bottom")).toBeTruthy();
  });

  it("renders single banner as background image", () => {
    const day = makeCalendarDay({
      key: "2025-01-15",
      events: [makeEvent({ id: "e1", title: "WithBanner", banner_url: "https://example.com/bg.png" })],
    });
    const { container } = render(<EventCalendar {...defaultProps} calendarDays={[day]} />);
    const cell = container.querySelector(".has-banner");
    expect(cell).toBeTruthy();
    expect((cell as HTMLElement).style.backgroundImage).toContain("bg.png");
  });

  it("applies today class to today's cell", () => {
    const day = makeCalendarDay({ key: "2025-01-15", isToday: true });
    const { container } = render(<EventCalendar {...defaultProps} calendarDays={[day]} todayKey="2025-01-15" />);
    expect(container.querySelector(".today")).toBeTruthy();
  });

  it("applies selected class to selected cell", () => {
    const day = makeCalendarDay({ key: "2025-01-15" });
    const { container } = render(<EventCalendar {...defaultProps} calendarDays={[day]} selectedDateKey="2025-01-15" />);
    expect(container.querySelector(".selected")).toBeTruthy();
  });

  it("applies muted class to non-current-month cells", () => {
    const day = makeCalendarDay({ key: "2025-01-15", isCurrentMonth: false });
    const { container } = render(<EventCalendar {...defaultProps} calendarDays={[day]} />);
    expect(container.querySelector(".muted")).toBeTruthy();
  });

  it("shows tooltip on hover over day with events", () => {
    const day = makeCalendarDay({
      key: "2025-01-15",
      events: [makeEvent({ id: "e1", title: "Hover Event" })],
    });
    const { container } = render(<EventCalendar {...defaultProps} calendarDays={[day]} />);
    const cell = container.querySelector(".calendar-day-cell");
    if (cell) fireEvent.mouseEnter(cell);
    expect(container.querySelector("[role='tooltip']")).toBeTruthy();
  });

  it("hides tooltip on mouse leave", async () => {
    vi.useFakeTimers();
    const day = makeCalendarDay({
      key: "2025-01-15",
      events: [makeEvent({ id: "e1", title: "Hover Event" })],
    });
    const { container } = render(<EventCalendar {...defaultProps} calendarDays={[day]} />);
    const cell = container.querySelector(".calendar-day-cell");
    if (cell) {
      fireEvent.mouseEnter(cell);
      expect(container.querySelector("[role='tooltip']")).toBeTruthy();
      fireEvent.mouseLeave(cell);
      await act(async () => {
        vi.advanceTimersByTime(200);
      });
    }
    expect(container.querySelector("[role='tooltip']")).toBeNull();
    vi.useRealTimers();
  });

  it("renders pinned event title when one is pinned", () => {
    const day = makeCalendarDay({
      key: "2025-01-15",
      events: [
        makeEvent({ id: "e1", title: "Normal", is_pinned: false, banner_url: null }),
        makeEvent({ id: "e2", title: "Pinned", is_pinned: true, banner_url: null }),
      ],
    });
    const { container } = render(<EventCalendar {...defaultProps} calendarDays={[day]} />);
    expect(container.querySelector(".calendar-day-title")?.textContent).toBe("Pinned");
  });

  it("displays month label from calendarMonth prop", () => {
    render(<EventCalendar {...defaultProps} calendarMonth={new Date("2025-06-01")} />);
    const { container } = render(<EventCalendar {...defaultProps} calendarMonth={new Date("2025-06-01")} />);
    const label = container.querySelector(".calendar-month-label");
    expect(label).toBeTruthy();
  });
});
