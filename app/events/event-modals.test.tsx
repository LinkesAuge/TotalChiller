// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("../components/confirm-modal", () => ({
  __esModule: true,
  default: ({
    isOpen,
    title,
    confirmLabel,
    cancelLabel,
    confirmPhrase,
    phraseValue,
    onPhraseChange,
    phrasePlaceholder,
    phraseLabel,
    onConfirm,
    onCancel,
    message,
    subtitle,
  }: any) => {
    if (!isOpen) return null;
    const React = require("react");
    return React.createElement(
      "div",
      { "data-testid": "confirm-modal" },
      React.createElement("span", { "data-testid": "modal-title" }, title),
      subtitle && React.createElement("span", { "data-testid": "modal-subtitle" }, subtitle),
      message &&
        React.createElement(
          "span",
          { "data-testid": "modal-message" },
          typeof message === "string" ? message : "rich-content",
        ),
      confirmPhrase &&
        React.createElement(
          "div",
          null,
          phraseLabel && React.createElement("label", null, phraseLabel),
          React.createElement("input", {
            "data-testid": "phrase-input",
            value: phraseValue || "",
            placeholder: phrasePlaceholder,
            onChange: (e: any) => onPhraseChange?.(e.target.value),
          }),
        ),
      React.createElement("button", { "data-testid": "confirm-btn", onClick: onConfirm }, confirmLabel),
      React.createElement("button", { "data-testid": "cancel-btn", onClick: onCancel }, cancelLabel),
    );
  },
}));

import { EventDeleteModal } from "./event-modals";

describe("EventDeleteModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when isOpen=false", () => {
    const { container } = render(
      <EventDeleteModal isOpen={false} onConfirm={vi.fn()} onCancel={vi.fn()} t={(key: string) => key} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders ConfirmModal with correct props when open", () => {
    render(<EventDeleteModal isOpen={true} onConfirm={vi.fn()} onCancel={vi.fn()} t={(key: string) => key} />);
    expect(screen.getByTestId("confirm-modal")).toBeDefined();
    expect(screen.getByTestId("modal-title").textContent).toBe("confirmDeleteEventTitle");
    expect(screen.getByTestId("confirm-btn").textContent).toBe("deleteEvent");
    expect(screen.getByTestId("cancel-btn").textContent).toBe("cancel");
  });

  it("calls onConfirm when confirm button clicked", () => {
    const onConfirm = vi.fn();
    render(<EventDeleteModal isOpen={true} onConfirm={onConfirm} onCancel={vi.fn()} t={(key: string) => key} />);
    fireEvent.click(screen.getByTestId("confirm-btn"));
    expect(onConfirm).toHaveBeenCalled();
  });

  it("calls onCancel when cancel button clicked", () => {
    const onCancel = vi.fn();
    render(<EventDeleteModal isOpen={true} onConfirm={vi.fn()} onCancel={onCancel} t={(key: string) => key} />);
    fireEvent.click(screen.getByTestId("cancel-btn"));
    expect(onCancel).toHaveBeenCalled();
  });
});
