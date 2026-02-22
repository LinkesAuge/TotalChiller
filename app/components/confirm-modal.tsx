"use client";

import { useCallback, useEffect, useId, useRef, type MutableRefObject, type ReactElement, type ReactNode } from "react";

function useLatest<T>(value: T): MutableRefObject<T> {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  });
  return ref;
}
import type { GameButtonVariant } from "./ui/game-button";
import GameButton from "./ui/game-button";

const VARIANT_TO_BUTTON: Record<string, GameButtonVariant> = {
  info: "green",
  danger: "orange",
  warning: "orange",
};

interface ConfirmModalProps {
  /** Whether the modal is open. */
  readonly isOpen: boolean;
  /** Modal title. */
  readonly title: string;
  /** Optional subtitle (appears below title). */
  readonly subtitle?: string;
  /** Message or content displayed inside the modal. */
  readonly message: string | ReactNode;
  /** Visual variant controlling the card/button style. */
  readonly variant?: "danger" | "warning" | "info";
  /** Override the GameButton variant for the confirm button. */
  readonly confirmButtonVariant?: GameButtonVariant;
  /** Label for the danger/warning zone header. */
  readonly zoneLabel?: string;
  /** Label for the confirm button. */
  readonly confirmLabel: string;
  /** Label for the cancel button. */
  readonly cancelLabel: string;
  /** Optional confirmation phrase the user must type (enables two-step delete). */
  readonly confirmPhrase?: string;
  /** Current value of the phrase input (controlled externally). */
  readonly phraseValue?: string;
  /** Callback when phrase input changes. */
  readonly onPhraseChange?: (value: string) => void;
  /** Placeholder for the phrase input. */
  readonly phrasePlaceholder?: string;
  /** Label above the phrase input. */
  readonly phraseLabel?: string;
  /** Called when the user confirms. */
  readonly onConfirm: () => void;
  /** Called when the user cancels. */
  readonly onCancel: () => void;
  /** Disables the confirm button (e.g. while loading). */
  readonly isConfirmDisabled?: boolean;
}

/**
 * Reusable confirmation modal with optional phrase-based two-step confirmation.
 * Covers danger/warning/info variants used across event delete, batch delete, etc.
 */
export default function ConfirmModal({
  isOpen,
  title,
  subtitle,
  message,
  variant = "danger",
  confirmButtonVariant,
  zoneLabel,
  confirmLabel,
  cancelLabel,
  confirmPhrase,
  phraseValue,
  onPhraseChange,
  phrasePlaceholder,
  phraseLabel,
  onConfirm,
  onCancel,
  isConfirmDisabled,
}: ConfirmModalProps): ReactElement | null {
  const titleId = useId();
  const modalRef = useRef<HTMLDivElement>(null);
  const onCancelRef = useLatest(onCancel);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCancelRef.current();
        return;
      }
      if (e.key === "Tab" && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0]!;
        const last = focusable[focusable.length - 1]!;
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    },
    [onCancelRef],
  );

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener("keydown", handleKeyDown);
    const prev = document.activeElement as HTMLElement | null;
    requestAnimationFrame(() => {
      const first = modalRef.current?.querySelector<HTMLElement>("button:not([disabled]), input:not([disabled])");
      first?.focus();
    });
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      prev?.focus();
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;
  const cardClass = `modal card ${variant}`;
  const btnVariant = confirmButtonVariant ?? VARIANT_TO_BUTTON[variant] ?? "green";
  const isDisabled = isConfirmDisabled ?? (confirmPhrase ? phraseValue !== confirmPhrase : false);

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby={titleId} onClick={onCancel}>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div className={cardClass} ref={modalRef} onClick={(e) => e.stopPropagation()}>
        <div className="card-header">
          <div>
            {zoneLabel ? <div className={`${variant}-label`}>{zoneLabel}</div> : null}
            <div id={titleId} className="card-title">
              {title}
            </div>
            {subtitle ? <div className="card-subtitle">{subtitle}</div> : null}
          </div>
        </div>
        {typeof message === "string" ? (
          <div className="list">
            <div className={`alert ${variant}`}>{message}</div>
          </div>
        ) : (
          message
        )}
        {confirmPhrase ? (
          <div className="form-group">
            {phraseLabel ? <label htmlFor="confirmPhraseInput">{phraseLabel}</label> : null}
            <input
              id="confirmPhraseInput"
              value={phraseValue ?? ""}
              onChange={(e) => onPhraseChange?.(e.target.value)}
              placeholder={phrasePlaceholder}
            />
          </div>
        ) : null}
        <div className="list inline">
          <GameButton variant={btnVariant} fontSize="0.6rem" type="button" onClick={onConfirm} disabled={isDisabled}>
            {confirmLabel}
          </GameButton>
          <button className="button" type="button" onClick={onCancel}>
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
