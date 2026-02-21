// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import FormModal from "./form-modal";

vi.mock("./ui/game-button", () => ({
  __esModule: true,
  default: ({ children, ...props }: any) => {
    const React = require("react");
    return React.createElement("button", props, children);
  },
}));

const defaultProps = {
  isOpen: true,
  title: "Test Title",
  submitLabel: "Save",
  cancelLabel: "Cancel",
  onSubmit: vi.fn(),
  onCancel: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("FormModal", () => {
  it("returns null when isOpen=false", () => {
    const { container } = render(<FormModal {...defaultProps} isOpen={false} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders modal with title and form", () => {
    render(<FormModal {...defaultProps} />);
    expect(screen.getByText("Test Title")).toBeDefined();
    expect(screen.getByRole("dialog")).toBeDefined();
    expect(screen.getByRole("dialog").getAttribute("aria-modal")).toBe("true");
  });

  it("shows subtitle when provided", () => {
    render(<FormModal {...defaultProps} subtitle="Sub info" />);
    expect(screen.getByText("Sub info")).toBeDefined();
  });

  it("renders children as form body", () => {
    render(
      <FormModal {...defaultProps}>
        <input data-testid="field" />
      </FormModal>,
    );
    expect(screen.getByTestId("field")).toBeDefined();
  });

  it("shows statusMessage when provided", () => {
    render(<FormModal {...defaultProps} statusMessage="Saving…" />);
    expect(screen.getByText("Saving…")).toBeDefined();
  });

  it("calls onSubmit when form submitted", () => {
    render(<FormModal {...defaultProps} />);
    fireEvent.submit(screen.getByText("Save").closest("form")!);
    expect(defaultProps.onSubmit).toHaveBeenCalledOnce();
  });

  it("calls onCancel when cancel button clicked", () => {
    render(<FormModal {...defaultProps} />);
    fireEvent.click(screen.getByText("Cancel"));
    expect(defaultProps.onCancel).toHaveBeenCalledOnce();
  });

  it("disables submit when isSubmitDisabled=true", () => {
    render(<FormModal {...defaultProps} isSubmitDisabled />);
    const submitBtn = screen.getByText("Save");
    expect(submitBtn.hasAttribute("disabled")).toBe(true);
  });

  it("adds wide class when wide=true", () => {
    render(<FormModal {...defaultProps} wide />);
    const modal = screen.getByRole("dialog").querySelector(".modal");
    expect(modal?.className).toContain("wide");
  });
});
