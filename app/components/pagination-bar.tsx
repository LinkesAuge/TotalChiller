"use client";

import type { ReactElement } from "react";
import { useTranslations } from "next-intl";
import RadixSelect from "./ui/radix-select";
import IconButton from "./ui/icon-button";
import type { PaginationState } from "@/lib/hooks/use-pagination";

interface PaginationBarProps {
  /** State returned by `usePagination()`. */
  readonly pagination: PaginationState;
  /** Page size options. Defaults to [25, 50, 100, 250]. */
  readonly pageSizeOptions?: readonly number[];
  /** Unique id prefix for accessibility (e.g. "clans", "users"). */
  readonly idPrefix?: string;
  /** When true, hides the page-size selector and page-jump input. */
  readonly compact?: boolean;
}

/**
 * Reusable pagination controls: page-size selector, "Showing X-Y of Z",
 * page-jump input, and prev/next buttons.
 */
export default function PaginationBar({
  pagination,
  pageSizeOptions = [25, 50, 100, 250],
  idPrefix = "pagination",
  compact = false,
}: PaginationBarProps): ReactElement {
  const t = useTranslations("common");
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
      {!compact && (
        <div className="pagination-page-size">
          <label htmlFor={`${idPrefix}PageSize`} className="text-muted">
            {t("pageSize")}
          </label>
          <RadixSelect
            id={`${idPrefix}PageSize`}
            ariaLabel={t("pageSize")}
            value={String(pageSize)}
            onValueChange={(v) => setPageSize(Number(v))}
            options={pageSizeOptions.map((n) => ({ value: String(n), label: String(n) }))}
          />
        </div>
      )}
      <span className="text-muted">
        {t("showing")} {totalItems === 0 ? 0 : startIndex + 1}&ndash;{endIndex} {t("of")} {totalItems}
      </span>
      <div className="pagination-actions">
        {!compact && (
          <div className="pagination-page-indicator">
            <label htmlFor={`${idPrefix}PageJump`} className="text-muted">
              {t("page")}
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
        )}
        <IconButton ariaLabel={t("previousPage")} onClick={goPrev} disabled={page === 1}>
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
        <IconButton ariaLabel={t("nextPage")} onClick={goNext} disabled={page >= totalPages}>
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
