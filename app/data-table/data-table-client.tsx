"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import createSupabaseBrowserClient from "../../lib/supabase/browser-client";
import DatePicker from "../components/date-picker";
import { createValidationEvaluator } from "../components/validation-evaluator";
import { useToast } from "../components/toast-provider";
import IconButton from "../components/ui/icon-button";
import LabeledSelect from "../components/ui/labeled-select";
import RadixSelect from "../components/ui/radix-select";
import SearchInput from "../components/ui/search-input";

interface ChestEntryRow {
  readonly id: string;
  readonly collected_date: string;
  readonly player: string;
  readonly source: string;
  readonly chest: string;
  readonly score: number;
  readonly clan_id: string;
  readonly clan_name: string;
}

interface EditableRow {
  readonly collected_date: string;
  readonly player: string;
  readonly source: string;
  readonly chest: string;
  readonly score: string;
  readonly clan_id: string;
}

type SortDirection = "asc" | "desc" | null;
type SortKey = "collected_date" | "player" | "source" | "chest" | "score" | "clan";

interface ChestEntryQueryRow {
  readonly id: string;
  readonly collected_date: string;
  readonly player: string;
  readonly source: string;
  readonly chest: string;
  readonly score: number;
  readonly clan_id: string;
  readonly clans: { readonly name: string } | null;
}

interface ValidationRuleRow {
  readonly id: string;
  readonly clan_id: string;
  readonly field: string;
  readonly match_value: string;
  readonly status: string;
}

interface AuditLogEntry {
  readonly clan_id: string;
  readonly actor_id: string;
  readonly action: string;
  readonly entity: string;
  readonly entity_id: string;
  readonly diff: Record<string, unknown> | null;
}

const DATE_REGEX: RegExp = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Client-side data table with inline edit and batch operations.
 */
