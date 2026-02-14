"use client";

import { useCallback, useMemo, useState } from "react";

/**
 * Generic comparator for nullable string | number values.
 * Nulls sort to the end in ascending order.
 */
export function compareValues(
  left: string | number | null | undefined,
  right: string | number | null | undefined,
  direction: "asc" | "desc",
): number {
  if (left === right) return 0;
  if (left === undefined || left === null) return direction === "asc" ? 1 : -1;
  if (right === undefined || right === null) return direction === "asc" ? -1 : 1;
  if (typeof left === "number" && typeof right === "number") {
    return direction === "asc" ? left - right : right - left;
  }
  const result = String(left).localeCompare(String(right), undefined, { sensitivity: "base" });
  return direction === "asc" ? result : -result;
}

/**
 * Manages sort key and direction state with a toggle function
 * that flips direction when re-clicking the active column.
 */
export function useSortable<K extends string>(defaultKey: K, defaultDirection: "asc" | "desc" = "asc") {
  const [sortKey, setSortKey] = useState<K>(defaultKey);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">(defaultDirection);

  const toggleSort = useCallback(
    (key: K) => {
      if (sortKey !== key) {
        setSortKey(key);
        setSortDirection("asc");
      } else {
        setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
      }
    },
    [sortKey],
  );

  return useMemo(() => ({ sortKey, sortDirection, toggleSort }), [sortKey, sortDirection, toggleSort]);
}
