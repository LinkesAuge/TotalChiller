// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next-intl", () => ({
  useTranslations: vi.fn(() => vi.fn((key: string) => key)),
}));
vi.mock("next/dynamic", () => ({
  __esModule: true,
  default: (loader: any) => {
    const Component = (props: any) => {
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
  TemplateDeleteModal: ({ isOpen }: any) => {
    if (!isOpen) return null;
    const React = require("react");
    return React.createElement("div", {
      "data-testid": "template-delete-modal",
    });
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
  templates: [],
  editingTemplateId: "",
  editTplTitle: "",
  editTplDesc: "",
  editTplLocation: "",
  editTplDurationH: "1",
  editTplDurationM: "0",
  editTplOpenEnded: false,
  editTplOrganizer: "",
  editTplRecurrence: "none",
  editTplRecurrenceEnd: "",
  editTplRecurrenceOngoing: false,
  handleStartEditTemplate: vi.fn(),
  handleCancelEditTemplate: vi.fn(),
  handleSaveEditedTemplate: vi.fn(),
  requestDeleteTemplate: vi.fn(),
  confirmDeleteTemplate: vi.fn(),
  closeDeleteTemplateModal: vi.fn(),
  deleteEventId: "",
  deleteTemplateId: "",
  deleteTemplateName: "",
  deleteTemplateInput: "",
  isDeleteTemplateStep2: false,
  setDeleteEventId: vi.fn(),
  setDeleteTemplateInput: vi.fn(),
  setIsDeleteTemplateStep2: vi.fn(),
  setEditTplTitle: vi.fn(),
  setEditTplDesc: vi.fn(),
  setEditTplLocation: vi.fn(),
  setEditTplDurationH: vi.fn(),
  setEditTplDurationM: vi.fn(),
  setEditTplOpenEnded: vi.fn(),
  setEditTplOrganizer: vi.fn(),
  setEditTplRecurrence: vi.fn(),
  setEditTplRecurrenceEnd: vi.fn(),
  setEditTplRecurrenceOngoing: vi.fn(),
  confirmDeleteEvent: vi.fn(),
  handleEditEventById: vi.fn(),
  requestDeleteEvent: vi.fn(),
  handleSaveEventAsTemplate: vi.fn(),
  isSavingTemplate: false,
  canManage: true,
  locale: "de",
  t: vi.fn((key: string) => key),
  supabase: {},
  currentUserId: "user-1",
  isTemplatesOpen: false,
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

  it("does not render template delete modal when deleteTemplateId is empty", () => {
    render(<EventsClient />);
    expect(screen.queryByTestId("template-delete-modal")).toBeNull();
  });

  /* ── Delete modal renders when deleteEventId is set ── */

  it("renders delete modal when deleteEventId is set", () => {
    mockEventsState.deleteEventId = "evt-1";
    render(<EventsClient />);
    expect(screen.getByTestId("delete-modal")).toBeDefined();
    mockEventsState.deleteEventId = "";
  });

  /* ── Template delete modal renders when deleteTemplateId is set ── */

  it("renders template delete modal when deleteTemplateId is set", () => {
    mockEventsState.deleteTemplateId = "tpl-1";
    render(<EventsClient />);
    expect(screen.getByTestId("template-delete-modal")).toBeDefined();
    mockEventsState.deleteTemplateId = "";
  });

  /* ── ManageTemplates renders when isTemplatesOpen ── */

  it("renders ManageTemplates dynamic component when isTemplatesOpen is true", () => {
    mockEventsState.isTemplatesOpen = true;
    render(<EventsClient />);
    expect(screen.getByTestId("dynamic-component")).toBeDefined();
    mockEventsState.isTemplatesOpen = false;
  });

  it("does not render ManageTemplates when isTemplatesOpen is false", () => {
    mockEventsState.isTemplatesOpen = false;
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
