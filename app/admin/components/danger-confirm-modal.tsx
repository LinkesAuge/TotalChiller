"use client";

import type { ReactElement } from "react";
import { useTranslations } from "next-intl";
import type { ConfirmDeleteState } from "../hooks/use-confirm-delete";

interface DangerConfirmModalProps {
  /** State returned by `useConfirmDelete()`. */
  readonly state: ConfirmDeleteState;
  /** Title shown in both steps. */
  readonly title: string;
  /** Subtitle (shown below title). */
  readonly subtitle?: string;
  /** Warning message in the first (confirm) step. */
  readonly warningText: string;
  /** Phrase the user must type to confirm (e.g. "DELETE RULES"). */
  readonly confirmPhrase: string;
  /** Called when the user submits the confirmed deletion. */
  readonly onConfirm: () => void;
  /** Label for the final delete button. Falls back to title. */
  readonly deleteLabel?: string;
  /** Input field id for accessibility. */
  readonly inputId?: string;
}

/**
 * Two-step danger confirmation modal:
 * 1. "Are you sure?" with continue / cancel
 * 2. "Type DELETE ... to confirm" with delete / cancel
 *
 * Driven entirely by a `useConfirmDelete` state machine — renders nothing when closed.
 */
export default function DangerConfirmModal({
  state,
  title,
  subtitle,
  warningText,
  confirmPhrase,
  onConfirm,
  deleteLabel,
  inputId,
}: DangerConfirmModalProps): ReactElement | null {
  const tAdmin = useTranslations("admin");

  if (state.step === "closed") return null;

  /* ── Step 1: Confirm ── */
  if (state.step === "confirm") {
    return (
      <div className="modal-backdrop">
        <div className="modal card danger">
          <div className="card-header">
            <div>
              <div className="danger-label">{tAdmin("danger.title")}</div>
              <div className="card-title">{title}</div>
              {subtitle ? <div className="card-subtitle">{subtitle}</div> : null}
            </div>
          </div>
          <div className="list">
            <div className="alert danger">{warningText}</div>
          </div>
          <div className="list inline">
            <button className="button danger" type="button" onClick={state.proceedToInput}>
              {tAdmin("common.continue")}
            </button>
            <button className="button" type="button" onClick={state.close}>
              {tAdmin("common.cancel")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Step 2: Type phrase ── */
  return (
    <div className="modal-backdrop">
      <div className="modal card danger">
        <div className="card-header">
          <div>
            <div className="danger-label">{tAdmin("danger.title")}</div>
            <div className="card-title">{tAdmin("danger.confirmDeletion")}</div>
            <div className="card-subtitle">{tAdmin("danger.cannotBeUndone")}</div>
          </div>
        </div>
        <div className="alert danger">{warningText}</div>
        <div className="form-group">
          <label htmlFor={inputId ?? "dangerDeleteInput"}>{tAdmin("common.confirmationPhrase")}</label>
          <input
            id={inputId ?? "dangerDeleteInput"}
            value={state.inputValue}
            onChange={(e) => state.setInputValue(e.target.value)}
            placeholder={confirmPhrase}
          />
        </div>
        <div className="list inline">
          <button className="button danger" type="button" onClick={onConfirm}>
            {deleteLabel ?? title}
          </button>
          <button className="button" type="button" onClick={state.close}>
            {tAdmin("common.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
