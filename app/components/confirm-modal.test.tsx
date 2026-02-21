// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

vi.mock("next-intl", () => ({
  useTranslations: vi.fn(() => vi.fn((key: string) => key)),
  useLocale: vi.fn(() => "de"),
}));

vi.mock("./ui/game-button", () => ({
  __esModule: true,
  default: ({ children, ...props }: any) => {
    const React = require("react");
    return React.createElement("button", props, children);
  },
}));

import ConfirmModal from "./confirm-modal";

const baseProps = {
  isOpen: true,
  title: "Delete Item",
  message: "Are you sure?",
  confirmLabel: "Confirm",
  cancelLabel: "Cancel",
  onConfirm: vi.fn(),
  onCancel: vi.fn(),
};

describe("ConfirmModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    baseProps.onConfirm = vi.fn();
    baseProps.onCancel = vi.fn();
  });

  it("returns null when isOpen=false", () => {
    const { container } = render(<ConfirmModal {...baseProps} isOpen={false} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders modal with title, message, confirm and cancel buttons", () => {
    render(<ConfirmModal {...baseProps} />);
    expect(screen.getByText("Delete Item")).toBeInTheDocument();
    expect(screen.getByText("Are you sure?")).toBeInTheDocument();
    expect(screen.getByText("Confirm")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("shows subtitle when provided", () => {
    render(<ConfirmModal {...baseProps} subtitle="This cannot be undone" />);
    expect(screen.getByText("This cannot be undone")).toBeInTheDocument();
  });

  it("shows zone label when provided", () => {
    render(<ConfirmModal {...baseProps} zoneLabel="Danger Zone" />);
    expect(screen.getByText("Danger Zone")).toBeInTheDocument();
  });

  it("calls onConfirm when confirm button clicked", () => {
    render(<ConfirmModal {...baseProps} />);
    fireEvent.click(screen.getByText("Confirm"));
    expect(baseProps.onConfirm).toHaveBeenCalledOnce();
  });

  it("calls onCancel when cancel button clicked", () => {
    render(<ConfirmModal {...baseProps} />);
    fireEvent.click(screen.getByText("Cancel"));
    expect(baseProps.onCancel).toHaveBeenCalledOnce();
  });

  it("disables confirm when isConfirmDisabled=true", () => {
    render(<ConfirmModal {...baseProps} isConfirmDisabled={true} />);
    expect(screen.getByText("Confirm")).toBeDisabled();
  });

  it("renders ReactNode message (not just string)", () => {
    render(<ConfirmModal {...baseProps} message={<div data-testid="custom-msg">Rich content</div>} />);
    expect(screen.getByTestId("custom-msg")).toBeInTheDocument();
  });

  it("shows phrase input when confirmPhrase is set", () => {
    render(
      <ConfirmModal
        {...baseProps}
        confirmPhrase="DELETE"
        phraseValue=""
        onPhraseChange={vi.fn()}
        phraseLabel="Type DELETE"
        phrasePlaceholder="DELETE"
      />,
    );
    expect(screen.getByLabelText("Type DELETE")).toBeInTheDocument();
  });

  it("disables confirm until phrase matches", () => {
    const onPhraseChange = vi.fn();
    const { rerender } = render(
      <ConfirmModal {...baseProps} confirmPhrase="DELETE" phraseValue="" onPhraseChange={onPhraseChange} />,
    );
    expect(screen.getByText("Confirm")).toBeDisabled();

    rerender(
      <ConfirmModal {...baseProps} confirmPhrase="DELETE" phraseValue="DELETE" onPhraseChange={onPhraseChange} />,
    );
    expect(screen.getByText("Confirm")).not.toBeDisabled();
  });
});
