"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChestEntryRow, EditableRow } from "./use-data-table-types";

interface AuditLogEntry {
  readonly clan_id: string;
  readonly actor_id: string;
  readonly action: string;
  readonly entity: string;
  readonly entity_id: string;
  readonly diff: Record<string, unknown> | null;
}

export interface UseDataTableBatchParams {
  readonly rows: readonly ChestEntryRow[];
  readonly selectedIds: readonly string[];
  readonly setSelectedIds: (value: readonly string[] | ((prev: readonly string[]) => readonly string[])) => void;
  readonly editMap: Record<string, EditableRow>;
  readonly updateEditValue: (id: string, field: keyof EditableRow, value: string) => void;
  readonly getRowValue: (row: ChestEntryRow, field: keyof EditableRow) => string;
  readonly getCurrentUserId: () => Promise<string | null>;
  readonly insertAuditLogs: (entries: readonly AuditLogEntry[]) => Promise<void>;
  readonly supabase: SupabaseClient;
  readonly refreshAfterDelete: (deleteCount: number) => void;
  readonly setStatus: (message: string) => void;
  readonly setRows: (
    value: readonly ChestEntryRow[] | ((prev: readonly ChestEntryRow[]) => readonly ChestEntryRow[]),
  ) => void;
  readonly setTotalCount: (value: number | ((prev: number) => number)) => void;
  readonly t: (key: string, values?: Record<string, string | number>) => string;
  readonly pushToast: (message: string) => void;
}

/**
 * Sub-hook for data table batch operations: selection, batch edit, batch delete.
 */
