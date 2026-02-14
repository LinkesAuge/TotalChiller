"use client";

import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { RuleRow } from "../admin-types";
import { usePagination } from "@/lib/hooks/use-pagination";
import { compareValues, useSortable } from "@/lib/hooks/use-sortable";
import { normalizeString } from "@/lib/string-utils";

/* ── Config ── */

export interface RuleListConfig<SortKey extends string> {
  /** Supabase table name to query. */
  readonly tableName: string;
  /** Columns passed to `.select()`. */
  readonly selectColumns: string;
  /** Field-tab options (e.g. ["player","source","chest","clan"]). */
  readonly fieldOptions: readonly string[];
  /** Default active field tab. */
  readonly defaultField: string;
  /** Default sort column. */
  readonly defaultSortKey: SortKey;
  /** Status options shown in the filter dropdown. */
  readonly statusOptions: readonly string[];
  /** Parse a CSV/TXT file into RuleRows. Return { entries, errors }. */
  readonly parseFile: (text: string, activeField: string) => { entries: RuleRow[]; errors: string[] };
  /** Build CSV string from rules. */
  readonly buildCsv: (rules: readonly RuleRow[]) => string;
  /** Build the dedup key for import uniqueness check. */
  readonly normalizeValue: (value: string) => string;
  /** Build the dedup key for existing rules (to skip during import). */
  readonly existingValueKey: (rule: RuleRow) => string;
  /** Build the dedup key for import payload entries. */
  readonly importPayloadKey: (entry: Record<string, string | undefined>) => string;
  /** Map a RuleRow import entry to a DB insert payload object. */
  readonly toInsertPayload: (entry: RuleRow) => Record<string, string | undefined>;
}

/* ── Return type ── */

export interface RuleListState<SortKey extends string> {
  /* Core data */
  readonly rules: readonly RuleRow[];
  readonly loadRules: () => Promise<void>;

  /* Filter / search */
  readonly search: string;
  readonly setSearch: (value: string) => void;
  readonly activeField: string;
  readonly setActiveField: (field: string) => void;
  readonly statusFilter: string;
  readonly setStatusFilter: (status: string) => void;

  /* Derived lists */
  readonly filteredRules: readonly RuleRow[];
  readonly sortedRules: readonly RuleRow[];
  readonly pagedRules: readonly RuleRow[];
  readonly fieldCounts: Readonly<Record<string, { total: number; active: number }>>;

  /* Sort */
  readonly sortKey: SortKey;
  readonly sortDirection: "asc" | "desc";
  readonly toggleSort: (key: SortKey) => void;

  /* Pagination (forwarded from usePagination) */
  readonly pagination: ReturnType<typeof usePagination>;

  /* Selection */
  readonly selectedIds: readonly string[];
  readonly selectedSet: ReadonlySet<string>;
  readonly areAllSelected: boolean;
  /** Whether some (but not all) paged items are selected -- useful for indeterminate checkbox state. */
  readonly areSomeSelected: boolean;
  readonly toggleSelect: (id: string) => void;
  readonly toggleSelectAll: () => void;
  readonly clearSelection: () => void;

  /* Import state */
  readonly importOpen: boolean;
  readonly setImportOpen: (open: boolean) => void;
  readonly importEntries: readonly RuleRow[];
  readonly importErrors: readonly string[];
  readonly importFileName: string;
  readonly importMode: "append" | "replace";
  readonly setImportMode: (mode: "append" | "replace") => void;
  readonly ignoreDuplicates: boolean;
  readonly setIgnoreDuplicates: (value: boolean) => void;
  readonly importSelected: readonly number[];
  readonly importStatus: string;
  readonly replaceConfirmOpen: boolean;
  readonly setReplaceConfirmOpen: (open: boolean) => void;
  readonly handleImportFile: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  readonly handleApplyImport: () => Promise<void>;
  readonly executeImport: () => Promise<void>;
  readonly handleCloseImport: () => void;
  readonly toggleImportSelected: (index: number) => void;
  readonly removeSelectedImportEntries: () => void;
  readonly updateImportEntry: (index: number, field: string, value: string) => void;

  /* Export */
  readonly handleExport: () => void;
  readonly handleBackup: () => void;
}

/* ── Download helper ── */

function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/* ── Hook ── */

