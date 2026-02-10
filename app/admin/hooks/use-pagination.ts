"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export interface PaginationState {
  readonly page: number;
  readonly pageSize: number;
  readonly totalPages: number;
  readonly totalItems: number;
  readonly startIndex: number;
  readonly endIndex: number;
  readonly setPage: (page: number) => void;
  readonly setPageSize: (size: number) => void;
  readonly goNext: () => void;
  readonly goPrev: () => void;
  readonly clampPageValue: (raw: string) => number | null;
}

/**
 * Manages pagination state: page, pageSize, derived totalPages,
 * start/end indices, and auto-clamp when the total shrinks.
 */
export function usePagination(totalItems: number, defaultPageSize = 50): PaginationState {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeRaw] = useState(defaultPageSize);

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Auto-reset page when it exceeds total
  useEffect(() => {
    if (page > totalPages) {
      setPage(1);
    }
  }, [page, totalPages]);

  const setPageSize = useCallback((size: number) => {
    setPageSizeRaw(size);
    setPage(1);
  }, []);

  const goNext = useCallback(() => {
    setPage((current) => Math.min(current + 1, totalPages));
  }, [totalPages]);

  const goPrev = useCallback(() => {
    setPage((current) => Math.max(1, current - 1));
  }, []);

  const clampPageValue = useCallback(
    (raw: string): number | null => {
      const num = Number(raw);
      if (Number.isNaN(num)) return null;
      if (num < 1) return 1;
      if (num > totalPages) return totalPages;
      return num;
    },
    [totalPages],
  );

  const startIndex = (page - 1) * pageSize;
  const endIndex = Math.min(page * pageSize, totalItems);

  return useMemo(
    () => ({
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
    }),
    [
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
    ],
  );
}
