// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import EditableText from "./editable-text";

vi.mock("next-intl", () => ({
  useTranslations: vi.fn(() => vi.fn((key: string) => key)),
}));
vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: any) => {
    const React = require("react");
    return React.createElement("img", props);
  },
}));
vi.mock("next/dynamic", () => ({
  __esModule: true,
  default: () => {
    const Component = ({ content }: any) => {
      const React = require("react");
      return React.createElement("div", { "data-testid": "app-markdown" }, content);
    };
    Component.displayName = "AppMarkdownMock";
    return Component;
  },
}));
vi.mock("@/lib/markdown/app-markdown-toolbar", () => ({
  __esModule: true,
  default: (_props: any) => {
    const React = require("react");
    return React.createElement("div", { "data-testid": "md-toolbar" });
  },
}));
vi.mock("./ui/game-button", () => ({
  __esModule: true,
  default: ({ children, onClick, disabled, ariaLabel, ...props }: any) => {
    const React = require("react");
    return React.createElement("button", { onClick, disabled, "aria-label": ariaLabel, ...props }, children);
  },
}));

const defaultProps = {
  value: "Hello World",
  onSave: vi.fn(async () => {}),
  canEdit: false,
  locale: "de",
};

describe("EditableText", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders plain text value when canEdit=false", () => {
    render(<EditableText {...defaultProps} />);
    expect(screen.getByText("Hello World")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "editContent" })).toBeNull();
  });

  it("shows edit pencil button when canEdit=true", () => {
    render(<EditableText {...defaultProps} canEdit={true} />);
    expect(screen.getByRole("button", { name: "editContent" })).toBeTruthy();
  });

  it("renders with custom tag via 'as' prop", () => {
    const { container } = render(<EditableText {...defaultProps} as="h3" singleLine />);
    expect(container.querySelector("h3")).toBeTruthy();
  });

  it("applies className", () => {
    const { container } = render(<EditableText {...defaultProps} className="extra" />);
    expect(container.querySelector(".extra")).toBeTruthy();
  });

  it("renders children instead of value when children provided", () => {
    render(
      <EditableText {...defaultProps}>
        <span>Custom Child</span>
      </EditableText>,
    );
    expect(screen.getByText("Custom Child")).toBeTruthy();
  });

  it("renders markdown content when markdown=true", () => {
    render(<EditableText {...defaultProps} markdown={true} />);
    expect(screen.getByTestId("app-markdown")).toBeTruthy();
    expect(screen.getByTestId("app-markdown").textContent).toBe("Hello World");
  });

  it("renders pencil button on children path when canEdit", () => {
    render(
      <EditableText {...defaultProps} canEdit>
        <span>Child</span>
      </EditableText>,
    );
    expect(screen.getByRole("button", { name: "editContent" })).toBeTruthy();
  });

  it("renders singleLine value in custom tag", () => {
    const { container } = render(<EditableText {...defaultProps} singleLine as="p" />);
    const p = container.querySelector("p");
    expect(p?.textContent).toContain("Hello World");
  });

  it("renders plain text with line breaks for multiline default mode", () => {
    render(<EditableText {...defaultProps} value={"Line 1\nLine 2\nLine 3"} />);
    expect(screen.getByText("Line 1")).toBeTruthy();
    expect(screen.getByText("Line 2")).toBeTruthy();
    expect(screen.getByText("Line 3")).toBeTruthy();
    const brs = document.querySelectorAll("br");
    expect(brs.length).toBe(2);
  });

  it("adds editable class when canEdit=true", () => {
    const { container } = render(<EditableText {...defaultProps} canEdit />);
    expect(container.querySelector(".editable")).toBeTruthy();
  });

  it("does not add editable class when canEdit=false", () => {
    const { container } = render(<EditableText {...defaultProps} />);
    expect(container.querySelector(".editable")).toBeNull();
  });

  it("opens edit mode when pencil clicked", () => {
    render(<EditableText {...defaultProps} canEdit />);
    fireEvent.click(screen.getByRole("button", { name: "editContent" }));
    expect(screen.getByRole("button", { name: "save" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "cancel" })).toBeTruthy();
  });

  it("opens edit mode via keyboard Enter on pencil", () => {
    render(<EditableText {...defaultProps} canEdit />);
    const pencil = screen.getByRole("button", { name: "editContent" });
    fireEvent.keyDown(pencil, { key: "Enter" });
    expect(screen.getByRole("button", { name: "save" })).toBeTruthy();
  });

  it("opens edit mode via keyboard Space on pencil", () => {
    render(<EditableText {...defaultProps} canEdit />);
    const pencil = screen.getByRole("button", { name: "editContent" });
    fireEvent.keyDown(pencil, { key: " " });
    expect(screen.getByRole("button", { name: "save" })).toBeTruthy();
  });

  it("shows DE/EN tabs in multiline edit mode", () => {
    render(<EditableText {...defaultProps} canEdit />);
    fireEvent.click(screen.getByRole("button", { name: "editContent" }));
    expect(screen.getByText("DE")).toBeTruthy();
    expect(screen.getByText("EN")).toBeTruthy();
  });

  it("shows single-line inputs in singleLine edit mode", () => {
    render(<EditableText {...defaultProps} canEdit singleLine />);
    fireEvent.click(screen.getByRole("button", { name: "editContent" }));
    expect(screen.getByLabelText("DE")).toBeTruthy();
    expect(screen.getByLabelText("EN")).toBeTruthy();
  });

  it("populates edit fields correctly for DE locale", () => {
    render(<EditableText {...defaultProps} canEdit singleLine value="German text" valueEn="English text" />);
    fireEvent.click(screen.getByRole("button", { name: "editContent" }));
    const deInput = screen.getByLabelText("DE") as HTMLInputElement;
    const enInput = screen.getByLabelText("EN") as HTMLInputElement;
    expect(deInput.value).toBe("German text");
    expect(enInput.value).toBe("English text");
  });

  it("populates edit fields correctly for EN locale", () => {
    render(
      <EditableText {...defaultProps} canEdit singleLine locale="en" value="English text" valueDe="German text" />,
    );
    fireEvent.click(screen.getByRole("button", { name: "editContent" }));
    const deInput = screen.getByLabelText("DE") as HTMLInputElement;
    const enInput = screen.getByLabelText("EN") as HTMLInputElement;
    expect(deInput.value).toBe("German text");
    expect(enInput.value).toBe("English text");
  });

  it("cancels editing and returns to display mode", () => {
    render(<EditableText {...defaultProps} canEdit />);
    fireEvent.click(screen.getByRole("button", { name: "editContent" }));
    expect(screen.getByRole("button", { name: "cancel" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "cancel" }));
    expect(screen.getByText("Hello World")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "cancel" })).toBeNull();
  });

  it("saves and exits edit mode on successful save", async () => {
    const onSave = vi.fn(async () => {});
    render(<EditableText {...defaultProps} canEdit singleLine onSave={onSave} />);
    fireEvent.click(screen.getByRole("button", { name: "editContent" }));
    const deInput = screen.getByLabelText("DE") as HTMLInputElement;
    fireEvent.change(deInput, { target: { value: "Updated DE" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "save" }));
    });
    expect(onSave).toHaveBeenCalledWith("Updated DE", "Hello World");
    expect(screen.queryByRole("button", { name: "cancel" })).toBeNull();
  });

  it("shows error message on save failure", async () => {
    const onSave = vi.fn(async () => {
      throw new Error("Save failed!");
    });
    render(<EditableText {...defaultProps} canEdit singleLine onSave={onSave} />);
    fireEvent.click(screen.getByRole("button", { name: "editContent" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "save" }));
    });
    expect(screen.getByText("Save failed!")).toBeTruthy();
    expect(screen.getByRole("button", { name: "cancel" })).toBeTruthy();
  });

  it("shows fallback error message for non-Error throws", async () => {
    const onSave = vi.fn(async () => {
      throw "string error";
    });
    render(<EditableText {...defaultProps} canEdit singleLine onSave={onSave} />);
    fireEvent.click(screen.getByRole("button", { name: "editContent" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "save" }));
    });
    expect(screen.getByText("saveFailed")).toBeTruthy();
  });

  it("disables save button while saving", async () => {
    let resolvePromise: () => void;
    const savePromise = new Promise<void>((resolve) => {
      resolvePromise = resolve;
    });
    const onSave = vi.fn(() => savePromise);
    render(<EditableText {...defaultProps} canEdit singleLine onSave={onSave} />);
    fireEvent.click(screen.getByRole("button", { name: "editContent" }));
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "save" }));
    });
    await waitFor(() => {
      expect(screen.getByText("…")).toBeTruthy();
    });
    const saveBtn = screen.getByRole("button", { name: "save" });
    expect(saveBtn).toHaveAttribute("disabled");
    await act(async () => {
      resolvePromise!();
    });
  });

  it("switches between DE and EN tabs in multiline mode", () => {
    render(<EditableText {...defaultProps} canEdit value="DE text" valueEn="EN text" />);
    fireEvent.click(screen.getByRole("button", { name: "editContent" }));
    const textarea = document.querySelector(".editable-text-textarea") as HTMLTextAreaElement;
    expect(textarea.value).toBe("DE text");
    fireEvent.click(screen.getByText("EN"));
    const textareaEn = document.querySelector(".editable-text-textarea") as HTMLTextAreaElement;
    expect(textareaEn.value).toBe("EN text");
  });

  it("shows markdown toolbar and preview toggle for markdown fields", () => {
    render(<EditableText {...defaultProps} canEdit markdown />);
    fireEvent.click(screen.getByRole("button", { name: "editContent" }));
    expect(screen.getByTestId("md-toolbar")).toBeTruthy();
    expect(screen.getByText("preview")).toBeTruthy();
  });

  it("toggles preview mode in markdown edit", () => {
    render(<EditableText {...defaultProps} canEdit markdown />);
    fireEvent.click(screen.getByRole("button", { name: "editContent" }));
    fireEvent.click(screen.getByText("preview"));
    expect(screen.getByTestId("app-markdown")).toBeTruthy();
    expect(screen.getByText("editor")).toBeTruthy();
  });

  it("does not show preview toggle for non-markdown multiline", () => {
    render(<EditableText {...defaultProps} canEdit />);
    fireEvent.click(screen.getByRole("button", { name: "editContent" }));
    expect(screen.queryByText("preview")).toBeNull();
  });

  it("renders markdown in display mode via AppMarkdown", () => {
    render(<EditableText {...defaultProps} markdown />);
    const md = screen.getByTestId("app-markdown");
    expect(md.textContent).toBe("Hello World");
  });

  it("renders markdown display in div wrapper", () => {
    const { container } = render(<EditableText {...defaultProps} markdown />);
    expect(container.querySelector("div.editable-text-wrap")).toBeTruthy();
  });

  it("clears error on cancel", async () => {
    const onSave = vi.fn(async () => {
      throw new Error("Oops");
    });
    render(<EditableText {...defaultProps} canEdit singleLine onSave={onSave} />);
    fireEvent.click(screen.getByRole("button", { name: "editContent" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "save" }));
    });
    expect(screen.getByText("Oops")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "cancel" }));
    fireEvent.click(screen.getByRole("button", { name: "editContent" }));
    expect(screen.queryByText("Oops")).toBeNull();
  });

  it("saves from multiline mode with textarea", async () => {
    const onSave = vi.fn(async () => {});
    render(<EditableText {...defaultProps} canEdit onSave={onSave} />);
    fireEvent.click(screen.getByRole("button", { name: "editContent" }));
    const textarea = document.querySelector(".editable-text-textarea") as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "Updated DE value" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "save" }));
    });
    expect(onSave).toHaveBeenCalledWith("Updated DE value", "Hello World");
  });

  it("changes textarea value via EN tab and saves both", async () => {
    const onSave = vi.fn(async () => {});
    render(<EditableText {...defaultProps} canEdit value="DE content" valueEn="EN content" onSave={onSave} />);
    fireEvent.click(screen.getByRole("button", { name: "editContent" }));

    fireEvent.click(screen.getByText("EN"));
    const textareaEn = document.querySelector(".editable-text-textarea") as HTMLTextAreaElement;
    fireEvent.change(textareaEn, { target: { value: "Updated EN" } });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "save" }));
    });
    expect(onSave).toHaveBeenCalledWith("DE content", "Updated EN");
  });

  it("populates valueDe fallback when no explicit valueDe provided in EN locale", () => {
    render(<EditableText {...defaultProps} canEdit singleLine locale="en" value="English" />);
    fireEvent.click(screen.getByRole("button", { name: "editContent" }));
    const deInput = screen.getByLabelText("DE") as HTMLInputElement;
    expect(deInput.value).toBe("English");
  });

  it("populates valueEn fallback when no explicit valueEn provided in DE locale", () => {
    render(<EditableText {...defaultProps} canEdit singleLine value="German" />);
    fireEvent.click(screen.getByRole("button", { name: "editContent" }));
    const enInput = screen.getByLabelText("EN") as HTMLInputElement;
    expect(enInput.value).toBe("German");
  });

  it("renders single-line EN input edit and saves both values", async () => {
    const onSave = vi.fn(async () => {});
    render(<EditableText {...defaultProps} canEdit singleLine onSave={onSave} />);
    fireEvent.click(screen.getByRole("button", { name: "editContent" }));
    const enInput = screen.getByLabelText("EN") as HTMLInputElement;
    fireEvent.change(enInput, { target: { value: "New EN" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "save" }));
    });
    expect(onSave).toHaveBeenCalledWith("Hello World", "New EN");
  });

  it("renders markdown display with editable class", () => {
    const { container } = render(<EditableText {...defaultProps} canEdit markdown />);
    expect(container.querySelector(".editable")).toBeTruthy();
  });

  it("renders with as='div' tag", () => {
    const { container } = render(<EditableText {...defaultProps} as="div" singleLine />);
    const div = container.querySelector("div.editable-text-wrap");
    expect(div).toBeTruthy();
  });

  it("ignores non-Enter/Space keyDown on pencil", () => {
    render(<EditableText {...defaultProps} canEdit />);
    const pencil = screen.getByRole("button", { name: "editContent" });
    fireEvent.keyDown(pencil, { key: "Tab" });
    expect(screen.queryByRole("button", { name: "save" })).toBeNull();
  });
});
