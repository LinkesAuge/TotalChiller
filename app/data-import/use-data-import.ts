"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { useSupabase } from "../hooks/use-supabase";
import type { ValidationRuleRow, CorrectionRuleRow } from "@/lib/types/domain";
import { DATE_REGEX } from "@/lib/constants";
import { useRuleProcessing } from "@/lib/hooks/use-rule-processing";
import type {
  CsvRow,
  ParseError,
  ParseResult,
  CommitRow,
  CorrectionMap,
  CorrectionField,
  IndexedRow,
  RowEdits,
} from "./data-import-types";
import { REQUIRED_HEADERS, COMMIT_STATUS_TIMEOUT_MS } from "./data-import-types";
import type { ImportSortKey } from "./data-import-types";

const rowSchema = z.object({
  date: z.string().regex(DATE_REGEX, "Invalid date format"),
  player: z.string().min(1, "Player is required"),
  source: z.string().min(1, "Source is required"),
  chest: z.string().min(1, "Chest is required"),
  score: z.number().int().nonnegative(),
  clan: z.string().min(1, "Clan is required"),
});

function normalizeHeader(value: string): string {
  return value.trim().toUpperCase();
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      const nextChar = line[index + 1];
      if (inQuotes && nextChar === '"') {
        current += '"';
        index += 1;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }
    if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  values.push(current.trim());
  return values;
}

function getNonEmptyLines(csvText: string): string[] {
  return csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function parseScoreValue(rawValue: string): number | null {
  const parsedScore = Number(rawValue);
  if (Number.isNaN(parsedScore)) {
    return null;
  }
  return parsedScore;
}

function parseCsvText(csvText: string): ParseResult {
  const lines = getNonEmptyLines(csvText);
  if (lines.length === 0) {
    return { rows: [], errors: [], headerErrors: ["CSV file is empty."] };
  }
  const headerValues = parseCsvLine(lines[0] ?? "").map(normalizeHeader);
  const headerErrors: string[] = [];
  REQUIRED_HEADERS.forEach((header, index) => {
    if ((headerValues[index] ?? "") !== header) {
      headerErrors.push(`Expected ${header} at position ${index + 1}.`);
    }
  });
  const rows: CsvRow[] = [];
  const errors: ParseError[] = [];
  for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
    const values = parseCsvLine(lines[lineIndex] ?? "");
    if (values.length < REQUIRED_HEADERS.length) {
      errors.push({
        line: lineIndex + 1,
        message: "Missing required columns.",
      });
      continue;
    }
    const scoreValue = parseScoreValue(values[4] ?? "");
    if (scoreValue === null) {
      errors.push({
        line: lineIndex + 1,
        message: "Score must be a number.",
      });
      continue;
    }
    const rowCandidate: CsvRow = {
      date: values[0] ?? "",
      player: values[1] ?? "",
      source: values[2] ?? "",
      chest: values[3] ?? "",
      score: scoreValue,
      clan: values[5] ?? "",
    };
    const validation = rowSchema.safeParse(rowCandidate);
    if (!validation.success) {
      const issues = validation.error.issues.map((issue) => issue.message).join(", ");
      errors.push({
        line: lineIndex + 1,
        message: issues,
      });
      continue;
    }
    rows.push(rowCandidate);
  }
  return { rows, errors, headerErrors };
}

function getRowValidationErrors(nextRows: readonly CsvRow[]): ParseError[] {
  const errors: ParseError[] = [];
  nextRows.forEach((row, index) => {
    const validation = rowSchema.safeParse(row);
    if (!validation.success) {
      const issues = validation.error.issues.map((issue) => issue.message).join(", ");
      errors.push({
        line: index + 1,
        message: issues,
      });
    }
  });
  return errors;
}

function compareImportValues(left: string | number, right: string | number, direction: "asc" | "desc"): number {
  if (left === right) {
    return 0;
  }
  if (typeof left === "number" && typeof right === "number") {
    return direction === "asc" ? left - right : right - left;
  }
  const leftText = String(left);
  const rightText = String(right);
  return direction === "asc" ? leftText.localeCompare(rightText) : rightText.localeCompare(leftText);
}

function getImportSortValue(item: IndexedRow, key: ImportSortKey): string | number {
  if (key === "index") {
    return item.index;
  }
  if (key === "score") {
    return item.row.score;
  }
  return item.row[key];
}

