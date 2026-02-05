"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import { z } from "zod";
import createSupabaseBrowserClient from "../../lib/supabase/browser-client";
import DatePicker from "../components/date-picker";
import RadixSelect from "../components/ui/radix-select";
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
  readonly clan_id: string;
  readonly field: string;
  readonly match_value: string;
  readonly status: string;
}

type RowEdits = Partial<CsvRow>;

const REQUIRED_HEADERS: readonly string[] = [
  "DATE",
  "PLAYER",
  "SOURCE",
  "CHEST",
  "SCORE",
  "CLAN",
];

const DATE_REGEX: RegExp = /^\d{4}-\d{2}-\d{2}$/;

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

function parseDateFromFilename(filename: string): string | null {
  const dateMatch = filename.match(/\d{4}-\d{2}-\d{2}/);
  if (!dateMatch) {
    return null;
  }
  return dateMatch[0];
}

/**
 * Handles CSV file upload, parsing, and preview rendering.
 */
function DataImportClient(): JSX.Element {
  const [originalRows, setOriginalRows] = useState<readonly CsvRow[]>([]);
  const [rows, setRows] = useState<readonly CsvRow[]>([]);
  const [errors, setErrors] = useState<readonly ParseError[]>([]);
  const [headerErrors, setHeaderErrors] = useState<readonly string[]>([]);
  const [validationRules, setValidationRules] = useState<readonly ValidationRuleRow[]>([]);
  const [validationMessages, setValidationMessages] = useState<readonly string[]>([]);
  const [validationErrors, setValidationErrors] = useState<readonly string[]>([]);
  const [availableClans, setAvailableClans] = useState<readonly string[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [batchDate, setBatchDate] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [commitStatus, setCommitStatus] = useState<string>("");
  const [isCommitting, setIsCommitting] = useState<boolean>(false);
  const [clanIdByName, setClanIdByName] = useState<Map<string, string>>(new Map());
  const [manualEdits, setManualEdits] = useState<Record<number, RowEdits>>({});
  const [selectedRows, setSelectedRows] = useState<readonly number[]>([]);
  const supabase = createSupabaseBrowserClient();

  const validationEvaluator = useMemo(
    () => createValidationEvaluator(validationRules),
    [validationRules],
  );

  function evaluateValidationResults(nextRows: readonly CsvRow[]): { warnings: string[]; errors: string[] } {
    const warnings: string[] = [];
    const errors: string[] = [];
    nextRows.forEach((row) => {
      const clanId = clanIdByName.get(row.clan) ?? "";
      const result = validationEvaluator({
        player: row.player,
        source: row.source,
        chest: row.chest,
        clan: row.clan,
        clanId,
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
  }

  async function loadRulesForClans(clanNames: readonly string[]): Promise<void> {
    if (clanNames.length === 0) {
      setValidationRules([]);
      setAvailableClans([]);
      setClanIdByName(new Map());
      return;
    }
    const { data: clanRows, error: clanError } = await supabase
      .from("clans")
      .select("id,name")
      .in("name", clanNames);
    if (clanError || !clanRows) {
      setValidationRules([]);
      setAvailableClans([]);
      setClanIdByName(new Map());
      return;
    }
    const { data: availableClanRows } = await supabase.from("clans").select("name").order("name");
    const clanNameSet = new Set<string>([
      ...clanNames,
      ...clanRows.map((clan) => clan.name),
      ...(availableClanRows ?? []).map((clan) => clan.name),
    ]);
    setAvailableClans(Array.from(clanNameSet).sort((a, b) => a.localeCompare(b)));
    const clanIds = clanRows.map((clan) => clan.id);
    const { data: validationData } = await supabase
      .from("validation_rules")
      .select("id,clan_id,field,match_value,status")
      .in("clan_id", clanIds);
    setValidationRules(validationData ?? []);
    setClanIdByName(new Map(clanRows.map((clan) => [clan.name, clan.id])));
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

  const rowValidationResults = useMemo(() => {
    return rows.map((row) =>
      validationEvaluator({
        player: row.player,
        source: row.source,
        chest: row.chest,
        clan: row.clan,
        clanId: clanIdByName.get(row.clan) ?? "",
      }),
    );
  }, [clanIdByName, rows, validationEvaluator]);

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
    setErrors(result.errors);
    setHeaderErrors(result.headerErrors);
    setFileName(file.name);
    const derivedDate = parseDateFromFilename(file.name);
    setBatchDate(derivedDate ?? "");
    const { warnings, errors: validationIssues } = evaluateValidationResults(nextRows);
    setValidationMessages(warnings);
    setValidationErrors(validationIssues);
    setStatusMessage(`Parsed ${result.rows.length} rows.`);
  }

  function getCommitRows(): CommitRow[] {
    return rows.map((row, index) => ({
      collected_date: batchDate || row.date,
      player: row.player,
      source: row.source,
      chest: row.chest,
      score: row.score,
      clan: row.clan,
    }));
  }

  function toggleSelectRow(index: number): void {
    setSelectedRows((current) =>
      current.includes(index) ? current.filter((item) => item !== index) : [...current, index],
    );
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
    if (validationErrors.length > 0) {
      return false;
    }
    if (!batchDate && rows.some((row) => !row.date)) {
      return false;
    }
    return true;
  }

  async function handleCommit(): Promise<void> {
    if (!canCommit()) {
      setCommitStatus("Fix validation errors before committing.");
      return;
    }
    setIsCommitting(true);
    setCommitStatus("Committing rows to Supabase...");
    const payload = getCommitRows();
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
    setIsCommitting(false);
  }

  return (
    <>
      <div className="table-toolbar">
        <button className="button" type="button" disabled>
          Download Example
        </button>
        <button
          className="button primary"
          type="button"
          disabled={!canCommit() || isCommitting}
          onClick={handleCommit}
        >
          {isCommitting ? "Committing..." : "Commit Data"}
        </button>
        <button
          className="button danger"
          type="button"
          disabled={selectedRows.length === 0}
          onClick={handleRemoveSelectedRows}
        >
          Remove Selected
        </button>
      </div>
      <div className="grid">
        <section className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Upload CSV</div>
            <div className="card-subtitle">DATE, PLAYER, SOURCE, CHEST, SCORE, CLAN</div>
          </div>
          <span className="badge">Pattern 1</span>
        </div>
        <div className="form-group">
          <label htmlFor="csvFile">CSV File</label>
          <input id="csvFile" type="file" accept=".csv" onChange={handleFileChange} />
        </div>
        <div className="list">
          <div className="list-item">
            <span>Filename</span>
            <span className="badge">{fileName || "No file selected"}</span>
          </div>
          <div className="list-item">
            <span>Batch date (override)</span>
            <input
              type="date"
              value={batchDate}
              onChange={(event) => setBatchDate(event.target.value)}
            />
          </div>
        </div>
        {statusMessage ? <p className="text-muted">{statusMessage}</p> : null}
          {commitStatus ? <p className="text-muted">{commitStatus}</p> : null}
        </section>
        <section className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Parsing Feedback</div>
              <div className="card-subtitle">Validation and errors</div>
            </div>
            <span className="badge">Errors: {errors.length + validationErrors.length}</span>
          </div>
          {headerErrors.length > 0 ? (
            <div className="alert error">
              Header issues: {headerErrors.join(" ")}
            </div>
          ) : null}
          {validationErrors.length > 0 ? (
            <div className="alert error">
              Validation errors: {validationErrors.slice(0, 4).join(" • ")}
            </div>
          ) : null}
          {validationMessages.length > 0 ? (
            <div className="alert warn">
              Validation warnings: {validationMessages.slice(0, 4).join(" • ")}
            </div>
          ) : null}
          {errors.length === 0 && validationErrors.length === 0 ? (
            <div className="alert success">No row errors found.</div>
          ) : (
            <div className="list">
              {errors.slice(0, 6).map((error) => (
                <div key={`${error.line}-${error.message}`} className="list-item">
                  <span>Line {error.line}</span>
                  <span className="badge">{error.message}</span>
                </div>
              ))}
            </div>
          )}
      </section>
        <div className="table-scroll">
        <section className="table data-import">
          <header>
            <span>Select</span>
            <span>Date</span>
            <span>Player</span>
            <span>Source</span>
            <span>Chest</span>
            <span>Score</span>
            <span>Clan</span>
          </header>
          {rows.length === 0 ? (
            <div className="row">
              <span>No data loaded</span>
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
          ) : (
            rows.slice(0, 50).map((row, index) => {
              const validation = rowValidationResults[index];
              const rowStatus = validation?.rowStatus ?? "neutral";
              const fieldStatus = validation?.fieldStatus ?? { player: "neutral", source: "neutral", chest: "neutral", clan: "neutral" };
              return (
              <div
                className={`row ${rowStatus === "valid" ? "validation-valid" : ""} ${rowStatus === "invalid" ? "validation-invalid" : ""}`.trim()}
                key={`${row.date}-${row.player}-${row.chest}-${index}`}
              >
                <input
                  type="checkbox"
                  checked={selectedRows.includes(index)}
                  onChange={() => toggleSelectRow(index)}
                />
                <DatePicker value={row.date} onChange={(value) => updateRowValue(index, "date", value)} />
                <input
                  value={row.player}
                  className={fieldStatus.player === "invalid" ? "validation-cell-invalid" : ""}
                  onChange={(event) => updateRowValue(index, "player", event.target.value)}
                />
                <input
                  value={row.source}
                  className={fieldStatus.source === "invalid" ? "validation-cell-invalid" : ""}
                  onChange={(event) => updateRowValue(index, "source", event.target.value)}
                />
                <input
                  value={row.chest}
                  className={fieldStatus.chest === "invalid" ? "validation-cell-invalid" : ""}
                  onChange={(event) => updateRowValue(index, "chest", event.target.value)}
                />
                <input
                  value={String(row.score)}
                  onChange={(event) => updateRowValue(index, "score", event.target.value)}
                />
                <RadixSelect
                  ariaLabel="Clan"
                  value={row.clan}
                  onValueChange={(value) => updateRowValue(index, "clan", value)}
                  triggerClassName={fieldStatus.clan === "invalid" ? "select-trigger validation-cell-invalid" : undefined}
                  options={[
                    ...(!availableClans.includes(row.clan) ? [{ value: row.clan, label: row.clan }] : []),
                    ...availableClans.map((clan) => ({ value: clan, label: clan })),
                  ]}
                />
              </div>
              );
            })
          )}
        </section>
        </div>
      </div>
    </>
  );
}

export default DataImportClient;
