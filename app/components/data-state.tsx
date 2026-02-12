"use client";

import type { ReactNode } from "react";

/* ─── Types ─── */

interface DataStateProps {
  /** Whether data is currently loading */
  readonly isLoading: boolean;
  /** Error message to display (null/undefined = no error) */
  readonly error?: string | null;
  /** Whether the data set is empty (checked after loading + no error) */
  readonly isEmpty?: boolean;
  /** Text shown in the loading indicator */
  readonly loadingMessage?: string;
  /** Custom loading-state node (overrides loadingMessage + default alert) */
  readonly loadingNode?: ReactNode;
  /** Simple empty-state text rendered inside a card */
  readonly emptyMessage?: string;
  /** Optional subtitle below the empty message */
  readonly emptySubtitle?: string;
  /** Custom empty-state node (overrides emptyMessage / emptySubtitle) */
  readonly emptyNode?: ReactNode;
  /** Optional retry callback shown on the error banner */
  readonly onRetry?: () => void;
  /** Extra CSS classes applied to the loading / error / empty wrapper */
  readonly className?: string;
  /** Content rendered when not loading, no error, and not empty */
  readonly children: ReactNode;
}

/**
 * Handles the standard loading → error → empty → content rendering flow.
 *
 * Renders exactly ONE of:
 *   1. Loading indicator (`alert info loading`)
 *   2. Error banner (`alert error`)
 *   3. Empty state (card or custom node)
 *   4. Children (as a fragment — no extra wrapper)
 */
export default function DataState({
  isLoading,
  error,
  isEmpty = false,
  loadingMessage,
  loadingNode,
  emptyMessage,
  emptySubtitle,
  emptyNode,
  onRetry,
  className = "",
  children,
}: DataStateProps): ReactNode {
  if (isLoading) {
    if (loadingNode) return <>{loadingNode}</>;
    return <div className={`alert info loading ${className}`.trim()}>{loadingMessage}</div>;
  }
  if (error) {
    return (
      <div className={`alert error ${className}`.trim()} role="alert">
        {error}
        {onRetry && (
          <button type="button" className="ml-2 underline" onClick={onRetry}>
            ↻
          </button>
        )}
      </div>
    );
  }
  if (isEmpty) {
    if (emptyNode) return <>{emptyNode}</>;
    return (
      <div className={`card ${className}`.trim()}>
        <div className="card-header">
          <div>
            <div className="card-title">{emptyMessage ?? "No data"}</div>
            {emptySubtitle && <div className="card-subtitle">{emptySubtitle}</div>}
          </div>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
