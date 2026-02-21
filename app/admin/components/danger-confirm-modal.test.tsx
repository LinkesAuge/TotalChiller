// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next-intl", () => ({
  useTranslations: vi.fn(() => vi.fn((key: string) => key)),
}));

vi.mock("../../components/ui/game-button", () => ({
  __esModule: true,
  default: ({ children, ...props }: any) => {
    const React = require("react");
    return React.createElement("button", props, children);
  },
}));

import DangerConfirmModal from "./danger-confirm-modal";

const baseProps = {
  title: "Delete Item",
  warningText: "This will permanently delete the item.",
  confirmPhrase: "DELETE ITEM",
  onConfirm: vi.fn(),
};

describe("DangerConfirmModal", () => {
  it("renders nothing when step is closed", () => {
    const state = {
      step: "closed" as const,
      inputValue: "",
      setInputValue: vi.fn(),
      openConfirm: vi.fn(),
      proceedToInput: vi.fn(),
      close: vi.fn(),
      isConfirmed: vi.fn(() => false),
    };
    const { container } = render(<DangerConfirmModal state={state} {...baseProps} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders confirm step with warning and buttons", () => {
    const state = {
      step: "confirm" as const,
      inputValue: "",
      setInputValue: vi.fn(),
      openConfirm: vi.fn(),
      proceedToInput: vi.fn(),
      close: vi.fn(),
      isConfirmed: vi.fn(() => false),
    };
    render(<DangerConfirmModal state={state} {...baseProps} />);
    expect(screen.getByText("Delete Item")).toBeInTheDocument();
    expect(screen.getByText("This will permanently delete the item.")).toBeInTheDocument();
    expect(screen.getByText("common.continue")).toBeInTheDocument();
    expect(screen.getByText("common.cancel")).toBeInTheDocument();
  });

  it("renders input step with text field and delete button", () => {
    const state = {
      step: "input" as const,
      inputValue: "",
      setInputValue: vi.fn(),
      openConfirm: vi.fn(),
      proceedToInput: vi.fn(),
      close: vi.fn(),
      isConfirmed: vi.fn(() => false),
    };
    render(<DangerConfirmModal state={state} {...baseProps} />);
    expect(screen.getByText("danger.confirmDeletion")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("DELETE ITEM")).toBeInTheDocument();
    expect(screen.getByText("Delete Item")).toBeInTheDocument();
  });

  it("renders subtitle when provided", () => {
    const state = {
      step: "confirm" as const,
      inputValue: "",
      setInputValue: vi.fn(),
      openConfirm: vi.fn(),
      proceedToInput: vi.fn(),
      close: vi.fn(),
      isConfirmed: vi.fn(() => false),
    };
    render(<DangerConfirmModal state={state} {...baseProps} subtitle="Some subtitle" />);
    expect(screen.getByText("Some subtitle")).toBeInTheDocument();
  });

  it("uses custom deleteLabel when provided", () => {
    const state = {
      step: "input" as const,
      inputValue: "",
      setInputValue: vi.fn(),
      openConfirm: vi.fn(),
      proceedToInput: vi.fn(),
      close: vi.fn(),
      isConfirmed: vi.fn(() => false),
    };
    render(<DangerConfirmModal state={state} {...baseProps} deleteLabel="Remove Forever" />);
    expect(screen.getByText("Remove Forever")).toBeInTheDocument();
  });
});