export function useDataTableBatch({
  rows,
  selectedIds,
  setSelectedIds,
  editMap: _editMap,
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
}: UseDataTableBatchParams) {
  const [isBatchEditOpen, setIsBatchEditOpen] = useState<boolean>(false);
  const [batchEditField, setBatchEditField] = useState<keyof EditableRow>("player");
  const [batchEditValue, setBatchEditValue] = useState<string>("");
  const [batchEditDate, setBatchEditDate] = useState<string>("");
  const [batchEditClanId, setBatchEditClanId] = useState<string>("");
  const [isBatchDeleteConfirmOpen, setIsBatchDeleteConfirmOpen] = useState<boolean>(false);
  const [isBatchDeleteInputOpen, setIsBatchDeleteInputOpen] = useState<boolean>(false);
  const [batchDeleteInput, setBatchDeleteInput] = useState<string>("");

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedRows = useMemo(() => rows.filter((row) => selectedSet.has(row.id)), [rows, selectedSet]);
  const selectAllRef = useRef<HTMLInputElement | null>(null);
  const areAllRowsSelected = useMemo(
    () => rows.length > 0 && rows.every((row) => selectedSet.has(row.id)),
    [rows, selectedSet],
  );
  const areSomeRowsSelected = useMemo(
    () => rows.some((row) => selectedSet.has(row.id)) && !areAllRowsSelected,
    [areAllRowsSelected, rows, selectedSet],
  );

  useEffect(() => {
    if (!selectAllRef.current) {
      return;
    }
    selectAllRef.current.indeterminate = areSomeRowsSelected;
  }, [areSomeRowsSelected]);

  const toggleSelect = useCallback(
    (id: string): void => {
      setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
    },
    [setSelectedIds],
  );

  const toggleSelectAllRows = useCallback((): void => {
    if (rows.length === 0) {
      return;
    }
    if (areAllRowsSelected) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(rows.map((row) => row.id));
  }, [areAllRowsSelected, rows, setSelectedIds]);

  const openBatchEdit = useCallback((): void => {
    if (selectedIds.length === 0) {
      pushToast(t("selectRowsForBatchEdit"));
      return;
    }
    setIsBatchEditOpen(true);
  }, [pushToast, selectedIds.length, t]);

  const closeBatchEdit = useCallback((): void => {
    setIsBatchEditOpen(false);
  }, []);

  const handleBatchFieldChange = useCallback((nextField: keyof EditableRow): void => {
    setBatchEditField(nextField);
    setBatchEditValue("");
    setBatchEditDate("");
    setBatchEditClanId("");
  }, []);

  const getBatchPreviewValue = useCallback(
    (row: ChestEntryRow, field: keyof EditableRow): string => {
      const baseValue = getRowValue(row, field);
      if (batchEditField !== field) {
        return baseValue;
      }
      if (field === "collected_date") {
        return batchEditDate ? batchEditDate : baseValue;
      }
      if (field === "clan_id") {
        return batchEditClanId ? batchEditClanId : baseValue;
      }
      if (batchEditValue === "") {
        return baseValue;
      }
      return batchEditValue;
    },
    [batchEditDate, batchEditField, batchEditClanId, batchEditValue, getRowValue],
  );

  const confirmBatchEdit = useCallback((): void => {
    if (selectedRows.length === 0) {
      setStatus(t("selectRowsForBatchEdit"));
      return;
    }
    if (batchEditField === "collected_date" && !batchEditDate) {
      setStatus(t("selectDateValue"));
      return;
    }
    if (batchEditField === "clan_id" && !batchEditClanId) {
      setStatus(t("selectClan"));
      return;
    }
    if (batchEditField !== "collected_date" && batchEditField !== "clan_id" && batchEditValue === "") {
      setStatus(t("enterValue"));
      return;
    }
    const nextValue =
      batchEditField === "collected_date"
        ? batchEditDate
        : batchEditField === "clan_id"
          ? batchEditClanId
          : batchEditValue;
    selectedRows.forEach((row) => {
      updateEditValue(row.id, batchEditField, nextValue);
    });
    setIsBatchEditOpen(false);
    setStatus(t("batchEditsApplied"));
  }, [batchEditClanId, batchEditDate, batchEditField, batchEditValue, selectedRows, setStatus, t, updateEditValue]);

  const handleBatchDelete = useCallback((): void => {
    if (selectedIds.length === 0) {
      setStatus(t("selectRowsToDelete"));
      return;
    }
    setIsBatchDeleteConfirmOpen(true);
  }, [selectedIds.length, setStatus, t]);

  const closeBatchDeleteConfirm = useCallback((): void => {
    setIsBatchDeleteConfirmOpen(false);
  }, []);

  const openBatchDeleteInput = useCallback((): void => {
    setIsBatchDeleteConfirmOpen(false);
    setIsBatchDeleteInputOpen(true);
    setBatchDeleteInput("");
  }, []);

  const closeBatchDeleteInput = useCallback((): void => {
    setIsBatchDeleteInputOpen(false);
    setBatchDeleteInput("");
  }, []);

  const confirmBatchDelete = useCallback(async (): Promise<void> => {
    const confirmationPhrase = "DELETE ROWS";
    if (batchDeleteInput.trim().toUpperCase() !== confirmationPhrase) {
      setStatus(t("confirmationPhraseMismatch"));
      return;
    }
    setIsBatchDeleteInputOpen(false);
    const userId = await getCurrentUserId();
    if (!userId) {
      setStatus(t("mustBeLoggedInBatchDelete"));
      return;
    }
    const selectedRowsForDelete = rows.filter((row) => selectedIds.includes(row.id));
    const { data, error } = await supabase.from("chest_entries").delete().in("id", selectedIds).select("id");
    if (error || !data?.length) {
      setStatus(t("batchDeleteFailed", { error: error?.message ?? "No rows deleted" }));
      return;
    }
    await insertAuditLogs(
      selectedRowsForDelete.map((row) => ({
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
      })),
    );
    const deleteIdSet = new Set(selectedIds);
    const remainingRows = rows.filter((row) => !deleteIdSet.has(row.id));
    setStatus(t("rowsDeleted"));
    setSelectedIds([]);
    if (remainingRows.length > 0) {
      setRows(remainingRows);
      setTotalCount((current) => Math.max(0, current - selectedIds.length));
      return;
    }
    refreshAfterDelete(selectedIds.length);
  }, [
    batchDeleteInput,
    getCurrentUserId,
    insertAuditLogs,
    refreshAfterDelete,
    rows,
    selectedIds,
    setSelectedIds,
    setRows,
    setStatus,
    setTotalCount,
    supabase,
    t,
  ]);

  return {
    selectedIds,
    selectedSet,
    selectedRows,
    selectAllRef,
    areAllRowsSelected,
    areSomeRowsSelected,
    isBatchEditOpen,
    batchEditField,
    batchEditValue,
    batchEditDate,
    batchEditClanId,
    isBatchDeleteConfirmOpen,
    isBatchDeleteInputOpen,
    batchDeleteInput,
    setBatchDeleteInput,
    toggleSelect,
    toggleSelectAllRows,
    openBatchEdit,
    closeBatchEdit,
    handleBatchFieldChange,
    confirmBatchEdit,
    handleBatchDelete,
    closeBatchDeleteConfirm,
    openBatchDeleteInput,
    closeBatchDeleteInput,
    confirmBatchDelete,
    getBatchPreviewValue,
    setBatchEditDate,
    setBatchEditClanId,
    setBatchEditValue,
  };
}
