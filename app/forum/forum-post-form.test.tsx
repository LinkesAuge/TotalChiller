// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("next/dynamic", () => ({
  __esModule: true,
  default: (_loader: any, opts?: any) => {
    opts?.loading?.();
    const React = require("react");
    return ({ content }: any) => React.createElement("div", { "data-testid": "markdown" }, content);
  },
}));
vi.mock("@/lib/markdown/app-markdown-toolbar", () => ({
  __esModule: true,
  default: () => {
    const React = require("react");
    return React.createElement("div", { "data-testid": "markdown-toolbar" });
  },
  handleImagePaste: vi.fn(),
  handleImageDrop: vi.fn(),
}));
vi.mock("../components/ui/game-button", () => ({
  __esModule: true,
  default: ({ children, disabled, ...props }: any) => {
    const React = require("react");
    return React.createElement("button", { ...props, disabled }, children);
  },
}));

import ForumPostForm from "./forum-post-form";
import type { ForumCategory } from "@/lib/types/domain";

const t = vi.fn((key: string) => key);

const categories: ForumCategory[] = [
  { id: "cat1", name: "General", slug: "general", clan_id: "c1" },
  { id: "cat2", name: "Help", slug: "help", clan_id: "c1" },
] as ForumCategory[];

function makeBaseProps(overrides: any = {}) {
  return {
    formTitle: "",
    formContent: "",
    formCategoryId: "",
    formPinned: false,
    editingPostId: "",
    isPreviewMode: false,
    isImageUploading: false,
    categories,
    canManage: false,
    t,
    contentTextareaRef: { current: null },
    supabase: {} as any,
    currentUserId: "u1",
    onTitleChange: vi.fn(),
    onContentChange: vi.fn(),
    onCategoryChange: vi.fn(),
    onPinnedChange: vi.fn(),
    onPreviewToggle: vi.fn(),
    onContentInsert: vi.fn(),
    onImageUploadingChange: vi.fn(),
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  };
}

