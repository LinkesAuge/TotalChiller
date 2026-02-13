"use client";

import { useCallback, useMemo, useState } from "react";
import type { ValidationRuleRow } from "@/lib/types/domain";
import type { ChestEntryRow, FilterOption } from "./use-data-table-types";

export interface UseDataTableFiltersParams {
  readonly validationRules: readonly ValidationRuleRow[];
  readonly t: (key: string, values?: Record<string, string | number>) => string;
  readonly setPage: (value: number | ((prev: number) => number)) => void;
  readonly rows: readonly ChestEntryRow[];
  readonly rowValidationResults: Record<
    string,
    { readonly rowStatus: string; readonly fieldStatus: Record<string, string> }
  >;
  readonly rowCorrectionMatches: Record<string, boolean>;
}

/**
 * Sub-hook for data table filter state, filter handlers, and derived filtered data.
 * Manages server-side filter values (used in loadRows) and client-side filtering
 * (validation/correction status).
 */
export function useDataTableFilters({
  validationRules,
  t,
  setPage,
  rows,
  rowValidationResults,
  rowCorrectionMatches,
}: UseDataTableFiltersParams) {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filterPlayer, setFilterPlayer] = useState<string>("");
  const [filterSource, setFilterSource] = useState<string>("");
  const [filterChest, setFilterChest] = useState<string>("");
  const [filterClanId, setFilterClanId] = useState<string>("all");
  const [filterDateFrom, setFilterDateFrom] = useState<string>("");
  const [filterDateTo, setFilterDateTo] = useState<string>("");
  const [filterScoreMin, setFilterScoreMin] = useState<string>("");
  const [filterScoreMax, setFilterScoreMax] = useState<string>("");
  const [filterRowStatus, setFilterRowStatus] = useState<"all" | "valid" | "invalid">("all");
  const [filterCorrectionStatus, setFilterCorrectionStatus] = useState<"all" | "corrected" | "uncorrected">("all");

  const playerFilterOptions = useMemo((): FilterOption[] => {
    const values = new Set<string>();
    validationRules.forEach((rule) => {
      if (rule.field.toLowerCase() === "player" && rule.match_value.trim()) {
        values.add(rule.match_value.trim());
      }
    });
    return [
      { value: "", label: t("all") },
      ...Array.from(values)
        .sort()
        .map((v) => ({ value: v, label: v })),
    ];
  }, [validationRules, t]);

  const sourceFilterOptions = useMemo((): FilterOption[] => {
    const values = new Set<string>();
    validationRules.forEach((rule) => {
      if (rule.field.toLowerCase() === "source" && rule.match_value.trim()) {
        values.add(rule.match_value.trim());
      }
    });
    return [
      { value: "", label: t("all") },
      ...Array.from(values)
        .sort()
        .map((v) => ({ value: v, label: v })),
    ];
  }, [validationRules, t]);

  const chestFilterOptions = useMemo((): FilterOption[] => {
    const values = new Set<string>();
    validationRules.forEach((rule) => {
      if (rule.field.toLowerCase() === "chest" && rule.match_value.trim()) {
        values.add(rule.match_value.trim());
      }
    });
    return [
      { value: "", label: t("all") },
      ...Array.from(values)
        .sort()
        .map((v) => ({ value: v, label: v })),
    ];
  }, [validationRules, t]);

  const clientFilteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (filterRowStatus !== "all") {
        const rowStatus = rowValidationResults[row.id]?.rowStatus ?? "neutral";
        if (filterRowStatus === "valid" && rowStatus !== "valid") {
          return false;
        }
        if (filterRowStatus === "invalid" && rowStatus !== "invalid") {
          return false;
        }
      }
      if (filterCorrectionStatus !== "all") {
        const hasCorrections = rowCorrectionMatches[row.id] ?? false;
        if (filterCorrectionStatus === "corrected" && !hasCorrections) {
          return false;
        }
        if (filterCorrectionStatus === "uncorrected" && hasCorrections) {
          return false;
        }
      }
      return true;
    });
  }, [filterCorrectionStatus, filterRowStatus, rowCorrectionMatches, rowValidationResults, rows]);

  const clearFilters = useCallback((): void => {
    setSearchTerm("");
    setFilterPlayer("");
    setFilterSource("");
    setFilterChest("");
    setFilterClanId("all");
    setFilterDateFrom("");
    setFilterDateTo("");
    setFilterScoreMin("");
    setFilterScoreMax("");
    setFilterRowStatus("all");
    setFilterCorrectionStatus("all");
    setPage(1);
  }, [setPage]);

  const setFilterPlayerWithPage = useCallback(
    (value: string) => {
      setFilterPlayer(value);
      setPage(1);
    },
    [setPage],
  );
  const setFilterSourceWithPage = useCallback(
    (value: string) => {
      setFilterSource(value);
      setPage(1);
    },
    [setPage],
  );
  const setFilterChestWithPage = useCallback(
    (value: string) => {
      setFilterChest(value);
      setPage(1);
    },
    [setPage],
  );
  const setFilterClanIdWithPage = useCallback(
    (value: string) => {
      setFilterClanId(value);
      setPage(1);
    },
    [setPage],
  );
  const setFilterDateFromWithPage = useCallback(
    (value: string) => {
      setFilterDateFrom(value);
      setPage(1);
    },
    [setPage],
  );
  const setFilterDateToWithPage = useCallback(
    (value: string) => {
      setFilterDateTo(value);
      setPage(1);
    },
    [setPage],
  );
  const setFilterScoreMinWithPage = useCallback(
    (value: string) => {
      setFilterScoreMin(value);
      setPage(1);
    },
    [setPage],
  );
  const setFilterScoreMaxWithPage = useCallback(
    (value: string) => {
      setFilterScoreMax(value);
      setPage(1);
    },
    [setPage],
  );
  const setSearchTermWithPage = useCallback(
    (value: string) => {
      setSearchTerm(value);
      setPage(1);
    },
    [setPage],
  );
  const setFilterRowStatusWithPage = useCallback(
    (value: "all" | "valid" | "invalid") => {
      setFilterRowStatus(value);
      setPage(1);
    },
    [setPage],
  );
  const setFilterCorrectionStatusWithPage = useCallback(
    (value: "all" | "corrected" | "uncorrected") => {
      setFilterCorrectionStatus(value);
      setPage(1);
    },
    [setPage],
  );

  return {
    searchTerm,
    filterPlayer,
    filterSource,
    filterChest,
    filterClanId,
    filterDateFrom,
    filterDateTo,
    filterScoreMin,
    filterScoreMax,
    filterRowStatus,
    filterCorrectionStatus,
    playerFilterOptions,
    sourceFilterOptions,
    chestFilterOptions,
    clientFilteredRows,
    clearFilters,
    setFilterPlayerWithPage,
    setFilterSourceWithPage,
    setFilterChestWithPage,
    setFilterClanIdWithPage,
    setFilterDateFromWithPage,
    setFilterDateToWithPage,
    setFilterScoreMinWithPage,
    setFilterScoreMaxWithPage,
    setSearchTermWithPage,
    setFilterRowStatusWithPage,
    setFilterCorrectionStatusWithPage,
  };
}
