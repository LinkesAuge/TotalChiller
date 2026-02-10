"use client";

import { useCallback, useMemo, useState } from "react";

export type ConfirmDeleteStep = "closed" | "confirm" | "input";

export interface ConfirmDeleteState {
  /** Current step of the deletion flow. */
  readonly step: ConfirmDeleteStep;
  /** Value the user has typed in the confirmation input. */
  readonly inputValue: string;
  readonly setInputValue: (value: string) => void;
  /** Open the first confirmation dialog. */
  readonly openConfirm: () => void;
  /** Advance from confirm to the phrase-input step. */
  readonly proceedToInput: () => void;
  /** Close the entire flow and reset. */
  readonly close: () => void;
  /** Returns true if the typed value matches the expected phrase. */
  readonly isConfirmed: (phrase: string) => boolean;
}

/**
 * State machine for a two-step "danger confirm -> type phrase -> execute" deletion flow.
 *
 * Usage:
 * ```tsx
 * const clanDelete = useConfirmDelete();
 * <DangerConfirmModal state={clanDelete} ... />
 * ```
 */
export function useConfirmDelete(): ConfirmDeleteState {
  const [step, setStep] = useState<ConfirmDeleteStep>("closed");
  const [inputValue, setInputValue] = useState("");

  const openConfirm = useCallback(() => setStep("confirm"), []);

  const proceedToInput = useCallback(() => {
    setInputValue("");
    setStep("input");
  }, []);

  const close = useCallback(() => {
    setStep("closed");
    setInputValue("");
  }, []);

  const isConfirmed = useCallback((phrase: string) => inputValue.trim() === phrase, [inputValue]);

  return useMemo(
    () => ({ step, inputValue, setInputValue, openConfirm, proceedToInput, close, isConfirmed }),
    [step, inputValue, openConfirm, proceedToInput, close, isConfirmed],
  );
}
