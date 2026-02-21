// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@/lib/constants/banner-presets", () => ({
  BANNER_PRESETS: ["/banner1.png", "/banner2.png"],
}));
vi.mock("../components/ui/radix-select", () => ({
  __esModule: true,
  default: ({ id, options, value, onValueChange }: any) => {
    const React = require("react");
    return React.createElement(
      "select",
      {
        id,
        "data-testid": `radix-select-${id}`,
        value,
        onChange: (e: any) => onValueChange(e.target.value),
      },
      options.map((o: any) => React.createElement("option", { key: o.value, value: o.value }, o.label)),
    );
  },
}));
vi.mock("../components/banner-picker", () => ({
  __esModule: true,
  default: ({ onChange, value, onUpload, isUploading }: any) => {
    const React = require("react");
    return React.createElement(
      "div",
      { "data-testid": "banner-picker", "data-uploading": isUploading ? "true" : "false" },
      React.createElement(
        "button",
        { "data-testid": "banner-change-btn", onClick: () => onChange("new-banner.png") },
        "change",
      ),
    );
  },
}));
vi.mock("../components/markdown-editor", () => ({
  __esModule: true,
  default: ({ id, value, placeholder, onChange }: any) => {
    const React = require("react");
    return React.createElement("textarea", {
      id,
      defaultValue: value,
      placeholder,
      "data-testid": `md-editor-${id}`,
      onChange: (e: any) => onChange(e.target.value),
    });
  },
}));
vi.mock("../components/ui/game-button", () => ({
  __esModule: true,
  default: ({ children, disabled, ...props }: any) => {
    const React = require("react");
    return React.createElement("button", { ...props, disabled }, children);
  },
}));

import NewsForm from "./news-form";

const t = vi.fn((key: string) => key);

function makeBaseProps(overrides: any = {}) {
  return {
    editFormRef: { current: null },
    isEditing: false,
    values: { title: "", content: "", status: "draft" as const, isPinned: false, tagsInput: "", bannerUrl: "" },
    onFieldChange: vi.fn(),
    isSaving: false,
    isBannerUploading: false,
    bannerFileRef: { current: null },
    onBannerUpload: vi.fn(),
    onSubmit: vi.fn((e: any) => e.preventDefault()),
    onCancel: vi.fn(),
    supabase: {} as any,
    userId: "u1",
    t,
    ...overrides,
  };
}