describe("ForumPostForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Heading ──

  it("renders create post heading when not editing", () => {
    render(<ForumPostForm {...makeBaseProps()} />);
    expect(screen.getByText("createPost")).toBeInTheDocument();
  });

  it("renders edit post heading when editing", () => {
    render(<ForumPostForm {...makeBaseProps({ editingPostId: "p1" })} />);
    expect(screen.getByText("editPost")).toBeInTheDocument();
  });

  // ── Title input ──

  it("renders title input with label", () => {
    render(<ForumPostForm {...makeBaseProps()} />);
    expect(screen.getByLabelText("postTitle")).toBeInTheDocument();
  });

  it("renders title input with maxLength of 200", () => {
    render(<ForumPostForm {...makeBaseProps()} />);
    expect(screen.getByLabelText("postTitle")).toHaveAttribute("maxLength", "200");
  });

  it("calls onTitleChange when title input changes", () => {
    const onTitleChange = vi.fn();
    render(<ForumPostForm {...makeBaseProps({ onTitleChange })} />);
    fireEvent.change(screen.getByLabelText("postTitle"), { target: { value: "New Title" } });
    expect(onTitleChange).toHaveBeenCalledWith("New Title");
  });

  it("renders placeholder for title", () => {
    render(<ForumPostForm {...makeBaseProps()} />);
    expect(screen.getByPlaceholderText("postTitlePlaceholder")).toBeInTheDocument();
  });

  // ── Category select ──

  it("renders category select with options", () => {
    render(<ForumPostForm {...makeBaseProps()} />);
    const select = screen.getByLabelText("category");
    expect(select).toBeInTheDocument();
    expect(screen.getByText("selectCategory")).toBeInTheDocument();
    expect(screen.getByText("General")).toBeInTheDocument();
    expect(screen.getByText("Help")).toBeInTheDocument();
  });

  it("calls onCategoryChange when category is selected", () => {
    const onCategoryChange = vi.fn();
    render(<ForumPostForm {...makeBaseProps({ onCategoryChange })} />);
    fireEvent.change(screen.getByLabelText("category"), { target: { value: "cat2" } });
    expect(onCategoryChange).toHaveBeenCalledWith("cat2");
  });

  it("renders with selected category value", () => {
    render(<ForumPostForm {...makeBaseProps({ formCategoryId: "cat1" })} />);
    const select = screen.getByLabelText("category") as HTMLSelectElement;
    expect(select.value).toBe("cat1");
  });

  // ── Pin checkbox ──

  it("does not render pin checkbox when canManage is false", () => {
    render(<ForumPostForm {...makeBaseProps()} />);
    expect(screen.queryByText("pinPost")).not.toBeInTheDocument();
  });

  it("renders pin checkbox when canManage is true", () => {
    render(<ForumPostForm {...makeBaseProps({ canManage: true })} />);
    expect(screen.getByText("pinPost")).toBeInTheDocument();
  });

  it("calls onPinnedChange when pin checkbox is toggled", () => {
    const onPinnedChange = vi.fn();
    render(<ForumPostForm {...makeBaseProps({ canManage: true, onPinnedChange })} />);
    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);
    expect(onPinnedChange).toHaveBeenCalledWith(true);
  });

  it("renders pin checkbox as checked when formPinned is true", () => {
    render(<ForumPostForm {...makeBaseProps({ canManage: true, formPinned: true })} />);
    const checkbox = screen.getByRole("checkbox") as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });

  // ── Write/Preview tabs ──

  it("renders write/preview tabs", () => {
    render(<ForumPostForm {...makeBaseProps()} />);
    expect(screen.getByText("write")).toBeInTheDocument();
    expect(screen.getByText("preview")).toBeInTheDocument();
  });

  it("calls onPreviewToggle(true) when preview tab is clicked", () => {
    const onPreviewToggle = vi.fn();
    render(<ForumPostForm {...makeBaseProps({ onPreviewToggle })} />);
    fireEvent.click(screen.getByText("preview"));
    expect(onPreviewToggle).toHaveBeenCalledWith(true);
  });

  it("calls onPreviewToggle(false) when write tab is clicked", () => {
    const onPreviewToggle = vi.fn();
    render(<ForumPostForm {...makeBaseProps({ isPreviewMode: true, onPreviewToggle })} />);
    fireEvent.click(screen.getByText("write"));
    expect(onPreviewToggle).toHaveBeenCalledWith(false);
  });

  it("marks write tab as active when not in preview mode", () => {
    const { container } = render(<ForumPostForm {...makeBaseProps()} />);
    const writeTabs = container.querySelectorAll(".forum-editor-tab");
    expect(writeTabs[0]!.classList.contains("active")).toBe(true);
    expect(writeTabs[1]!.classList.contains("active")).toBe(false);
  });

  it("marks preview tab as active when in preview mode", () => {
    const { container } = render(<ForumPostForm {...makeBaseProps({ isPreviewMode: true, formContent: "x" })} />);
    const tabs = container.querySelectorAll(".forum-editor-tab");
    expect(tabs[0]!.classList.contains("active")).toBe(false);
    expect(tabs[1]!.classList.contains("active")).toBe(true);
  });

  // ── Content area ──

  it("renders content textarea when not in preview mode", () => {
    render(<ForumPostForm {...makeBaseProps()} />);
    expect(screen.getByPlaceholderText("postContentPlaceholder")).toBeInTheDocument();
  });

  it("renders markdown toolbar when not in preview mode", () => {
    render(<ForumPostForm {...makeBaseProps()} />);
    expect(screen.getByTestId("markdown-toolbar")).toBeInTheDocument();
  });

  it("renders preview content when in preview mode with content", () => {
    render(<ForumPostForm {...makeBaseProps({ isPreviewMode: true, formContent: "Hello world" })} />);
    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });

  it("renders empty preview message when content is empty in preview mode", () => {
    render(<ForumPostForm {...makeBaseProps({ isPreviewMode: true, formContent: "" })} />);
    expect(screen.getByText("previewEmpty")).toBeInTheDocument();
  });

  it("renders empty preview for whitespace-only content", () => {
    render(<ForumPostForm {...makeBaseProps({ isPreviewMode: true, formContent: "   " })} />);
    expect(screen.getByText("previewEmpty")).toBeInTheDocument();
  });

  it("hides textarea in preview mode", () => {
    render(<ForumPostForm {...makeBaseProps({ isPreviewMode: true, formContent: "x" })} />);
    expect(screen.queryByPlaceholderText("postContentPlaceholder")).not.toBeInTheDocument();
    expect(screen.queryByTestId("markdown-toolbar")).not.toBeInTheDocument();
  });

  it("calls onContentChange when textarea content changes", () => {
    const onContentChange = vi.fn();
    render(<ForumPostForm {...makeBaseProps({ onContentChange })} />);
    fireEvent.change(screen.getByPlaceholderText("postContentPlaceholder"), { target: { value: "New content" } });
    expect(onContentChange).toHaveBeenCalledWith("New content");
  });

  // ── Markdown hint ──

  it("renders markdown hint text", () => {
    render(<ForumPostForm {...makeBaseProps()} />);
    expect(screen.getByText("markdownHint")).toBeInTheDocument();
  });

  // ── Submit button ──

  it("disables submit button when title is empty", () => {
    render(<ForumPostForm {...makeBaseProps()} />);
    expect(screen.getByText("submit")).toBeDisabled();
  });

  it("disables submit button when title is whitespace only", () => {
    render(<ForumPostForm {...makeBaseProps({ formTitle: "   " })} />);
    expect(screen.getByText("submit")).toBeDisabled();
  });

  it("enables submit button when title is provided", () => {
    render(<ForumPostForm {...makeBaseProps({ formTitle: "Some title" })} />);
    expect(screen.getByText("submit")).not.toBeDisabled();
  });

  it("calls onSubmit when submit button is clicked", () => {
    const onSubmit = vi.fn();
    render(<ForumPostForm {...makeBaseProps({ formTitle: "Title", onSubmit })} />);
    fireEvent.click(screen.getByText("submit"));
    expect(onSubmit).toHaveBeenCalled();
  });

  it("shows 'save' label when editing", () => {
    render(<ForumPostForm {...makeBaseProps({ editingPostId: "p1", formTitle: "Title" })} />);
    expect(screen.getByText("save")).toBeInTheDocument();
  });

  it("shows 'submit' label when creating", () => {
    render(<ForumPostForm {...makeBaseProps({ formTitle: "Title" })} />);
    expect(screen.getByText("submit")).toBeInTheDocument();
  });

  // ── Cancel button ──

  it("calls onCancel when cancel button is clicked", () => {
    const onCancel = vi.fn();
    render(<ForumPostForm {...makeBaseProps({ onCancel })} />);
    fireEvent.click(screen.getByText("cancel"));
    expect(onCancel).toHaveBeenCalled();
  });

  // ── Paste / Drop handlers ──

  it("calls handleImagePaste when pasting into textarea", async () => {
    const { handleImagePaste } = await import("@/lib/markdown/app-markdown-toolbar");
    render(<ForumPostForm {...makeBaseProps()} />);
    const textarea = screen.getByPlaceholderText("postContentPlaceholder");
    fireEvent.paste(textarea);
    expect(handleImagePaste).toHaveBeenCalled();
  });

  it("calls handleImageDrop when dropping into textarea", async () => {
    const { handleImageDrop } = await import("@/lib/markdown/app-markdown-toolbar");
    render(<ForumPostForm {...makeBaseProps()} />);
    const textarea = screen.getByPlaceholderText("postContentPlaceholder");
    fireEvent.drop(textarea);
    expect(handleImageDrop).toHaveBeenCalled();
  });

  // ── DragOver prevention ──

  it("prevents default on dragover for textarea", () => {
    render(<ForumPostForm {...makeBaseProps()} />);
    const textarea = screen.getByPlaceholderText("postContentPlaceholder");
    const event = new Event("dragover", { bubbles: true });
    Object.assign(event, { preventDefault: vi.fn(), stopPropagation: vi.fn() });
    textarea.dispatchEvent(event);
    expect((event as any).preventDefault).toHaveBeenCalled();
  });
});