export interface UseDataImportReturn {
  readonly fileInputRef: React.RefObject<HTMLInputElement | null>;
  readonly originalRows: readonly CsvRow[];
  readonly rows: readonly CsvRow[];
  readonly errors: readonly ParseError[];
  readonly headerErrors: readonly string[];
  readonly fileName: string;
  readonly statusMessage: string;
  readonly commitStatus: string;
  readonly isCommitting: boolean;
  readonly manualEdits: Record<number, RowEdits>;
  readonly selectedRows: readonly number[];
  readonly page: number;
  readonly pageSize: number;
  readonly totalPages: number;
  readonly pageStartIndex: number;
  readonly isBatchOpsOpen: boolean;
  readonly filterPlayer: string;
  readonly filterSource: string;
  readonly filterChest: string;
  readonly filterClan: string;
  readonly filterDateFrom: string;
  readonly filterDateTo: string;
  readonly filterScoreMin: string;
  readonly filterScoreMax: string;
  readonly filterRowStatus: "all" | "valid" | "invalid";
  readonly filterCorrectionStatus: "all" | "corrected" | "uncorrected";
  readonly importSortKey: ImportSortKey;
  readonly importSortDirection: "asc" | "desc";
  readonly isAutoCorrectEnabled: boolean;
  readonly isValidationEnabled: boolean;
  readonly correctionResults: { rows: CsvRow[]; correctionsByRow: CorrectionMap };
  readonly correctionStats: { correctedFields: number; correctedRows: number };
  readonly rowValidationResults: readonly ReturnType<ReturnType<typeof useRuleProcessing>["validationEvaluator"]>[];
  readonly validationStats: { validatedRows: number; validatedFields: number; totalFields: number };
  readonly validatedRowsLabel: string | number;
  readonly correctedRowsLabel: string | number;
  readonly filteredCount: number;
  readonly overallCount: number;
  readonly pagedRows: readonly IndexedRow[];
  readonly availableClans: readonly string[];
  readonly playerSuggestions: readonly string[];
  readonly sourceSuggestions: readonly string[];
  readonly chestSuggestions: readonly string[];
  readonly suggestionsForField: Record<string, readonly string[]>;
  readonly areAllRowsSelected: boolean;
  readonly areSomeRowsSelected: boolean;
  readonly selectedRowSet: Set<number>;
  readonly selectAllRef: React.RefObject<HTMLInputElement | null>;
  readonly isAddCorrectionRuleOpen: boolean;
  readonly isAddValidationRuleOpen: boolean;
  readonly correctionRuleRowIndex: number | null;
  readonly correctionRuleField: "player" | "source" | "chest" | "clan" | "all";
  readonly correctionRuleMatch: string;
  readonly correctionRuleReplacement: string;
  readonly correctionRuleStatus: string;
  readonly correctionRuleMessage: string;
  readonly validationRuleRowIndex: number | null;
  readonly validationRuleField: "player" | "source" | "chest" | "clan";
  readonly validationRuleMatch: string;
  readonly validationRuleStatus: string;
  readonly validationRuleMessage: string;
  readonly isBatchEditOpen: boolean;
  readonly batchEditField: keyof CsvRow;
  readonly batchEditValue: string;
  readonly batchEditDate: string;
  readonly batchEditClan: string;
  readonly isCommitWarningOpen: boolean;
  readonly commitWarningInvalidRows: readonly number[];
  readonly invalidRowCount: number;
  readonly commitAllCount: number;
  readonly commitSkipCount: number;
  readonly handleFileChange: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  readonly updateRowValue: (index: number, field: keyof CsvRow, value: string) => void;
  readonly toggleSelectRow: (index: number) => void;
  readonly toggleSelectAllRows: () => void;
  readonly handlePageInputChange: (nextValue: string) => void;
  readonly setPage: (value: number | ((prev: number) => number)) => void;
  readonly setPageSize: (value: number) => void;
  readonly resetImportFilters: () => void;
  readonly toggleImportSort: (nextKey: ImportSortKey) => void;
  readonly setIsBatchOpsOpen: (value: boolean | ((prev: boolean) => boolean)) => void;
  readonly setIsAutoCorrectEnabled: (value: boolean) => void;
  readonly setIsValidationEnabled: (value: boolean) => void;
  readonly setFilterPlayer: (value: string) => void;
  readonly setFilterSource: (value: string) => void;
  readonly setFilterChest: (value: string) => void;
  readonly setFilterClan: (value: string) => void;
  readonly setFilterDateFrom: (value: string) => void;
  readonly setFilterDateTo: (value: string) => void;
  readonly setFilterScoreMin: (value: string) => void;
  readonly setFilterScoreMax: (value: string) => void;
  readonly setFilterRowStatus: (value: "all" | "valid" | "invalid") => void;
  readonly setFilterCorrectionStatus: (value: "all" | "corrected" | "uncorrected") => void;
  readonly setImportSortKey: (value: ImportSortKey) => void;
  readonly setImportSortDirection: (value: "asc" | "desc") => void;
  readonly openCorrectionRuleModal: (index: number) => void;
  readonly updateCorrectionRuleField: (nextField: "player" | "source" | "chest" | "clan" | "all") => void;
  readonly openValidationRuleModal: (index: number) => void;
  readonly updateValidationRuleField: (nextField: "player" | "source" | "chest" | "clan") => void;
  readonly closeValidationRuleModal: () => void;
  readonly handleSaveValidationRuleFromRow: () => Promise<void>;
  readonly closeCorrectionRuleModal: () => void;
  readonly handleSaveCorrectionRuleFromRow: () => Promise<void>;
  readonly setCorrectionRuleMatch: (value: string) => void;
  readonly setCorrectionRuleReplacement: (value: string) => void;
  readonly setCorrectionRuleStatus: (value: string) => void;
  readonly setValidationRuleMatch: (value: string) => void;
  readonly setValidationRuleStatus: (value: string) => void;
  readonly getBatchPreviewValue: (row: CsvRow, field: keyof CsvRow) => string;
  readonly openBatchEdit: () => void;
  readonly closeBatchEdit: () => void;
  readonly confirmBatchEdit: () => void;
  readonly setBatchEditField: (value: keyof CsvRow) => void;
  readonly setBatchEditValue: (value: string) => void;
  readonly setBatchEditDate: (value: string) => void;
  readonly setBatchEditClan: (value: string) => void;
  readonly handleRemoveSelectedRows: () => void;
  readonly canCommit: () => boolean;
  readonly handleCommit: () => Promise<void>;
  readonly handleCommitSkipInvalid: () => Promise<void>;
  readonly handleCommitForce: () => Promise<void>;
  readonly setIsCommitWarningOpen: (value: boolean) => void;
  readonly applyCorrectionsToRows: (inputRows: readonly CsvRow[]) => {
    rows: CsvRow[];
    correctionsByRow: CorrectionMap;
  };
  readonly validationEvaluator: ReturnType<typeof useRuleProcessing>["validationEvaluator"];
}