describe("NewsForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Heading ──

  it("renders create heading when not editing", () => {
    const { container } = render(<NewsForm {...makeBaseProps()} />);
    expect(container.querySelector(".card-title")?.textContent).toBe("createPost");
  });

  it("renders edit heading when editing", () => {
    render(<NewsForm {...makeBaseProps({ isEditing: true })} />);
    expect(screen.getByText("editPost")).toBeInTheDocument();
  });

  it("renders subtitle", () => {
    render(<NewsForm {...makeBaseProps()} />);
    expect(screen.getByText("visibleToClan")).toBeInTheDocument();
  });

  // ── Title field ──

  it("renders title input with label", () => {
    render(<NewsForm {...makeBaseProps()} />);
    expect(screen.getByLabelText("titleLabel")).toBeInTheDocument();
  });

  it("renders title placeholder", () => {
    render(<NewsForm {...makeBaseProps()} />);
    expect(screen.getByPlaceholderText("titlePlaceholder")).toBeInTheDocument();
  });

  it("calls onFieldChange when title changes", () => {
    const onFieldChange = vi.fn();
    render(<NewsForm {...makeBaseProps({ onFieldChange })} />);
    fireEvent.change(screen.getByLabelText("titleLabel"), { target: { value: "New Title" } });
    expect(onFieldChange).toHaveBeenCalledWith("title", "New Title");
  });

  it("renders title with current value", () => {
    render(
      <NewsForm
        {...makeBaseProps({
          values: {
            title: "Existing",
            content: "",
            status: "draft" as const,
            isPinned: false,
            tagsInput: "",
            bannerUrl: "",
          },
        })}
      />,
    );
    expect(screen.getByLabelText("titleLabel")).toHaveValue("Existing");
  });

  // ── Content editor ──

  it("renders content editor", () => {
    render(<NewsForm {...makeBaseProps()} />);
    expect(screen.getByTestId("md-editor-newsContent")).toBeInTheDocument();
  });

  it("renders content placeholder", () => {
    render(<NewsForm {...makeBaseProps()} />);
    expect(screen.getByPlaceholderText("contentPlaceholder")).toBeInTheDocument();
  });

  // ── Banner picker ──

  it("renders banner picker", () => {
    render(<NewsForm {...makeBaseProps()} />);
    expect(screen.getByTestId("banner-picker")).toBeInTheDocument();
  });

  it("passes uploading state to banner picker", () => {
    render(<NewsForm {...makeBaseProps({ isBannerUploading: true })} />);
    expect(screen.getByTestId("banner-picker").dataset.uploading).toBe("true");
  });

  // ── Status select ──

  it("renders status select with options", () => {
    render(<NewsForm {...makeBaseProps()} />);
    const select = screen.getByTestId("radix-select-newsStatus");
    expect(select).toBeInTheDocument();
    expect(screen.getByText("draft")).toBeInTheDocument();
    expect(screen.getByText("pending")).toBeInTheDocument();
    expect(screen.getByText("published")).toBeInTheDocument();
  });

  it("calls onFieldChange when status changes", () => {
    const onFieldChange = vi.fn();
    render(<NewsForm {...makeBaseProps({ onFieldChange })} />);
    fireEvent.change(screen.getByTestId("radix-select-newsStatus"), { target: { value: "published" } });
    expect(onFieldChange).toHaveBeenCalledWith("status", "published");
  });

  // ── Tags input ──

  it("renders tags input", () => {
    render(<NewsForm {...makeBaseProps()} />);
    expect(screen.getByLabelText("tags")).toBeInTheDocument();
  });

  it("renders tags placeholder", () => {
    render(<NewsForm {...makeBaseProps()} />);
    expect(screen.getByPlaceholderText("tagsPlaceholder")).toBeInTheDocument();
  });

  it("calls onFieldChange when tags change", () => {
    const onFieldChange = vi.fn();
    render(<NewsForm {...makeBaseProps({ onFieldChange })} />);
    fireEvent.change(screen.getByLabelText("tags"), { target: { value: "tag1, tag2" } });
    expect(onFieldChange).toHaveBeenCalledWith("tagsInput", "tag1, tag2");
  });

  // ── Pin checkbox ──

  it("renders pin checkbox", () => {
    render(<NewsForm {...makeBaseProps()} />);
    expect(screen.getByText("pinLabel")).toBeInTheDocument();
  });

  it("calls onFieldChange when pin checkbox is toggled", () => {
    const onFieldChange = vi.fn();
    render(<NewsForm {...makeBaseProps({ onFieldChange })} />);
    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);
    expect(onFieldChange).toHaveBeenCalledWith("isPinned", true);
  });

  it("renders pin checkbox checked when isPinned is true", () => {
    render(
      <NewsForm
        {...makeBaseProps({
          values: { title: "", content: "", status: "draft" as const, isPinned: true, tagsInput: "", bannerUrl: "" },
        })}
      />,
    );
    const checkbox = screen.getByRole("checkbox") as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });

  // ── Submit button ──

  it("renders submit button with 'createPost' label when not editing", () => {
    render(<NewsForm {...makeBaseProps()} />);
    expect(screen.getByRole("button", { name: "createPost" })).toBeInTheDocument();
  });

  it("renders submit button with 'save' label when editing", () => {
    render(<NewsForm {...makeBaseProps({ isEditing: true })} />);
    expect(screen.getByText("save")).toBeInTheDocument();
  });

  it("renders submit button with 'saving' label when isSaving", () => {
    render(<NewsForm {...makeBaseProps({ isSaving: true })} />);
    expect(screen.getByText("saving")).toBeInTheDocument();
  });

  it("disables submit button when saving", () => {
    render(<NewsForm {...makeBaseProps({ isSaving: true })} />);
    expect(screen.getByText("saving")).toBeDisabled();
  });

  it("calls onSubmit when form is submitted", () => {
    const onSubmit = vi.fn((e: any) => e.preventDefault());
    render(<NewsForm {...makeBaseProps({ onSubmit })} />);
    const form = screen.getByRole("button", { name: "createPost" }).closest("form")!;
    fireEvent.submit(form);
    expect(onSubmit).toHaveBeenCalled();
  });

  // ── Cancel button ──

  it("renders cancel button", () => {
    render(<NewsForm {...makeBaseProps()} />);
    expect(screen.getByText("cancel")).toBeInTheDocument();
  });

  it("calls onCancel when cancel button is clicked", () => {
    const onCancel = vi.fn();
    render(<NewsForm {...makeBaseProps({ onCancel })} />);
    fireEvent.click(screen.getByText("cancel"));
    expect(onCancel).toHaveBeenCalled();
  });

  // ── Banner label ──

  it("renders banner label", () => {
    render(<NewsForm {...makeBaseProps()} />);
    expect(screen.getByText("bannerLabel")).toBeInTheDocument();
  });

  // ── Content label ──

  it("renders content label", () => {
    render(<NewsForm {...makeBaseProps()} />);
    expect(screen.getByText("contentLabel")).toBeInTheDocument();
  });

  // ── Callback coverage for BannerPicker & MarkdownEditor ──

  it("calls onFieldChange for bannerUrl when banner is changed", () => {
    const onFieldChange = vi.fn();
    render(<NewsForm {...makeBaseProps({ onFieldChange })} />);
    fireEvent.click(screen.getByTestId("banner-change-btn"));
    expect(onFieldChange).toHaveBeenCalledWith("bannerUrl", "new-banner.png");
  });

  it("calls onFieldChange for content when editor content changes", () => {
    const onFieldChange = vi.fn();
    render(<NewsForm {...makeBaseProps({ onFieldChange })} />);
    fireEvent.change(screen.getByTestId("md-editor-newsContent"), { target: { value: "New content" } });
    expect(onFieldChange).toHaveBeenCalledWith("content", "New content");
  });
});
