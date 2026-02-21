// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EventsForm } from "./events-form";

vi.mock("next/dynamic", () => ({
  __esModule: true,
  default: () => {
    const Component = (_props: any) => {
      const React = require("react");
      return React.createElement("div", { "data-testid": "event-form" });
    };
    Component.displayName = "DynamicMock";
    return Component;
  },
}));
vi.mock("../components/ui/game-button", () => ({
  __esModule: true,
  default: ({ children, onClick, ...props }: any) => {
    const React = require("react");
    return React.createElement("button", { onClick, ...props }, children);
  },
}));

function makeState(overrides: any = {}): any {
  return {
    canManage: true,
    isFormOpen: false,
    eventFormRef: { current: null },
    editingId: "",
    title: "",
    description: "",
    location: "",
    startsAt: "",
    durationH: "1",
    durationM: "0",
    isOpenEnded: false,
    endsAt: "",
    organizer: "",
    recurrenceType: "none",
    recurrenceEndDate: "",
    recurrenceOngoing: false,
    selectedTemplate: "",
    bannerUrl: "",
    isBannerUploading: false,
    bannerFileRef: { current: null },
    setTitle: vi.fn(),
    setDescription: vi.fn(),
    setLocation: vi.fn(),
    setStartsAt: vi.fn(),
    setDurationH: vi.fn(),
    setDurationM: vi.fn(),
    setIsOpenEnded: vi.fn(),
    setEndsAt: vi.fn(),
    setOrganizer: vi.fn(),
    setRecurrenceType: vi.fn(),
    setRecurrenceEndDate: vi.fn(),
    setRecurrenceOngoing: vi.fn(),
    setBannerUrl: vi.fn(),
    handleBannerUpload: vi.fn(),
    applyTemplate: vi.fn(),
    handleSubmit: vi.fn(),
    resetForm: vi.fn(),
    handleSaveFormAsTemplate: vi.fn(),
    requestDeleteEvent: vi.fn(),
    isSaving: false,
    isSavingTemplate: false,
    gameAccounts: [],
    templateOptions: [],
    currentUserId: "user-1",
    handleOpenCreate: vi.fn(),
    t: vi.fn((key: string) => key),
    isTemplatesOpen: false,
    setIsTemplatesOpen: vi.fn(),
    locale: "de",
    supabase: {},
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("EventsForm", () => {
  it("renders nothing when canManage=false", () => {
    const { container } = render(<EventsForm eventsState={makeState({ canManage: false })} />);
    expect(container.innerHTML).toBe("");
  });

  it("shows create event button when canManage and form closed", () => {
    render(<EventsForm eventsState={makeState()} />);
    expect(screen.getByText("createEvent")).toBeDefined();
  });

  it("shows manage templates button when canManage", () => {
    render(<EventsForm eventsState={makeState()} />);
    expect(screen.getByText(/manageTemplates/)).toBeDefined();
  });

  it("hides create button when form is open", () => {
    render(<EventsForm eventsState={makeState({ isFormOpen: true })} />);
    expect(screen.queryByText("createEvent")).toBeNull();
  });

  it("renders EventForm (dynamic) when isFormOpen and canManage", () => {
    render(<EventsForm eventsState={makeState({ isFormOpen: true })} />);
    expect(screen.getByTestId("event-form")).toBeDefined();
  });

  it("calls handleOpenCreate when create button clicked", () => {
    const state = makeState();
    render(<EventsForm eventsState={state} />);
    fireEvent.click(screen.getByText("createEvent"));
    expect(state.handleOpenCreate).toHaveBeenCalledOnce();
  });

  it("calls setIsTemplatesOpen when templates button clicked", () => {
    const state = makeState();
    render(<EventsForm eventsState={state} />);
    fireEvent.click(screen.getByText(/manageTemplates/));
    expect(state.setIsTemplatesOpen).toHaveBeenCalledOnce();
  });
});
