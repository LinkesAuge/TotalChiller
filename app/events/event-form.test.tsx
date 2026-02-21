// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createRef } from "react";
import { EventForm } from "./event-form";

vi.mock("../components/date-picker", () => ({
  __esModule: true,
  default: (props: any) => {
    const React = require("react");
    return React.createElement("input", {
      "data-testid": `date-picker${props.enableTime ? "-time" : ""}`,
      type: "text",
      value: props.value || "",
      onChange: (e: any) => props.onChange?.(e.target.value),
    });
  },
}));
vi.mock("../components/ui/radix-select", () => ({
  __esModule: true,
  default: ({ value, onValueChange, options, ariaLabel, id }: any) => {
    const React = require("react");
    return React.createElement(
      "select",
      {
        "data-testid": `select-${id || "default"}`,
        value,
        onChange: (e: any) => onValueChange(e.target.value),
        "aria-label": ariaLabel,
      },
      options?.map((o: any) => React.createElement("option", { key: o.value, value: o.value }, o.label)),
    );
  },
}));
vi.mock("../components/banner-picker", () => ({
  __esModule: true,
  default: () => {
    const React = require("react");
    return React.createElement("div", { "data-testid": "banner-picker" });
  },
}));
vi.mock("../components/ui/game-button", () => ({
  __esModule: true,
  default: ({ children, disabled, ...props }: any) => {
    const React = require("react");
    return React.createElement("button", { ...props, disabled }, children);
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
vi.mock("@/lib/constants/banner-presets", () => ({ BANNER_PRESETS: [] }));

function makeProps(overrides: any = {}): any {
  return {
    isFormOpen: true,
    formRef: createRef(),
    editingId: "",
    title: "",
    description: "",
    location: "",
    startsAt: "",
    durationH: "2",
    durationM: "0",
    isOpenEnded: false,
    endsAt: "",
    organizer: "",
    recurrenceType: "none" as const,
    recurrenceEndDate: "",
    recurrenceOngoing: false,
    selectedTemplate: "",
    bannerUrl: "",
    isBannerUploading: false,
    bannerFileRef: createRef(),
    onBannerUrlChange: vi.fn(),
    onBannerUpload: vi.fn(),
    onTitleChange: vi.fn(),
    onDescriptionChange: vi.fn(),
    onLocationChange: vi.fn(),
    onStartsAtChange: vi.fn(),
    onDurationHChange: vi.fn(),
    onDurationMChange: vi.fn(),
    onOpenEndedChange: vi.fn(),
    onEndsAtChange: vi.fn(),
    onOrganizerChange: vi.fn(),
    onRecurrenceTypeChange: vi.fn(),
    onRecurrenceEndDateChange: vi.fn(),
    onRecurrenceOngoingChange: vi.fn(),
    onTemplateSelect: vi.fn(),
    onSubmit: vi.fn((e: any) => e.preventDefault()),
    onCancel: vi.fn(),
    onSaveAsTemplate: vi.fn(),
    onDelete: vi.fn(),
    isSaving: false,
    isSavingTemplate: false,
    canManage: true,
    gameAccounts: [],
    templateOptions: [{ value: "", label: "No template" }],
    locale: "de",
    t: vi.fn((key: string) => key),
    supabase: {} as any,
    userId: "user-1",
    ...overrides,
  };
}

describe("EventForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Visibility guard ──

  it("returns null when isFormOpen is false", () => {
    const { container } = render(<EventForm {...makeProps({ isFormOpen: false })} />);
    expect(container.innerHTML).toBe("");
  });

  it("returns null when canManage is false", () => {
    const { container } = render(<EventForm {...makeProps({ canManage: false })} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders form when isFormOpen and canManage are both true", () => {
    const { container } = render(<EventForm {...makeProps()} />);
    expect(container.querySelector(".card-title")?.textContent).toBe("createEvent");
  });

  // ── Heading ──

  it("shows create heading when not editing", () => {
    const { container } = render(<EventForm {...makeProps()} />);
    expect(container.querySelector(".card-title")?.textContent).toBe("createEvent");
    expect(screen.getByText("visibleToClan")).toBeInTheDocument();
  });

  it("shows edit heading when editingId is set", () => {
    render(<EventForm {...makeProps({ editingId: "evt-1" })} />);
    expect(screen.getByText("editEvent")).toBeInTheDocument();
  });

  // ── Template selector ──

  it("shows template selector when creating (no editingId)", () => {
    render(<EventForm {...makeProps()} />);
    expect(screen.getByTestId("select-eventTemplate")).toBeInTheDocument();
  });

  it("hides template selector when editing", () => {
    render(<EventForm {...makeProps({ editingId: "evt-1" })} />);
    expect(screen.queryByTestId("select-eventTemplate")).not.toBeInTheDocument();
  });

  it("calls onTemplateSelect when template changes", () => {
    const onTemplateSelect = vi.fn();
    render(
      <EventForm
        {...makeProps({
          onTemplateSelect,
          templateOptions: [
            { value: "", label: "None" },
            { value: "t1", label: "Template 1" },
          ],
        })}
      />,
    );
    fireEvent.change(screen.getByTestId("select-eventTemplate"), { target: { value: "t1" } });
    expect(onTemplateSelect).toHaveBeenCalledWith("t1");
  });

  // ── Title ──

  it("renders title input", () => {
    render(<EventForm {...makeProps({ title: "My Event" })} />);
    expect(screen.getByDisplayValue("My Event")).toBeInTheDocument();
  });

  it("calls onTitleChange when title changes", () => {
    const onTitleChange = vi.fn();
    render(<EventForm {...makeProps({ onTitleChange })} />);
    fireEvent.change(screen.getByLabelText("eventTitle"), { target: { value: "New Title" } });
    expect(onTitleChange).toHaveBeenCalledWith("New Title");
  });

  // ── Banner ──

  it("shows banner picker", () => {
    render(<EventForm {...makeProps()} />);
    expect(screen.getByTestId("banner-picker")).toBeInTheDocument();
  });

  // ── Description ──

  it("shows description markdown editor", () => {
    render(<EventForm {...makeProps({ description: "Some desc" })} />);
    const editor = screen.getByTestId("md-editor-eventDescription");
    expect(editor).toBeInTheDocument();
    expect(editor).toHaveValue("Some desc");
  });

  it("calls onDescriptionChange when description changes", () => {
    const onDescriptionChange = vi.fn();
    render(<EventForm {...makeProps({ onDescriptionChange })} />);
    fireEvent.change(screen.getByTestId("md-editor-eventDescription"), { target: { value: "Updated" } });
    expect(onDescriptionChange).toHaveBeenCalledWith("Updated");
  });

  // ── Location ──

  it("renders location input", () => {
    render(<EventForm {...makeProps({ location: "Discord" })} />);
    expect(screen.getByDisplayValue("Discord")).toBeInTheDocument();
  });

  it("calls onLocationChange", () => {
    const onLocationChange = vi.fn();
    render(<EventForm {...makeProps({ onLocationChange })} />);
    fireEvent.change(screen.getByLabelText("locationOptional"), { target: { value: "In-game" } });
    expect(onLocationChange).toHaveBeenCalledWith("In-game");
  });

  // ── Date/Time ──

  it("renders date picker for starts_at", () => {
    render(<EventForm {...makeProps()} />);
    expect(screen.getByTestId("date-picker-time")).toBeInTheDocument();
  });

  // ── Open-ended checkbox ──

  it("renders open-ended checkbox", () => {
    render(<EventForm {...makeProps()} />);
    expect(screen.getByText("openEnded")).toBeInTheDocument();
  });

  it("calls onOpenEndedChange when toggled", () => {
    const onOpenEndedChange = vi.fn();
    render(<EventForm {...makeProps({ onOpenEndedChange })} />);
    const checkbox = screen.getByText("openEnded").closest("label")!.querySelector("input")!;
    fireEvent.click(checkbox);
    expect(onOpenEndedChange).toHaveBeenCalledWith(true);
  });

  // ── Duration fields (non-open-ended) ──

  it("shows duration fields when not open-ended and no endsAt", () => {
    render(<EventForm {...makeProps()} />);
    expect(screen.getByLabelText("durationH")).toBeInTheDocument();
    expect(screen.getByLabelText("durationM")).toBeInTheDocument();
  });

  it("hides duration fields when open-ended", () => {
    render(<EventForm {...makeProps({ isOpenEnded: true })} />);
    expect(screen.queryByLabelText("durationH")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("durationM")).not.toBeInTheDocument();
  });

  it("calls onDurationHChange", () => {
    const onDurationHChange = vi.fn();
    render(<EventForm {...makeProps({ onDurationHChange })} />);
    fireEvent.change(screen.getByLabelText("durationH"), { target: { value: "3" } });
    expect(onDurationHChange).toHaveBeenCalledWith("3");
  });

  it("calls onDurationMChange", () => {
    const onDurationMChange = vi.fn();
    render(<EventForm {...makeProps({ onDurationMChange })} />);
    fireEvent.change(screen.getByLabelText("durationM"), { target: { value: "30" } });
    expect(onDurationMChange).toHaveBeenCalledWith("30");
  });

  // ── End date mode ──

  it("shows end date picker when endsAt is set", () => {
    render(<EventForm {...makeProps({ endsAt: "2026-01-02T12:00" })} />);
    expect(screen.getByText("endDateAndTime")).toBeInTheDocument();
    expect(screen.queryByLabelText("durationH")).not.toBeInTheDocument();
  });

  it("shows duration/end date radio toggles", () => {
    render(<EventForm {...makeProps()} />);
    expect(screen.getByText("durationMode")).toBeInTheDocument();
    expect(screen.getByText("endDateMode")).toBeInTheDocument();
  });

  it("calls onEndsAtChange when switching to end date mode", () => {
    const onEndsAtChange = vi.fn();
    render(<EventForm {...makeProps({ startsAt: "2026-01-01T10:00", onEndsAtChange })} />);
    fireEvent.click(screen.getByText("endDateMode"));
    expect(onEndsAtChange).toHaveBeenCalled();
  });

  it("calls onEndsAtChange('') when switching to duration mode", () => {
    const onEndsAtChange = vi.fn();
    render(<EventForm {...makeProps({ endsAt: "2026-01-02T12:00", onEndsAtChange })} />);
    fireEvent.click(screen.getByText("durationMode"));
    expect(onEndsAtChange).toHaveBeenCalledWith("");
  });

  // ── Organizer ──

  it("renders organizer input", () => {
    render(<EventForm {...makeProps({ organizer: "Player1" })} />);
    expect(screen.getByDisplayValue("Player1")).toBeInTheDocument();
  });

  it("calls onOrganizerChange", () => {
    const onOrganizerChange = vi.fn();
    render(<EventForm {...makeProps({ onOrganizerChange })} />);
    fireEvent.change(screen.getByLabelText("organizer"), { target: { value: "NewOrg" } });
    expect(onOrganizerChange).toHaveBeenCalledWith("NewOrg");
  });

  it("renders datalist with game accounts", () => {
    const gameAccounts = [
      { id: "ga1", game_username: "Gamer1" },
      { id: "ga2", game_username: "Gamer2" },
    ];
    const { container } = render(<EventForm {...makeProps({ gameAccounts })} />);
    const options = container.querySelectorAll("datalist option");
    expect(options.length).toBe(2);
  });

  // ── Recurrence ──

  it("renders recurrence select", () => {
    render(<EventForm {...makeProps()} />);
    expect(screen.getByTestId("select-eventRecurrence")).toBeInTheDocument();
  });

  it("calls onRecurrenceTypeChange", () => {
    const onRecurrenceTypeChange = vi.fn();
    render(<EventForm {...makeProps({ onRecurrenceTypeChange })} />);
    fireEvent.change(screen.getByTestId("select-eventRecurrence"), { target: { value: "weekly" } });
    expect(onRecurrenceTypeChange).toHaveBeenCalledWith("weekly");
  });

  it("shows recurrence end date when recurrence is not none", () => {
    render(<EventForm {...makeProps({ recurrenceType: "weekly" })} />);
    expect(screen.getByText("recurrenceEndDate")).toBeInTheDocument();
    expect(screen.getByText("recurrenceOngoing")).toBeInTheDocument();
  });

  it("hides recurrence end date when recurrence is none", () => {
    render(<EventForm {...makeProps()} />);
    expect(screen.queryByText("recurrenceEndDate")).not.toBeInTheDocument();
    expect(screen.queryByText("recurrenceOngoing")).not.toBeInTheDocument();
  });

  it("hides recurrence end date input when recurrenceOngoing is true", () => {
    render(<EventForm {...makeProps({ recurrenceType: "weekly", recurrenceOngoing: true })} />);
    expect(screen.queryByLabelText("recurrenceEndDate")).not.toBeInTheDocument();
    expect(screen.getByText("recurrenceOngoing")).toBeInTheDocument();
  });

  it("calls onRecurrenceOngoingChange and clears end date on ongoing check", () => {
    const onRecurrenceOngoingChange = vi.fn();
    const onRecurrenceEndDateChange = vi.fn();
    render(
      <EventForm {...makeProps({ recurrenceType: "weekly", onRecurrenceOngoingChange, onRecurrenceEndDateChange })} />,
    );
    const checkbox = screen.getByText("recurrenceOngoing").closest("label")!.querySelector("input")!;
    fireEvent.click(checkbox);
    expect(onRecurrenceOngoingChange).toHaveBeenCalledWith(true);
    expect(onRecurrenceEndDateChange).toHaveBeenCalledWith("");
  });

  // ── Submit ──

  it("shows create button when not editing", () => {
    render(<EventForm {...makeProps()} />);
    const btn = screen.getByRole("button", { name: "createEvent" });
    expect(btn).toHaveAttribute("type", "submit");
  });

  it("shows save button when editing", () => {
    render(<EventForm {...makeProps({ editingId: "evt-1" })} />);
    expect(screen.getByText("save")).toBeInTheDocument();
  });

  it("shows saving label when isSaving", () => {
    render(<EventForm {...makeProps({ isSaving: true })} />);
    expect(screen.getByText("saving")).toBeDisabled();
  });

  it("calls onSubmit on form submit", () => {
    const onSubmit = vi.fn((e: any) => e.preventDefault());
    render(<EventForm {...makeProps({ onSubmit })} />);
    fireEvent.submit(screen.getByRole("button", { name: "createEvent" }).closest("form")!);
    expect(onSubmit).toHaveBeenCalled();
  });

  // ── Cancel ──

  it("calls onCancel when cancel is clicked", () => {
    const onCancel = vi.fn();
    render(<EventForm {...makeProps({ onCancel })} />);
    fireEvent.click(screen.getByText("cancel"));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  // ── Save as template ──

  it("shows save as template button", () => {
    render(<EventForm {...makeProps()} />);
    expect(screen.getByText("saveAsTemplate")).toBeInTheDocument();
  });

  it("calls onSaveAsTemplate", () => {
    const onSaveAsTemplate = vi.fn();
    render(<EventForm {...makeProps({ onSaveAsTemplate })} />);
    fireEvent.click(screen.getByText("saveAsTemplate"));
    expect(onSaveAsTemplate).toHaveBeenCalled();
  });

  it("disables save as template when isSavingTemplate", () => {
    render(<EventForm {...makeProps({ isSavingTemplate: true })} />);
    expect(screen.getByText("saving")).toBeInTheDocument();
  });

  // ── Delete ──

  it("shows delete button only when editing", () => {
    const { rerender } = render(<EventForm {...makeProps()} />);
    expect(screen.queryByText("deleteEvent")).not.toBeInTheDocument();
    rerender(<EventForm {...makeProps({ editingId: "evt-1" })} />);
    expect(screen.getByText("deleteEvent")).toBeInTheDocument();
  });

  it("calls onDelete when delete is clicked", () => {
    const onDelete = vi.fn();
    render(<EventForm {...makeProps({ editingId: "evt-1", onDelete })} />);
    fireEvent.click(screen.getByText("deleteEvent"));
    expect(onDelete).toHaveBeenCalled();
  });
});
