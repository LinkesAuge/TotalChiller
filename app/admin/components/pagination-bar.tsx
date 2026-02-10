"use client";

import type { ReactElement } from "react";
import { useTranslations } from "next-intl";
import RadixSelect from "../../components/ui/radix-select";
import IconButton from "../../components/ui/icon-button";
import type { PaginationState } from "../hooks/use-pagination";

interface PaginationBarProps {
  /** State returned by `usePagination()`. */
  readonly pagination: PaginationState;
  /** Page size options. Defaults to [25, 50, 100, 250]. */
  readonly pageSizeOptions?: readonly number[];
  /** Unique id prefix for accessibility (e.g. "validation", "correction"). */
  readonly idPrefix?: string;
}

/**
 * Reusable pagination controls: page-size selector, "Showing X-Y of Z",
 * page-jump input, and prev/next buttons.
 */
export default function PaginationBar({
  pagination,
  pageSizeOptions = [25, 50, 100, 250],
  idPrefix = "pagination",
}: PaginationBarProps): ReactElement {
  const tAdmin = useTranslations("admin");
  const {
    page,
    pageSize,
    totalPages,
    totalItems,
    startIndex,
    endIndex,
    setPage,
    setPageSize,
    goNext,
    goPrev,
    clampPageValue,
  } = pagination;

  return (
    <div className="pagination-bar table-pagination">
      <div className="pagination-page-size">
        <label htmlFor={`${idPrefix}PageSize`} className="text-muted">
          {tAdmin("common.pageSize")}
        </label>
        <RadixSelect
          id={`${idPrefix}PageSize`}
          ariaLabel={tAdmin("common.pageSize")}
          value={String(pageSize)}
          onValueChange={(v) => setPageSize(Number(v))}
          options={pageSizeOptions.map((n) => ({ value: String(n), label: String(n) }))}
        />
      </div>
      <span className="text-muted">
        {tAdmin("common.showing")} {totalItems === 0 ? 0 : startIndex + 1}&ndash;{endIndex} {tAdmin("common.of")}{" "}
        {totalItems}
      </span>
      <div className="pagination-actions">
        <div className="pagination-page-indicator">
          <label htmlFor={`${idPrefix}PageJump`} className="text-muted">
            {tAdmin("common.page")}
          </label>
          <input
            id={`${idPrefix}PageJump`}
            className="pagination-page-input"
            type="number"
            min={1}
            max={totalPages}
            value={page}
            onChange={(e) => {
              const next = clampPageValue(e.target.value);
              if (next !== null) setPage(next);
            }}
          />
          <span className="text-muted">/ {totalPages}</span>
        </div>
        <IconButton ariaLabel={tAdmin("common.previousPage")} onClick={goPrev} disabled={page === 1}>
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M10 3L6 8L10 13"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </IconButton>
        <IconButton ariaLabel={tAdmin("common.nextPage")} onClick={goNext} disabled={page >= totalPages}>
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M6 3L10 8L6 13"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </IconButton>
      </div>
    </div>
  );
}
