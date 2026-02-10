"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useTranslations } from "next-intl";
import createSupabaseBrowserClient from "../../lib/supabase/browser-client";
import createCorrectionApplicator from "../../lib/correction-applicator";
import DatePicker from "../components/date-picker";
import { createValidationEvaluator } from "../components/validation-evaluator";
import { useToast } from "../components/toast-provider";
import IconButton from "../components/ui/icon-button";
import LabeledSelect from "../components/ui/labeled-select";
import RadixSelect from "../components/ui/radix-select";
import ComboboxInput from "../components/ui/combobox-input";
import SearchInput from "../components/ui/search-input";
import TableScroll from "../components/table-scroll";

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

interface RowValues {
  collected_date: string;
  player: string;
  source: string;
  chest: string;
  score: number;
  clan_id: string;
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
  readonly clans: { readonly name: string } | readonly { readonly name: string }[] | null;
}

interface ValidationRuleRow {
  readonly id: string;
  readonly field: string;
  readonly match_value: string;
  readonly status: string;
}

interface CorrectionRuleRow {
  readonly id: string;
  readonly field: string;
  readonly match_value: string;
  readonly replacement_value: string;
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
  const t = useTranslations("dataTable");
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
  const [pageSize, setPageSize] = useState<number>(50);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const totalPages: number = Math.max(1, Math.ceil(totalCount / pageSize));
  const [availableClans, setAvailableClans] = useState<readonly { id: string; name: string }[]>([]);
  const [validationRules, setValidationRules] = useState<readonly ValidationRuleRow[]>([]);
  const [correctionRules, setCorrectionRules] = useState<readonly CorrectionRuleRow[]>([]);
  const [isBatchEditOpen, setIsBatchEditOpen] = useState<boolean>(false);
  const [batchEditField, setBatchEditField] = useState<keyof EditableRow>("player");
  const [batchEditValue, setBatchEditValue] = useState<string>("");
  const [batchEditDate, setBatchEditDate] = useState<string>("");
  const [batchEditClanId, setBatchEditClanId] = useState<string>("");
  const [isBatchDeleteConfirmOpen, setIsBatchDeleteConfirmOpen] = useState<boolean>(false);
  const [isBatchDeleteInputOpen, setIsBatchDeleteInputOpen] = useState<boolean>(false);
  const [batchDeleteInput, setBatchDeleteInput] = useState<string>("");
  const [filterRowStatus, setFilterRowStatus] = useState<"all" | "valid" | "invalid">("all");
  const [filterCorrectionStatus, setFilterCorrectionStatus] = useState<"all" | "corrected" | "uncorrected">("all");
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
  const validationEvaluator = useMemo(() => createValidationEvaluator(validationRules), [validationRules]);
  const correctionApplicator = useMemo(() => createCorrectionApplicator(correctionRules), [correctionRules]);
  const clanIdByName = useMemo(() => {
    return availableClans.reduce<Record<string, string>>((acc, clan) => {
      acc[clan.name.toLowerCase()] = clan.id;
      return acc;
    }, {});
  }, [availableClans]);
  const playerFilterOptions = useMemo(() => {
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
        .map((value) => ({ value, label: value })),
    ];
  }, [validationRules, t]);
  const sourceFilterOptions = useMemo(() => {
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
        .map((value) => ({ value, label: value })),
    ];
  }, [validationRules, t]);
  const chestFilterOptions = useMemo(() => {
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
        .map((value) => ({ value, label: value })),
    ];
  }, [validationRules, t]);
  const playerSuggestions = useMemo(() => {
    const values = new Set<string>();
    validationRules.forEach((rule) => {
      if (rule.field.toLowerCase() === "player" && rule.status.toLowerCase() === "valid" && rule.match_value.trim()) {
        values.add(rule.match_value.trim());
      }
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [validationRules]);
  const sourceSuggestions = useMemo(() => {
    const values = new Set<string>();
    validationRules.forEach((rule) => {
      if (rule.field.toLowerCase() === "source" && rule.status.toLowerCase() === "valid" && rule.match_value.trim()) {
        values.add(rule.match_value.trim());
      }
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [validationRules]);
  const chestSuggestions = useMemo(() => {
    const values = new Set<string>();
    validationRules.forEach((rule) => {
      if (rule.field.toLowerCase() === "chest" && rule.status.toLowerCase() === "valid" && rule.match_value.trim()) {
        values.add(rule.match_value.trim());
      }
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [validationRules]);
  const suggestionsForField = useMemo<Record<string, readonly string[]>>(
    () => ({
      player: playerSuggestions,
      source: sourceSuggestions,
      chest: chestSuggestions,
      clan: availableClans.map((clan) => clan.name),
      all: [],
    }),
    [availableClans, chestSuggestions, playerSuggestions, sourceSuggestions],
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
  }, [clanNameById, editMap, rows, validationEvaluator]);
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
  const clientFilteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (filterRowStatus !== "all") {
        const status = rowValidationResults[row.id]?.rowStatus ?? "neutral";
        if (filterRowStatus === "valid" && status !== "valid") {
          return false;
        }
        if (filterRowStatus === "invalid" && status !== "invalid") {
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

  useEffect(() => {
    if (!selectAllRef.current) {
      return;
    }
    selectAllRef.current.indeterminate = areSomeRowsSelected;
  }, [areSomeRowsSelected]);

  function toggleSelect(id: string): void {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
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
      pushToast(t("selectRowsForBatchEdit"));
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
    setFilterRowStatus("all");
    setFilterCorrectionStatus("all");
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

  function validateRow(values: RowValues): string | null {
    const nextDate = values.collected_date;
    const nextPlayer = values.player;
    const nextSource = values.source;
    const nextChest = values.chest;
    const nextScore = values.score;
    const nextClanId = values.clan_id;
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

  function buildRowValues(row: ChestEntryRow, edits: EditableRow): RowValues {
    return {
      collected_date: edits.collected_date || row.collected_date,
      player: edits.player || row.player,
      source: edits.source || row.source,
      chest: edits.chest || row.chest,
      score: Number(edits.score || row.score),
      clan_id: edits.clan_id || row.clan_id,
    };
  }

  function applyCorrectionsToValues(
    values: RowValues,
    row: ChestEntryRow,
  ): { values: RowValues; correctionCount: number } {
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
      const correctedClanId = clanIdByName[clanCorrection.value.trim().toLowerCase()];
      if (correctedClanId && correctedClanId !== nextValues.clan_id) {
        nextValues.clan_id = correctedClanId;
        correctionCount += 1;
      }
    }
    return { values: nextValues, correctionCount };
  }

  function buildRowDiff(
    row: ChestEntryRow,
    values: RowValues,
  ): Record<string, { from: string | number; to: string | number }> {
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
  }

  async function handleSaveRow(row: ChestEntryRow): Promise<void> {
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
  }

  async function handleDeleteRow(row: ChestEntryRow): Promise<void> {
    const confirmDelete = window.confirm(t("deleteRowConfirm", { player: row.player, date: row.collected_date }));
    if (!confirmDelete) {
      return;
    }
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
  }

  async function handleBatchDelete(): Promise<void> {
    if (selectedIds.length === 0) {
      setStatus(t("selectRowsToDelete"));
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
      setStatus(t("confirmationPhraseMismatch"));
      return;
    }
    setIsBatchDeleteInputOpen(false);
    const userId = await getCurrentUserId();
    if (!userId) {
      setStatus(t("mustBeLoggedInBatchDelete"));
      return;
    }
    const selectedRows = rows.filter((row) => selectedIds.includes(row.id));
    const { error } = await supabase.from("chest_entries").delete().in("id", selectedIds);
    if (error) {
      setStatus(t("batchDeleteFailed", { error: error.message }));
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
    setStatus(t("rowsDeleted"));
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
      setStatus(t("noChangesToSave"));
      return;
    }
    const confirmSave = window.confirm(t("saveEditedRows", { count: editIds.length }));
    if (!confirmSave) {
      return;
    }
    let hasValidationError = false;
    const nextErrors: Record<string, string> = {};
    const userId = await getCurrentUserId();
    if (!userId) {
      setStatus(t("mustBeLoggedIn"));
      return;
    }
    setStatus(t("savingAllChanges"));
    for (const rowId of editIds) {
      const row = rows.find((item) => item.id === rowId);
      if (!row) {
        continue;
      }
      const edits = editMap[rowId];
      const baseValues = buildRowValues(row, edits);
      const { values: correctedValues } = applyCorrectionsToValues(baseValues, row);
      const errorMessage = validateRow(correctedValues);
      if (errorMessage) {
        nextErrors[rowId] = errorMessage;
        hasValidationError = true;
        continue;
      }
      await handleSaveRow(row);
    }
    if (hasValidationError) {
      setRowErrors((current) => ({ ...current, ...nextErrors }));
      setStatus(t("someRowsNeedFixes"));
      return;
    }
    setStatus(t("allChangesSaved"));
  }

  function getRowFieldValueForRule(row: ChestEntryRow, field: "player" | "source" | "chest" | "clan"): string {
    if (field === "clan") {
      return clanNameById[row.clan_id] ?? row.clan_name ?? "";
    }
    return row[field];
  }

  function openCorrectionRuleModal(row: ChestEntryRow): void {
    const defaultField: "player" | "source" | "chest" | "clan" | "all" = "player";
    setCorrectionRuleRowId(row.id);
    setCorrectionRuleField(defaultField);
    setCorrectionRuleMatch(row.player);
    setCorrectionRuleReplacement("");
    setCorrectionRuleStatus("active");
    setCorrectionRuleMessage("");
    setIsAddCorrectionRuleOpen(true);
  }

  function updateCorrectionRuleField(nextField: "player" | "source" | "chest" | "clan" | "all"): void {
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
  }

  function closeCorrectionRuleModal(): void {
    setIsAddCorrectionRuleOpen(false);
    setCorrectionRuleRowId(null);
    setCorrectionRuleMessage("");
  }

  async function handleSaveCorrectionRuleFromRow(): Promise<void> {
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
  }

  function openValidationRuleModal(row: ChestEntryRow): void {
    const defaultField: "player" | "source" | "chest" | "clan" = "player";
    setValidationRuleRowId(row.id);
    setValidationRuleField(defaultField);
    setValidationRuleMatch(row.player);
    setValidationRuleStatus("valid");
    setValidationRuleMessage("");
    setIsAddValidationRuleOpen(true);
  }

  function updateValidationRuleField(nextField: "player" | "source" | "chest" | "clan"): void {
    setValidationRuleField(nextField);
    if (!validationRuleRowId) {
      return;
    }
    const row = rows.find((entry) => entry.id === validationRuleRowId);
    if (!row) {
      return;
    }
    setValidationRuleMatch(getRowFieldValueForRule(row, nextField));
  }

  function closeValidationRuleModal(): void {
    setIsAddValidationRuleOpen(false);
    setValidationRuleRowId(null);
    setValidationRuleMessage("");
  }

  async function handleSaveValidationRuleFromRow(): Promise<void> {
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
  }

  return (
    <div className="grid">
      {isBatchOpsOpen ? (
        <section className="card batch-ops">
          <div className="card-header">
            <div>
              <div className="card-title">{t("searchFilters")}</div>
              <div className="card-subtitle">{t("applyFilters")}</div>
            </div>
          </div>
          <div className="card-section">
            <div className="batch-ops-rows">
              <div className="list inline admin-members-filters filter-bar batch-ops-row">
                <LabeledSelect
                  id="filterPlayer"
                  label={t("player")}
                  value={filterPlayer}
                  onValueChange={(value) => {
                    setFilterPlayer(value);
                    setPage(1);
                  }}
                  enableSearch
                  searchPlaceholder={t("searchPlayer")}
                  options={playerFilterOptions}
                />
                <LabeledSelect
                  id="filterSource"
                  label={t("source")}
                  value={filterSource}
                  onValueChange={(value) => {
                    setFilterSource(value);
                    setPage(1);
                  }}
                  enableSearch
                  searchPlaceholder={t("searchSource")}
                  options={sourceFilterOptions}
                />
                <LabeledSelect
                  id="filterChest"
                  label={t("chest")}
                  value={filterChest}
                  onValueChange={(value) => {
                    setFilterChest(value);
                    setPage(1);
                  }}
                  enableSearch
                  searchPlaceholder={t("searchChest")}
                  options={chestFilterOptions}
                />
                <LabeledSelect
                  id="filterClan"
                  label={t("clan")}
                  value={filterClanId}
                  onValueChange={(value) => {
                    setFilterClanId(value);
                    setPage(1);
                  }}
                  enableSearch
                  searchPlaceholder={t("searchClan")}
                  options={[
                    { value: "all", label: t("all") },
                    ...availableClans.map((clan) => ({ value: clan.id, label: clan.name })),
                  ]}
                />
              </div>
              <div className="list inline admin-members-filters filter-bar batch-ops-row">
                <label htmlFor="filterDateFrom" className="text-muted">
                  {t("dateFrom")}
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
                  {t("dateTo")}
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
                  {t("scoreMin")}
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
                  {t("scoreMax")}
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
                  label={t("search")}
                  value={searchTerm}
                  onChange={(value) => {
                    setSearchTerm(value);
                    setPage(1);
                  }}
                  placeholder={t("searchPlayerSourceChest")}
                  inputClassName="batch-search-input"
                />
              </div>
              <div className="list inline admin-members-filters filter-bar batch-ops-row">
                <label htmlFor="filterRowStatus" className="text-muted">
                  {t("rowStatus")}
                </label>
                <RadixSelect
                  id="filterRowStatus"
                  ariaLabel={t("rowStatus")}
                  value={filterRowStatus}
                  onValueChange={(value) => {
                    setFilterRowStatus(value as "all" | "valid" | "invalid");
                    setPage(1);
                  }}
                  options={[
                    { value: "all", label: t("all") },
                    { value: "valid", label: t("validOnly") },
                    { value: "invalid", label: t("invalidOnly") },
                  ]}
                />
                <label htmlFor="filterCorrectionStatus" className="text-muted">
                  {t("correction")}
                </label>
                <RadixSelect
                  id="filterCorrectionStatus"
                  ariaLabel={t("correction")}
                  value={filterCorrectionStatus}
                  onValueChange={(value) => {
                    setFilterCorrectionStatus(value as "all" | "corrected" | "uncorrected");
                    setPage(1);
                  }}
                  options={[
                    { value: "all", label: t("all") },
                    { value: "corrected", label: t("correctedOnly") },
                    { value: "uncorrected", label: t("notCorrected") },
                  ]}
                />
              </div>
            </div>
          </div>
        </section>
      ) : null}
      <div className="table-toolbar">
        <button className="button" type="button" onClick={() => setIsBatchOpsOpen((current) => !current)}>
          {isBatchOpsOpen ? t("hideSearchFilters") : t("showSearchFilters")}
        </button>
        <IconButton ariaLabel={t("clearFilters")} onClick={clearFilters}>
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 4L12 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M12 4L4 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </IconButton>
        <div className="list inline action-icons">
          <button className="button" type="button" onClick={openBatchEdit}>
            {t("batchEdit")}
          </button>
          <IconButton ariaLabel={t("saveAll")} onClick={handleSaveAllRows} disabled={Object.keys(editMap).length === 0}>
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
          <IconButton ariaLabel={t("batchDelete")} onClick={handleBatchDelete} variant="danger">
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3.5 5.5H12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              <path
                d="M6 5.5V4C6 3.4 6.4 3 7 3H9C9.6 3 10 3.4 10 4V5.5"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
              <path
                d="M5.2 5.5L5.6 12C5.6 12.6 6.1 13 6.7 13H9.3C9.9 13 10.4 12.6 10.4 12L10.8 5.5"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
          </IconButton>
        </div>
      </div>
      <div className="pagination-bar table-pagination col-span-full">
        <div className="pagination-page-size">
          <label htmlFor="pageSize" className="text-muted">
            {t("pageSize")}
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
              { value: "250", label: "250" },
            ]}
          />
        </div>
        <span className="text-muted">
          {t("showing")} {totalCount === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalCount)}{" "}
          {t("of")} {totalCount}
          {clientFilteredRows.length < rows.length ? ` • ${clientFilteredRows.length} ${t("visibleAfterFilter")}` : ""}
          {selectedIds.length > 0 ? ` • ${selectedIds.length} ${t("selected")}` : ""}
        </span>
        <div className="pagination-actions">
          <div className="pagination-page-indicator">
            <label htmlFor="pageJump" className="text-muted">
              {t("page")}
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
            ariaLabel={t("previousPage")}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page === 1}
          >
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
          <IconButton
            ariaLabel={t("nextPage")}
            onClick={() => setPage((current) => current + 1)}
            disabled={page >= totalPages}
          >
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
      <TableScroll>
        <section className="table data-table">
          <header>
            <span>{t("tableHeaderIndex")}</span>
            <span>
              <input
                type="checkbox"
                ref={selectAllRef}
                checked={areAllRowsSelected}
                onChange={toggleSelectAllRows}
                aria-label={t("selectAllRowsOnPage")}
              />
            </span>
            <span>{renderSortButton(t("tableHeaderDate"), "collected_date")}</span>
            <span>{renderSortButton(t("tableHeaderPlayer"), "player")}</span>
            <span>{renderSortButton(t("tableHeaderSource"), "source")}</span>
            <span>{renderSortButton(t("tableHeaderChest"), "chest")}</span>
            <span>{renderSortButton(t("tableHeaderScore"), "score")}</span>
            <span>{renderSortButton(t("tableHeaderClan"), "clan")}</span>
            <span>{t("tableHeaderActions")}</span>
          </header>
          {clientFilteredRows.length === 0 ? (
            <div className="row">
              <span>{t("noRowsFound")}</span>
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
          ) : (
            sortRows(clientFilteredRows).map((row, index) => {
              const validation = rowValidationResults[row.id];
              const rowStatus = validation?.rowStatus ?? "neutral";
              const fieldStatus = validation?.fieldStatus ?? {
                player: "neutral",
                source: "neutral",
                chest: "neutral",
                clan: "neutral",
              };
              const rowNumber = (page - 1) * pageSize + index + 1;
              return (
                <div
                  className={`row ${rowStatus === "valid" ? "validation-valid" : ""} ${rowStatus === "invalid" ? "validation-invalid" : ""}`.trim()}
                  key={row.id}
                >
                  <span className="text-muted">{rowNumber}</span>
                  <span>
                    <input type="checkbox" checked={selectedSet.has(row.id)} onChange={() => toggleSelect(row.id)} />
                  </span>
                  <span>
                    <DatePicker
                      value={getRowValue(row, "collected_date")}
                      onChange={(value) => updateEditValue(row.id, "collected_date", value)}
                    />
                  </span>
                  <ComboboxInput
                    value={getRowValue(row, "player")}
                    className={fieldStatus.player === "invalid" ? "validation-cell-invalid" : ""}
                    onChange={(value) => updateEditValue(row.id, "player", value)}
                    options={playerSuggestions}
                  />
                  <ComboboxInput
                    value={getRowValue(row, "source")}
                    className={fieldStatus.source === "invalid" ? "validation-cell-invalid" : ""}
                    onChange={(value) => updateEditValue(row.id, "source", value)}
                    options={sourceSuggestions}
                  />
                  <ComboboxInput
                    value={getRowValue(row, "chest")}
                    className={fieldStatus.chest === "invalid" ? "validation-cell-invalid" : ""}
                    onChange={(value) => updateEditValue(row.id, "chest", value)}
                    options={chestSuggestions}
                  />
                  <input
                    value={getRowValue(row, "score")}
                    onChange={(event) => updateEditValue(row.id, "score", event.target.value)}
                  />
                  <RadixSelect
                    ariaLabel="Clan"
                    value={getRowValue(row, "clan_id")}
                    onValueChange={(value) => updateEditValue(row.id, "clan_id", value)}
                    triggerClassName={
                      fieldStatus.clan === "invalid" ? "select-trigger validation-cell-invalid" : undefined
                    }
                    options={availableClans.map((clan) => ({ value: clan.id, label: clan.name }))}
                  />
                  <div className="list inline action-icons">
                    {(() => {
                      const hasRowEdits = Boolean(editMap[row.id]);
                      return (
                        <>
                          <IconButton
                            ariaLabel={t("saveChanges")}
                            onClick={() => handleSaveRow(row)}
                            disabled={!hasRowEdits}
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
                          <IconButton
                            ariaLabel={t("cancelChanges")}
                            onClick={() => clearRowEdits(row.id)}
                            disabled={!hasRowEdits}
                          >
                            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
                              <path
                                d="M4.5 4.5L11.5 11.5"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                              />
                              <path
                                d="M11.5 4.5L4.5 11.5"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                              />
                            </svg>
                          </IconButton>
                          <IconButton ariaLabel={t("deleteRow")} onClick={() => handleDeleteRow(row)} variant="danger">
                            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
                              <path d="M3.5 5.5H12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                              <path
                                d="M6 5.5V4C6 3.4 6.4 3 7 3H9C9.6 3 10 3.4 10 4V5.5"
                                stroke="currentColor"
                                strokeWidth="1.4"
                                strokeLinecap="round"
                              />
                              <path
                                d="M5.2 5.5L5.6 12C5.6 12.6 6.1 13 6.7 13H9.3C9.9 13 10.4 12.6 10.4 12L10.8 5.5"
                                stroke="currentColor"
                                strokeWidth="1.4"
                                strokeLinecap="round"
                              />
                            </svg>
                          </IconButton>
                          <IconButton ariaLabel={t("addCorrectionRule")} onClick={() => openCorrectionRuleModal(row)}>
                            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
                              <path
                                d="M3.5 10.5L8 6L12.5 10.5L7.5 15H3.5V10.5Z"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path d="M7.5 15H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                          </IconButton>
                          <IconButton ariaLabel={t("addValidationRule")} onClick={() => openValidationRuleModal(row)}>
                            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
                              <path
                                d="M3.5 5.5L5 7L7.5 4.5"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path d="M8.5 5.5H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                              <path
                                d="M3.5 10.5L5 12L7.5 9.5"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path d="M8.5 10.5H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
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
      </TableScroll>
      {isBatchEditOpen ? (
        <div className="modal-backdrop">
          <div className="modal card wide">
            <div className="card-header">
              <div>
                <div className="card-title">{t("batchEditTitle")}</div>
                <div className="card-subtitle">{t("reviewChangesTable")}</div>
              </div>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="batchEditField">{t("column")}</label>
                <RadixSelect
                  id="batchEditField"
                  ariaLabel={t("column")}
                  value={batchEditField}
                  onValueChange={(value) => handleBatchFieldChange(value as keyof EditableRow)}
                  options={[
                    { value: "collected_date", label: t("tableHeaderDate") },
                    { value: "player", label: t("tableHeaderPlayer") },
                    { value: "source", label: t("tableHeaderSource") },
                    { value: "chest", label: t("tableHeaderChest") },
                    { value: "score", label: t("tableHeaderScore") },
                    { value: "clan_id", label: t("tableHeaderClan") },
                  ]}
                />
              </div>
              <div className="form-group">
                <label htmlFor="batchEditValue">{t("newValue")}</label>
                {batchEditField === "collected_date" ? (
                  <DatePicker value={batchEditDate} onChange={setBatchEditDate} />
                ) : batchEditField === "clan_id" ? (
                  <RadixSelect
                    id="batchEditClan"
                    ariaLabel="Batch edit clan"
                    value={batchEditClanId}
                    onValueChange={setBatchEditClanId}
                    enableSearch
                    searchPlaceholder={t("searchClan")}
                    options={availableClans.map((clan) => ({ value: clan.id, label: clan.name }))}
                  />
                ) : (
                  <input
                    id="batchEditValue"
                    type={batchEditField === "score" ? "number" : "text"}
                    value={batchEditValue}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => setBatchEditValue(event.target.value)}
                    placeholder={batchEditField === "score" ? "0" : t("newValue")}
                  />
                )}
              </div>
            </div>
            <div className="modal-table-scroll">
              <section className="table batch-preview">
                <header>
                  <span>{t("tableHeaderIndex")}</span>
                  <span>{renderSortButton(t("tableHeaderDate"), "collected_date")}</span>
                  <span>{renderSortButton(t("tableHeaderPlayer"), "player")}</span>
                  <span>{renderSortButton(t("tableHeaderSource"), "source")}</span>
                  <span>{renderSortButton(t("tableHeaderChest"), "chest")}</span>
                  <span>{renderSortButton(t("tableHeaderScore"), "score")}</span>
                  <span>{renderSortButton(t("tableHeaderClan"), "clan")}</span>
                </header>
                {selectedRows.length === 0 ? (
                  <div className="row">
                    <span>{t("noRowsSelected")}</span>
                    <span />
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
                    const rowIndex = rows.findIndex((entry) => entry.id === row.id);
                    const rowNumber = rowIndex >= 0 ? (page - 1) * pageSize + rowIndex + 1 : 0;
                    const validation = validationEvaluator({
                      player: getBatchPreviewValue(row, "player"),
                      source: getBatchPreviewValue(row, "source"),
                      chest: getBatchPreviewValue(row, "chest"),
                      clan: previewClanName,
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
                        <span className="text-muted">{rowNumber || "-"}</span>
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
                {t("applyChanges")}
              </button>
              <button className="button" type="button" onClick={closeBatchEdit}>
                {t("cancel")}
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
                <div className="danger-label">{t("dangerZone")}</div>
                <div className="card-title">{t("deleteSelectedRows")}</div>
                <div className="card-subtitle">{t("cannotBeUndone")}</div>
              </div>
            </div>
            <div className="list">
              <div className="alert danger">{t("permanentlyDelete")}</div>
            </div>
            <div className="list inline">
              <button className="button danger" type="button" onClick={openBatchDeleteInput}>
                {t("continue")}
              </button>
              <button className="button" type="button" onClick={closeBatchDeleteConfirm}>
                {t("cancel")}
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
                <div className="danger-label">{t("dangerZone")}</div>
                <div className="card-title">{t("confirmDeletion")}</div>
                <div className="card-subtitle">{t("cannotBeUndone")}</div>
              </div>
            </div>
            <div className="alert danger">{t("deletingRowsWarning")}</div>
            <div className="form-group">
              <label htmlFor="batchDeleteInput">{t("confirmationPhrase")}</label>
              <input
                id="batchDeleteInput"
                value={batchDeleteInput}
                onChange={(event) => setBatchDeleteInput(event.target.value)}
                placeholder="DELETE ROWS"
              />
            </div>
            <div className="list inline">
              <button className="button danger" type="button" onClick={confirmBatchDelete}>
                {t("deleteRows")}
              </button>
              <button className="button" type="button" onClick={closeBatchDeleteInput}>
                {t("cancel")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {isAddCorrectionRuleOpen ? (
        <div className="modal-backdrop">
          <div className="modal card wide">
            <div className="card-header">
              <div>
                <div className="card-title">{t("addCorrectionRuleTitle")}</div>
                <div className="card-subtitle">{t("createRuleFromRow")}</div>
              </div>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="correctionRuleField">{t("field")}</label>
                <RadixSelect
                  id="correctionRuleField"
                  ariaLabel={t("field")}
                  value={correctionRuleField}
                  onValueChange={(value) =>
                    updateCorrectionRuleField(value as "player" | "source" | "chest" | "clan" | "all")
                  }
                  options={[
                    { value: "player", label: t("player") },
                    { value: "source", label: t("source") },
                    { value: "chest", label: t("chest") },
                    { value: "clan", label: t("clan") },
                    { value: "all", label: t("all") },
                  ]}
                />
              </div>
              <div className="form-group">
                <label htmlFor="correctionRuleMatch">{t("matchValue")}</label>
                <ComboboxInput
                  id="correctionRuleMatch"
                  value={correctionRuleMatch}
                  onChange={setCorrectionRuleMatch}
                  options={suggestionsForField[correctionRuleField] ?? []}
                />
              </div>
              <div className="form-group">
                <label htmlFor="correctionRuleReplacement">{t("replacementValue")}</label>
                <ComboboxInput
                  id="correctionRuleReplacement"
                  value={correctionRuleReplacement}
                  onChange={setCorrectionRuleReplacement}
                  options={suggestionsForField[correctionRuleField] ?? []}
                />
              </div>
              <div className="form-group">
                <label htmlFor="correctionRuleStatus">{t("status")}</label>
                <RadixSelect
                  id="correctionRuleStatus"
                  ariaLabel={t("status")}
                  value={correctionRuleStatus}
                  onValueChange={(value) => setCorrectionRuleStatus(value)}
                  options={[
                    { value: "active", label: t("active") },
                    { value: "inactive", label: t("inactive") },
                  ]}
                />
              </div>
            </div>
            {correctionRuleMessage ? <div className="alert info">{correctionRuleMessage}</div> : null}
            <div className="list inline">
              <button className="button" type="button" onClick={closeCorrectionRuleModal}>
                {t("cancel")}
              </button>
              <button className="button primary" type="button" onClick={handleSaveCorrectionRuleFromRow}>
                {t("saveRule")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {isAddValidationRuleOpen ? (
        <div className="modal-backdrop">
          <div className="modal card wide">
            <div className="card-header">
              <div>
                <div className="card-title">{t("addValidationRuleTitle")}</div>
                <div className="card-subtitle">{t("createValidValue")}</div>
              </div>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="validationRuleField">{t("field")}</label>
                <RadixSelect
                  id="validationRuleField"
                  ariaLabel={t("field")}
                  value={validationRuleField}
                  onValueChange={(value) => updateValidationRuleField(value as "player" | "source" | "chest" | "clan")}
                  options={[
                    { value: "player", label: t("player") },
                    { value: "source", label: t("source") },
                    { value: "chest", label: t("chest") },
                    { value: "clan", label: t("clan") },
                  ]}
                />
              </div>
              <div className="form-group">
                <label htmlFor="validationRuleMatch">{t("value")}</label>
                <ComboboxInput
                  id="validationRuleMatch"
                  value={validationRuleMatch}
                  onChange={setValidationRuleMatch}
                  options={suggestionsForField[validationRuleField] ?? []}
                />
              </div>
              <div className="form-group">
                <label htmlFor="validationRuleStatus">{t("status")}</label>
                <RadixSelect
                  id="validationRuleStatus"
                  ariaLabel={t("status")}
                  value={validationRuleStatus}
                  onValueChange={(value) => setValidationRuleStatus(value)}
                  options={[
                    { value: "valid", label: t("valid") },
                    { value: "invalid", label: t("invalid") },
                  ]}
                />
              </div>
            </div>
            {validationRuleMessage ? <div className="alert info">{validationRuleMessage}</div> : null}
            <div className="list inline">
              <button className="button" type="button" onClick={closeValidationRuleModal}>
                {t("cancel")}
              </button>
              <button className="button primary" type="button" onClick={handleSaveValidationRuleFromRow}>
                {t("saveRule")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default DataTableClient;