export function useRuleList<SortKey extends string>(
  supabase: SupabaseClient,
  config: RuleListConfig<SortKey>,
  onStatus: (msg: string) => void,
): RuleListState<SortKey> {
  const {
    tableName,
    selectColumns,
    fieldOptions,
    defaultField,
    defaultSortKey,
    parseFile,
    buildCsv,
    normalizeValue,
    existingValueKey,
    importPayloadKey,
    toInsertPayload,
  } = config;

  /* ── Core state ── */
  const [rules, setRules] = useState<readonly RuleRow[]>([]);
  const [search, setSearch] = useState("");
  const [activeField, setActiveField] = useState(defaultField);
  const [statusFilter, setStatusFilter] = useState("all");

  /* ── Sort ── */
  const { sortKey, sortDirection, toggleSort } = useSortable<SortKey>(defaultSortKey);

  /* ── Selection ── */
  const [selectedIds, setSelectedIds] = useState<readonly string[]>([]);

  /* ── Import state ── */
  const [importOpen, setImportOpen] = useState(false);
  const [importEntries, setImportEntries] = useState<readonly RuleRow[]>([]);
  const [importErrors, setImportErrors] = useState<readonly string[]>([]);
  const [importFileName, setImportFileName] = useState("");
  const [importMode, setImportMode] = useState<"append" | "replace">("append");
  const [ignoreDuplicates, setIgnoreDuplicates] = useState(true);
  const [importSelected, setImportSelected] = useState<readonly number[]>([]);
  const [importStatus, setImportStatus] = useState("");
  const [replaceConfirmOpen, setReplaceConfirmOpen] = useState(false);

  /* ── Load rules from DB ── */
  const loadRules = useCallback(async () => {
    const { data } = await supabase.from(tableName).select(selectColumns).order("field");
    setRules((data as RuleRow[] | null) ?? []);
    setSelectedIds([]);
  }, [supabase, tableName, selectColumns]);

  // Load on mount
  useEffect(() => {
    void loadRules();
  }, [loadRules]);

  /* ── Filtering ── */
  const filteredRules = useMemo(() => {
    const normalizedSearch = normalizeString(search);
    return rules.filter((rule) => {
      if (activeField && activeField !== "all" && rule.field !== activeField) return false;
      if (statusFilter !== "all") {
        const ruleStatus = (rule.status ?? "active").toLowerCase();
        if (ruleStatus !== statusFilter) return false;
      }
      if (!normalizedSearch) return true;
      const text = [rule.field, rule.match_value, rule.replacement_value, rule.status]
        .filter((v): v is string => Boolean(v))
        .join(" ")
        .toLowerCase();
      return text.includes(normalizedSearch);
    });
  }, [rules, activeField, statusFilter, search]);

  /* ── Field counts ── */
  const allFieldOptions = useMemo(() => (fieldOptions.includes("all") ? fieldOptions : fieldOptions), [fieldOptions]);
  const fieldCounts = useMemo(() => {
    const counts: Record<string, { total: number; active: number }> = {};
    for (const f of allFieldOptions) {
      counts[f] = { total: 0, active: 0 };
    }
    for (const rule of rules) {
      const f = rule.field ?? "";
      const target = counts[f];
      if (!target) continue;
      target.total += 1;
      const s = (rule.status ?? "active").toLowerCase();
      if (s === "valid" || s === "active") target.active += 1;
    }
    return counts;
  }, [rules, allFieldOptions]);

  /* ── Sorting ── */
  const sortedRules = useMemo(() => {
    const sorted = [...filteredRules];
    sorted.sort((a, b) => {
      const left = a[sortKey as keyof RuleRow];
      const right = b[sortKey as keyof RuleRow];
      return compareValues(
        left as string | number | null | undefined,
        right as string | number | null | undefined,
        sortDirection,
      );
    });
    return sorted;
  }, [filteredRules, sortKey, sortDirection]);

  /* ── Pagination ── */
  const pagination = usePagination(filteredRules.length);
  const pagedRules = useMemo(
    () => sortedRules.slice(pagination.startIndex, pagination.endIndex),
    [sortedRules, pagination.startIndex, pagination.endIndex],
  );

  /* ── Selection derived ── */
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const areAllSelected = useMemo(
    () => pagedRules.length > 0 && pagedRules.every((r) => selectedSet.has(r.id)),
    [pagedRules, selectedSet],
  );
  const areSomeSelected = useMemo(
    () => pagedRules.some((r) => selectedSet.has(r.id)) && !areAllSelected,
    [pagedRules, selectedSet, areAllSelected],
  );

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (pagedRules.length === 0) return;
    if (areAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pagedRules.map((r) => r.id));
    }
  }, [pagedRules, areAllSelected]);

  const clearSelection = useCallback(() => setSelectedIds([]), []);

  /* ── Import functions ── */
  const handleImportFile = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const text = await file.text();
      const { entries, errors } = parseFile(text, activeField);
      setImportFileName(file.name);
      setImportEntries(entries);
      setImportErrors(errors);
      setImportSelected([]);
      setImportStatus("");
      event.target.value = "";
    },
    [parseFile, activeField],
  );

  const executeImport = useCallback(async () => {
    if (importMode === "replace") {
      const { error: delErr } = await supabase.from(tableName).delete().eq("field", activeField);
      if (delErr) {
        setImportStatus(`Failed to clear list: ${delErr.message}`);
        return;
      }
    }
    const existingValues = new Set(
      rules.filter((r) => r.field === activeField).map((r) => normalizeValue(existingValueKey(r))),
    );
    const payload = importEntries
      .filter((entry) => {
        if (!ignoreDuplicates) return true;
        return !existingValues.has(normalizeValue(existingValueKey(entry)));
      })
      .map(toInsertPayload);
    const unique = Array.from(new Map(payload.map((e) => [importPayloadKey(e), e])).values());
    const { error: insertErr } = await supabase.from(tableName).insert(unique);
    if (insertErr) {
      setImportStatus(`Failed to import list: ${insertErr.message}`);
      return;
    }
    onStatus(`Imported ${unique.length} entries.`);
    setImportOpen(false);
    setImportEntries([]);
    setImportSelected([]);
    setImportFileName("");
    setImportErrors([]);
    await loadRules();
  }, [
    importMode,
    supabase,
    tableName,
    activeField,
    rules,
    normalizeValue,
    existingValueKey,
    importEntries,
    ignoreDuplicates,
    toInsertPayload,
    importPayloadKey,
    loadRules,
    onStatus,
  ]);

  const handleApplyImport = useCallback(async () => {
    if (importErrors.length > 0) {
      setImportStatus(importErrors.slice(0, 3).join(" "));
      return;
    }
    if (importEntries.length === 0) {
      setImportStatus("No valid entries found in file.");
      return;
    }
    if (importMode === "replace") {
      setReplaceConfirmOpen(true);
      return;
    }
    await executeImport();
  }, [importErrors, importEntries, importMode, executeImport]);

  const handleCloseImport = useCallback(() => {
    setImportOpen(false);
    setImportEntries([]);
    setImportSelected([]);
    setImportFileName("");
    setImportErrors([]);
    setImportStatus("");
  }, []);

  const toggleImportSelected = useCallback((index: number) => {
    setImportSelected((cur) => (cur.includes(index) ? cur.filter((i) => i !== index) : [...cur, index]));
  }, []);

  const removeSelectedImportEntries = useCallback(() => {
    if (importSelected.length === 0) return;
    const sel = new Set(importSelected);
    setImportEntries((cur) => cur.filter((_, i) => !sel.has(i)));
    setImportSelected([]);
  }, [importSelected]);

  const updateImportEntry = useCallback((index: number, field: string, value: string) => {
    setImportEntries((cur) => cur.map((entry, i) => (i === index ? { ...entry, [field]: value } : entry)));
  }, []);

  /* ── Export / Backup ── */
  const handleExport = useCallback(() => {
    const listRules = rules.filter((r) => r.field === activeField);
    const csv = buildCsv(listRules);
    downloadCsv(`${tableName}-${activeField}.csv`, csv);
  }, [rules, activeField, buildCsv, tableName]);

  const handleBackup = useCallback(() => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const listRules = rules.filter((r) => r.field === activeField);
    const csv = buildCsv(listRules);
    downloadCsv(`${tableName}-backup-${activeField}-${timestamp}.csv`, csv);
  }, [rules, activeField, buildCsv, tableName]);

  return {
    rules,
    loadRules,
    search,
    setSearch,
    activeField,
    setActiveField,
    statusFilter,
    setStatusFilter,
    filteredRules,
    sortedRules,
    pagedRules,
    fieldCounts,
    sortKey,
    sortDirection,
    toggleSort,
    pagination,
    selectedIds,
    selectedSet,
    areAllSelected,
    areSomeSelected,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
    importOpen,
    setImportOpen,
    importEntries,
    importErrors,
    importFileName,
    importMode,
    setImportMode,
    ignoreDuplicates,
    setIgnoreDuplicates,
    importSelected,
    importStatus,
    replaceConfirmOpen,
    setReplaceConfirmOpen,
    handleImportFile,
    handleApplyImport,
    executeImport,
    handleCloseImport,
    toggleImportSelected,
    removeSelectedImportEntries,
    updateImportEntry,
    handleExport,
    handleBackup,
  };
}
