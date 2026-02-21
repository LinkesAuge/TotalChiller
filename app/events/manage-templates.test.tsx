// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ManageTemplates } from "./manage-templates";

vi.mock("../components/ui/radix-select", () => ({
  __esModule: true,
  default: ({ value, onValueChange, options, ariaLabel, id }: any) => {
    const React = require("react");
    return React.createElement(
      "select",
      {
        value,
        onChange: (e: any) => onValueChange(e.target.value),
        "aria-label": ariaLabel,
        "data-testid": `select-${id || "default"}`,
      },
      options?.map((o: any) => React.createElement("option", { key: o.value, value: o.value }, o.label)),
    );
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
vi.mock("./events-utils", () => ({
  formatDurationFromHours: vi.fn((h: number) => `${h}h`),
}));

function makeTemplate(overrides: any = {}): any {
  return {
    id: "tpl-1",
    title: "Template 1",
    description: "Template description",
    location: "Location",
    duration_hours: 2.5,
    is_open_ended: false,
    organizer: "Org",
    recurrence_type: "none",
    recurrence_end_date: null,
    banner_url: null,
    ...overrides,
  };
}

function makeProps(overrides: any = {}): any {
  return {
    isTemplatesOpen: true,
    templates: [makeTemplate()],
    editingTemplateId: "",
    editTplTitle: "",
    editTplDescription: "",
    editTplLocation: "",
    editTplDurationH: "2",
    editTplDurationM: "30",
    editTplOpenEnded: false,
    editTplOrganizer: "",
    editTplRecurrence: "none" as const,
    editTplRecurrenceEnd: "",
    editTplRecurrenceOngoing: false,
    onStartEdit: vi.fn(),
    onEditTplTitleChange: vi.fn(),
    onEditTplDescChange: vi.fn(),
    onEditTplLocationChange: vi.fn(),
    onEditTplDurationHChange: vi.fn(),
    onEditTplDurationMChange: vi.fn(),
    onEditTplOpenEndedChange: vi.fn(),
    onEditTplOrganizerChange: vi.fn(),
    onEditTplRecurrenceChange: vi.fn(),
    onEditTplRecurrenceEndChange: vi.fn(),
    onEditTplRecurrenceOngoingChange: vi.fn(),
    onCancelEdit: vi.fn(),
    onSaveEdit: vi.fn(),
    onRequestDelete: vi.fn(),
    isSavingTemplate: false,
    canManage: true,
    t: vi.fn((key: string) => key),
    supabase: {} as any,
    userId: "user-1",
    ...overrides,
  };
}

describe("ManageTemplates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Visibility guard ──

  it("returns null when canManage is false", () => {
    const { container } = render(<ManageTemplates {...makeProps({ canManage: false })} />);
    expect(container.innerHTML).toBe("");
  });

  it("returns null when isTemplatesOpen is false", () => {
    const { container } = render(<ManageTemplates {...makeProps({ isTemplatesOpen: false })} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders when both canManage and isTemplatesOpen", () => {
    render(<ManageTemplates {...makeProps()} />);
    expect(screen.getByText("manageTemplates")).toBeInTheDocument();
  });

  // ── Template list ──

  it("renders template list with titles", () => {
    const templates = [makeTemplate({ id: "t1", title: "Alpha" }), makeTemplate({ id: "t2", title: "Beta" })];
    render(<ManageTemplates {...makeProps({ templates })} />);
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });

  it("shows empty message when no templates", () => {
    render(<ManageTemplates {...makeProps({ templates: [] })} />);
    expect(screen.getByText("noEvents")).toBeInTheDocument();
  });

  it("shows edit button for each template", () => {
    const templates = [makeTemplate({ id: "t1" }), makeTemplate({ id: "t2" })];
    render(<ManageTemplates {...makeProps({ templates })} />);
    expect(screen.getAllByText("editEvent")).toHaveLength(2);
  });

  it("calls onStartEdit when edit button clicked", () => {
    const onStartEdit = vi.fn();
    const tpl = makeTemplate();
    render(<ManageTemplates {...makeProps({ onStartEdit, templates: [tpl] })} />);
    fireEvent.click(screen.getByText("editEvent"));
    expect(onStartEdit).toHaveBeenCalledWith(tpl);
  });

  // ── Read-only row details ──

  it("shows description truncated if > 80 chars", () => {
    const longDesc = "A".repeat(100);
    const { container } = render(
      <ManageTemplates {...makeProps({ templates: [makeTemplate({ description: longDesc })] })} />,
    );
    const metaEl = container.querySelector(".text-text-muted");
    expect(metaEl?.textContent).toContain("A".repeat(78));
    expect(metaEl?.textContent).toContain("…");
  });

  it("shows full description if <= 80 chars", () => {
    render(<ManageTemplates {...makeProps({ templates: [makeTemplate({ description: "Short desc" })] })} />);
    expect(screen.getByText(/Short desc/)).toBeInTheDocument();
  });

  it("shows location in row", () => {
    render(<ManageTemplates {...makeProps({ templates: [makeTemplate({ location: "Discord" })] })} />);
    expect(screen.getByText(/Discord/)).toBeInTheDocument();
  });

  it("shows organizer in row", () => {
    render(<ManageTemplates {...makeProps({ templates: [makeTemplate({ organizer: "Player1" })] })} />);
    expect(screen.getByText(/Player1/)).toBeInTheDocument();
  });

  it("shows 'openEnded' for open-ended templates", () => {
    render(<ManageTemplates {...makeProps({ templates: [makeTemplate({ is_open_ended: true })] })} />);
    expect(screen.getByText(/openEnded/)).toBeInTheDocument();
  });

  it("shows formatted duration for non-open-ended templates", () => {
    render(
      <ManageTemplates {...makeProps({ templates: [makeTemplate({ is_open_ended: false, duration_hours: 2.5 })] })} />,
    );
    expect(screen.getByText(/2\.5h/)).toBeInTheDocument();
  });

  it("shows openEnded for zero-duration templates", () => {
    render(<ManageTemplates {...makeProps({ templates: [makeTemplate({ duration_hours: 0 })] })} />);
    expect(screen.getByText(/openEnded/)).toBeInTheDocument();
  });

  it("shows recurrence type if not none", () => {
    render(<ManageTemplates {...makeProps({ templates: [makeTemplate({ recurrence_type: "weekly" })] })} />);
    expect(screen.getByText(/recurrenceWeekly/)).toBeInTheDocument();
  });

  it("does not show recurrence if type is none", () => {
    render(<ManageTemplates {...makeProps({ templates: [makeTemplate({ recurrence_type: "none" })] })} />);
    expect(screen.queryByText(/recurrenceWeekly/)).not.toBeInTheDocument();
  });

  // ── Inline edit form ──

  it("shows inline edit form when editingTemplateId matches", () => {
    render(<ManageTemplates {...makeProps({ editingTemplateId: "tpl-1", editTplTitle: "Edited Title" })} />);
    expect(screen.getByDisplayValue("Edited Title")).toBeInTheDocument();
  });

  it("shows save and cancel buttons in edit form", () => {
    render(<ManageTemplates {...makeProps({ editingTemplateId: "tpl-1" })} />);
    expect(screen.getByText("saveTemplate")).toBeInTheDocument();
    expect(screen.getByText("cancel")).toBeInTheDocument();
  });

  it("shows delete button in edit form", () => {
    render(<ManageTemplates {...makeProps({ editingTemplateId: "tpl-1" })} />);
    expect(screen.getByText("deleteTemplate")).toBeInTheDocument();
  });

  it("calls onSaveEdit when save is clicked", () => {
    const onSaveEdit = vi.fn();
    render(<ManageTemplates {...makeProps({ editingTemplateId: "tpl-1", onSaveEdit })} />);
    fireEvent.click(screen.getByText("saveTemplate"));
    expect(onSaveEdit).toHaveBeenCalled();
  });

  it("calls onCancelEdit when cancel is clicked", () => {
    const onCancelEdit = vi.fn();
    render(<ManageTemplates {...makeProps({ editingTemplateId: "tpl-1", onCancelEdit })} />);
    fireEvent.click(screen.getByText("cancel"));
    expect(onCancelEdit).toHaveBeenCalled();
  });

  it("calls onCancelEdit and onRequestDelete when delete is clicked", () => {
    const onCancelEdit = vi.fn();
    const onRequestDelete = vi.fn();
    render(<ManageTemplates {...makeProps({ editingTemplateId: "tpl-1", onCancelEdit, onRequestDelete })} />);
    fireEvent.click(screen.getByText("deleteTemplate"));
    expect(onCancelEdit).toHaveBeenCalled();
    expect(onRequestDelete).toHaveBeenCalledWith("tpl-1", "Template 1");
  });

  it("disables save button when isSavingTemplate", () => {
    render(<ManageTemplates {...makeProps({ editingTemplateId: "tpl-1", isSavingTemplate: true })} />);
    expect(screen.getByText("saving")).toBeDisabled();
  });

  // ── Edit form fields ──

  it("calls onEditTplTitleChange when title changes", () => {
    const onEditTplTitleChange = vi.fn();
    render(
      <ManageTemplates {...makeProps({ editingTemplateId: "tpl-1", editTplTitle: "Old", onEditTplTitleChange })} />,
    );
    fireEvent.change(screen.getByDisplayValue("Old"), { target: { value: "New" } });
    expect(onEditTplTitleChange).toHaveBeenCalledWith("New");
  });

  it("renders markdown editor for description in edit form", () => {
    render(<ManageTemplates {...makeProps({ editingTemplateId: "tpl-1" })} />);
    expect(screen.getByTestId("md-editor-tplDesc-tpl-1")).toBeInTheDocument();
  });

  it("calls onEditTplLocationChange when location changes", () => {
    const onEditTplLocationChange = vi.fn();
    render(
      <ManageTemplates
        {...makeProps({ editingTemplateId: "tpl-1", editTplLocation: "Old", onEditTplLocationChange })}
      />,
    );
    fireEvent.change(screen.getByDisplayValue("Old"), { target: { value: "New" } });
    expect(onEditTplLocationChange).toHaveBeenCalledWith("New");
  });

  // ── Open-ended in edit ──

  it("shows open-ended checkbox in edit form", () => {
    render(<ManageTemplates {...makeProps({ editingTemplateId: "tpl-1" })} />);
    expect(screen.getByText("openEnded")).toBeInTheDocument();
  });

  it("shows duration fields when not open-ended in edit", () => {
    render(<ManageTemplates {...makeProps({ editingTemplateId: "tpl-1", editTplOpenEnded: false })} />);
    expect(screen.getByLabelText("durationH")).toBeInTheDocument();
    expect(screen.getByLabelText("durationM")).toBeInTheDocument();
  });

  it("hides duration fields when open-ended in edit", () => {
    render(<ManageTemplates {...makeProps({ editingTemplateId: "tpl-1", editTplOpenEnded: true })} />);
    expect(screen.queryByLabelText("durationH")).not.toBeInTheDocument();
  });

  it("calls onEditTplDurationHChange when duration hours changes", () => {
    const onEditTplDurationHChange = vi.fn();
    render(
      <ManageTemplates
        {...makeProps({ editingTemplateId: "tpl-1", editTplOpenEnded: false, onEditTplDurationHChange })}
      />,
    );
    fireEvent.change(screen.getByLabelText("durationH"), { target: { value: "5" } });
    expect(onEditTplDurationHChange).toHaveBeenCalledWith("5");
  });

  it("calls onEditTplDurationMChange when duration minutes changes", () => {
    const onEditTplDurationMChange = vi.fn();
    render(
      <ManageTemplates
        {...makeProps({ editingTemplateId: "tpl-1", editTplOpenEnded: false, onEditTplDurationMChange })}
      />,
    );
    fireEvent.change(screen.getByLabelText("durationM"), { target: { value: "45" } });
    expect(onEditTplDurationMChange).toHaveBeenCalledWith("45");
  });

  it("calls onEditTplOpenEndedChange when open-ended toggled", () => {
    const onEditTplOpenEndedChange = vi.fn();
    render(<ManageTemplates {...makeProps({ editingTemplateId: "tpl-1", onEditTplOpenEndedChange })} />);
    const checkbox = screen.getByText("openEnded").closest("label")!.querySelector("input")!;
    fireEvent.click(checkbox);
    expect(onEditTplOpenEndedChange).toHaveBeenCalledWith(true);
  });

  // ── Recurrence in edit ──

  it("shows recurrence select in edit form", () => {
    render(<ManageTemplates {...makeProps({ editingTemplateId: "tpl-1" })} />);
    expect(screen.getByTestId(`select-tplRecurrence-tpl-1`)).toBeInTheDocument();
  });

  it("shows recurrence end date and ongoing when recurrence is not none", () => {
    render(<ManageTemplates {...makeProps({ editingTemplateId: "tpl-1", editTplRecurrence: "weekly" })} />);
    expect(screen.getByText("recurrenceEndDate")).toBeInTheDocument();
    expect(screen.getByText("recurrenceOngoing")).toBeInTheDocument();
  });

  it("hides recurrence end date and ongoing when recurrence is none", () => {
    render(<ManageTemplates {...makeProps({ editingTemplateId: "tpl-1", editTplRecurrence: "none" })} />);
    expect(screen.queryByText("recurrenceEndDate")).not.toBeInTheDocument();
    expect(screen.queryByText("recurrenceOngoing")).not.toBeInTheDocument();
  });

  it("calls onEditTplRecurrenceChange when recurrence select changes", () => {
    const onEditTplRecurrenceChange = vi.fn();
    render(
      <ManageTemplates
        {...makeProps({ editingTemplateId: "tpl-1", editTplRecurrence: "none", onEditTplRecurrenceChange })}
      />,
    );
    fireEvent.change(screen.getByTestId("select-tplRecurrence-tpl-1"), { target: { value: "weekly" } });
    expect(onEditTplRecurrenceChange).toHaveBeenCalledWith("weekly");
  });

  it("calls onEditTplRecurrenceEndChange when recurrence end date changes", () => {
    const onEditTplRecurrenceEndChange = vi.fn();
    render(
      <ManageTemplates
        {...makeProps({
          editingTemplateId: "tpl-1",
          editTplRecurrence: "weekly",
          editTplRecurrenceOngoing: false,
          editTplRecurrenceEnd: "2026-01-01",
          onEditTplRecurrenceEndChange,
        })}
      />,
    );
    const dateInput = screen.getByDisplayValue("2026-01-01");
    fireEvent.change(dateInput, { target: { value: "2026-06-15" } });
    expect(onEditTplRecurrenceEndChange).toHaveBeenCalledWith("2026-06-15");
  });

  it("hides recurrence end date input when ongoing is true", () => {
    render(
      <ManageTemplates
        {...makeProps({ editingTemplateId: "tpl-1", editTplRecurrence: "weekly", editTplRecurrenceOngoing: true })}
      />,
    );
    expect(screen.queryByText("recurrenceEndDate")).not.toBeInTheDocument();
    expect(screen.getByText("recurrenceOngoing")).toBeInTheDocument();
  });

  it("calls onEditTplRecurrenceOngoingChange and clears end date", () => {
    const onEditTplRecurrenceOngoingChange = vi.fn();
    const onEditTplRecurrenceEndChange = vi.fn();
    render(
      <ManageTemplates
        {...makeProps({
          editingTemplateId: "tpl-1",
          editTplRecurrence: "weekly",
          onEditTplRecurrenceOngoingChange,
          onEditTplRecurrenceEndChange,
        })}
      />,
    );
    const checkbox = screen.getByText("recurrenceOngoing").closest("label")!.querySelector("input")!;
    fireEvent.click(checkbox);
    expect(onEditTplRecurrenceOngoingChange).toHaveBeenCalledWith(true);
    expect(onEditTplRecurrenceEndChange).toHaveBeenCalledWith("");
  });

  // ── Organizer in edit ──

  it("renders organizer input in edit form", () => {
    render(<ManageTemplates {...makeProps({ editingTemplateId: "tpl-1", editTplOrganizer: "OrgName" })} />);
    expect(screen.getByDisplayValue("OrgName")).toBeInTheDocument();
  });

  it("calls onEditTplOrganizerChange when organizer changes", () => {
    const onEditTplOrganizerChange = vi.fn();
    render(
      <ManageTemplates
        {...makeProps({ editingTemplateId: "tpl-1", editTplOrganizer: "Old", onEditTplOrganizerChange })}
      />,
    );
    fireEvent.change(screen.getByDisplayValue("Old"), { target: { value: "New" } });
    expect(onEditTplOrganizerChange).toHaveBeenCalledWith("New");
  });
});
