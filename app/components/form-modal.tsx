"use client";

import type { FormEvent, ReactElement, ReactNode } from "react";
import GameButton from "./ui/game-button";

interface FormModalProps {
  /** Whether the modal is open. */
  readonly isOpen: boolean;
  /** Modal card title. */
  readonly title: string;
  /** Optional subtitle below the title. */
  readonly subtitle?: string;
  /** Form body rendered between header and footer. */
  readonly children: ReactNode;
  /** Optional status / feedback message shown as an info alert. */
  readonly statusMessage?: string;
  /** Label for the primary (submit) button. */
  readonly submitLabel: string;
  /** Label for the cancel button. */
  readonly cancelLabel: string;
  /** Called when the user submits the form. */
  readonly onSubmit: () => void;
  /** Called when the user cancels. */
  readonly onCancel: () => void;
  /** Apply `wide` modifier to the modal card. */
  readonly wide?: boolean;
  /** Disable the submit button (e.g. while saving). */
  readonly isSubmitDisabled?: boolean;
}

/**
 * Reusable form modal providing the common backdrop, card header, footer buttons,
 * and optional status alert. Form fields are passed as children.
 */
export default function FormModal({
  isOpen,
  title,
  subtitle,
  children,
  statusMessage,
  submitLabel,
  cancelLabel,
  onSubmit,
  onCancel,
  wide = false,
  isSubmitDisabled = false,
}: FormModalProps): ReactElement | null {
  if (!isOpen) return null;

  function handleFormSubmit(e: FormEvent): void {
    e.preventDefault();
    onSubmit();
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="form-modal-title">
      <div className={`modal card${wide ? " wide" : ""}`}>
        <div className="card-header">
          <div>
            <div id="form-modal-title" className="card-title">
              {title}
            </div>
            {subtitle ? <div className="card-subtitle">{subtitle}</div> : null}
          </div>
        </div>
        <form onSubmit={handleFormSubmit}>
          {children}
          {statusMessage ? <div className="alert info">{statusMessage}</div> : null}
          <div className="list inline">
            <GameButton variant="green" fontSize="0.6rem" type="submit" disabled={isSubmitDisabled}>
              {submitLabel}
            </GameButton>
            <button className="button" type="button" onClick={onCancel}>
              {cancelLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
