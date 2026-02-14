"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useSupabase } from "../hooks/use-supabase";
import { useToast } from "../components/toast-provider";
import type { ValidationRuleRow, CorrectionRuleRow } from "@/lib/types/domain";
import { DATE_REGEX } from "@/lib/constants";
import { normalizeString } from "@/lib/string-utils";
import { useRuleProcessing } from "@/lib/hooks/use-rule-processing";
import { useDataTableFilters } from "./use-data-table-filters";
import { useDataTableBatch } from "./use-data-table-batch";
import type { ChestEntryRow, EditableRow, RowValues, SortKey } from "./use-data-table-types";

export type {
  ChestEntryRow,
  EditableRow,
  FilterOption,
  RowValues,
  SortDirection,
  SortKey,
} from "./use-data-table-types";

interface ChestEntryQueryRow {
  readonly id: string;
  readonly collected_date: string;
  readonly player: string;
  readonly source: string;
  readonly chest: string;
  readonly score: number;
  readonly clan_id: string;
  readonly clans: { readonly name: string } | readonly { readonly name: string }[] | null;
}

interface AuditLogEntry {
  readonly clan_id: string;
  readonly actor_id: string;
  readonly action: string;
  readonly entity: string;
  readonly entity_id: string;
  readonly diff: Record<string, unknown> | null;
}

interface LoadRowsParams {
  readonly pageNumber: number;
  readonly allowRetry?: boolean;
}

/**
 * Custom hook for data table state, data loading, filtering, editing, and CRUD.
 * Encapsulates all business logic for the chest entries table.
 */
