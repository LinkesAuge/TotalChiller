// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("./event-calendar", () => ({
  EventCalendar: (_props: any) => {
    const React = require("react");
    return React.createElement("div", { "data-testid": "calendar" });
  },
  EventDayPanel: (_props: any) => {
    const React = require("react");
    return React.createElement("div", { "data-testid": "day-panel" });
  },
}));

vi.mock("./upcoming-events-sidebar", () => ({
  UpcomingEventsSidebar: (_props: any) => {
    const React = require("react");
    return React.createElement("div", { "data-testid": "sidebar" });
  },
}));

vi.mock("../components/data-state", () => ({
  __esModule: true,
  default: ({ children, isLoading, isEmpty, loadingMessage, emptyMessage }: any) => {
    const React = require("react");
    if (isLoading) return React.createElement("div", null, loadingMessage || "Loading...");
    if (isEmpty) return React.createElement("div", null, emptyMessage || "Empty");
    return React.createElement(React.Fragment, null, children);
  },
}));

import { EventsList } from "./events-list";
import type { UseEventsResult } from "./use-events";

function makeEventsState(overrides: Record<string, any> = {}): UseEventsResult {
  return {
    events: [],
    setEvents: vi.fn(),
    isLoading: false,
    templates: [],
    gameAccounts: [],
    reloadEvents: vi.fn(),
    reloadTemplates: vi.fn(),
    canManage: false,
    currentUserId: "user-1",
    supabase: {} as any,
    t: vi.fn((key: string) => key),
    locale: "de",
    calendarMonth: new Date(2025, 5, 1),
    calendarDays: [],
    selectedDateKey: "2025-06-15",
    selectedDateLabel: "June 15, 2025",
    selectedDayEvents: [],
    todayKey: "2025-06-15",
    dateSelectNonce: 0,
    highlightEventId: "",
    eventIdsWithResults: new Set<string>(),
    focusResultsEventId: "",
    handleFocusEventResults: vi.fn(),
    upcomingEvents: [],
    pastEvents: [],
    upcomingPage: 1,
    setUpcomingPage: vi.fn(),
    isPastExpanded: false,
    setIsPastExpanded: vi.fn(),
    isFormOpen: false,
    isSaving: false,
    editingId: "",
    title: "",
    description: "",
    location: "",
    startsAt: "",
    endsAt: "",
    organizer: "",
    recurrenceType: "none",
    recurrenceEndDate: "",
    bannerUrl: "",
    selectedGameAccount: "",
    setTitle: vi.fn(),
    setDescription: vi.fn(),
    setLocation: vi.fn(),
    setStartsAt: vi.fn(),
    setEndsAt: vi.fn(),
    setOrganizer: vi.fn(),
    setRecurrenceType: vi.fn(),
    setRecurrenceEndDate: vi.fn(),
    setBannerUrl: vi.fn(),
    setSelectedGameAccount: vi.fn(),
    resetForm: vi.fn(),
    openForm: vi.fn(),
    openEditForm: vi.fn(),
    handleSave: vi.fn(),
    handleEditEventById: vi.fn(),
    requestDeleteEvent: vi.fn(),
    confirmDeleteEvent: vi.fn(),
    cancelDeleteEvent: vi.fn(),
    deleteTargetId: "",
    handleTogglePin: vi.fn(),
    handleSelectUpcomingEvent: vi.fn(),
    shiftCalendarMonth: vi.fn(),
    handleDateSelect: vi.fn(),
    jumpToToday: vi.fn(),
    isSavingTemplate: false,
    saveAsTemplate: vi.fn(),
    deleteTemplateId: "",
    deleteTemplateInput: "",
    deleteTemplateStep2: false,
    setDeleteTemplateInput: vi.fn(),
    requestDeleteTemplate: vi.fn(),
    confirmDeleteTemplate: vi.fn(),
    cancelDeleteTemplate: vi.fn(),
    continueDeleteTemplateStep2: vi.fn(),
    applyTemplate: vi.fn(),
    ...overrides,
  } as unknown as UseEventsResult;
}

describe("EventsList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading message when isLoading=true", () => {
    render(<EventsList eventsState={makeEventsState({ isLoading: true })} />);
    expect(screen.getByText("loadingEvents")).toBeDefined();
  });

  it("shows empty message when events list is empty", () => {
    render(<EventsList eventsState={makeEventsState({ events: [], isLoading: false })} />);
    expect(screen.getByText("noEvents")).toBeDefined();
  });

  it("renders calendar, day-panel, and sidebar when events exist", () => {
    render(
      <EventsList
        eventsState={makeEventsState({
          events: [{ id: "evt-1" }],
          isLoading: false,
        })}
      />,
    );
    expect(screen.getByTestId("calendar")).toBeDefined();
    expect(screen.getByTestId("day-panel")).toBeDefined();
    expect(screen.getByTestId("sidebar")).toBeDefined();
  });
});
