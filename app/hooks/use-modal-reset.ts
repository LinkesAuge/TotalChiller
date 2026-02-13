import { useState } from "react";

/**
 * Tracks modal open/close transitions and calls `onOpen` when the modal
 * transitions from closed to open. Replaces the repeated `prevOpen` pattern
 * in rule modals.
 *
 * Uses the React-recommended "adjust state during render" pattern
 * (the functional equivalent of getDerivedStateFromProps) so that:
 * - No refs are read during render (react-hooks/refs).
 * - The reset fires synchronously on the first render where isOpen becomes true.
 */
export function useModalReset(isOpen: boolean, onOpen: () => void): void {
  const [wasOpen, setWasOpen] = useState(false);
  if (isOpen && !wasOpen) {
    onOpen();
  }
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
  }
}