export function useDataTable() {
  const t = useTranslations("dataTable");
  const supabase = useSupabase();
  const { pushToast } = useToast();
  const [rows, setRows] = useState<readonly ChestEntryRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<readonly string[]>([]);
  const [editMap, setEditMap] = useState<Record<string, EditableRow>>({});
  const [status, setStatus] = useState<string>("");
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [isBatchOpsOpen, setIsBatchOpsOpen] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(null);
  const [availableClans, setAvailableClans] = useState<readonly { id: string; name: string }[]>([]);
  const [validationRules, setValidationRules] = useState<readonly ValidationRuleRow[]>([]);
  const [correctionRules, setCorrectionRules] = useState<readonly CorrectionRuleRow[]>([]);
  const [isAddCorrectionRuleOpen, setIsAddCorrectionRuleOpen] = useState<boolean>(false);
  const [correctionRuleRowId, setCorrectionRuleRowId] = useState<string | null>(null);
  const [correctionRuleField, setCorrectionRuleField] = useState<"player" | "source" | "chest" | "clan" | "all">(
    "player",
  );
  const [correctionRuleMatch, setCorrectionRuleMatch] = useState<string>("");
  const [correctionRuleReplacement, setCorrectionRuleReplacement] = useState<string>("");
  const [correctionRuleStatus, setCorrectionRuleStatus] = useState<string>("active");
  const [correctionRuleMessage, setCorrectionRuleMessage] = useState<string>("");
  const [isAddValidationRuleOpen, setIsAddValidationRuleOpen] = useState<boolean>(false);
  const [validationRuleRowId, setValidationRuleRowId] = useState<string | null>(null);
  const [validationRuleField, setValidationRuleField] = useState<"player" | "source" | "chest" | "clan">("player");
  const [validationRuleMatch, setValidationRuleMatch] = useState<string>("");
  const [validationRuleStatus, setValidationRuleStatus] = useState<string>("valid");
  const [validationRuleMessage, setValidationRuleMessage] = useState<string>("");
  const [rulesVersion, setRulesVersion] = useState<number>(0);
  const [retryPage, setRetryPage] = useState<number | null>(null);
  const [pendingDeleteRow, setPendingDeleteRow] = useState<ChestEntryRow | null>(null);
  const [pendingSaveAll, setPendingSaveAll] = useState<boolean>(false);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalCount / pageSize)), [totalCount, pageSize]);

  const clanNameById = useMemo(() => {
    return availableClans.reduce<Record<string, string>>((acc, clan) => {
      acc[clan.id] = clan.name;
      return acc;
    }, {});
  }, [availableClans]);
  const clanNameSuggestions = useMemo(() => availableClans.map((clan) => clan.name), [availableClans]);
  const {
    validationEvaluator,
    correctionApplicator,
    playerSuggestions,
    sourceSuggestions,
    chestSuggestions,
    suggestionsForField,
  } = useRuleProcessing(validationRules, correctionRules, clanNameSuggestions);
  const clanIdByName = useMemo(() => {
    return availableClans.reduce<Record<string, string>>((acc, clan) => {
      acc[clan.name.toLowerCase()] = clan.id;
      return acc;
    }, {});
  }, [availableClans]);

  const getRowValue = useCallback(
    (row: ChestEntryRow, field: keyof EditableRow): string => {
      const edits = editMap[row.id];
      if (edits && edits[field]) {
        return edits[field];
      }
      if (field === "collected_date") {
        return row.collected_date;
      }
      if (field === "score") {
        return String(row.score);
      }
      if (field === "clan_id") {
        return row.clan_id;
      }
      return row[field];
    },
    [editMap],
  );

  const rowValidationResults = useMemo(() => {
    return rows.reduce<Record<string, ReturnType<typeof validationEvaluator>>>((acc, row) => {
      const clanId = getRowValue(row, "clan_id");
      const clanName = clanNameById[clanId] ?? row.clan_name;
      acc[row.id] = validationEvaluator({
        player: getRowValue(row, "player"),
        source: getRowValue(row, "source"),
        chest: getRowValue(row, "chest"),
        clan: clanName,
      });
      return acc;
    }, {});
  }, [clanNameById, rows, validationEvaluator, getRowValue]);
  const rowCorrectionMatches = useMemo(() => {
    return rows.reduce<Record<string, boolean>>((acc, row) => {
      const playerResult = correctionApplicator.applyToField({ field: "player", value: row.player });
      const sourceResult = correctionApplicator.applyToField({ field: "source", value: row.source });
      const chestResult = correctionApplicator.applyToField({ field: "chest", value: row.chest });
      const clanName = clanNameById[row.clan_id] ?? row.clan_name ?? "";
      const clanResult = correctionApplicator.applyToField({ field: "clan", value: clanName });
      acc[row.id] =
        playerResult.wasCorrected || sourceResult.wasCorrected || chestResult.wasCorrected || clanResult.wasCorrected;
      return acc;
    }, {});
  }, [clanNameById, correctionApplicator, rows]);

  const filters = useDataTableFilters({
    validationRules,
    t,
    setPage,
    rows,
    rowValidationResults,
    rowCorrectionMatches,
  });

  const loadRows = useCallback(
    async ({ pageNumber, allowRetry = true }: LoadRowsParams): Promise<void> => {
      const fromIndex = (pageNumber - 1) * pageSize;
      const toIndex = fromIndex + pageSize - 1;
      const query = supabase
        .from("chest_entries")
        .select("id,collected_date,player,source,chest,score,clan_id,clans(name)", { count: "exact" })
        .order("collected_date", { ascending: false })
        .range(fromIndex, toIndex);
      if (filters.searchTerm.trim()) {
        const pattern = `%${filters.searchTerm.trim()}%`;
        query.or(`player.ilike.${pattern},source.ilike.${pattern},chest.ilike.${pattern}`);
      }
      if (filters.filterPlayer.trim()) {
        query.ilike("player", `%${filters.filterPlayer.trim()}%`);
      }
      if (filters.filterSource.trim()) {
        query.ilike("source", `%${filters.filterSource.trim()}%`);
      }
      if (filters.filterChest.trim()) {
        query.ilike("chest", `%${filters.filterChest.trim()}%`);
      }
      if (filters.filterClanId !== "all") {
        query.eq("clan_id", filters.filterClanId);
      }
      if (filters.filterDateFrom.trim()) {
        query.gte("collected_date", filters.filterDateFrom.trim());
      }
      if (filters.filterDateTo.trim()) {
        query.lte("collected_date", filters.filterDateTo.trim());
      }
      if (filters.filterScoreMin.trim()) {
        const minValue = Number(filters.filterScoreMin);
        if (!Number.isNaN(minValue)) {
          query.gte("score", minValue);
        }
      }
      if (filters.filterScoreMax.trim()) {
        const maxValue = Number(filters.filterScoreMax);
        if (!Number.isNaN(maxValue)) {
          query.lte("score", maxValue);
        }
      }
      const { data, error, count } = await query;
      if (error) {
        setStatus(`Failed to load data: ${error.message}`);
        return;
      }
      const mappedRows = (data ?? []).map((row) => {
        const entry = row as ChestEntryQueryRow;
        const clanEntry = Array.isArray(entry.clans) ? entry.clans[0] : entry.clans;
        return {
          id: entry.id,
          collected_date: entry.collected_date,
          player: entry.player,
          source: entry.source,
          chest: entry.chest,
          score: entry.score,
          clan_id: entry.clan_id,
          clan_name: clanEntry?.name ?? "",
        };
      });
      if (mappedRows.length === 0 && count && count > 0 && pageNumber > 1 && allowRetry) {
        const maxPage = Math.max(1, Math.ceil(count / pageSize));
        if (maxPage !== pageNumber) {
          setPage(maxPage);
          /* Re-fetch at corrected page without recursion — caller should retry */
          setRetryPage(maxPage);
          return;
        }
      }
      setRows(mappedRows);
      setTotalCount(count ?? 0);
    },
    [
      filters.filterChest,
      filters.filterClanId,
      filters.filterDateFrom,
      filters.filterDateTo,
      filters.filterPlayer,
      filters.filterScoreMax,
      filters.filterScoreMin,
      filters.filterSource,
      filters.searchTerm,
      pageSize,
      supabase,
    ],
  );

  /* When a page comes back empty (e.g. after a delete), retry at the corrected max page */
  useEffect(() => {
    if (retryPage !== null) {
      setRetryPage(null);
      void loadRows({ pageNumber: retryPage, allowRetry: false });
    }
  }, [retryPage, loadRows]);

  const getCurrentUserId = useCallback(async (): Promise<string | null> => {
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  }, [supabase]);

  const insertAuditLogs = useCallback(
    async (entries: readonly AuditLogEntry[]): Promise<void> => {
      if (entries.length === 0) {
        return;
      }
      const { error } = await supabase.from("audit_logs").insert(entries);
      if (error) {
        setStatus(`Audit log failed: ${error.message}`);
      }
    },
    [supabase],
  );

  useEffect(() => {
    void loadRows({ pageNumber: page });
  }, [loadRows, page]);

  useEffect(() => {
    async function loadClans(): Promise<void> {
      const { data, error } = await supabase.from("clans").select("id,name").order("name");
      if (error) {
        return;
      }
      setAvailableClans(data ?? []);
    }
    void loadClans();
  }, [supabase]);

  useEffect(() => {
    async function loadAllRules(): Promise<void> {
      const { data, error } = await supabase
        .from("validation_rules")
        .select("id,field,match_value,status")
        .order("field");
      if (error) {
        return;
      }
      setValidationRules(data ?? []);
      const { data: correctionData, error: correctionError } = await supabase
        .from("correction_rules")
        .select("id,field,match_value,replacement_value,status")
        .order("field");
      if (correctionError) {
        return;
      }
      setCorrectionRules(correctionData ?? []);
    }
    void loadAllRules();
  }, [rulesVersion, supabase]);

  useEffect(() => {
    if (status) {
      pushToast(status);
    }
  }, [pushToast, status]);

  const toggleSort = useCallback((nextKey: SortKey): void => {
    setSortKey((current) => {
      if (current !== nextKey) {
        setSortDirection("asc");
        return nextKey;
      }
      setSortDirection((dir) => {
        if (dir === "asc") {
          return "desc";
        }
        return null;
      });
      setSortKey(null);
      return current;
    });
  }, []);

  const getSortValue = useCallback(
    (row: ChestEntryRow, key: SortKey): string | number => {
      if (key === "score") {
        return Number(getRowValue(row, "score"));
      }
      if (key === "clan") {
        const clanId = getRowValue(row, "clan_id");
        return (clanNameById[clanId] ?? row.clan_name ?? "").toLowerCase();
      }
      if (key === "collected_date") {
        return getRowValue(row, "collected_date");
      }
      return getRowValue(row, key).toLowerCase();
    },
    [clanNameById, getRowValue],
  );

  const sortRows = useCallback(
    (inputRows: readonly ChestEntryRow[]): ChestEntryRow[] => {
      if (!sortKey || !sortDirection) {
        return [...inputRows];
      }
      const direction = sortDirection === "asc" ? 1 : -1;
      return [...inputRows].sort((a, b) => {
        const aValue = getSortValue(a, sortKey);
        const bValue = getSortValue(b, sortKey);
        if (aValue < bValue) {
          return -1 * direction;
        }
        if (aValue > bValue) {
          return 1 * direction;
        }
        return 0;
      });
    },
    [getSortValue, sortDirection, sortKey],
  );

  const updateEditValue = useCallback((id: string, field: keyof EditableRow, value: string): void => {
    const existing: EditableRow = {
      collected_date: "",
      player: "",
      source: "",
      chest: "",
      score: "",
      clan_id: "",
    };
    setEditMap((current) => ({
      ...current,
      [id]: { ...(current[id] ?? existing), [field]: value },
    }));
    setRowErrors((current) => {
      if (!current[id]) {
        return current;
      }
      const updated = { ...current };
      delete updated[id];
      return updated;
    });
  }, []);

  const clearRowEdits = useCallback((rowId: string): void => {
    setEditMap((current) => {
      if (!current[rowId]) {
        return current;
      }
      const updated = { ...current };
      delete updated[rowId];
      return updated;
    });
    setRowErrors((current) => {
      if (!current[rowId]) {
        return current;
      }
      const updated = { ...current };
      delete updated[rowId];
      return updated;
    });
  }, []);

  const getNextPageAfterDelete = useCallback(
    (deleteCount: number): number => {
      const nextTotal = Math.max(0, totalCount - deleteCount);
      const maxPage = Math.max(1, Math.ceil(nextTotal / pageSize));
      return Math.min(page, maxPage);
    },
    [page, pageSize, totalCount],
  );

  const refreshAfterDelete = useCallback(
    (deleteCount: number): void => {
      const nextPage = getNextPageAfterDelete(deleteCount);
      setPage(nextPage);
      void loadRows({ pageNumber: nextPage });
    },
    [getNextPageAfterDelete, loadRows],
  );

  const batch = useDataTableBatch({
    rows,
    selectedIds,
    setSelectedIds,
    editMap,
    updateEditValue,
    getRowValue,
    getCurrentUserId,
    insertAuditLogs,
    supabase,
    refreshAfterDelete,
    setStatus,
    setRows,
    setTotalCount,
    t,
    pushToast,
  });

  const validateRow = useCallback(
    (values: RowValues): string | null => {
      const nextDate = values.collected_date;
      const nextPlayer = values.player;
      const nextSource = values.source;
      const nextChest = values.chest;
      const nextScore = values.score;
      const nextClanId = values.clan_id;
      if (!nextDate.trim() || !DATE_REGEX.test(nextDate.trim())) {
        return t("validationDateFormat");
      }
      if (!nextPlayer.trim() || !nextSource.trim() || !nextChest.trim()) {
        return t("validationPlayerSourceChestRequired");
      }
      if (!nextClanId.trim()) {
        return t("validationClanRequired");
      }
      if (Number.isNaN(nextScore) || nextScore < 0) {
        return t("validationScoreNonNegative");
      }
      if (!Number.isInteger(nextScore)) {
        return t("validationScoreInteger");
      }
      return null;
    },
    [t],
  );

  const buildRowValues = useCallback((row: ChestEntryRow, edits: EditableRow): RowValues => {
    return {
      collected_date: edits.collected_date || row.collected_date,
      player: edits.player || row.player,
      source: edits.source || row.source,
      chest: edits.chest || row.chest,
      score: Number(edits.score || row.score),
      clan_id: edits.clan_id || row.clan_id,
    };
  }, []);

  const applyCorrectionsToValues = useCallback(
    (values: RowValues, row: ChestEntryRow): { values: RowValues; correctionCount: number } => {
      let correctionCount = 0;
      const nextValues: RowValues = { ...values };
      const playerCorrection = correctionApplicator.applyToField({ field: "player", value: values.player });
      if (playerCorrection.wasCorrected) {
        nextValues.player = playerCorrection.value;
        correctionCount += 1;
      }
      const sourceCorrection = correctionApplicator.applyToField({ field: "source", value: values.source });
      if (sourceCorrection.wasCorrected) {
        nextValues.source = sourceCorrection.value;
        correctionCount += 1;
      }
      const chestCorrection = correctionApplicator.applyToField({ field: "chest", value: values.chest });
      if (chestCorrection.wasCorrected) {
        nextValues.chest = chestCorrection.value;
        correctionCount += 1;
      }
      const clanName = clanNameById[values.clan_id] ?? row.clan_name ?? "";
      const clanCorrection = correctionApplicator.applyToField({ field: "clan", value: clanName });
      if (clanCorrection.wasCorrected) {
        const correctedClanId = clanIdByName[normalizeString(clanCorrection.value)];
        if (correctedClanId && correctedClanId !== nextValues.clan_id) {
          nextValues.clan_id = correctedClanId;
          correctionCount += 1;
        }
      }
      return { values: nextValues, correctionCount };
    },
    [clanIdByName, clanNameById, correctionApplicator],
  );

  const buildRowDiff = useCallback(
    (row: ChestEntryRow, values: RowValues): Record<string, { from: string | number; to: string | number }> => {
      const diff: Record<string, { from: string | number; to: string | number }> = {};
      if (values.collected_date && values.collected_date !== row.collected_date) {
        diff.collected_date = { from: row.collected_date, to: values.collected_date };
      }
      if (values.player && values.player !== row.player) {
        diff.player = { from: row.player, to: values.player };
      }
      if (values.source && values.source !== row.source) {
        diff.source = { from: row.source, to: values.source };
      }
      if (values.chest && values.chest !== row.chest) {
        diff.chest = { from: row.chest, to: values.chest };
      }
      if (!Number.isNaN(values.score) && values.score !== row.score) {
        diff.score = { from: row.score, to: values.score };
      }
      if (values.clan_id && values.clan_id !== row.clan_id) {
        diff.clan_id = { from: row.clan_id, to: values.clan_id };
      }
      return diff;
    },
    [],
  );

  const handleSaveRow = useCallback(
    async (row: ChestEntryRow): Promise<void> => {
      const edits = editMap[row.id];
      if (!edits) {
        setStatus(t("noChangesToSave"));
        return;
      }
      const baseValues = buildRowValues(row, edits);
      const { values: correctedValues, correctionCount } = applyCorrectionsToValues(baseValues, row);
      const errorMessage = validateRow(correctedValues);
      if (errorMessage) {
        setRowErrors((current) => ({ ...current, [row.id]: errorMessage }));
        return;
      }
      const userId = await getCurrentUserId();
      if (!userId) {
        setStatus(t("mustBeLoggedIn"));
        return;
      }
      const nextScore = correctedValues.score;
      const nextDate = correctedValues.collected_date;
      const nextClanId = correctedValues.clan_id;
      const { error } = await supabase
        .from("chest_entries")
        .update({
          collected_date: nextDate,
          player: correctedValues.player,
          source: correctedValues.source,
          chest: correctedValues.chest,
          score: nextScore,
          clan_id: nextClanId,
          updated_by: userId,
        })
        .eq("id", row.id);
      if (error) {
        setStatus(t("updateFailed", { error: error.message }));
        return;
      }
      const diff = buildRowDiff(row, correctedValues);
      if (Object.keys(diff).length > 0) {
        await insertAuditLogs([
          {
            clan_id: row.clan_id,
            actor_id: userId,
            action: "update",
            entity: "chest_entries",
            entity_id: row.id,
            diff,
          },
        ]);
      }
      setStatus(correctionCount > 0 ? t("rowUpdatedWithCorrections", { count: correctionCount }) : t("rowUpdated"));
      setEditMap((current) => {
        const updated = { ...current };
        delete updated[row.id];
        return updated;
      });
      await loadRows({ pageNumber: page });
    },
    [
      applyCorrectionsToValues,
      buildRowDiff,
      buildRowValues,
      editMap,
      getCurrentUserId,
      insertAuditLogs,
      loadRows,
      page,
      supabase,
      t,
      validateRow,
    ],
  );

  const requestDeleteRow = useCallback((row: ChestEntryRow): void => {
    setPendingDeleteRow(row);
  }, []);

  const performDeleteRow = useCallback(
    async (row: ChestEntryRow): Promise<void> => {
      setPendingDeleteRow(null);
      const userId = await getCurrentUserId();
      if (!userId) {
        setStatus(t("mustBeLoggedInDelete"));
        return;
      }
      const { error } = await supabase.from("chest_entries").delete().eq("id", row.id);
      if (error) {
        setStatus(t("deleteFailed", { error: error.message }));
        return;
      }
      await insertAuditLogs([
        {
          clan_id: row.clan_id,
          actor_id: userId,
          action: "delete",
          entity: "chest_entries",
          entity_id: row.id,
          diff: {
            collected_date: row.collected_date,
            player: row.player,
            source: row.source,
            chest: row.chest,
            score: row.score,
          },
        },
      ]);
      const remainingRows = rows.filter((entry) => entry.id !== row.id);
      setStatus(t("rowDeleted"));
      clearRowEdits(row.id);
      setSelectedIds((current) => current.filter((id) => id !== row.id));
      if (remainingRows.length > 0) {
        setRows(remainingRows);
        setTotalCount((current) => Math.max(0, current - 1));
        return;
      }
      refreshAfterDelete(1);
    },
    [clearRowEdits, getCurrentUserId, insertAuditLogs, refreshAfterDelete, rows, supabase, t],
  );

  const handleDeleteRow = requestDeleteRow;

  const handlePageInputChange = useCallback(
    (nextValue: string): void => {
      const nextPage = Number(nextValue);
      if (Number.isNaN(nextPage)) {
        return;
      }
      const clampedPage = Math.min(Math.max(1, nextPage), totalPages);
      setPage(clampedPage);
    },
    [totalPages],
  );

  const requestSaveAllRows = useCallback((): void => {
    const editIds = Object.keys(editMap);
    if (editIds.length === 0) {
      setStatus(t("noChangesToSave"));
      return;
    }
    setPendingSaveAll(true);
  }, [editMap, setStatus, t]);

  const performSaveAllRows = useCallback(async (): Promise<void> => {
    setPendingSaveAll(false);
    const editIds = Object.keys(editMap);
    if (editIds.length === 0) return;
    let hasValidationError = false;
    const nextErrors: Record<string, string> = {};
    const userId = await getCurrentUserId();
    if (!userId) {
      setStatus(t("mustBeLoggedIn"));
      return;
    }
    setStatus(t("savingAllChanges"));
    for (const rowId of editIds) {
      const foundRow = rows.find((item) => item.id === rowId);
      if (!foundRow) continue;
      const edits = editMap[rowId];
      if (!edits) continue;
      const baseValues = buildRowValues(foundRow, edits);
      const { values: correctedValues } = applyCorrectionsToValues(baseValues, foundRow);
      const errorMessage = validateRow(correctedValues);
      if (errorMessage) {
        nextErrors[rowId] = errorMessage;
        hasValidationError = true;
        continue;
      }
      await handleSaveRow(foundRow);
    }
    if (hasValidationError) {
      setRowErrors((current) => ({ ...current, ...nextErrors }));
      setStatus(t("someRowsNeedFixes"));
      return;
    }
    setStatus(t("allChangesSaved"));
  }, [applyCorrectionsToValues, buildRowValues, editMap, getCurrentUserId, handleSaveRow, rows, t, validateRow]);

  const handleSaveAllRows = requestSaveAllRows;

  const getRowFieldValueForRule = useCallback(
    (row: ChestEntryRow, field: "player" | "source" | "chest" | "clan"): string => {
      if (field === "clan") {
        return clanNameById[row.clan_id] ?? row.clan_name ?? "";
      }
      return row[field];
    },
    [clanNameById],
  );

  const openCorrectionRuleModal = useCallback((row: ChestEntryRow): void => {
    setCorrectionRuleRowId(row.id);
    setCorrectionRuleField("player");
    setCorrectionRuleMatch(row.player);
    setCorrectionRuleReplacement("");
    setCorrectionRuleStatus("active");
    setCorrectionRuleMessage("");
    setIsAddCorrectionRuleOpen(true);
  }, []);

  const updateCorrectionRuleField = useCallback(
    (nextField: "player" | "source" | "chest" | "clan" | "all"): void => {
      setCorrectionRuleField(nextField);
      if (nextField === "all" || !correctionRuleRowId) {
        return;
      }
      const row = rows.find((entry) => entry.id === correctionRuleRowId);
      if (!row) {
        return;
      }
      setCorrectionRuleMatch(getRowFieldValueForRule(row, nextField));
      setCorrectionRuleReplacement("");
    },
    [correctionRuleRowId, getRowFieldValueForRule, rows],
  );

  const closeCorrectionRuleModal = useCallback((): void => {
    setIsAddCorrectionRuleOpen(false);
    setCorrectionRuleRowId(null);
    setCorrectionRuleMessage("");
  }, []);

  const handleSaveCorrectionRuleFromRow = useCallback(async (): Promise<void> => {
    if (!correctionRuleRowId) {
      setCorrectionRuleMessage(t("selectRowFirst"));
      return;
    }
    const row = rows.find((entry) => entry.id === correctionRuleRowId);
    if (!row) {
      setCorrectionRuleMessage(t("rowDataNotAvailable"));
      return;
    }
    if (!correctionRuleMatch.trim() || !correctionRuleReplacement.trim()) {
      setCorrectionRuleMessage(t("matchReplacementRequired"));
      return;
    }
    const payload = {
      field: correctionRuleField,
      match_value: correctionRuleMatch.trim(),
      replacement_value: correctionRuleReplacement.trim(),
      status: correctionRuleStatus.trim() || "active",
    };
    const { error } = await supabase.from("correction_rules").insert(payload);
    if (error) {
      setCorrectionRuleMessage(t("failedToAddCorrectionRule", { error: error.message }));
      return;
    }
    setCorrectionRuleMessage(t("correctionRuleAdded"));
    setRulesVersion((current) => current + 1);
    closeCorrectionRuleModal();
  }, [
    closeCorrectionRuleModal,
    correctionRuleField,
    correctionRuleMatch,
    correctionRuleReplacement,
    correctionRuleRowId,
    correctionRuleStatus,
    rows,
    supabase,
    t,
  ]);

  const openValidationRuleModal = useCallback((row: ChestEntryRow): void => {
    setValidationRuleRowId(row.id);
    setValidationRuleField("player");
    setValidationRuleMatch(row.player);
    setValidationRuleStatus("valid");
    setValidationRuleMessage("");
    setIsAddValidationRuleOpen(true);
  }, []);

  const updateValidationRuleField = useCallback(
    (nextField: "player" | "source" | "chest" | "clan"): void => {
      setValidationRuleField(nextField);
      if (!validationRuleRowId) {
        return;
      }
      const row = rows.find((entry) => entry.id === validationRuleRowId);
      if (!row) {
        return;
      }
      setValidationRuleMatch(getRowFieldValueForRule(row, nextField));
    },
    [getRowFieldValueForRule, rows, validationRuleRowId],
  );

  const closeValidationRuleModal = useCallback((): void => {
    setIsAddValidationRuleOpen(false);
    setValidationRuleRowId(null);
    setValidationRuleMessage("");
  }, []);

  const handleSaveValidationRuleFromRow = useCallback(async (): Promise<void> => {
    if (!validationRuleRowId) {
      setValidationRuleMessage(t("selectRowFirst"));
      return;
    }
    const row = rows.find((entry) => entry.id === validationRuleRowId);
    if (!row) {
      setValidationRuleMessage(t("rowDataNotAvailable"));
      return;
    }
    if (!validationRuleMatch.trim()) {
      setValidationRuleMessage(t("valueRequired"));
      return;
    }
    const payload = {
      field: validationRuleField,
      match_value: validationRuleMatch.trim(),
      status: validationRuleStatus.trim() || "valid",
    };
    const { error } = await supabase.from("validation_rules").insert(payload);
    if (error) {
      setValidationRuleMessage(t("failedToAddValidationRule", { error: error.message }));
      return;
    }
    setValidationRuleMessage(t("validationRuleAdded"));
    setRulesVersion((current) => current + 1);
    closeValidationRuleModal();
  }, [
    closeValidationRuleModal,
    rows,
    supabase,
    t,
    validationRuleField,
    validationRuleMatch,
    validationRuleRowId,
    validationRuleStatus,
  ]);

  const setPageSizeWithReset = useCallback((value: number) => {
    setPageSize(value);
    setPage(1);
  }, []);

  return {
    rows,
    selectedIds: batch.selectedIds,
    editMap,
    rowErrors,
    searchTerm: filters.searchTerm,
    isBatchOpsOpen,
    setIsBatchOpsOpen,
    filterPlayer: filters.filterPlayer,
    filterSource: filters.filterSource,
    filterChest: filters.filterChest,
    filterClanId: filters.filterClanId,
    filterDateFrom: filters.filterDateFrom,
    filterDateTo: filters.filterDateTo,
    filterScoreMin: filters.filterScoreMin,
    filterScoreMax: filters.filterScoreMax,
    filterRowStatus: filters.filterRowStatus,
    filterCorrectionStatus: filters.filterCorrectionStatus,
    page,
    setPage,
    pageSize,
    totalCount,
    totalPages,
    sortKey,
    sortDirection,
    availableClans,
    clientFilteredRows: filters.clientFilteredRows,
    selectedRows: batch.selectedRows,
    selectedSet: batch.selectedSet,
    selectAllRef: batch.selectAllRef,
    areAllRowsSelected: batch.areAllRowsSelected,
    areSomeRowsSelected: batch.areSomeRowsSelected,
    playerFilterOptions: filters.playerFilterOptions,
    sourceFilterOptions: filters.sourceFilterOptions,
    chestFilterOptions: filters.chestFilterOptions,
    rowValidationResults,
    validationEvaluator,
    playerSuggestions,
    sourceSuggestions,
    chestSuggestions,
    suggestionsForField,
    isBatchEditOpen: batch.isBatchEditOpen,
    batchEditField: batch.batchEditField,
    batchEditValue: batch.batchEditValue,
    batchEditDate: batch.batchEditDate,
    batchEditClanId: batch.batchEditClanId,
    isBatchDeleteConfirmOpen: batch.isBatchDeleteConfirmOpen,
    isBatchDeleteInputOpen: batch.isBatchDeleteInputOpen,
    batchDeleteInput: batch.batchDeleteInput,
    setBatchDeleteInput: batch.setBatchDeleteInput,
    isAddCorrectionRuleOpen,
    correctionRuleField,
    correctionRuleMatch,
    setCorrectionRuleMatch,
    correctionRuleReplacement,
    setCorrectionRuleReplacement,
    correctionRuleStatus,
    setCorrectionRuleStatus,
    correctionRuleMessage,
    isAddValidationRuleOpen,
    validationRuleField,
    validationRuleMatch,
    setValidationRuleMatch,
    validationRuleStatus,
    setValidationRuleStatus,
    validationRuleMessage,
    setFilterPlayerWithPage: filters.setFilterPlayerWithPage,
    setFilterSourceWithPage: filters.setFilterSourceWithPage,
    setFilterChestWithPage: filters.setFilterChestWithPage,
    setFilterClanIdWithPage: filters.setFilterClanIdWithPage,
    setFilterDateFromWithPage: filters.setFilterDateFromWithPage,
    setFilterDateToWithPage: filters.setFilterDateToWithPage,
    setFilterScoreMinWithPage: filters.setFilterScoreMinWithPage,
    setFilterScoreMaxWithPage: filters.setFilterScoreMaxWithPage,
    setSearchTermWithPage: filters.setSearchTermWithPage,
    setFilterRowStatusWithPage: filters.setFilterRowStatusWithPage,
    setFilterCorrectionStatusWithPage: filters.setFilterCorrectionStatusWithPage,
    setPageSizeWithReset,
    toggleSelect: batch.toggleSelect,
    toggleSelectAllRows: batch.toggleSelectAllRows,
    toggleSort,
    sortRows,
    openBatchEdit: batch.openBatchEdit,
    closeBatchEdit: batch.closeBatchEdit,
    handleBatchFieldChange: batch.handleBatchFieldChange,
    clearFilters: filters.clearFilters,
    updateEditValue,
    clearRowEdits,
    handleSaveRow,
    handleDeleteRow,
    handlePageInputChange,
    confirmBatchEdit: batch.confirmBatchEdit,
    handleBatchDelete: batch.handleBatchDelete,
    closeBatchDeleteConfirm: batch.closeBatchDeleteConfirm,
    openBatchDeleteInput: batch.openBatchDeleteInput,
    closeBatchDeleteInput: batch.closeBatchDeleteInput,
    confirmBatchDelete: batch.confirmBatchDelete,
    handleSaveAllRows,
    pendingDeleteRow,
    pendingSaveAll,
    performDeleteRow,
    performSaveAllRows,
    closePendingDeleteRow: () => setPendingDeleteRow(null),
    closePendingSaveAll: () => setPendingSaveAll(false),
    openCorrectionRuleModal,
    updateCorrectionRuleField,
    closeCorrectionRuleModal,
    handleSaveCorrectionRuleFromRow,
    openValidationRuleModal,
    updateValidationRuleField,
    closeValidationRuleModal,
    handleSaveValidationRuleFromRow,
    getRowValue,
    getBatchPreviewValue: batch.getBatchPreviewValue,
    setBatchEditDate: batch.setBatchEditDate,
    setBatchEditClanId: batch.setBatchEditClanId,
    setBatchEditValue: batch.setBatchEditValue,
  };
}
