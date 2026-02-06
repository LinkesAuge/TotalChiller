"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { z } from "zod";
import createSupabaseBrowserClient from "../../lib/supabase/browser-client";
import createCorrectionApplicator from "../../lib/correction-applicator";
import DatePicker from "../components/date-picker";
import ComboboxInput from "../components/ui/combobox-input";
import IconButton from "../components/ui/icon-button";
import SearchInput from "../components/ui/search-input";
import RadixSelect from "../components/ui/radix-select";
import TableScroll from "../components/table-scroll";
import { createValidationEvaluator } from "../components/validation-evaluator";

interface CsvRow {
  readonly date: string;
  readonly player: string;
  readonly source: string;
  readonly chest: string;
  readonly score: number;
  readonly clan: string;
}

interface ParseError {
  readonly line: number;
  readonly message: string;
}

interface ParseResult {
  readonly rows: CsvRow[];
  readonly errors: ParseError[];
  readonly headerErrors: string[];
}

interface CommitRow {
  readonly collected_date: string;
  readonly player: string;
  readonly source: string;
  readonly chest: string;
  readonly score: number;
  readonly clan: string;
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

interface CorrectionMatch {
  readonly value: string;
  readonly wasCorrected: boolean;
  readonly ruleId?: string;
  readonly from?: string;
  readonly to?: string;
  readonly ruleField?: string;
}

type RowEdits = Partial<CsvRow>;
type CorrectionField = "player" | "source" | "chest" | "clan";
type CorrectionMap = Record<number, Partial<Record<CorrectionField, CorrectionMatch>>>;
type ImportSortKey = "index" | "date" | "player" | "source" | "chest" | "score" | "clan";

interface IndexedRow {
  readonly row: CsvRow;
  readonly index: number;
}

const REQUIRED_HEADERS: readonly string[] = [
  "DATE",
  "PLAYER",
  "SOURCE",
  "CHEST",
  "SCORE",
  "CLAN",
];

const DATE_REGEX: RegExp = /^\d{4}-\d{2}-\d{2}$/;
const COMMIT_STATUS_TIMEOUT_MS: number = 5000;
const importSortOptions: readonly { value: ImportSortKey; label: string }[] = [
  { value: "index", label: "Row" },
  { value: "date", label: "Date" },
  { value: "player", label: "Player" },
  { value: "source", label: "Source" },
  { value: "chest", label: "Chest" },
  { value: "score", label: "Score" },
  { value: "clan", label: "Clan" },
];

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
    if (char === "\"") {
      const nextChar = line[index + 1];
      if (inQuotes && nextChar === "\"") {
        current += "\"";
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
  const headerValues = parseCsvLine(lines[0]).map(normalizeHeader);
  const headerErrors: string[] = [];
  REQUIRED_HEADERS.forEach((header, index) => {
    if (headerValues[index] !== header) {
      headerErrors.push(`Expected ${header} at position ${index + 1}.`);
    }
  });
  const rows: CsvRow[] = [];
  const errors: ParseError[] = [];
  for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
    const values = parseCsvLine(lines[lineIndex]);
    if (values.length < REQUIRED_HEADERS.length) {
      errors.push({
        line: lineIndex + 1,
        message: "Missing required columns.",
      });
      continue;
    }
    const scoreValue = parseScoreValue(values[4]);
    if (scoreValue === null) {
      errors.push({
        line: lineIndex + 1,
        message: "Score must be a number.",
      });
      continue;
    }
    const rowCandidate: CsvRow = {
      date: values[0],
      player: values[1],
      source: values[2],
      chest: values[3],
      score: scoreValue,
      clan: values[5],
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

function compareImportValues(
  left: string | number,
  right: string | number,
  direction: "asc" | "desc",
): number {
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

/**
 * Handles CSV file upload, parsing, and preview rendering.
 */
function DataImportClient(): JSX.Element {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const commitStatusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [originalRows, setOriginalRows] = useState<readonly CsvRow[]>([]);
  const [rows, setRows] = useState<readonly CsvRow[]>([]);
  const [errors, setErrors] = useState<readonly ParseError[]>([]);
  const [headerErrors, setHeaderErrors] = useState<readonly string[]>([]);
  const [validationRules, setValidationRules] = useState<readonly ValidationRuleRow[]>([]);
  const [correctionRules, setCorrectionRules] = useState<readonly CorrectionRuleRow[]>([]);
  const [validationMessages, setValidationMessages] = useState<readonly string[]>([]);
  const [validationErrors, setValidationErrors] = useState<readonly string[]>([]);
  const [availableClans, setAvailableClans] = useState<readonly string[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [commitStatus, setCommitStatus] = useState<string>("");
  const [isCommitting, setIsCommitting] = useState<boolean>(false);
  const [clanIdByName, setClanIdByName] = useState<Map<string, string>>(new Map());
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
  const supabase = createSupabaseBrowserClient();

  const validationEvaluator = useMemo(
    () => createValidationEvaluator(validationRules),
    [validationRules],
  );
  const correctionApplicator = useMemo(() => createCorrectionApplicator(correctionRules), [correctionRules]);
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
  const suggestionsForField = useMemo<Record<string, readonly string[]>>(() => ({
    player: playerSuggestions,
    source: sourceSuggestions,
    chest: chestSuggestions,
    clan: availableClans,
    all: [],
  }), [availableClans, chestSuggestions, playerSuggestions, sourceSuggestions]);

  const applyCorrectionsToRows = useCallback(
    (inputRows: readonly CsvRow[]): { rows: CsvRow[]; correctionsByRow: CorrectionMap } => {
      if (!isAutoCorrectEnabled) {
        return { rows: [...inputRows], correctionsByRow: {} };
      }
      const correctionsByRow: CorrectionMap = {};
      const correctedRows = inputRows.map((row, index) => {
        let nextRow = row;
        const nextCorrections: Partial<Record<CorrectionField, CorrectionMatch>> = {};
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

  function applyManualEdits(baseRows: readonly CsvRow[], edits: Record<number, RowEdits>): CsvRow[] {
    return baseRows.map((row, index) => {
      const rowEdits = edits[index];
      if (!rowEdits) {
        return row;
      }
      return { ...row, ...rowEdits };
    });
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
      const { warnings, errors } = evaluateValidationResults(updated);
      setValidationMessages(warnings);
      setValidationErrors(errors);
      return updated;
    });
    setManualEdits((current) => ({
      ...current,
      [index]: { ...(current[index] ?? {}), [field]: value },
    }));
  }

  function openCorrectionRuleModal(index: number): void {
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
  }

  function updateCorrectionRuleField(
    nextField: "player" | "source" | "chest" | "clan" | "all",
  ): void {
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
  }

  function openValidationRuleModal(index: number): void {
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
  }

  function updateValidationRuleField(nextField: "player" | "source" | "chest" | "clan"): void {
    setValidationRuleField(nextField);
    if (validationRuleRowIndex === null) {
      return;
    }
    const currentRow = correctionResults.rows[validationRuleRowIndex];
    if (!currentRow) {
      return;
    }
    setValidationRuleMatch(currentRow[nextField]);
  }

  function closeValidationRuleModal(): void {
    setIsAddValidationRuleOpen(false);
    setValidationRuleRowIndex(null);
    setValidationRuleMessage("");
  }

  async function handleSaveValidationRuleFromRow(): Promise<void> {
    if (validationRuleRowIndex === null) {
      setValidationRuleMessage("Select a row first.");
      return;
    }
    const currentRow = correctionResults.rows[validationRuleRowIndex];
    if (!currentRow) {
      setValidationRuleMessage("Row data not available.");
      return;
    }
    if (!validationRuleMatch.trim()) {
      setValidationRuleMessage("Value is required.");
      return;
    }
    const payload = {
      field: validationRuleField,
      match_value: validationRuleMatch.trim(),
      status: validationRuleStatus.trim() || "valid",
    };
    const { error } = await supabase.from("validation_rules").insert(payload);
    if (error) {
      setValidationRuleMessage(`Failed to add validation rule: ${error.message}`);
      return;
    }
    setValidationRuleMessage("Validation rule added.");
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
      setCorrectionRuleMessage("Select a row first.");
      return;
    }
    const currentRow = correctionResults.rows[correctionRuleRowIndex];
    if (!currentRow) {
      setCorrectionRuleMessage("Row data not available.");
      return;
    }
    if (!correctionRuleMatch.trim() || !correctionRuleReplacement.trim()) {
      setCorrectionRuleMessage("Match and replacement values are required.");
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
      setCorrectionRuleMessage(`Failed to add correction rule: ${error.message}`);
      return;
    }
    setCorrectionRuleMessage("Correction rule added.");
    const clanNames = Array.from(new Set(rows.map((row) => row.clan)));
    await loadRulesForClans(clanNames);
    closeCorrectionRuleModal();
  }

  const correctionResults = useMemo(
    () => applyCorrectionsToRows(rows),
    [rows, correctionApplicator, isAutoCorrectEnabled],
  );
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
      return correctionResults.rows.map(() => ({
        rowStatus: "neutral",
        fieldStatus: { player: "neutral", source: "neutral", chest: "neutral", clan: "neutral" },
      }));
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
    const validatedFields = rowValidationResults.reduce((count, result) => {
      return count + Object.values(result.fieldStatus).filter((status) => status === "valid").length;
    }, 0);
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
    setStatusMessage("Parsing file...");
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
    setStatusMessage(`Parsed ${result.rows.length} rows.`);
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

  function renderImportSortButton(label: string, key: ImportSortKey): JSX.Element {
    const isActive = importSortKey === key;
    return (
      <button className="table-sort-button" type="button" onClick={() => toggleImportSort(key)}>
        <span>{label}</span>
        {isActive ? (
          <svg
            aria-hidden="true"
            className={`table-sort-indicator ${importSortDirection === "desc" ? "is-desc" : ""}`.trim()}
            width="10"
            height="10"
            viewBox="0 0 12 12"
            fill="none"
          >
            <path d="M6 2L10 6H2L6 2Z" fill="currentColor" />
          </svg>
        ) : null}
      </button>
    );
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
      setStatusMessage("Select rows for batch edit.");
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
      setStatusMessage("Select rows for batch edit.");
      return;
    }
    if (batchEditField === "date" && !batchEditDate) {
      setStatusMessage("Select a date value.");
      return;
    }
    if (batchEditField === "clan" && !batchEditClan) {
      setStatusMessage("Select a clan.");
      return;
    }
    if (batchEditField === "score") {
      const parsedScore = Number(batchEditValue);
      if (Number.isNaN(parsedScore)) {
        setStatusMessage("Score must be a number.");
        return;
      }
    }
    if (batchEditField !== "date" && batchEditField !== "clan" && batchEditField !== "score" && !batchEditValue) {
      setStatusMessage("Enter a value.");
      return;
    }
    const nextValue =
      batchEditField === "date"
        ? batchEditDate
        : batchEditField === "clan"
          ? batchEditClan
          : batchEditValue;
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
          nextEdits[index] = { ...existing, score: nextValue };
          return;
        }
        nextEdits[index] = { ...existing, [batchEditField]: nextValue };
      });
      return nextEdits;
    });
    setIsBatchEditOpen(false);
    setStatusMessage("Batch edits applied.");
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
      setCommitStatus("Fix validation errors before committing.");
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
    setCommitStatus("Committing rows to Supabase...");
    const payload = getCommitRows(commitRows);
    const response = await fetch("/api/data-import/commit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows: payload }),
    });
    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setCommitStatus(data.error ?? "Commit failed.");
      setIsCommitting(false);
      return;
    }
    const data = (await response.json()) as { insertedCount: number };
    setCommitStatus(`Committed ${data.insertedCount} rows.`);
    resetImportState();
    setIsCommitting(false);
  }

  async function handleCommitSkipInvalid(): Promise<void> {
    const invalidSet = new Set(commitWarningInvalidRows);
    const filteredRows = correctionResults.rows.filter((_row, index) => !invalidSet.has(index));
    setIsCommitWarningOpen(false);
    if (filteredRows.length === 0) {
      setCommitStatus("No valid rows to commit.");
      return;
    }
    await executeCommit(filteredRows);
  }

  async function handleCommitForce(): Promise<void> {
    setIsCommitWarningOpen(false);
    await executeCommit(correctionResults.rows);
  }

  return (
    <>
      <div className="grid">
        <section className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Upload CSV</div>
            <div className="card-subtitle">DATE, PLAYER, SOURCE, CHEST, SCORE, CLAN</div>
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="csvFile">CSV File</label>
          <input id="csvFile" ref={fileInputRef} type="file" accept=".csv,.txt" onChange={handleFileChange} />
        </div>
        <div className="list">
          <div className="list-item">
            <span>Filename</span>
            <span className="badge">{fileName || "No file selected"}</span>
          </div>
        </div>
        {statusMessage ? <p className="text-muted">{statusMessage}</p> : null}
          {commitStatus ? <p className="text-muted">{commitStatus}</p> : null}
        </section>
        <section className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Parsing Feedback</div>
              <div className="card-subtitle">Import and validation summary</div>
            </div>
            <span className="badge">Imported: {correctionResults.rows.length}</span>
          </div>
          <div className="list">
            <div className="list-item">
              <span>Imported entries</span>
              <span className="badge">{correctionResults.rows.length}</span>
            </div>
            <div className="list-item">
              <span>Corrections applied</span>
              <span className="badge">
                {correctionStats.correctedFields} fields • {correctionStats.correctedRows} rows
              </span>
            </div>
            <div className="list-item">
              <span>Rows validated</span>
              <span className="badge">{validationStats.validatedRows}</span>
            </div>
            <div className="list-item">
              <span>Fields validated</span>
              <span className="badge">
                {validationStats.validatedFields} / {validationStats.totalFields}
              </span>
            </div>
          </div>
      </section>
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
                <SearchInput
                  id="importFilterPlayer"
                  label="Player"
                  value={filterPlayer}
                  onChange={(value) => {
                    setFilterPlayer(value);
                    setPage(1);
                  }}
                  placeholder="Search player"
                />
                <SearchInput
                  id="importFilterSource"
                  label="Source"
                  value={filterSource}
                  onChange={(value) => {
                    setFilterSource(value);
                    setPage(1);
                  }}
                  placeholder="Search source"
                />
                <SearchInput
                  id="importFilterChest"
                  label="Chest"
                  value={filterChest}
                  onChange={(value) => {
                    setFilterChest(value);
                    setPage(1);
                  }}
                  placeholder="Search chest"
                />
                <SearchInput
                  id="importFilterClan"
                  label="Clan"
                  value={filterClan}
                  onChange={(value) => {
                    setFilterClan(value);
                    setPage(1);
                  }}
                  placeholder="Search clan"
                />
              </div>
              <div className="list inline admin-members-filters filter-bar batch-ops-row">
                <label htmlFor="importDateFrom" className="text-muted">
                  Date from
                </label>
                <input
                  id="importDateFrom"
                  type="date"
                  value={filterDateFrom}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => {
                    setFilterDateFrom(event.target.value);
                    setPage(1);
                  }}
                />
                <label htmlFor="importDateTo" className="text-muted">
                  Date to
                </label>
                <input
                  id="importDateTo"
                  type="date"
                  value={filterDateTo}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => {
                    setFilterDateTo(event.target.value);
                    setPage(1);
                  }}
                />
                <label htmlFor="importScoreMin" className="text-muted">
                  Score min
                </label>
                <input
                  id="importScoreMin"
                  type="number"
                  value={filterScoreMin}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => {
                    setFilterScoreMin(event.target.value);
                    setPage(1);
                  }}
                  placeholder="0"
                />
              <label htmlFor="importScoreMax" className="text-muted">
                Score max
              </label>
              <input
                id="importScoreMax"
                type="number"
                value={filterScoreMax}
                onChange={(event: ChangeEvent<HTMLInputElement>) => {
                  setFilterScoreMax(event.target.value);
                  setPage(1);
                }}
                placeholder="9999"
              />
            </div>
            <div className="list inline admin-members-filters filter-bar batch-ops-row">
              <label htmlFor="importRowStatus" className="text-muted">
                Row status
              </label>
              <RadixSelect
                id="importRowStatus"
                ariaLabel="Row status"
                value={filterRowStatus}
                onValueChange={(value) => {
                  setFilterRowStatus(value as "all" | "valid" | "invalid");
                  setPage(1);
                }}
                options={[
                  { value: "all", label: "All" },
                  { value: "valid", label: "Valid only" },
                  { value: "invalid", label: "Invalid only" },
                ]}
                disabled={!isValidationEnabled}
              />
              {!isValidationEnabled ? <span className="text-muted">Validation off</span> : null}
              <label htmlFor="importCorrectionStatus" className="text-muted">
                Correction
              </label>
              <RadixSelect
                id="importCorrectionStatus"
                ariaLabel="Correction status"
                value={filterCorrectionStatus}
                onValueChange={(value) => {
                  setFilterCorrectionStatus(value as "all" | "corrected" | "uncorrected");
                  setPage(1);
                }}
                options={[
                  { value: "all", label: "All" },
                  { value: "corrected", label: "Corrected only" },
                  { value: "uncorrected", label: "Not corrected" },
                ]}
                disabled={!isAutoCorrectEnabled}
              />
              {!isAutoCorrectEnabled ? <span className="text-muted">Auto-correct off</span> : null}
              <label htmlFor="importSortKey" className="text-muted">
                Sort by
              </label>
              <RadixSelect
                id="importSortKey"
                ariaLabel="Sort by"
                value={importSortKey}
                onValueChange={(value) => {
                  setImportSortKey(value as ImportSortKey);
                  setImportSortDirection("asc");
                  setPage(1);
                }}
                options={importSortOptions.map((option) => ({ value: option.value, label: option.label }))}
              />
              <RadixSelect
                ariaLabel="Sort direction"
                value={importSortDirection}
                onValueChange={(value) => {
                  setImportSortDirection(value as "asc" | "desc");
                  setPage(1);
                }}
                options={[
                  { value: "asc", label: "Asc" },
                  { value: "desc", label: "Desc" },
                ]}
              />
              <button className="button" type="button" onClick={resetImportFilters}>
                Reset
              </button>
              </div>
            </div>
          </div>
        </section>
      ) : null}
        <div className="table-toolbar">
          <button className="button" type="button" onClick={() => setIsBatchOpsOpen((current) => !current)}>
            {isBatchOpsOpen ? "Hide Search & Filters" : "Search & Filters"}
          </button>
          <button
            className="button primary"
            type="button"
            disabled={!canCommit() || isCommitting}
            onClick={handleCommit}
          >
            {isCommitting ? "Committing..." : "Commit Data"}
          </button>
          <button className="button" type="button" onClick={openBatchEdit} disabled={selectedRows.length === 0}>
            Batch Edit
          </button>
          <IconButton
            ariaLabel="Remove selected rows"
            onClick={handleRemoveSelectedRows}
            variant="danger"
            disabled={selectedRows.length === 0}
          >
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3.5 5.5H12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              <path d="M6 5.5V4C6 3.4 6.4 3 7 3H9C9.6 3 10 3.4 10 4V5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              <path d="M5.2 5.5L5.6 12C5.6 12.6 6.1 13 6.7 13H9.3C9.9 13 10.4 12.6 10.4 12L10.8 5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </IconButton>
          <div className="list inline toggle-group" style={{ marginLeft: "auto", alignItems: "center" }}>
            <label
              className="text-muted"
              htmlFor="autoCorrectToggle"
              style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
            >
              <input
                id="autoCorrectToggle"
                type="checkbox"
                checked={isAutoCorrectEnabled}
                onChange={(event) => setIsAutoCorrectEnabled(event.target.checked)}
              />
              Auto-correct
            </label>
            <label
              className="text-muted"
              htmlFor="validationToggle"
              style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
            >
              <input
                id="validationToggle"
                type="checkbox"
                checked={isValidationEnabled}
                onChange={(event) => setIsValidationEnabled(event.target.checked)}
              />
              Validation
            </label>
          </div>
        </div>
        <div className="pagination-bar table-pagination" style={{ gridColumn: "span 12" }}>
          <div className="pagination-page-size">
            <label htmlFor="importPageSize" className="text-muted">
              Page size
            </label>
            <RadixSelect
              id="importPageSize"
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
            Showing {filteredCount === 0 ? 0 : pageStartIndex + 1}–
            {Math.min(pageStartIndex + pageSize, filteredCount)} of {filteredCount}
            {selectedRows.length > 0 ? ` • ${selectedRows.length} selected` : ""}
          </span>
          <div className="pagination-actions">
            <div className="pagination-page-indicator">
              <label htmlFor="importPageJump" className="text-muted">
                Page
              </label>
              <input
                id="importPageJump"
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
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page >= totalPages}
            >
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 3L10 8L6 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </IconButton>
          </div>
        </div>
        <TableScroll>
        <section className="table data-import">
          <header>
            <span>{renderImportSortButton("#", "index")}</span>
            <span>
              <input
                type="checkbox"
                ref={selectAllRef}
                checked={areAllRowsSelected}
                onChange={toggleSelectAllRows}
                aria-label="Select all rows"
              />
            </span>
            <span>{renderImportSortButton("Date", "date")}</span>
            <span>{renderImportSortButton("Player", "player")}</span>
            <span>{renderImportSortButton("Source", "source")}</span>
            <span>{renderImportSortButton("Chest", "chest")}</span>
            <span>{renderImportSortButton("Score", "score")}</span>
            <span>{renderImportSortButton("Clan", "clan")}</span>
            <span>Actions</span>
          </header>
          {correctionResults.rows.length === 0 ? (
            <div className="row">
              <span>No data loaded</span>
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
          ) : filteredCount === 0 ? (
            <div className="row">
              <span>No rows match the filters</span>
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
            pagedRows.map((item) => {
              const row = item.row;
              const rowIndex = item.index;
              const validation = rowValidationResults[rowIndex];
              const rowStatus = validation?.rowStatus ?? "neutral";
              const fieldStatus = validation?.fieldStatus ?? { player: "neutral", source: "neutral", chest: "neutral", clan: "neutral" };
              const correctionsForRow = correctionResults.correctionsByRow[rowIndex];
              const playerClassName = [
                fieldStatus.player === "invalid" ? "validation-cell-invalid" : "",
                correctionsForRow?.player ? "correction-cell-corrected" : "",
              ]
                .filter(Boolean)
                .join(" ");
              const sourceClassName = [
                fieldStatus.source === "invalid" ? "validation-cell-invalid" : "",
                correctionsForRow?.source ? "correction-cell-corrected" : "",
              ]
                .filter(Boolean)
                .join(" ");
              const chestClassName = [
                fieldStatus.chest === "invalid" ? "validation-cell-invalid" : "",
                correctionsForRow?.chest ? "correction-cell-corrected" : "",
              ]
                .filter(Boolean)
                .join(" ");
              const clanClassName = [
                fieldStatus.clan === "invalid" ? "select-trigger validation-cell-invalid" : "select-trigger",
                correctionsForRow?.clan ? "correction-cell-corrected" : "",
              ]
                .filter(Boolean)
                .join(" ");
              return (
              <div
                className={`row ${rowStatus === "valid" ? "validation-valid" : ""} ${rowStatus === "invalid" ? "validation-invalid" : ""}`.trim()}
                key={`${row.date}-${row.player}-${row.chest}-${rowIndex}`}
              >
                <span className="text-muted">{rowIndex + 1}</span>
                <input
                  type="checkbox"
                  checked={selectedRows.includes(rowIndex)}
                  onChange={() => toggleSelectRow(rowIndex)}
                />
                <DatePicker value={row.date} onChange={(value) => updateRowValue(rowIndex, "date", value)} />
                <ComboboxInput
                  value={row.player}
                  className={playerClassName}
                  onChange={(value) => updateRowValue(rowIndex, "player", value)}
                  options={playerSuggestions}
                />
                <ComboboxInput
                  value={row.source}
                  className={sourceClassName}
                  onChange={(value) => updateRowValue(rowIndex, "source", value)}
                  options={sourceSuggestions}
                />
                <ComboboxInput
                  value={row.chest}
                  className={chestClassName}
                  onChange={(value) => updateRowValue(rowIndex, "chest", value)}
                  options={chestSuggestions}
                />
                <input
                  value={String(row.score)}
                  onChange={(event) => updateRowValue(rowIndex, "score", event.target.value)}
                />
                <RadixSelect
                  ariaLabel="Clan"
                  value={row.clan}
                  onValueChange={(value) => updateRowValue(rowIndex, "clan", value)}
                  triggerClassName={clanClassName}
                  options={[
                    ...(!availableClans.includes(row.clan) ? [{ value: row.clan, label: row.clan }] : []),
                    ...availableClans.map((clan) => ({ value: clan, label: clan })),
                  ]}
                />
                <div className="list inline action-icons">
                  <IconButton ariaLabel="Add correction rule" onClick={() => openCorrectionRuleModal(rowIndex)}>
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
                  <IconButton ariaLabel="Add validation rule" onClick={() => openValidationRuleModal(rowIndex)}>
                    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M3.5 5.5L5 7L7.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M8.5 5.5H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      <path d="M3.5 10.5L5 12L7.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M8.5 10.5H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </IconButton>
                </div>
              </div>
              );
            })
          )}
        </section>
        </TableScroll>
      </div>
      {isAddCorrectionRuleOpen ? (
        <div className="modal-backdrop">
          <div className="modal card wide">
            <div className="card-header">
              <div>
                <div className="card-title">Add correction rule</div>
                <div className="card-subtitle">Create a rule from this row</div>
              </div>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="correctionRuleField">Field</label>
                <RadixSelect
                  id="correctionRuleField"
                  ariaLabel="Correction field"
                  value={correctionRuleField}
                  onValueChange={(value) =>
                    updateCorrectionRuleField(value as "player" | "source" | "chest" | "clan" | "all")
                  }
                  options={[
                    { value: "player", label: "Player" },
                    { value: "source", label: "Source" },
                    { value: "chest", label: "Chest" },
                    { value: "clan", label: "Clan" },
                    { value: "all", label: "All" },
                  ]}
                />
              </div>
              <div className="form-group">
                <label htmlFor="correctionRuleMatch">Match value</label>
                <ComboboxInput
                  id="correctionRuleMatch"
                  value={correctionRuleMatch}
                  onChange={setCorrectionRuleMatch}
                  options={suggestionsForField[correctionRuleField] ?? []}
                />
              </div>
              <div className="form-group">
                <label htmlFor="correctionRuleReplacement">Replacement value</label>
                <ComboboxInput
                  id="correctionRuleReplacement"
                  value={correctionRuleReplacement}
                  onChange={setCorrectionRuleReplacement}
                  options={suggestionsForField[correctionRuleField] ?? []}
                />
              </div>
              <div className="form-group">
                <label htmlFor="correctionRuleStatus">Status</label>
                <RadixSelect
                  id="correctionRuleStatus"
                  ariaLabel="Status"
                  value={correctionRuleStatus}
                  onValueChange={(value) => setCorrectionRuleStatus(value)}
                  options={[
                    { value: "active", label: "active" },
                    { value: "inactive", label: "inactive" },
                  ]}
                />
              </div>
            </div>
            {correctionRuleMessage ? <div className="alert info">{correctionRuleMessage}</div> : null}
            <div className="list inline">
              <button className="button" type="button" onClick={closeCorrectionRuleModal}>
                Cancel
              </button>
              <button className="button primary" type="button" onClick={handleSaveCorrectionRuleFromRow}>
                Save rule
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
                <div className="card-title">Add validation rule</div>
                <div className="card-subtitle">Create a valid value from this row</div>
              </div>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="validationRuleField">Field</label>
                <RadixSelect
                  id="validationRuleField"
                  ariaLabel="Validation field"
                  value={validationRuleField}
                  onValueChange={(value) => updateValidationRuleField(value as "player" | "source" | "chest" | "clan")}
                  options={[
                    { value: "player", label: "Player" },
                    { value: "source", label: "Source" },
                    { value: "chest", label: "Chest" },
                    { value: "clan", label: "Clan" },
                  ]}
                />
              </div>
              <div className="form-group">
                <label htmlFor="validationRuleMatch">Value</label>
                <ComboboxInput
                  id="validationRuleMatch"
                  value={validationRuleMatch}
                  onChange={setValidationRuleMatch}
                  options={suggestionsForField[validationRuleField] ?? []}
                />
              </div>
              <div className="form-group">
                <label htmlFor="validationRuleStatus">Status</label>
                <RadixSelect
                  id="validationRuleStatus"
                  ariaLabel="Status"
                  value={validationRuleStatus}
                  onValueChange={(value) => setValidationRuleStatus(value)}
                  options={[
                    { value: "valid", label: "valid" },
                    { value: "invalid", label: "invalid" },
                  ]}
                />
              </div>
            </div>
            {validationRuleMessage ? <div className="alert info">{validationRuleMessage}</div> : null}
            <div className="list inline">
              <button className="button" type="button" onClick={closeValidationRuleModal}>
                Cancel
              </button>
              <button className="button primary" type="button" onClick={handleSaveValidationRuleFromRow}>
                Save rule
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {isBatchEditOpen ? (
        <div className="modal-backdrop">
          <div className="modal card wide tall">
            <div className="card-header">
              <div>
                <div className="card-title">Batch edit selected rows</div>
                <div className="card-subtitle">Review changes before applying them.</div>
              </div>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="batchEditField">Column</label>
                <RadixSelect
                  id="batchEditField"
                  ariaLabel="Batch edit column"
                  value={batchEditField}
                  onValueChange={(value) => setBatchEditField(value as keyof CsvRow)}
                  options={[
                    { value: "date", label: "Date" },
                    { value: "player", label: "Player" },
                    { value: "source", label: "Source" },
                    { value: "chest", label: "Chest" },
                    { value: "score", label: "Score" },
                    { value: "clan", label: "Clan" },
                  ]}
                />
              </div>
              <div className="form-group">
                <label htmlFor="batchEditValue">New value</label>
                {batchEditField === "date" ? (
                  <DatePicker value={batchEditDate} onChange={setBatchEditDate} />
                ) : batchEditField === "clan" ? (
                  <RadixSelect
                    id="batchEditClan"
                    ariaLabel="Batch edit clan"
                    value={batchEditClan}
                    onValueChange={setBatchEditClan}
                    enableSearch
                    searchPlaceholder="Search clan"
                    options={availableClans.map((clan) => ({ value: clan, label: clan }))}
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
                  <span>#</span>
                  <span>Date</span>
                  <span>Player</span>
                  <span>Source</span>
                  <span>Chest</span>
                  <span>Score</span>
                  <span>Clan</span>
                </header>
                {selectedRows.length === 0 ? (
                  <div className="row">
                    <span>No rows selected</span>
                    <span />
                    <span />
                    <span />
                    <span />
                    <span />
                    <span />
                  </div>
                ) : (
                  selectedRows.map((index) => {
                    const row = correctionResults.rows[index];
                    if (!row) {
                      return null;
                    }
                    const nextValue =
                      batchEditField === "date"
                        ? batchEditDate
                        : batchEditField === "clan"
                          ? batchEditClan
                          : batchEditValue;
                    const previewRow: CsvRow = {
                      ...row,
                      [batchEditField]:
                        batchEditField === "score"
                          ? Number(nextValue || row.score)
                          : batchEditField === "date" || batchEditField === "clan"
                            ? (nextValue || row[batchEditField])
                            : (nextValue || row[batchEditField]),
                    };
                    const { rows: correctedRows, correctionsByRow } = applyCorrectionsToRows([previewRow]);
                    const correctedPreview = correctedRows[0] ?? previewRow;
                    const previewCorrections = correctionsByRow[0];
                    const validationResult = isValidationEnabled
                      ? validationEvaluator({
                          player: correctedPreview.player,
                          source: correctedPreview.source,
                          chest: correctedPreview.chest,
                          clan: correctedPreview.clan,
                        })
                      : {
                          rowStatus: "neutral",
                          fieldStatus: {
                            player: "neutral",
                            source: "neutral",
                            chest: "neutral",
                            clan: "neutral",
                          },
                        };
                    const playerClassName = [
                      validationResult.fieldStatus.player === "invalid" ? "validation-cell-invalid" : "",
                      previewCorrections?.player ? "correction-cell-corrected" : "",
                    ]
                      .filter(Boolean)
                      .join(" ");
                    const sourceClassName = [
                      validationResult.fieldStatus.source === "invalid" ? "validation-cell-invalid" : "",
                      previewCorrections?.source ? "correction-cell-corrected" : "",
                    ]
                      .filter(Boolean)
                      .join(" ");
                    const chestClassName = [
                      validationResult.fieldStatus.chest === "invalid" ? "validation-cell-invalid" : "",
                      previewCorrections?.chest ? "correction-cell-corrected" : "",
                    ]
                      .filter(Boolean)
                      .join(" ");
                    const clanClassName = [
                      validationResult.fieldStatus.clan === "invalid" ? "validation-cell-invalid" : "",
                      previewCorrections?.clan ? "correction-cell-corrected" : "",
                    ]
                      .filter(Boolean)
                      .join(" ");
                    return (
                      <div
                        className={`row ${validationResult.rowStatus === "valid" ? "validation-valid" : ""} ${validationResult.rowStatus === "invalid" ? "validation-invalid" : ""}`.trim()}
                        key={`batch-preview-${row.date}-${index}`}
                      >
                        <span className="text-muted">{index + 1}</span>
                        <span className={validationResult.rowStatus === "invalid" ? "validation-cell-invalid" : ""}>
                          {getBatchPreviewValue(correctedPreview, "date")}
                        </span>
                        <span className={playerClassName}>{getBatchPreviewValue(correctedPreview, "player")}</span>
                        <span className={sourceClassName}>{getBatchPreviewValue(correctedPreview, "source")}</span>
                        <span className={chestClassName}>{getBatchPreviewValue(correctedPreview, "chest")}</span>
                        <span className={validationResult.rowStatus === "invalid" ? "validation-cell-invalid" : ""}>
                          {getBatchPreviewValue(correctedPreview, "score")}
                        </span>
                        <span className={clanClassName}>{getBatchPreviewValue(correctedPreview, "clan")}</span>
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
      {isCommitWarningOpen ? (
        <div className="modal-backdrop">
          <div className="modal card danger">
            <div className="card-header">
              <div>
                <div className="danger-label">Validation Warning</div>
                <div className="card-title">Invalid rows detected</div>
                <div className="card-subtitle">Choose how to proceed with the commit.</div>
              </div>
            </div>
            <div className="alert warn">
              {invalidRowCount} row(s) have validation errors. You can skip them or commit anyway.
            </div>
            <div className="list">
              <div className="list-item">
                <span>Rows validated</span>
                <span className="badge">{validatedRowsLabel}</span>
              </div>
              <div className="list-item">
                <span>Rows corrected</span>
                <span className="badge">{correctedRowsLabel}</span>
              </div>
              <div className="list-item">
                <span>Commit if skipping invalid</span>
                <span className="badge">{commitSkipCount}</span>
              </div>
              <div className="list-item">
                <span>Commit if committing anyway</span>
                <span className="badge">{commitAllCount}</span>
              </div>
              <div className="list-item">
                <span>Invalid row numbers</span>
                <span className="badge">
                  {commitWarningInvalidRows
                    .slice(0, 12)
                    .map((index) => index + 1)
                    .join(", ")}
                  {commitWarningInvalidRows.length > 12 ? "…" : ""}
                </span>
              </div>
            </div>
            <div className="list inline">
              <button className="button" type="button" onClick={handleCommitSkipInvalid}>
                Skip invalid rows
              </button>
              <button className="button primary" type="button" onClick={handleCommitForce}>
                Commit anyway
              </button>
              <button className="button" type="button" onClick={() => setIsCommitWarningOpen(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export default DataImportClient;