/**
 * Custom hook for data import: CSV parsing, row corrections, validation, filtering,
 * sorting, pagination, batch operations, and commit logic.
 *
 * @returns State and handlers for the data import UI.
 */
export function useDataImport(): UseDataImportReturn {
  const t = useTranslations("dataImport");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const commitStatusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [originalRows, setOriginalRows] = useState<readonly CsvRow[]>([]);
  const [rows, setRows] = useState<readonly CsvRow[]>([]);
  const [errors, setErrors] = useState<readonly ParseError[]>([]);
  const [headerErrors, setHeaderErrors] = useState<readonly string[]>([]);
  const [validationRules, setValidationRules] = useState<readonly ValidationRuleRow[]>([]);
  const [correctionRules, setCorrectionRules] = useState<readonly CorrectionRuleRow[]>([]);
  const [_validationMessages, setValidationMessages] = useState<readonly string[]>([]);
  const [_validationErrors, setValidationErrors] = useState<readonly string[]>([]);
  const [availableClans, setAvailableClans] = useState<readonly string[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [commitStatus, setCommitStatus] = useState<string>("");
  const [isCommitting, setIsCommitting] = useState<boolean>(false);
  const [_clanIdByName, setClanIdByName] = useState<Map<string, string>>(new Map());
  const [manualEdits, setManualEdits] = useState<Record<number, RowEdits>>({});
  const [selectedRows, setSelectedRows] = useState<readonly number[]>([]);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);
  const [isBatchOpsOpen, setIsBatchOpsOpen] = useState<boolean>(false);
  const [filterPlayer, setFilterPlayer] = useState<string>("");
  const [filterSource, setFilterSource] = useState<string>("");
  const [filterChest, setFilterChest] = useState<string>("");
  const [filterClan, setFilterClan] = useState<string>("");
  const [filterDateFrom, setFilterDateFrom] = useState<string>("");
  const [filterDateTo, setFilterDateTo] = useState<string>("");
  const [filterScoreMin, setFilterScoreMin] = useState<string>("");
  const [filterScoreMax, setFilterScoreMax] = useState<string>("");
  const [filterRowStatus, setFilterRowStatus] = useState<"all" | "valid" | "invalid">("all");
  const [filterCorrectionStatus, setFilterCorrectionStatus] = useState<"all" | "corrected" | "uncorrected">("all");
  const [importSortKey, setImportSortKey] = useState<ImportSortKey>("index");
  const [importSortDirection, setImportSortDirection] = useState<"asc" | "desc">("asc");
  const [isAutoCorrectEnabled, setIsAutoCorrectEnabled] = useState<boolean>(true);
  const [isValidationEnabled, setIsValidationEnabled] = useState<boolean>(true);
  const [isAddCorrectionRuleOpen, setIsAddCorrectionRuleOpen] = useState<boolean>(false);
  const [isAddValidationRuleOpen, setIsAddValidationRuleOpen] = useState<boolean>(false);
  const [correctionRuleRowIndex, setCorrectionRuleRowIndex] = useState<number | null>(null);
  const [correctionRuleField, setCorrectionRuleField] = useState<"player" | "source" | "chest" | "clan" | "all">(
    "player",
  );
  const [correctionRuleMatch, setCorrectionRuleMatch] = useState<string>("");
  const [correctionRuleReplacement, setCorrectionRuleReplacement] = useState<string>("");
  const [correctionRuleStatus, setCorrectionRuleStatus] = useState<string>("active");
  const [correctionRuleMessage, setCorrectionRuleMessage] = useState<string>("");
  const [validationRuleRowIndex, setValidationRuleRowIndex] = useState<number | null>(null);
  const [validationRuleField, setValidationRuleField] = useState<"player" | "source" | "chest" | "clan">("player");
  const [validationRuleMatch, setValidationRuleMatch] = useState<string>("");
  const [validationRuleStatus, setValidationRuleStatus] = useState<string>("valid");
  const [validationRuleMessage, setValidationRuleMessage] = useState<string>("");
  const selectAllRef = useRef<HTMLInputElement | null>(null);
  const [isBatchEditOpen, setIsBatchEditOpen] = useState<boolean>(false);
  const [batchEditField, setBatchEditField] = useState<keyof CsvRow>("player");
  const [batchEditValue, setBatchEditValue] = useState<string>("");
  const [batchEditDate, setBatchEditDate] = useState<string>("");
  const [batchEditClan, setBatchEditClan] = useState<string>("");
  const [isCommitWarningOpen, setIsCommitWarningOpen] = useState<boolean>(false);
  const [commitWarningInvalidRows, setCommitWarningInvalidRows] = useState<readonly number[]>([]);
  const supabase = useSupabase();

  const {
    validationEvaluator,
    correctionApplicator,
    playerSuggestions,
    sourceSuggestions,
    chestSuggestions,
    suggestionsForField,
  } = useRuleProcessing(validationRules, correctionRules, availableClans);

  const applyCorrectionsToRows = useCallback(
    (inputRows: readonly CsvRow[]): { rows: CsvRow[]; correctionsByRow: CorrectionMap } => {
      if (!isAutoCorrectEnabled) {
        return { rows: [...inputRows], correctionsByRow: {} };
      }
      const correctionsByRow: CorrectionMap = {};
      const correctedRows = inputRows.map((row, index) => {
        let nextRow = row;
        const nextCorrections: Partial<Record<CorrectionField, { value: string; wasCorrected: boolean }>> = {};
        (["player", "source", "chest", "clan"] as const).forEach((field) => {
          const result = correctionApplicator.applyToField({ field, value: row[field] });
          if (result.wasCorrected) {
            if (nextRow === row) {
              nextRow = { ...row };
            }
            nextRow = { ...nextRow, [field]: result.value };
            nextCorrections[field] = result;
          }
        });
        if (Object.keys(nextCorrections).length > 0) {
          correctionsByRow[index] = nextCorrections;
        }
        return nextRow;
      });
      return { rows: correctedRows, correctionsByRow };
    },
    [correctionApplicator, isAutoCorrectEnabled],
  );

  const evaluateValidationResults = useCallback(
    (nextRows: readonly CsvRow[]): { warnings: string[]; errors: string[] } => {
      if (!isValidationEnabled) {
        return { warnings: [], errors: [] };
      }
      const warnings: string[] = [];
      const errors: string[] = [];
      const validationRows = applyCorrectionsToRows(nextRows).rows;
      validationRows.forEach((row) => {
        const result = validationEvaluator({
          player: row.player,
          source: row.source,
          chest: row.chest,
          clan: row.clan,
        });
        if (result.fieldStatus.player === "invalid") {
          errors.push(`Invalid player: ${row.player}`);
        }
        if (result.fieldStatus.source === "invalid") {
          errors.push(`Invalid source: ${row.source}`);
        }
        if (result.fieldStatus.chest === "invalid") {
          errors.push(`Invalid chest: ${row.chest}`);
        }
        if (result.fieldStatus.clan === "invalid") {
          errors.push(`Invalid clan: ${row.clan}`);
        }
      });
      return { warnings, errors };
    },
    [applyCorrectionsToRows, isValidationEnabled, validationEvaluator],
  );

  async function loadRulesForClans(clanNames: readonly string[]): Promise<void> {
    const { data: clanRows } = await supabase
      .from("clans")
      .select("id,name")
      .in("name", clanNames.length > 0 ? clanNames : ["__none__"]);
    const { data: availableClanRows } = await supabase.from("clans").select("name").order("name");
    const clanNameSet = new Set<string>([
      ...clanNames,
      ...(clanRows ?? []).map((clan) => clan.name),
      ...(availableClanRows ?? []).map((clan) => clan.name),
    ]);
    setAvailableClans(Array.from(clanNameSet).sort((a, b) => a.localeCompare(b)));
    setClanIdByName(new Map((clanRows ?? []).map((clan) => [clan.name, clan.id])));
    const { data: validationData } = await supabase
      .from("validation_rules")
      .select("id,field,match_value,status")
      .order("field");
    setValidationRules(validationData ?? []);
    const { data: correctionData } = await supabase
      .from("correction_rules")
      .select("id,field,match_value,replacement_value,status")
      .order("field");
    setCorrectionRules(correctionData ?? []);
  }

  function updateRowValue(index: number, field: keyof CsvRow, value: string): void {
    setRows((current) => {
      const updated = [...current];
      const target = updated[index];
      if (!target) {
        return current;
      }
      const nextValue = field === "score" ? Number(value || 0) : value;
      updated[index] = { ...target, [field]: nextValue };
      const { warnings, errors: validationIssues } = evaluateValidationResults(updated);
      setValidationMessages(warnings);
      setValidationErrors(validationIssues);
      return updated;
    });
    setManualEdits((current) => ({
      ...current,
      [index]: { ...(current[index] ?? {}), [field]: value },
    }));
  }

  const correctionResults = useMemo(() => applyCorrectionsToRows(rows), [rows, applyCorrectionsToRows]);

  const openCorrectionRuleModal = useCallback(
    (index: number): void => {
      const currentRow = correctionResults.rows[index];
      const originalRow = originalRows[index];
      if (!currentRow || !originalRow) {
        return;
      }
      const defaultField: CorrectionField = "player";
      setCorrectionRuleRowIndex(index);
      setCorrectionRuleField(defaultField);
      setCorrectionRuleMatch(originalRow[defaultField]);
      setCorrectionRuleReplacement(currentRow[defaultField]);
      setCorrectionRuleStatus("active");
      setCorrectionRuleMessage("");
      setIsAddCorrectionRuleOpen(true);
    },
    [correctionResults.rows, originalRows],
  );

  const updateCorrectionRuleField = useCallback(
    (nextField: "player" | "source" | "chest" | "clan" | "all"): void => {
      setCorrectionRuleField(nextField);
      if (nextField === "all") {
        return;
      }
      if (correctionRuleRowIndex === null) {
        return;
      }
      const currentRow = correctionResults.rows[correctionRuleRowIndex];
      const originalRow = originalRows[correctionRuleRowIndex];
      if (!currentRow || !originalRow) {
        return;
      }
      setCorrectionRuleMatch(originalRow[nextField]);
      setCorrectionRuleReplacement(currentRow[nextField]);
    },
    [correctionRuleRowIndex, correctionResults.rows, originalRows],
  );

  const openValidationRuleModal = useCallback(
    (index: number): void => {
      const currentRow = correctionResults.rows[index];
      if (!currentRow) {
        return;
      }
      const defaultField: CorrectionField = "player";
      setValidationRuleRowIndex(index);
      setValidationRuleField(defaultField);
      setValidationRuleMatch(currentRow[defaultField]);
      setValidationRuleStatus("valid");
      setValidationRuleMessage("");
      setIsAddValidationRuleOpen(true);
    },
    [correctionResults.rows],
  );

  const updateValidationRuleField = useCallback(
    (nextField: "player" | "source" | "chest" | "clan"): void => {
      setValidationRuleField(nextField);
      if (validationRuleRowIndex === null) {
        return;
      }
      const currentRow = correctionResults.rows[validationRuleRowIndex];
      if (!currentRow) {
        return;
      }
      setValidationRuleMatch(currentRow[nextField]);
    },
    [validationRuleRowIndex, correctionResults.rows],
  );

  function closeValidationRuleModal(): void {
    setIsAddValidationRuleOpen(false);
    setValidationRuleRowIndex(null);
    setValidationRuleMessage("");
  }

  async function handleSaveValidationRuleFromRow(): Promise<void> {
    if (validationRuleRowIndex === null) {
      setValidationRuleMessage(t("selectRowFirst"));
      return;
    }
    const currentRow = correctionResults.rows[validationRuleRowIndex];
    if (!currentRow) {
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
      setValidationRuleMessage(t("failedToAddRule", { type: "validation", error: error.message }));
      return;
    }
    setValidationRuleMessage(t("ruleAdded", { type: "validation" }));
    const clanNames = Array.from(new Set(rows.map((row) => row.clan)));
    await loadRulesForClans(clanNames);
    closeValidationRuleModal();
  }

  function closeCorrectionRuleModal(): void {
    setIsAddCorrectionRuleOpen(false);
    setCorrectionRuleRowIndex(null);
    setCorrectionRuleMessage("");
  }

  async function handleSaveCorrectionRuleFromRow(): Promise<void> {
    if (correctionRuleRowIndex === null) {
      setCorrectionRuleMessage(t("selectRowFirst"));
      return;
    }
    const currentRow = correctionResults.rows[correctionRuleRowIndex];
    if (!currentRow) {
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
      setCorrectionRuleMessage(t("failedToAddRule", { type: "correction", error: error.message }));
      return;
    }
    setCorrectionRuleMessage(t("ruleAdded", { type: "correction" }));
    const clanNames = Array.from(new Set(rows.map((row) => row.clan)));
    await loadRulesForClans(clanNames);
    closeCorrectionRuleModal();
  }

  const correctionStats = useMemo(() => {
    const correctedFields = Object.values(correctionResults.correctionsByRow).reduce((count, rowCorrections) => {
      return count + Object.keys(rowCorrections).length;
    }, 0);
    const correctedRows = Object.keys(correctionResults.correctionsByRow).length;
    return { correctedFields, correctedRows };
  }, [correctionResults.correctionsByRow]);

  const indexedRows = useMemo(
    () => correctionResults.rows.map((row, index) => ({ row, index })),
    [correctionResults.rows],
  );
  const rowValidationResults = useMemo(() => {
    if (!isValidationEnabled) {
      return correctionResults.rows.map(
        (): {
          rowStatus: "valid" | "invalid" | "neutral";
          fieldStatus: Record<"player" | "source" | "chest" | "clan", "valid" | "invalid" | "neutral">;
        } => ({
          rowStatus: "neutral",
          fieldStatus: { player: "neutral", source: "neutral", chest: "neutral", clan: "neutral" },
        }),
      );
    }
    return correctionResults.rows.map((row) =>
      validationEvaluator({
        player: row.player,
        source: row.source,
        chest: row.chest,
        clan: row.clan,
      }),
    );
  }, [correctionResults.rows, isValidationEnabled, validationEvaluator]);
  const validationStats = useMemo(() => {
    if (!isValidationEnabled) {
      return { validatedRows: 0, validatedFields: 0, totalFields: 0 };
    }
    const validatedRows = rowValidationResults.filter((result) => result.rowStatus === "valid").length;
    let validatedFields = 0;
    rowValidationResults.forEach((result) => {
      validatedFields += Object.values(result.fieldStatus).filter((status) => status === "valid").length;
    });
    return { validatedRows, validatedFields, totalFields: rowValidationResults.length * 4 };
  }, [isValidationEnabled, rowValidationResults]);
  const validatedRowsLabel: string | number = isValidationEnabled ? validationStats.validatedRows : "Off";
  const correctedRowsLabel: string | number = isAutoCorrectEnabled ? correctionStats.correctedRows : "Off";
  const filteredRows = useMemo(() => {
    const normalizedPlayer = filterPlayer.trim().toLowerCase();
    const normalizedSource = filterSource.trim().toLowerCase();
    const normalizedChest = filterChest.trim().toLowerCase();
    const normalizedClan = filterClan.trim().toLowerCase();
    const minScore = Number(filterScoreMin);
    const maxScore = Number(filterScoreMax);
    const hasMinScore = filterScoreMin.trim() !== "" && !Number.isNaN(minScore);
    const hasMaxScore = filterScoreMax.trim() !== "" && !Number.isNaN(maxScore);
    return indexedRows.filter(({ row, index }) => {
      if (filterCorrectionStatus !== "all") {
        const hasCorrections = Boolean(correctionResults.correctionsByRow[index]);
        if (filterCorrectionStatus === "corrected" && !hasCorrections) {
          return false;
        }
        if (filterCorrectionStatus === "uncorrected" && hasCorrections) {
          return false;
        }
      }
      if (filterRowStatus !== "all") {
        if (!isValidationEnabled) {
          return false;
        }
        const rowStatus = rowValidationResults[index]?.rowStatus ?? "neutral";
        if (filterRowStatus === "valid" && rowStatus !== "valid") {
          return false;
        }
        if (filterRowStatus === "invalid" && rowStatus !== "invalid") {
          return false;
        }
      }
      if (normalizedPlayer && !row.player.toLowerCase().includes(normalizedPlayer)) {
        return false;
      }
      if (normalizedSource && !row.source.toLowerCase().includes(normalizedSource)) {
        return false;
      }
      if (normalizedChest && !row.chest.toLowerCase().includes(normalizedChest)) {
        return false;
      }
      if (normalizedClan && !row.clan.toLowerCase().includes(normalizedClan)) {
        return false;
      }
      if (filterDateFrom.trim() && row.date < filterDateFrom.trim()) {
        return false;
      }
      if (filterDateTo.trim() && row.date > filterDateTo.trim()) {
        return false;
      }
      if (hasMinScore && row.score < minScore) {
        return false;
      }
      if (hasMaxScore && row.score > maxScore) {
        return false;
      }
      return true;
    });
  }, [
    correctionResults.correctionsByRow,
    filterChest,
    filterClan,
    filterDateFrom,
    filterDateTo,
    filterPlayer,
    filterCorrectionStatus,
    filterRowStatus,
    filterScoreMax,
    filterScoreMin,
    filterSource,
    indexedRows,
    isValidationEnabled,
    rowValidationResults,
  ]);
  const sortedRows = useMemo(() => {
    const sorted = [...filteredRows];
    sorted.sort((left, right) => {
      const leftValue = getImportSortValue(left, importSortKey);
      const rightValue = getImportSortValue(right, importSortKey);
      return compareImportValues(leftValue, rightValue, importSortDirection);
    });
    return sorted;
  }, [filteredRows, importSortDirection, importSortKey]);
  const overallCount: number = correctionResults.rows.length;
  const filteredCount: number = sortedRows.length;
  const totalPages: number = Math.max(1, Math.ceil(filteredCount / pageSize));
  const pageStartIndex: number = (page - 1) * pageSize;
  const pagedRows: readonly IndexedRow[] = sortedRows.slice(pageStartIndex, pageStartIndex + pageSize);
  const invalidRowCount: number = commitWarningInvalidRows.length;
  const commitAllCount: number = overallCount;
  const commitSkipCount: number = Math.max(0, overallCount - invalidRowCount);

  const areAllRowsSelected = useMemo(
    () => rows.length > 0 && rows.every((_row, index) => selectedRows.includes(index)),
    [rows, selectedRows],
  );
  const areSomeRowsSelected = useMemo(
    () => selectedRows.length > 0 && !areAllRowsSelected,
    [areAllRowsSelected, selectedRows.length],
  );
  const selectedRowSet = useMemo(() => new Set(selectedRows), [selectedRows]);

  useEffect(() => {
    const { warnings, errors: validationIssues } = evaluateValidationResults(rows);
    setValidationMessages(warnings);
    setValidationErrors(validationIssues);
  }, [evaluateValidationResults, rows]);

  useEffect(() => {
    if (!selectAllRef.current) {
      return;
    }
    selectAllRef.current.indeterminate = areSomeRowsSelected;
  }, [areSomeRowsSelected]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  useEffect(() => {
    if (!isValidationEnabled && filterRowStatus !== "all") {
      setFilterRowStatus("all");
    }
  }, [filterRowStatus, isValidationEnabled]);

  useEffect(() => {
    if (!isAutoCorrectEnabled && filterCorrectionStatus !== "all") {
      setFilterCorrectionStatus("all");
    }
  }, [filterCorrectionStatus, isAutoCorrectEnabled]);

  useEffect(() => {
    if (isCommitting || !commitStatus) {
      if (commitStatusTimeoutRef.current) {
        clearTimeout(commitStatusTimeoutRef.current);
        commitStatusTimeoutRef.current = null;
      }
      return;
    }
    if (commitStatusTimeoutRef.current) {
      clearTimeout(commitStatusTimeoutRef.current);
    }
    commitStatusTimeoutRef.current = setTimeout(() => {
      setCommitStatus("");
      commitStatusTimeoutRef.current = null;
    }, COMMIT_STATUS_TIMEOUT_MS);
    return () => {
      if (commitStatusTimeoutRef.current) {
        clearTimeout(commitStatusTimeoutRef.current);
        commitStatusTimeoutRef.current = null;
      }
    };
  }, [commitStatus, isCommitting]);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setStatusMessage(t("parsingFile"));
    const text = await file.text();
    const result = parseCsvText(text);
    const clanNames = Array.from(new Set(result.rows.map((row) => row.clan)));
    await loadRulesForClans(clanNames);
    const nextRows = result.rows;
    setOriginalRows(result.rows);
    setRows(nextRows);
    setManualEdits({});
    setSelectedRows([]);
    setPage(1);
    setFilterPlayer("");
    setFilterSource("");
    setFilterChest("");
    setFilterClan("");
    setFilterDateFrom("");
    setFilterDateTo("");
    setFilterScoreMin("");
    setFilterScoreMax("");
    setFilterRowStatus("all");
    setFilterCorrectionStatus("all");
    setImportSortKey("index");
    setImportSortDirection("asc");
    setErrors(result.errors);
    setHeaderErrors(result.headerErrors);
    setFileName(file.name);
    const { warnings, errors: validationIssues } = evaluateValidationResults(nextRows);
    setValidationMessages(warnings);
    setValidationErrors(validationIssues);
    setStatusMessage(t("parsedRows", { count: result.rows.length }));
  }

  function getCommitRows(inputRows: readonly CsvRow[]): CommitRow[] {
    return inputRows.map((row) => ({
      collected_date: row.date,
      player: row.player,
      source: row.source,
      chest: row.chest,
      score: row.score,
      clan: row.clan,
    }));
  }

  function getInvalidRowIndexes(): number[] {
    if (!isValidationEnabled) {
      return [];
    }
    return rowValidationResults
      .map((result, index) => (result.rowStatus === "invalid" ? index : -1))
      .filter((index) => index >= 0);
  }

  function toggleSelectRow(index: number): void {
    setSelectedRows((current) =>
      current.includes(index) ? current.filter((item) => item !== index) : [...current, index],
    );
  }

  function toggleSelectAllRows(): void {
    if (rows.length === 0) {
      return;
    }
    if (areAllRowsSelected) {
      setSelectedRows([]);
      return;
    }
    setSelectedRows(rows.map((_row, index) => index));
  }

  function handlePageInputChange(nextValue: string): void {
    const nextPage = Number(nextValue);
    if (Number.isNaN(nextPage)) {
      return;
    }
    const clampedPage = Math.min(Math.max(1, nextPage), totalPages);
    setPage(clampedPage);
  }

  function resetImportFilters(): void {
    setFilterPlayer("");
    setFilterSource("");
    setFilterChest("");
    setFilterClan("");
    setFilterDateFrom("");
    setFilterDateTo("");
    setFilterScoreMin("");
    setFilterScoreMax("");
    setFilterRowStatus("all");
    setFilterCorrectionStatus("all");
    setImportSortKey("index");
    setImportSortDirection("asc");
    setPage(1);
  }

  function toggleImportSort(nextKey: ImportSortKey): void {
    if (importSortKey !== nextKey) {
      setImportSortKey(nextKey);
      setImportSortDirection("asc");
      setPage(1);
      return;
    }
    setImportSortDirection((current) => (current === "asc" ? "desc" : "asc"));
  }

  function getBatchPreviewValue(row: CsvRow, field: keyof CsvRow): string {
    if (batchEditField !== field) {
      return String(row[field]);
    }
    if (field === "date") {
      return batchEditDate || row.date;
    }
    if (field === "clan") {
      return batchEditClan || row.clan;
    }
    if (field === "score") {
      return batchEditValue || String(row.score);
    }
    return batchEditValue || String(row[field]);
  }

  function openBatchEdit(): void {
    if (selectedRows.length === 0) {
      setStatusMessage(t("selectRowsForBatchEdit"));
      return;
    }
    setBatchEditField("player");
    setBatchEditValue("");
    setBatchEditDate("");
    setBatchEditClan("");
    setIsBatchEditOpen(true);
  }

  function closeBatchEdit(): void {
    setIsBatchEditOpen(false);
  }

  function confirmBatchEdit(): void {
    if (selectedRows.length === 0) {
      setStatusMessage(t("selectRowsForBatchEdit"));
      return;
    }
    if (batchEditField === "date" && !batchEditDate) {
      setStatusMessage(t("selectDateValue"));
      return;
    }
    if (batchEditField === "clan" && !batchEditClan) {
      setStatusMessage(t("selectClan"));
      return;
    }
    if (batchEditField === "score") {
      const parsedScore = Number(batchEditValue);
      if (Number.isNaN(parsedScore)) {
        setStatusMessage(t("scoreMustBeNumber"));
        return;
      }
    }
    if (batchEditField !== "date" && batchEditField !== "clan" && batchEditField !== "score" && !batchEditValue) {
      setStatusMessage(t("enterValue"));
      return;
    }
    const nextValue =
      batchEditField === "date" ? batchEditDate : batchEditField === "clan" ? batchEditClan : batchEditValue;
    const updatedRows = rows.map((row, index) => {
      if (!selectedRowSet.has(index)) {
        return row;
      }
      if (batchEditField === "score") {
        return { ...row, score: Number(nextValue) };
      }
      return { ...row, [batchEditField]: nextValue };
    });
    setRows(updatedRows);
    setManualEdits((current) => {
      const nextEdits: Record<number, RowEdits> = { ...current };
      selectedRows.forEach((index) => {
        const existing = nextEdits[index] ?? {};
        if (batchEditField === "score") {
          nextEdits[index] = { ...existing, score: Number(nextValue) };
          return;
        }
        nextEdits[index] = { ...existing, [batchEditField]: nextValue };
      });
      return nextEdits;
    });
    setIsBatchEditOpen(false);
    setStatusMessage(t("batchEditsApplied"));
  }

  function handleRemoveSelectedRows(): void {
    if (selectedRows.length === 0) {
      return;
    }
    const selectedSet = new Set(selectedRows);
    const keptIndices = rows.map((_, index) => index).filter((index) => !selectedSet.has(index));
    const nextRows = rows.filter((_, index) => !selectedSet.has(index));
    const nextOriginal = originalRows.filter((_, index) => !selectedSet.has(index));
    const nextManual: Record<number, RowEdits> = {};
    keptIndices.forEach((oldIndex, newIndex) => {
      if (manualEdits[oldIndex]) {
        nextManual[newIndex] = manualEdits[oldIndex];
      }
    });
    setOriginalRows(nextOriginal);
    setRows(nextRows);
    setManualEdits(nextManual);
    setSelectedRows([]);
    const { warnings, errors: validationIssues } = evaluateValidationResults(nextRows);
    setValidationMessages(warnings);
    setValidationErrors(validationIssues);
    setErrors(getRowValidationErrors(nextRows));
  }

  function canCommit(): boolean {
    if (rows.length === 0) {
      return false;
    }
    if (errors.length > 0) {
      return false;
    }
    if (headerErrors.length > 0) {
      return false;
    }
    if (rows.some((row) => !row.date)) {
      return false;
    }
    return true;
  }

  function resetImportState(): void {
    setOriginalRows([]);
    setRows([]);
    setErrors([]);
    setHeaderErrors([]);
    setValidationMessages([]);
    setValidationErrors([]);
    setManualEdits({});
    setSelectedRows([]);
    setPage(1);
    setFilterPlayer("");
    setFilterSource("");
    setFilterChest("");
    setFilterClan("");
    setFilterDateFrom("");
    setFilterDateTo("");
    setFilterScoreMin("");
    setFilterScoreMax("");
    setFilterRowStatus("all");
    setFilterCorrectionStatus("all");
    setImportSortKey("index");
    setImportSortDirection("asc");
    setFileName("");
    setStatusMessage("");
    setBatchEditField("player");
    setBatchEditValue("");
    setBatchEditDate("");
    setBatchEditClan("");
    setIsBatchEditOpen(false);
    setCommitWarningInvalidRows([]);
    setIsCommitWarningOpen(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleCommit(): Promise<void> {
    if (!canCommit()) {
      setCommitStatus(t("fixValidationErrors"));
      return;
    }
    const invalidRowIndexes = getInvalidRowIndexes();
    if (invalidRowIndexes.length > 0) {
      setCommitWarningInvalidRows(invalidRowIndexes);
      setIsCommitWarningOpen(true);
      return;
    }
    await executeCommit(correctionResults.rows);
  }

  async function executeCommit(commitRows: readonly CsvRow[]): Promise<void> {
    setIsCommitting(true);
    setCommitStatus(t("committingRows"));
    const payload = getCommitRows(commitRows);
    const response = await fetch("/api/data-import/commit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows: payload }),
    });
    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setCommitStatus(data.error ?? t("commitFailed"));
      setIsCommitting(false);
      return;
    }
    const data = (await response.json()) as { insertedCount: number };
    setCommitStatus(t("committedRows", { count: data.insertedCount }));
    resetImportState();
    setIsCommitting(false);
  }

  async function handleCommitSkipInvalid(): Promise<void> {
    const invalidSet = new Set(commitWarningInvalidRows);
    const filteredRows = correctionResults.rows.filter((_row, index) => !invalidSet.has(index));
    setIsCommitWarningOpen(false);
    if (filteredRows.length === 0) {
      setCommitStatus(t("noValidRowsToCommit"));
      return;
    }
    await executeCommit(filteredRows);
  }

  async function handleCommitForce(): Promise<void> {
    setIsCommitWarningOpen(false);
    await executeCommit(correctionResults.rows);
  }

  return {
    fileInputRef,
    originalRows,
    rows,
    errors,
    headerErrors,
    fileName,
    statusMessage,
    commitStatus,
    isCommitting,
    manualEdits,
    selectedRows,
    page,
    pageSize,
    totalPages,
    pageStartIndex,
    isBatchOpsOpen,
    filterPlayer,
    filterSource,
    filterChest,
    filterClan,
    filterDateFrom,
    filterDateTo,
    filterScoreMin,
    filterScoreMax,
    filterRowStatus,
    filterCorrectionStatus,
    importSortKey,
    importSortDirection,
    isAutoCorrectEnabled,
    isValidationEnabled,
    correctionResults,
    correctionStats,
    rowValidationResults,
    validationStats,
    validatedRowsLabel,
    correctedRowsLabel,
    filteredCount,
    overallCount,
    pagedRows,
    availableClans,
    playerSuggestions,
    sourceSuggestions,
    chestSuggestions,
    suggestionsForField,
    areAllRowsSelected,
    areSomeRowsSelected,
    selectedRowSet,
    selectAllRef,
    isAddCorrectionRuleOpen,
    isAddValidationRuleOpen,
    correctionRuleRowIndex,
    correctionRuleField,
    correctionRuleMatch,
    correctionRuleReplacement,
    correctionRuleStatus,
    correctionRuleMessage,
    validationRuleRowIndex,
    validationRuleField,
    validationRuleMatch,
    validationRuleStatus,
    validationRuleMessage,
    isBatchEditOpen,
    batchEditField,
    batchEditValue,
    batchEditDate,
    batchEditClan,
    isCommitWarningOpen,
    commitWarningInvalidRows,
    invalidRowCount,
    commitAllCount,
    commitSkipCount,
    handleFileChange,
    updateRowValue,
    toggleSelectRow,
    toggleSelectAllRows,
    handlePageInputChange,
    setPage,
    setPageSize,
    resetImportFilters,
    toggleImportSort,
    setIsBatchOpsOpen,
    setIsAutoCorrectEnabled,
    setIsValidationEnabled,
    setFilterPlayer,
    setFilterSource,
    setFilterChest,
    setFilterClan,
    setFilterDateFrom,
    setFilterDateTo,
    setFilterScoreMin,
    setFilterScoreMax,
    setFilterRowStatus,
    setFilterCorrectionStatus,
    setImportSortKey,
    setImportSortDirection,
    openCorrectionRuleModal,
    updateCorrectionRuleField,
    openValidationRuleModal,
    updateValidationRuleField,
    closeValidationRuleModal,
    handleSaveValidationRuleFromRow,
    closeCorrectionRuleModal,
    handleSaveCorrectionRuleFromRow,
    setCorrectionRuleMatch,
    setCorrectionRuleReplacement,
    setCorrectionRuleStatus,
    setValidationRuleMatch,
    setValidationRuleStatus,
    getBatchPreviewValue,
    openBatchEdit,
    closeBatchEdit,
    confirmBatchEdit,
    setBatchEditField,
    setBatchEditValue,
    setBatchEditDate,
    setBatchEditClan,
    handleRemoveSelectedRows,
    canCommit,
    handleCommit,
    handleCommitSkipInvalid,
    handleCommitForce,
    setIsCommitWarningOpen,
    applyCorrectionsToRows,
    validationEvaluator,
  };
}
