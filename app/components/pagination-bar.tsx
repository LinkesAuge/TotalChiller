"use client";

import type { ReactElement } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import RadixSelect from "./ui/radix-select";
import type { PaginationState } from "@/lib/hooks/use-pagination";

/* ── Arrow asset paths ── */

const ARROW_LEFT = "/assets/game/buttons/button_arrow_over_2.png";
const ARROW_RIGHT = "/assets/game/buttons/button_arrow_over_1.png";

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

/** Game-styled arrow button for pagination navigation. */
function PaginationArrow({
  direction,
  onClick,
  disabled,
  ariaLabel,
}: {
  direction: "left" | "right";
  onClick: () => void;
  disabled: boolean;
  ariaLabel: string;
}): ReactElement {
  return (
    <button
      type="button"
      className={`pagination-arrow${disabled ? " pagination-arrow--disabled" : ""}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      <Image
        src={direction === "left" ? ARROW_LEFT : ARROW_RIGHT}
        alt=""
        width={28}
        height={28}
        className="pagination-arrow__img"
      />
    </button>
  );
}

/**
 * Reusable pagination controls: page-size selector, "Showing X-Y of Z",
 * page-jump input, and game-styled prev/next arrow buttons.
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
        <PaginationArrow direction="left" onClick={goPrev} disabled={page === 1} ariaLabel={t("previousPage")} />
        <PaginationArrow direction="right" onClick={goNext} disabled={page >= totalPages} ariaLabel={t("nextPage")} />
      </div>
    </div>
  );
}