function DataTableClient(): JSX.Element {
  const supabase = createSupabaseBrowserClient();
  const { pushToast } = useToast();
  const [rows, setRows] = useState<readonly ChestEntryRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<readonly string[]>([]);
  const [editMap, setEditMap] = useState<Record<string, EditableRow>>({});
  const [status, setStatus] = useState<string>("");
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isBatchOpsOpen, setIsBatchOpsOpen] = useState<boolean>(false);
  const [filterPlayer, setFilterPlayer] = useState<string>("");
  const [filterSource, setFilterSource] = useState<string>("");
  const [filterChest, setFilterChest] = useState<string>("");
  const [filterClanId, setFilterClanId] = useState<string>("all");
  const [filterDateFrom, setFilterDateFrom] = useState<string>("");
  const [filterDateTo, setFilterDateTo] = useState<string>("");
  const [filterScoreMin, setFilterScoreMin] = useState<string>("");
  const [filterScoreMax, setFilterScoreMax] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const totalPages: number = Math.max(1, Math.ceil(totalCount / pageSize));
  const [availableClans, setAvailableClans] = useState<readonly { id: string; name: string }[]>([]);
  const [validationRules, setValidationRules] = useState<readonly ValidationRuleRow[]>([]);
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
  const clanNameById = useMemo(() => {
    return availableClans.reduce<Record<string, string>>((acc, clan) => {
      acc[clan.id] = clan.name;
      return acc;
    }, {});
  }, [availableClans]);
  const validationEvaluator = useMemo(
    () => createValidationEvaluator(validationRules),
    [validationRules],
  );
  const playerFilterOptions = useMemo(() => {
    const values = new Set<string>();
    validationRules.forEach((rule) => {
      if (rule.field.toLowerCase() === "player" && rule.match_value.trim()) {
        values.add(rule.match_value.trim());
      }
    });
    return [{ value: "", label: "All" }, ...Array.from(values).sort().map((value) => ({ value, label: value }))];
  }, [validationRules]);
  const sourceFilterOptions = useMemo(() => {
    const values = new Set<string>();
    validationRules.forEach((rule) => {
      if (rule.field.toLowerCase() === "source" && rule.match_value.trim()) {
        values.add(rule.match_value.trim());
      }
    });
    return [{ value: "", label: "All" }, ...Array.from(values).sort().map((value) => ({ value, label: value }))];
  }, [validationRules]);
  const chestFilterOptions = useMemo(() => {
    const values = new Set<string>();
    validationRules.forEach((rule) => {
      if (rule.field.toLowerCase() === "chest" && rule.match_value.trim()) {
        values.add(rule.match_value.trim());
      }
    });
    return [{ value: "", label: "All" }, ...Array.from(values).sort().map((value) => ({ value, label: value }))];
  }, [validationRules]);
  const rowValidationResults = useMemo(() => {
    return rows.reduce<Record<string, ReturnType<typeof validationEvaluator>>>((acc, row) => {
      const clanId = getRowValue(row, "clan_id");
      const clanName = clanNameById[clanId] ?? row.clan_name;
      acc[row.id] = validationEvaluator({
        player: getRowValue(row, "player"),
        source: getRowValue(row, "source"),
        chest: getRowValue(row, "chest"),
        clan: clanName,
        clanId,
      });
      return acc;
    }, {});
  }, [clanNameById, editMap, rows, validationEvaluator]);
  

  interface LoadRowsParams {
    readonly pageNumber: number;
    readonly allowRetry?: boolean;
  }

  async function loadRows({ pageNumber, allowRetry = true }: LoadRowsParams): Promise<void> {
    const fromIndex = (pageNumber - 1) * pageSize;
    const toIndex = fromIndex + pageSize - 1;
    const query = supabase
      .from("chest_entries")
      .select("id,collected_date,player,source,chest,score,clan_id,clans(name)", { count: "exact" })
      .order("collected_date", { ascending: false })
      .range(fromIndex, toIndex);
    if (searchTerm.trim()) {
      const pattern = `%${searchTerm.trim()}%`;
      query.or(`player.ilike.${pattern},source.ilike.${pattern},chest.ilike.${pattern}`);
    }
    if (filterPlayer.trim()) {
      query.ilike("player", `%${filterPlayer.trim()}%`);
    }
    if (filterSource.trim()) {
      query.ilike("source", `%${filterSource.trim()}%`);
    }
    if (filterChest.trim()) {
      query.ilike("chest", `%${filterChest.trim()}%`);
    }
    if (filterClanId !== "all") {
      query.eq("clan_id", filterClanId);
    }
    if (filterDateFrom.trim()) {
      query.gte("collected_date", filterDateFrom.trim());
    }
    if (filterDateTo.trim()) {
      query.lte("collected_date", filterDateTo.trim());
    }
    if (filterScoreMin.trim()) {
      const minValue = Number(filterScoreMin);
      if (!Number.isNaN(minValue)) {
        query.gte("score", minValue);
      }
    }
    if (filterScoreMax.trim()) {
      const maxValue = Number(filterScoreMax);
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
      return {
        id: entry.id,
        collected_date: entry.collected_date,
        player: entry.player,
        source: entry.source,
        chest: entry.chest,
        score: entry.score,
        clan_id: entry.clan_id,
        clan_name: entry.clans?.name ?? "",
      };
    });
    if (mappedRows.length === 0 && count && count > 0 && pageNumber > 1 && allowRetry) {
      const maxPage = Math.max(1, Math.ceil(count / pageSize));
      if (maxPage !== pageNumber) {
        setPage(maxPage);
        await loadRows({ pageNumber: maxPage, allowRetry: false });
        return;
      }
    }
    setRows(mappedRows);
    setTotalCount(count ?? 0);
  }

  async function getCurrentUserId(): Promise<string | null> {
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  }

  async function insertAuditLogs(entries: readonly AuditLogEntry[]): Promise<void> {
    if (entries.length === 0) {
      return;
    }
    const { error } = await supabase.from("audit_logs").insert(entries);
    if (error) {
      setStatus(`Audit log failed: ${error.message}`);
    }
  }

  useEffect(() => {
    void loadRows({ pageNumber: page });
  }, [
    filterChest,
    filterClanId,
    filterDateFrom,
    filterDateTo,
    filterPlayer,
    filterScoreMax,
    filterScoreMin,
    filterSource,
    page,
    pageSize,
    searchTerm,
    supabase,
  ]);

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
    async function loadValidationRules(): Promise<void> {
      const clanIds = Array.from(new Set(rows.map((row) => row.clan_id).filter(Boolean)));
      if (clanIds.length === 0) {
        setValidationRules([]);
        return;
      }
      const { data, error } = await supabase
        .from("validation_rules")
        .select("id,clan_id,field,match_value,status")
        .in("clan_id", clanIds);
      if (error) {
        return;
      }
      setValidationRules(data ?? []);
    }
    void loadValidationRules();
  }, [rows, supabase]);

  useEffect(() => {
    if (status) {
      pushToast(status);
    }
  }, [pushToast, status]);

  useEffect(() => {
    if (!selectAllRef.current) {
      return;
    }
    selectAllRef.current.indeterminate = areSomeRowsSelected;
  }, [areSomeRowsSelected]);

  function toggleSelect(id: string): void {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function toggleSelectAllRows(): void {
    if (rows.length === 0) {
      return;
    }
    if (areAllRowsSelected) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(rows.map((row) => row.id));
  }

  function toggleSort(nextKey: SortKey): void {
    if (sortKey !== nextKey) {
      setSortKey(nextKey);
      setSortDirection("asc");
      return;
    }
    if (sortDirection === "asc") {
      setSortDirection("desc");
      return;
    }
    setSortKey(null);
    setSortDirection(null);
  }

  function getSortValue(row: ChestEntryRow, key: SortKey): string | number {
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
  }

  function sortRows(inputRows: readonly ChestEntryRow[]): ChestEntryRow[] {
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
  }

  function openBatchEdit(): void {
    if (selectedIds.length === 0) {
      pushToast("Select rows for batch edit.");
      return;
    }
    setIsBatchEditOpen(true);
  }

  function closeBatchEdit(): void {
    setIsBatchEditOpen(false);
  }

  function handleBatchFieldChange(nextField: keyof EditableRow): void {
    setBatchEditField(nextField);
    setBatchEditValue("");
    setBatchEditDate("");
    setBatchEditClanId("");
  }

  function clearFilters(): void {
    setSearchTerm("");
    setFilterPlayer("");
    setFilterSource("");
    setFilterChest("");
    setFilterClanId("all");
    setFilterDateFrom("");
    setFilterDateTo("");
    setFilterScoreMin("");
    setFilterScoreMax("");
    setPage(1);
  }

  function updateEditValue(id: string, field: keyof EditableRow, value: string): void {
    const existing = editMap[id] ?? {
      collected_date: "",
      player: "",
      source: "",
      chest: "",
      score: "",
      clan_id: "",
    };
    setEditMap((current) => ({
      ...current,
      [id]: { ...existing, [field]: value },
    }));
    setRowErrors((current) => {
      if (!current[id]) {
        return current;
      }
      const updated = { ...current };
      delete updated[id];
      return updated;
    });
  }

  function clearRowEdits(rowId: string): void {
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
  }

  function getNextPageAfterDelete(deleteCount: number): number {
    const nextTotal = Math.max(0, totalCount - deleteCount);
    const maxPage = Math.max(1, Math.ceil(nextTotal / pageSize));
    return Math.min(page, maxPage);
  }

  function refreshAfterDelete(deleteCount: number): void {
    const nextPage = getNextPageAfterDelete(deleteCount);
    setPage(nextPage);
    void loadRows({ pageNumber: nextPage });
  }

  function getRowValue(row: ChestEntryRow, field: keyof EditableRow): string {
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
  }

  function getBatchPreviewValue(row: ChestEntryRow, field: keyof EditableRow): string {
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
  }

  function renderSortButton(label: string, key: SortKey): JSX.Element {
    const isActive = sortKey === key && sortDirection;
    return (
      <button className="table-sort-button" type="button" onClick={() => toggleSort(key)}>
        <span>{label}</span>
        {isActive ? (
          <svg
            aria-hidden="true"
            className={`table-sort-indicator ${sortDirection === "desc" ? "is-desc" : ""}`.trim()}
            width="10"
            height="10"
            viewBox="0 0 12 12"
            fill="none"
          >
            <path d="M3 7L6 4L9 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        ) : null}
      </button>
    );
  }

  function validateRow(row: ChestEntryRow, edits: EditableRow): string | null {
    const nextDate = edits.collected_date || row.collected_date;
    const nextPlayer = edits.player || row.player;
    const nextSource = edits.source || row.source;
    const nextChest = edits.chest || row.chest;
    const nextScore = Number(edits.score || row.score);
    const nextClanId = edits.clan_id || row.clan_id;
    if (!nextDate.trim() || !DATE_REGEX.test(nextDate.trim())) {
      return "Date must be in YYYY-MM-DD format.";
    }
    if (!nextPlayer.trim() || !nextSource.trim() || !nextChest.trim()) {
      return "Player, source, chest are required.";
    }
    if (!nextClanId.trim()) {
      return "Clan is required.";
    }
    if (Number.isNaN(nextScore) || nextScore < 0) {
      return "Score must be a non-negative number.";
    }
    if (!Number.isInteger(nextScore)) {
      return "Score must be an integer.";
    }
    return null;
  }

  function buildRowDiff(row: ChestEntryRow, edits: EditableRow): Record<string, { from: string | number; to: string | number }> {
    const diff: Record<string, { from: string | number; to: string | number }> = {};
    if (edits.collected_date && edits.collected_date !== row.collected_date) {
      diff.collected_date = { from: row.collected_date, to: edits.collected_date };
    }
    if (edits.player && edits.player !== row.player) {
      diff.player = { from: row.player, to: edits.player };
    }
    if (edits.source && edits.source !== row.source) {
      diff.source = { from: row.source, to: edits.source };
    }
    if (edits.chest && edits.chest !== row.chest) {
      diff.chest = { from: row.chest, to: edits.chest };
    }
    if (edits.score) {
      const nextScore = Number(edits.score);
      if (!Number.isNaN(nextScore) && nextScore !== row.score) {
        diff.score = { from: row.score, to: nextScore };
      }
    }
    if (edits.clan_id && edits.clan_id !== row.clan_id) {
      diff.clan_id = { from: row.clan_id, to: edits.clan_id };
    }
    return diff;
  }

  async function handleSaveRow(row: ChestEntryRow): Promise<void> {
    const edits = editMap[row.id];
    if (!edits) {
      setStatus("No changes to save.");
      return;
    }
    const errorMessage = validateRow(row, edits);
    if (errorMessage) {
      setRowErrors((current) => ({ ...current, [row.id]: errorMessage }));
      return;
    }
    const userId = await getCurrentUserId();
    if (!userId) {
      setStatus("You must be logged in to update rows.");
      return;
    }
    const nextScore = Number(edits.score || row.score);
    const nextDate = edits.collected_date || row.collected_date;
    const nextClanId = edits.clan_id || row.clan_id;
    const { error } = await supabase
      .from("chest_entries")
      .update({
        collected_date: nextDate,
        player: edits.player || row.player,
        source: edits.source || row.source,
        chest: edits.chest || row.chest,
        score: nextScore,
        clan_id: nextClanId,
        updated_by: userId,
      })
      .eq("id", row.id);
    if (error) {
      setStatus(`Update failed: ${error.message}`);
      return;
    }
    const diff = buildRowDiff(row, edits);
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
    setStatus("Row updated.");
    setEditMap((current) => {
      const updated = { ...current };
      delete updated[row.id];
      return updated;
    });
    await loadRows({ pageNumber: page });
  }

  async function handleDeleteRow(row: ChestEntryRow): Promise<void> {
    const confirmDelete = window.confirm(`Delete row for ${row.player} on ${row.collected_date}?`);
    if (!confirmDelete) {
      return;
    }
    const userId = await getCurrentUserId();
    if (!userId) {
      setStatus("You must be logged in to delete rows.");
      return;
    }
    const { error } = await supabase.from("chest_entries").delete().eq("id", row.id);
    if (error) {
      setStatus(`Delete failed: ${error.message}`);
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
    setStatus("Row deleted.");
    clearRowEdits(row.id);
    setSelectedIds((current) => current.filter((id) => id !== row.id));
    if (remainingRows.length > 0) {
      setRows(remainingRows);
      setTotalCount((current) => Math.max(0, current - 1));
      return;
    }
    refreshAfterDelete(1);
  }

  function handlePageInputChange(nextValue: string): void {
    const nextPage = Number(nextValue);
    if (Number.isNaN(nextPage)) {
      return;
    }
    const clampedPage = Math.min(Math.max(1, nextPage), totalPages);
    setPage(clampedPage);
  }

  function confirmBatchEdit(): void {
    if (selectedRows.length === 0) {
      setStatus("Select rows for batch edit.");
      return;
    }
    if (batchEditField === "collected_date" && !batchEditDate) {
      setStatus("Select a date value.");
      return;
    }
    if (batchEditField === "clan_id" && !batchEditClanId) {
      setStatus("Select a clan.");
      return;
    }
    if (batchEditField !== "collected_date" && batchEditField !== "clan_id" && batchEditValue === "") {
      setStatus("Enter a value.");
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
    setStatus("Batch edits applied. Review changes and save.");
  }

  async function handleBatchDelete(): Promise<void> {
    if (selectedIds.length === 0) {
      setStatus("Select rows to delete.");
      return;
    }
    setIsBatchDeleteConfirmOpen(true);
  }

  function closeBatchDeleteConfirm(): void {
    setIsBatchDeleteConfirmOpen(false);
  }

  function openBatchDeleteInput(): void {
    setIsBatchDeleteConfirmOpen(false);
    setIsBatchDeleteInputOpen(true);
    setBatchDeleteInput("");
  }

  function closeBatchDeleteInput(): void {
    setIsBatchDeleteInputOpen(false);
    setBatchDeleteInput("");
  }

  async function confirmBatchDelete(): Promise<void> {
    const confirmationPhrase = "DELETE ROWS";
    if (batchDeleteInput.trim().toUpperCase() !== confirmationPhrase) {
      setStatus("Confirmation phrase does not match.");
      return;
    }
    setIsBatchDeleteInputOpen(false);
    const userId = await getCurrentUserId();
    if (!userId) {
      setStatus("You must be logged in to delete rows.");
      return;
    }
    const selectedRows = rows.filter((row) => selectedIds.includes(row.id));
    const { error } = await supabase.from("chest_entries").delete().in("id", selectedIds);
    if (error) {
      setStatus(`Batch delete failed: ${error.message}`);
      return;
    }
    await insertAuditLogs(
      selectedRows.map((row) => ({
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
    setStatus("Rows deleted.");
    setSelectedIds([]);
    if (remainingRows.length > 0) {
      setRows(remainingRows);
      setTotalCount((current) => Math.max(0, current - selectedIds.length));
      return;
    }
    refreshAfterDelete(selectedIds.length);
  }

  async function handleSaveAllRows(): Promise<void> {
    const editIds = Object.keys(editMap);
    if (editIds.length === 0) {
      setStatus("No changes to save.");
      return;
    }
    const confirmSave = window.confirm(`Save ${editIds.length} edited row(s)?`);
    if (!confirmSave) {
      return;
    }
    let hasValidationError = false;
    const nextErrors: Record<string, string> = {};
    const userId = await getCurrentUserId();
    if (!userId) {
      setStatus("You must be logged in to update rows.");
      return;
    }
    setStatus("Saving all changes...");
    for (const rowId of editIds) {
      const row = rows.find((item) => item.id === rowId);
      if (!row) {
        continue;
      }
      const edits = editMap[rowId];
      const errorMessage = validateRow(row, edits);
      if (errorMessage) {
        nextErrors[rowId] = errorMessage;
        hasValidationError = true;
        continue;
      }
      await handleSaveRow(row);
    }
    if (hasValidationError) {
      setRowErrors((current) => ({ ...current, ...nextErrors }));
      setStatus("Some rows need fixes before saving.");
      return;
    }
    setStatus("All changes saved.");
  }

  return (
    <div className="grid">
      {isBatchOpsOpen ? (
        <section className="card batch-ops">
          <div className="card-header">
            <div>
              <div className="card-title">Search & Filters</div>
              <div className="card-subtitle">Apply filters to narrow results</div>
            </div>
          </div>
          <div className="card-section">
            <div className="batch-ops-rows">
              <div className="list inline admin-members-filters filter-bar batch-ops-row">
                <LabeledSelect
                  id="filterPlayer"
                  label="Player"
                  value={filterPlayer}
                  onValueChange={(value) => {
                    setFilterPlayer(value);
                    setPage(1);
                  }}
                  enableSearch
                  searchPlaceholder="Search player"
                  options={playerFilterOptions}
                />
                <LabeledSelect
                  id="filterSource"
                  label="Source"
                  value={filterSource}
                  onValueChange={(value) => {
                    setFilterSource(value);
                    setPage(1);
                  }}
                  enableSearch
                  searchPlaceholder="Search source"
                  options={sourceFilterOptions}
                />
                <LabeledSelect
                  id="filterChest"
                  label="Chest"
                  value={filterChest}
                  onValueChange={(value) => {
                    setFilterChest(value);
                    setPage(1);
                  }}
                  enableSearch
                  searchPlaceholder="Search chest"
                  options={chestFilterOptions}
                />
                <LabeledSelect
                  id="filterClan"
                  label="Clan"
                  value={filterClanId}
                  onValueChange={(value) => {
                    setFilterClanId(value);
                    setPage(1);
                  }}
                  enableSearch
                  searchPlaceholder="Search clan"
                  options={[
                    { value: "all", label: "All" },
                    ...availableClans.map((clan) => ({ value: clan.id, label: clan.name })),
                  ]}
                />
              </div>
              <div className="list inline admin-members-filters filter-bar batch-ops-row">
                <label htmlFor="filterDateFrom" className="text-muted">
                  Date from
                </label>
                <input
                  id="filterDateFrom"
                  type="date"
                  value={filterDateFrom}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => {
                    setFilterDateFrom(event.target.value);
                    setPage(1);
                  }}
                />
                <label htmlFor="filterDateTo" className="text-muted">
                  Date to
                </label>
                <input
                  id="filterDateTo"
                  type="date"
                  value={filterDateTo}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => {
                    setFilterDateTo(event.target.value);
                    setPage(1);
                  }}
                />
                <label htmlFor="filterScoreMin" className="text-muted">
                  Score min
                </label>
                <input
                  id="filterScoreMin"
                  value={filterScoreMin}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => {
                    setFilterScoreMin(event.target.value);
                    setPage(1);
                  }}
                  placeholder="0"
                />
                <label htmlFor="filterScoreMax" className="text-muted">
                  Score max
                </label>
                <input
                  id="filterScoreMax"
                  value={filterScoreMax}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => {
                    setFilterScoreMax(event.target.value);
                    setPage(1);
                  }}
                  placeholder="100"
                />
              </div>
              <div className="list inline admin-members-filters filter-bar batch-ops-row">
                <SearchInput
                  id="searchTerm"
                  label="Search"
                  value={searchTerm}
                  onChange={(value) => {
                    setSearchTerm(value);
                    setPage(1);
                  }}
                  placeholder="Search player, source, or chest"
                  inputClassName="batch-search-input"
                />
              </div>
            </div>
          </div>
        </section>
      ) : null}
      <div className="table-toolbar">
        <button className="button" type="button" onClick={() => setIsBatchOpsOpen((current) => !current)}>
          {isBatchOpsOpen ? "Hide Search & Filters" : "Search & Filters"}
        </button>
        <IconButton ariaLabel="Clear filters" onClick={clearFilters}>
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 4L12 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M12 4L4 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </IconButton>
        <div className="list inline action-icons">
          <button className="button" type="button" onClick={openBatchEdit}>
            Batch Edit
          </button>
          <IconButton
            ariaLabel="Save all"
            onClick={handleSaveAllRows}
            disabled={Object.keys(editMap).length === 0}
          >
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M4 8.5L7 11.5L12 5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </IconButton>
          <IconButton ariaLabel="Batch delete" onClick={handleBatchDelete} variant="danger">
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3.5 5.5H12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              <path d="M6 5.5V4C6 3.4 6.4 3 7 3H9C9.6 3 10 3.4 10 4V5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              <path d="M5.2 5.5L5.6 12C5.6 12.6 6.1 13 6.7 13H9.3C9.9 13 10.4 12.6 10.4 12L10.8 5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </IconButton>
        </div>
      </div>
      <div className="table-scroll">
        <section className="table data-table">
        <header>
          <span>
            <input
              type="checkbox"
              ref={selectAllRef}
              checked={areAllRowsSelected}
              onChange={toggleSelectAllRows}
              aria-label="Select all rows on this page"
            />
          </span>
          <span>{renderSortButton("Date", "collected_date")}</span>
          <span>{renderSortButton("Player", "player")}</span>
          <span>{renderSortButton("Source", "source")}</span>
          <span>{renderSortButton("Chest", "chest")}</span>
          <span>{renderSortButton("Score", "score")}</span>
          <span>{renderSortButton("Clan", "clan")}</span>
          <span>Actions</span>
        </header>
        {rows.length === 0 ? (
          <div className="row">
            <span>No rows found</span>
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
        ) : (
          sortRows(rows).map((row) => {
            const validation = rowValidationResults[row.id];
            const rowStatus = validation?.rowStatus ?? "neutral";
            const fieldStatus = validation?.fieldStatus ?? { player: "neutral", source: "neutral", chest: "neutral", clan: "neutral" };
            return (
            <div
              className={`row ${rowStatus === "valid" ? "validation-valid" : ""} ${rowStatus === "invalid" ? "validation-invalid" : ""}`.trim()}
              key={row.id}
            >
              <span>
                <input
                  type="checkbox"
                  checked={selectedSet.has(row.id)}
                  onChange={() => toggleSelect(row.id)}
                />
              </span>
              <span>
                <DatePicker
                  value={getRowValue(row, "collected_date")}
                  onChange={(value) => updateEditValue(row.id, "collected_date", value)}
                />
              </span>
              <input
                value={getRowValue(row, "player")}
                className={fieldStatus.player === "invalid" ? "validation-cell-invalid" : ""}
                onChange={(event) => updateEditValue(row.id, "player", event.target.value)}
              />
              <input
                value={getRowValue(row, "source")}
                className={fieldStatus.source === "invalid" ? "validation-cell-invalid" : ""}
                onChange={(event) => updateEditValue(row.id, "source", event.target.value)}
              />
              <input
                value={getRowValue(row, "chest")}
                className={fieldStatus.chest === "invalid" ? "validation-cell-invalid" : ""}
                onChange={(event) => updateEditValue(row.id, "chest", event.target.value)}
              />
              <input
                value={getRowValue(row, "score")}
                onChange={(event) => updateEditValue(row.id, "score", event.target.value)}
              />
              <RadixSelect
                ariaLabel="Clan"
                value={getRowValue(row, "clan_id")}
                onValueChange={(value) => updateEditValue(row.id, "clan_id", value)}
                triggerClassName={fieldStatus.clan === "invalid" ? "select-trigger validation-cell-invalid" : undefined}
                options={availableClans.map((clan) => ({ value: clan.id, label: clan.name }))}
              />
              <div className="list inline action-icons">
                {(() => {
                  const hasRowEdits = Boolean(editMap[row.id]);
                  return (
                    <>
                      <IconButton ariaLabel="Save changes" onClick={() => handleSaveRow(row)} disabled={!hasRowEdits}>
                        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path
                            d="M4 8.5L7 11.5L12 5"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </IconButton>
                      <IconButton ariaLabel="Cancel changes" onClick={() => clearRowEdits(row.id)} disabled={!hasRowEdits}>
                        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M4.5 4.5L11.5 11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          <path d="M11.5 4.5L4.5 11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      </IconButton>
                      <IconButton ariaLabel="Delete row" onClick={() => handleDeleteRow(row)} variant="danger">
                        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M3.5 5.5H12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                          <path d="M6 5.5V4C6 3.4 6.4 3 7 3H9C9.6 3 10 3.4 10 4V5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                          <path d="M5.2 5.5L5.6 12C5.6 12.6 6.1 13 6.7 13H9.3C9.9 13 10.4 12.6 10.4 12L10.8 5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                        </svg>
                      </IconButton>
                    </>
                  );
                })()}
                {rowErrors[row.id] ? <span className="text-muted">{rowErrors[row.id]}</span> : null}
              </div>
            </div>
            );
          })
        )}
        </section>
      </div>
      <section className="card" style={{ gridColumn: "span 12" }}>
        <div className="pagination-bar">
          <div className="pagination-page-size">
            <label htmlFor="pageSize" className="text-muted">
              Page size
            </label>
            <RadixSelect
              id="pageSize"
              ariaLabel="Page size"
              value={String(pageSize)}
              onValueChange={(value) => {
                setPageSize(Number(value));
                setPage(1);
              }}
              options={[
                { value: "25", label: "25" },
                { value: "50", label: "50" },
                { value: "100", label: "100" },
              ]}
            />
          </div>
          <span className="text-muted">
            Showing {totalCount === 0 ? 0 : (page - 1) * pageSize + 1}–
            {Math.min(page * pageSize, totalCount)} of {totalCount}
          </span>
          <div className="pagination-actions">
            <div className="pagination-page-indicator">
              <label htmlFor="pageJump" className="text-muted">
                Page
              </label>
              <input
                id="pageJump"
                className="pagination-page-input"
                type="number"
                min={1}
                max={totalPages}
                value={page}
                onChange={(event) => handlePageInputChange(event.target.value)}
              />
              <span className="text-muted">/ {totalPages}</span>
            </div>
            <IconButton
              ariaLabel="Previous page"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1}
            >
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M10 3L6 8L10 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </IconButton>
            <IconButton
              ariaLabel="Next page"
              onClick={() => setPage((current) => current + 1)}
              disabled={page >= totalPages}
            >
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 3L10 8L6 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </IconButton>
          </div>
        </div>
      </section>
      {isBatchEditOpen ? (
        <div className="modal-backdrop">
          <div className="modal card wide">
            <div className="card-header">
              <div>
                <div className="card-title">Batch edit selected rows</div>
                <div className="card-subtitle">Review changes before applying them to the table.</div>
              </div>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="batchEditField">Column</label>
                <RadixSelect
                  id="batchEditField"
                  ariaLabel="Batch edit column"
                  value={batchEditField}
                  onValueChange={(value) => handleBatchFieldChange(value as keyof EditableRow)}
                  options={[
                    { value: "collected_date", label: "Date" },
                    { value: "player", label: "Player" },
                    { value: "source", label: "Source" },
                    { value: "chest", label: "Chest" },
                    { value: "score", label: "Score" },
                    { value: "clan_id", label: "Clan" },
                  ]}
                />
              </div>
              <div className="form-group">
                <label htmlFor="batchEditValue">New value</label>
                {batchEditField === "collected_date" ? (
                  <DatePicker value={batchEditDate} onChange={setBatchEditDate} />
                ) : batchEditField === "clan_id" ? (
                  <RadixSelect
                    id="batchEditClan"
                    ariaLabel="Batch edit clan"
                    value={batchEditClanId}
                    onValueChange={setBatchEditClanId}
                    enableSearch
                    searchPlaceholder="Search clan"
                    options={availableClans.map((clan) => ({ value: clan.id, label: clan.name }))}
                  />
                ) : (
                  <input
                    id="batchEditValue"
                    type={batchEditField === "score" ? "number" : "text"}
                    value={batchEditValue}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => setBatchEditValue(event.target.value)}
                    placeholder={batchEditField === "score" ? "0" : "New value"}
                  />
                )}
              </div>
            </div>
            <div className="modal-table-scroll">
              <section className="table batch-preview">
                <header>
                  <span>{renderSortButton("Date", "collected_date")}</span>
                  <span>{renderSortButton("Player", "player")}</span>
                  <span>{renderSortButton("Source", "source")}</span>
                  <span>{renderSortButton("Chest", "chest")}</span>
                  <span>{renderSortButton("Score", "score")}</span>
                  <span>{renderSortButton("Clan", "clan")}</span>
                </header>
                {selectedRows.length === 0 ? (
                  <div className="row">
                    <span>No rows selected</span>
                    <span />
                    <span />
                    <span />
                    <span />
                    <span />
                  </div>
                ) : (
                  sortRows(selectedRows).map((row) => {
                    const previewClanId = getBatchPreviewValue(row, "clan_id");
                    const previewClanName = clanNameById[previewClanId] ?? row.clan_name;
                    const validation = validationEvaluator({
                      player: getBatchPreviewValue(row, "player"),
                      source: getBatchPreviewValue(row, "source"),
                      chest: getBatchPreviewValue(row, "chest"),
                      clan: previewClanName,
                      clanId: previewClanId,
                    });
                    const rowStatus = validation?.rowStatus ?? "neutral";
                    const fieldStatus = validation?.fieldStatus ?? {
                      player: "neutral",
                      source: "neutral",
                      chest: "neutral",
                      clan: "neutral",
                    };
                    return (
                      <div
                        className={`row ${rowStatus === "valid" ? "validation-valid" : ""} ${rowStatus === "invalid" ? "validation-invalid" : ""}`.trim()}
                        key={row.id}
                      >
                        <span>{getBatchPreviewValue(row, "collected_date")}</span>
                        <span className={fieldStatus.player === "invalid" ? "validation-cell-invalid" : ""}>
                          {getBatchPreviewValue(row, "player")}
                        </span>
                        <span className={fieldStatus.source === "invalid" ? "validation-cell-invalid" : ""}>
                          {getBatchPreviewValue(row, "source")}
                        </span>
                        <span className={fieldStatus.chest === "invalid" ? "validation-cell-invalid" : ""}>
                          {getBatchPreviewValue(row, "chest")}
                        </span>
                        <span>{getBatchPreviewValue(row, "score")}</span>
                        <span className={fieldStatus.clan === "invalid" ? "validation-cell-invalid" : ""}>
                          {previewClanName}
                        </span>
                      </div>
                    );
                  })
                )}
              </section>
            </div>
            <div className="list inline">
              <button className="button primary" type="button" onClick={confirmBatchEdit}>
                Apply changes
              </button>
              <button className="button" type="button" onClick={closeBatchEdit}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {isBatchDeleteConfirmOpen ? (
        <div className="modal-backdrop">
          <div className="modal card danger">
            <div className="card-header">
              <div>
                <div className="danger-label">Danger Zone</div>
                <div className="card-title">Delete selected rows</div>
                <div className="card-subtitle">This action cannot be undone.</div>
              </div>
            </div>
            <div className="list">
              <div className="alert danger">This will permanently delete the selected rows from the data table.</div>
            </div>
            <div className="list inline">
              <button className="button danger" type="button" onClick={openBatchDeleteInput}>
                Continue
              </button>
              <button className="button" type="button" onClick={closeBatchDeleteConfirm}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {isBatchDeleteInputOpen ? (
        <div className="modal-backdrop">
          <div className="modal card danger">
            <div className="card-header">
              <div>
                <div className="danger-label">Danger Zone</div>
                <div className="card-title">Confirm deletion</div>
                <div className="card-subtitle">This action cannot be undone.</div>
              </div>
            </div>
            <div className="alert danger">
              Deleting these rows will remove them permanently. Make sure you intend to proceed.
            </div>
            <div className="form-group">
              <label htmlFor="batchDeleteInput">Confirmation phrase</label>
              <input
                id="batchDeleteInput"
                value={batchDeleteInput}
                onChange={(event) => setBatchDeleteInput(event.target.value)}
                placeholder="DELETE ROWS"
              />
            </div>
            <div className="list inline">
              <button className="button danger" type="button" onClick={confirmBatchDelete}>
                Delete Rows
              </button>
              <button className="button" type="button" onClick={closeBatchDeleteInput}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default DataTableClient;
