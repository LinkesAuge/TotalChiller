// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MarkdownEditor from "./markdown-editor";

vi.mock("next-intl", () => ({
  useTranslations: vi.fn(() => vi.fn((key: string) => key)),
}));
vi.mock("next/dynamic", () => ({
  __esModule: true,
  default: () => {
    const React = require("react");
    return (props: any) => React.createElement("div", { "data-testid": "app-markdown" }, props.content);
  },
}));
vi.mock("@/lib/markdown/app-markdown-toolbar", () => ({
  __esModule: true,
  default: (props: any) => {
    const React = require("react");
    return React.createElement("div", { "data-testid": "markdown-toolbar" });
  },
  handleImagePaste: vi.fn(),
  handleImageDrop: vi.fn(),
}));

function makeProps(overrides: any = {}): any {
  return {
    id: "test-editor",
    value: "",
    onChange: vi.fn(),
    supabase: {} as any,
    userId: "user-1",
    placeholder: "Write something…",
    rows: 8,
    minHeight: 200,
    ...overrides,
  };
}

describe("MarkdownEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders write and preview tabs", () => {
    render(<MarkdownEditor {...makeProps()} />);
    expect(screen.getByText("write")).toBeInTheDocument();
    expect(screen.getByText("preview")).toBeInTheDocument();
  });

  it("renders textarea in write mode by default", () => {
    render(<MarkdownEditor {...makeProps({ value: "hello" })} />);
    expect(screen.getByDisplayValue("hello")).toBeInTheDocument();
  });

  it("renders toolbar in write mode", () => {
    render(<MarkdownEditor {...makeProps()} />);
    expect(screen.getByTestId("markdown-toolbar")).toBeInTheDocument();
  });

  it("shows markdown hint text", () => {
    render(<MarkdownEditor {...makeProps()} />);
    expect(screen.getByText("markdownHint")).toBeInTheDocument();
  });

  it("calls onChange when textarea value changes", () => {
    const onChange = vi.fn();
    render(<MarkdownEditor {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "new text" } });
    expect(onChange).toHaveBeenCalledWith("new text");
  });

  it("switches to preview mode when preview tab clicked", () => {
    render(<MarkdownEditor {...makeProps({ value: "# Title" })} />);
    fireEvent.click(screen.getByText("preview"));
    expect(screen.getByTestId("app-markdown")).toBeInTheDocument();
    expect(screen.getByTestId("app-markdown")).toHaveTextContent("# Title");
  });

  it("shows empty preview message when value is empty", () => {
    render(<MarkdownEditor {...makeProps({ value: "" })} />);
    fireEvent.click(screen.getByText("preview"));
    expect(screen.getByText("previewEmpty")).toBeInTheDocument();
  });

  it("switches back to write mode when write tab clicked", () => {
    render(<MarkdownEditor {...makeProps({ value: "text" })} />);
    fireEvent.click(screen.getByText("preview"));
    expect(screen.queryByDisplayValue("text")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("write"));
    expect(screen.getByDisplayValue("text")).toBeInTheDocument();
  });

  it("sets the id on the textarea", () => {
    render(<MarkdownEditor {...makeProps({ id: "my-editor" })} />);
    expect(screen.getByRole("textbox")).toHaveAttribute("id", "my-editor");
  });

  /* ── Write tab has aria-selected true by default ── */

  it("marks write tab as aria-selected by default", () => {
    render(<MarkdownEditor {...makeProps()} />);
    const writeTab = screen.getByText("write");
    expect(writeTab).toHaveAttribute("aria-selected", "true");
    const previewTab = screen.getByText("preview");
    expect(previewTab).toHaveAttribute("aria-selected", "false");
  });

  /* ── Preview tab gets aria-selected when active ── */

  it("marks preview tab as aria-selected when switched", () => {
    render(<MarkdownEditor {...makeProps()} />);
    fireEvent.click(screen.getByText("preview"));
    expect(screen.getByText("preview")).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("write")).toHaveAttribute("aria-selected", "false");
  });

  /* ── Active class toggles on tabs ── */

  it("applies active class to write tab by default", () => {
    render(<MarkdownEditor {...makeProps()} />);
    expect(screen.getByText("write")).toHaveClass("active");
    expect(screen.getByText("preview")).not.toHaveClass("active");
  });

  it("applies active class to preview tab when switched", () => {
    render(<MarkdownEditor {...makeProps()} />);
    fireEvent.click(screen.getByText("preview"));
    expect(screen.getByText("preview")).toHaveClass("active");
    expect(screen.getByText("write")).not.toHaveClass("active");
  });

  /* ── Tablist role on container ── */

  it("renders tab container with tablist role", () => {
    render(<MarkdownEditor {...makeProps()} />);
    expect(screen.getByRole("tablist")).toBeInTheDocument();
  });

  /* ── Tabpanel role on content areas ── */

  it("renders tabpanel in write mode", () => {
    render(<MarkdownEditor {...makeProps()} />);
    expect(screen.getByRole("tabpanel")).toBeInTheDocument();
  });

  it("renders tabpanel in preview mode", () => {
    render(<MarkdownEditor {...makeProps({ value: "text" })} />);
    fireEvent.click(screen.getByText("preview"));
    expect(screen.getByRole("tabpanel")).toBeInTheDocument();
  });

  /* ── Preview with non-empty content renders AppMarkdown ── */

  it("renders AppMarkdown with content when value is non-empty in preview", () => {
    render(<MarkdownEditor {...makeProps({ value: "# Hello" })} />);
    fireEvent.click(screen.getByText("preview"));
    expect(screen.getByTestId("app-markdown")).toHaveTextContent("# Hello");
  });

  /* ── Preview with whitespace-only value shows empty message ── */

  it("shows empty preview message when value is whitespace-only", () => {
    render(<MarkdownEditor {...makeProps({ value: "   " })} />);
    fireEvent.click(screen.getByText("preview"));
    expect(screen.getByText("previewEmpty")).toBeInTheDocument();
  });

  /* ── Placeholder applied to textarea ── */

  it("applies placeholder to the textarea", () => {
    render(<MarkdownEditor {...makeProps({ placeholder: "Type here..." })} />);
    expect(screen.getByPlaceholderText("Type here...")).toBeInTheDocument();
  });

  /* ── onPaste triggers paste handler ── */

  it("handles paste event on textarea without error", () => {
    render(<MarkdownEditor {...makeProps()} />);
    expect(() => {
      fireEvent.paste(screen.getByRole("textbox"), {
        clipboardData: { items: [] },
      });
    }).not.toThrow();
  });

  /* ── onDrop triggers drop handler ── */

  it("handles drop event on textarea without error", () => {
    render(<MarkdownEditor {...makeProps()} />);
    expect(() => {
      fireEvent.drop(screen.getByRole("textbox"), {
        dataTransfer: { files: [] },
      });
    }).not.toThrow();
  });

  /* ── onDragOver prevents default ── */

  it("handles dragOver event without error", () => {
    render(<MarkdownEditor {...makeProps()} />);
    const textarea = screen.getByRole("textbox");
    const event = new Event("dragover", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "preventDefault", { value: vi.fn() });
    Object.defineProperty(event, "stopPropagation", { value: vi.fn() });
    textarea.dispatchEvent(event);
  });

  /* ── minHeight applied to textarea ── */

  it("applies minHeight style to textarea", () => {
    render(<MarkdownEditor {...makeProps({ minHeight: 300 })} />);
    const textarea = screen.getByRole("textbox");
    expect(textarea.style.minHeight).toBe("300px");
  });

  /* ── Preview minHeight applied ── */

  it("applies minHeight style to preview container", () => {
    render(<MarkdownEditor {...makeProps({ value: "text", minHeight: 400 })} />);
    fireEvent.click(screen.getByText("preview"));
    const preview = document.querySelector(".forum-editor-preview");
    expect(preview).toBeInTheDocument();
    expect((preview as HTMLElement).style.minHeight).toBe("400px");
  });
});
