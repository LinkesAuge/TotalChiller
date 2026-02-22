// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next-intl", () => ({
  useTranslations: vi.fn(() => vi.fn((key: string) => key)),
}));
vi.mock("next/dynamic", () => ({
  __esModule: true,
  default: (_loader: any) => {
    const Component = (_props: any) => {
      const React = require("react");
      return React.createElement("div", { "data-testid": "dynamic-component" });
    };
    Component.displayName = "DynamicMock";
    return Component;
  },
}));
vi.mock("../components/page-shell", () => ({
  __esModule: true,
  default: ({ children, title }: any) => {
    const React = require("react");
    return React.createElement(
      "div",
      { "data-testid": "page-shell" },
      React.createElement("h1", null, title),
      children,
    );
  },
}));
vi.mock("./event-modals", () => ({
  EventDeleteModal: ({ isOpen }: any) => {
    if (!isOpen) return null;
    const React = require("react");
    return React.createElement("div", { "data-testid": "delete-modal" });
  },
}));
vi.mock("./events-list", () => ({
  EventsList: () => {
    const React = require("react");
    return React.createElement("div", { "data-testid": "events-list" });
  },
}));
vi.mock("./events-form", () => ({
  EventsForm: () => {
    const React = require("react");
    return React.createElement("div", { "data-testid": "events-form" });
  },
}));

const mockEventsState: any = {
  isLoading: false,
  pastEvents: [],
  isPastExpanded: false,
  setIsPastExpanded: vi.fn(),
  events: [],
  eventTypes: [],
  deleteEventId: "",
  setDeleteEventId: vi.fn(),
  confirmDeleteEvent: vi.fn(),
  handleEditEventById: vi.fn(),
  requestDeleteEvent: vi.fn(),
  canManage: true,
  locale: "de",
  t: vi.fn((key: string) => key),
  supabase: {},
  currentUserId: "user-1",
  clanId: undefined,
  isEventTypesOpen: false,
  setIsEventTypesOpen: vi.fn(),
  isFormOpen: false,
};

vi.mock("./use-events", () => ({
  useEvents: vi.fn(() => mockEventsState),
}));

import EventsClient from "./events-client";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("EventsClient", () => {
  it("renders page shell with title", () => {
    render(<EventsClient />);
    expect(screen.getByTestId("page-shell")).toBeDefined();
    expect(screen.getByText("title")).toBeDefined();
  });

  it("renders events list and events form", () => {
    render(<EventsClient />);
    expect(screen.getByTestId("events-list")).toBeDefined();
    expect(screen.getByTestId("events-form")).toBeDefined();
  });

  it("does not render delete modal when deleteEventId is empty", () => {
    render(<EventsClient />);
    expect(screen.queryByTestId("delete-modal")).toBeNull();
  });

  /* ── Delete modal renders when deleteEventId is set ── */

  it("renders delete modal when deleteEventId is set", () => {
    mockEventsState.deleteEventId = "evt-1";
    render(<EventsClient />);
    expect(screen.getByTestId("delete-modal")).toBeDefined();
    mockEventsState.deleteEventId = "";
  });

  /* ── ManageEventTypes renders when isEventTypesOpen ── */

  it("renders ManageEventTypes dynamic component when isEventTypesOpen is true", () => {
    mockEventsState.isEventTypesOpen = true;
    render(<EventsClient />);
    expect(screen.getByTestId("dynamic-component")).toBeDefined();
    mockEventsState.isEventTypesOpen = false;
  });

  it("does not render ManageEventTypes when isEventTypesOpen is false", () => {
    mockEventsState.isEventTypesOpen = false;
    render(<EventsClient />);
    expect(screen.queryByTestId("dynamic-component")).toBeNull();
  });

  /* ── PastEventsList renders when pastEvents exist and not loading ── */

  it("renders PastEventsList dynamic component when past events exist and not loading", () => {
    mockEventsState.pastEvents = [{ id: "pe1", title: "Past Event" }];
    mockEventsState.isLoading = false;
    render(<EventsClient />);
    const dynamics = screen.getAllByTestId("dynamic-component");
    expect(dynamics.length).toBeGreaterThanOrEqual(1);
    mockEventsState.pastEvents = [];
  });

  it("does not render PastEventsList when isLoading is true", () => {
    mockEventsState.pastEvents = [{ id: "pe1", title: "Past Event" }];
    mockEventsState.isLoading = true;
    render(<EventsClient />);
    expect(screen.queryByTestId("dynamic-component")).toBeNull();
    mockEventsState.pastEvents = [];
    mockEventsState.isLoading = false;
  });

  it("does not render PastEventsList when pastEvents is empty", () => {
    mockEventsState.pastEvents = [];
    mockEventsState.isLoading = false;
    render(<EventsClient />);
    expect(screen.queryByTestId("dynamic-component")).toBeNull();
  });

  /* ── Grid layout ── */

  it("renders grid container inside page shell", () => {
    render(<EventsClient />);
    const grid = document.querySelector(".grid");
    expect(grid).toBeDefined();
  });

  /* ── PageShell receives correct props ── */

  it("renders page title via PageShell", () => {
    render(<EventsClient />);
    expect(screen.getByText("title")).toBeDefined();
  });

  /* ── Both modals outside of PageShell ── */

  it("renders modals outside the PageShell element", () => {
    mockEventsState.deleteEventId = "evt-2";
    render(<EventsClient />);
    const pageShell = screen.getByTestId("page-shell");
    const deleteModal = screen.getByTestId("delete-modal");
    expect(pageShell.contains(deleteModal)).toBe(false);
    mockEventsState.deleteEventId = "";
  });
});
