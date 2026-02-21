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

import { EventDeleteModal, TemplateDeleteModal } from "./event-modals";

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

describe("TemplateDeleteModal", () => {
  function makeProps(overrides: Record<string, any> = {}) {
    return {
      isOpen: true,
      isStep2: false,
      templateName: "My Template",
      deleteInput: "",
      onInputChange: vi.fn(),
      onConfirm: vi.fn(),
      onCancel: vi.fn(),
      onContinueToStep2: vi.fn(),
      t: (key: string, values?: Record<string, string>) => {
        if (values) return `${key}:${JSON.stringify(values)}`;
        return key;
      },
      ...overrides,
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when isOpen=false", () => {
    const { container } = render(<TemplateDeleteModal {...makeProps({ isOpen: false })} />);
    expect(container.innerHTML).toBe("");
  });

  it("step 1: shows warning with continue button", () => {
    render(<TemplateDeleteModal {...makeProps({ isStep2: false })} />);
    expect(screen.getByTestId("modal-title").textContent).toBe("confirmDeleteTemplateTitle");
    expect(screen.getByTestId("confirm-btn").textContent).toBe("continueAction");
  });

  it("step 1: calls onContinueToStep2 on confirm", () => {
    const onContinueToStep2 = vi.fn();
    render(<TemplateDeleteModal {...makeProps({ isStep2: false, onContinueToStep2 })} />);
    fireEvent.click(screen.getByTestId("confirm-btn"));
    expect(onContinueToStep2).toHaveBeenCalled();
  });

  it("step 2: shows phrase confirmation input", () => {
    render(<TemplateDeleteModal {...makeProps({ isStep2: true })} />);
    expect(screen.getByTestId("phrase-input")).toBeDefined();
    expect(screen.getByTestId("confirm-btn").textContent).toBe("deleteTemplate");
  });

  it("step 2: calls onConfirm on confirm button click", () => {
    const onConfirm = vi.fn();
    render(<TemplateDeleteModal {...makeProps({ isStep2: true, onConfirm })} />);
    fireEvent.click(screen.getByTestId("confirm-btn"));
    expect(onConfirm).toHaveBeenCalled();
  });

  it("step 2: calls onCancel on cancel button click", () => {
    const onCancel = vi.fn();
    render(<TemplateDeleteModal {...makeProps({ isStep2: true, onCancel })} />);
    fireEvent.click(screen.getByTestId("cancel-btn"));
    expect(onCancel).toHaveBeenCalled();
  });
});
