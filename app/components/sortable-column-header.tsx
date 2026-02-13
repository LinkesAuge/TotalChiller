"use client";

import type { ReactElement } from "react";

interface SortableColumnHeaderProps<K extends string> {
  /** Visible column label. */
  readonly label: string;
  /** The sort key this column represents. */
  readonly sortKey: K;
  /** Currently active sort key. */
  readonly activeSortKey: K;
  /** Current sort direction. */
  readonly direction: "asc" | "desc";
  /** Called when the column header is clicked. */
  readonly onToggle: (key: K) => void;
  /** SVG variant: "triangle" (member/user tables) or "chevron" (rule tables). Defaults to "chevron". */
  readonly variant?: "triangle" | "chevron";
}

/**
 * Reusable sortable column header button with direction indicator.
 * Replaces 4 near-identical `renderXSortButton` functions.
 */
export default function SortableColumnHeader<K extends string>({
  label,
  sortKey,
  activeSortKey,
  direction,
  onToggle,
  variant = "chevron",
}: SortableColumnHeaderProps<K>): ReactElement {
  const isActive = activeSortKey === sortKey;
  const ariaSort: "ascending" | "descending" | "none" = isActive
    ? direction === "asc"
      ? "ascending"
      : "descending"
    : "none";

  return (
    <button className="table-sort-button" type="button" onClick={() => onToggle(sortKey)} aria-sort={ariaSort}>
      <span>{label}</span>
      {isActive ? (
        <svg
          aria-hidden="true"
          className={`table-sort-indicator ${direction === "desc" ? "is-desc" : ""}`.trim()}
          width="10"
          height="10"
          viewBox="0 0 12 12"
          fill="none"
        >
          {variant === "triangle" ? (
            <path d="M6 2L10 6H2L6 2Z" fill="currentColor" />
          ) : (
            <path d="M3 7L6 4L9 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          )}
        </svg>
      ) : null}
    </button>
  );
}
