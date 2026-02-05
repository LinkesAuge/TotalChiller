"use client";

import { useState, type ChangeEvent } from "react";
import { z } from "zod";
import createSupabaseBrowserClient from "../../lib/supabase/browser-client";
import DatePicker from "../components/date-picker";
import RadixSelect from "../components/ui/radix-select";

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
  readonly clan_id: string;
  readonly created_by: string;
  readonly updated_by: string;
}

interface RuleSummary {
  readonly id?: string;
  readonly field: string;
  readonly match_value: string;
  readonly status?: string;
  readonly replacement_value?: string;
}

interface ScoringRule {
  readonly chest_match: string;
  readonly source_match: string;
  readonly min_level: number | null;
  readonly max_level: number | null;
  readonly score: number;
  readonly rule_order: number;
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
  const [validationRules, setValidationRules] = useState<readonly RuleSummary[]>([]);
  const [correctionRules, setCorrectionRules] = useState<readonly RuleSummary[]>([]);
  const [scoringRules, setScoringRules] = useState<readonly ScoringRule[]>([]);
  const [validationMessages, setValidationMessages] = useState<readonly string[]>([]);
  const [validationErrors, setValidationErrors] = useState<readonly string[]>([]);
  const [availableClans, setAvailableClans] = useState<readonly string[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [batchDate, setBatchDate] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [commitStatus, setCommitStatus] = useState<string>("");
  const [isCommitting, setIsCommitting] = useState<boolean>(false);
  const [applyCorrections, setApplyCorrections] = useState<boolean>(false);
  const [applyScoring, setApplyScoring] = useState<boolean>(false);
  const [showDiff, setShowDiff] = useState<boolean>(false);
  const [computedScores, setComputedScores] = useState<readonly number[]>([]);
  const [manualEdits, setManualEdits] = useState<Record<number, RowEdits>>({});
  const [selectedRows, setSelectedRows] = useState<readonly number[]>([]);
  const supabase = createSupabaseBrowserClient();

  function getCorrectionSuggestion(row: CsvRow): string | null {
    for (const rule of correctionRules) {
      if (rule.field === "source" && matchesRuleValue(rule.match_value, row.source, false)) {
        return `source: ${row.source} → ${rule.replacement_value ?? ""}`;
      }
      if (rule.field === "chest" && matchesRuleValue(rule.match_value, row.chest, false)) {
        return `chest: ${row.chest} → ${rule.replacement_value ?? ""}`;
      }
      if (rule.field === "player" && matchesRuleValue(rule.match_value, row.player, false)) {
        return `player: ${row.player} → ${rule.replacement_value ?? ""}`;
      }
      if (rule.field === "clan" && matchesRuleValue(rule.match_value, row.clan, false)) {
        return `clan: ${row.clan} → ${rule.replacement_value ?? ""}`;
      }
    }
    return null;
  }

  function applyRuleCorrections(row: CsvRow): CsvRow {
    let nextRow = { ...row };
    correctionRules.forEach((rule) => {
      if (rule.field === "source" && matchesRuleValue(rule.match_value, nextRow.source, false)) {
        nextRow = { ...nextRow, source: rule.replacement_value ?? nextRow.source };
      }
      if (rule.field === "chest" && matchesRuleValue(rule.match_value, nextRow.chest, false)) {
        nextRow = { ...nextRow, chest: rule.replacement_value ?? nextRow.chest };
      }
      if (rule.field === "player" && matchesRuleValue(rule.match_value, nextRow.player, false)) {
        nextRow = { ...nextRow, player: rule.replacement_value ?? nextRow.player };
      }
      if (rule.field === "clan" && matchesRuleValue(rule.match_value, nextRow.clan, false)) {
        nextRow = { ...nextRow, clan: rule.replacement_value ?? nextRow.clan };
      }
    });
    return nextRow;
  }

  function parseLevelFromSource(source: string): number | null {
    const match = source.match(/level\s+(\d+)/i);
    if (!match) {
      return null;
    }
    const value = Number(match[1]);
    return Number.isNaN(value) ? null : value;
  }

  function escapeRegexValue(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function matchesRuleValue(ruleValue: string, targetValue: string, allowEmpty: boolean): boolean {
    const trimmedRule = ruleValue.trim();
    if (!trimmedRule) {
      return allowEmpty;
    }
    if (trimmedRule.includes("*")) {
      const regexPattern = `^${escapeRegexValue(trimmedRule).replace(/\\\*/g, ".*")}$`;
      const matcher = new RegExp(regexPattern, "i");
      return matcher.test(targetValue);
    }
    if (trimmedRule.startsWith("~")) {
      const partial = trimmedRule.slice(1).trim();
      if (!partial) {
        return allowEmpty;
      }
      return targetValue.toLowerCase().includes(partial.toLowerCase());
    }
    return targetValue.toLowerCase() === trimmedRule.toLowerCase();
  }

  function getScoredValue(row: CsvRow): number | null {
    if (scoringRules.length === 0) {
      return null;
    }
    const level = parseLevelFromSource(row.source);
    const orderedRules = [...scoringRules].sort((a, b) => a.rule_order - b.rule_order);
    for (const rule of orderedRules) {
      if (!matchesRuleValue(rule.chest_match, row.chest, true)) {
        continue;
      }
      if (!matchesRuleValue(rule.source_match, row.source, true)) {
        continue;
      }
      if (rule.min_level !== null && level !== null && level < rule.min_level) {
        continue;
      }
      if (rule.max_level !== null && level !== null && level > rule.max_level) {
        continue;
      }
      return rule.score;
    }
    return null;
  }

  function evaluateValidationResults(nextRows: readonly CsvRow[]): { warnings: string[]; errors: string[] } {
    const warnings: string[] = [];
    const errors: string[] = [];
    const clanValidRules = validationRules.filter((rule) => rule.field === "clan" && rule.status === "valid");
    const clanInvalidRules = validationRules.filter((rule) => rule.field === "clan" && rule.status === "invalid");
    nextRows.forEach((row) => {
      if (clanValidRules.length > 0) {
        const hasAllowedClan = clanValidRules.some((rule) =>
          matchesRuleValue(rule.match_value, row.clan, false),
        );
        if (!hasAllowedClan) {
          errors.push(`Clan not allowed: ${row.clan}`);
        }
      }
      clanInvalidRules.forEach((rule) => {
        if (matchesRuleValue(rule.match_value, row.clan, false)) {
          errors.push(`Invalid clan: ${row.clan}`);
        }
      });
      validationRules.forEach((rule) => {
        if (rule.status !== "invalid") {
          return;
        }
        if (rule.field === "source" && matchesRuleValue(rule.match_value, row.source, false)) {
          errors.push(`Invalid source: ${row.source}`);
        }
        if (rule.field === "chest" && matchesRuleValue(rule.match_value, row.chest, false)) {
          errors.push(`Invalid chest: ${row.chest}`);
        }
        if (rule.field === "player" && matchesRuleValue(rule.match_value, row.player, false)) {
          errors.push(`Invalid player: ${row.player}`);
        }
      });
    });
    return { warnings, errors };
  }

  async function loadRulesForClans(clanNames: readonly string[]): Promise<void> {
    if (clanNames.length === 0) {
      setValidationRules([]);
      setCorrectionRules([]);
      setAvailableClans([]);
      return;
    }
    const { data: clanRows, error: clanError } = await supabase
      .from("clans")
      .select("id,name")
      .in("name", clanNames);
    if (clanError || !clanRows) {
      setValidationRules([]);
      setCorrectionRules([]);
      setAvailableClans([]);
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
      .select("id,field,match_value,status")
      .in("clan_id", clanIds);
    const { data: correctionData } = await supabase
      .from("correction_rules")
      .select("id,field,match_value,replacement_value")
      .in("clan_id", clanIds);
    const { data: scoringData } = await supabase
      .from("scoring_rules")
      .select("chest_match,source_match,min_level,max_level,score,rule_order")
      .in("clan_id", clanIds);
    const { data: clanValidationData } = await supabase
      .from("validation_rules")
      .select("id,field,match_value,status")
      .eq("field", "clan");
    const { data: clanCorrectionData } = await supabase
      .from("correction_rules")
      .select("id,field,match_value,replacement_value")
      .eq("field", "clan");
    const mergeRules = (base: readonly RuleSummary[], extras: readonly RuleSummary[]): RuleSummary[] => {
      const combined = [...base, ...extras];
      const seen = new Set<string>();
      return combined.filter((rule) => {
        const key = `${rule.field}-${rule.match_value}-${rule.status ?? ""}-${rule.replacement_value ?? ""}`;
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      });
    };
    setValidationRules(mergeRules(validationData ?? [], clanValidationData ?? []));
    setCorrectionRules(mergeRules(correctionData ?? [], clanCorrectionData ?? []));
    setScoringRules(scoringData ?? []);
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
      const updatedScores = updated.map((row) => getScoredValue(row) ?? row.score);
      setComputedScores(updatedScores);
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
    const correctedRows = result.rows.map(applyRuleCorrections);
    const nextRows = applyCorrections ? correctedRows : result.rows;
    const scoreValues = nextRows.map((row) => getScoredValue(row) ?? row.score);
    setComputedScores(scoreValues);
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

  function getCommitRows(userId: string, clanIdByName: Map<string, string>): CommitRow[] {
    return rows.map((row, index) => ({
      collected_date: batchDate || row.date,
      player: row.player,
      source: row.source,
      chest: row.chest,
      score: applyScoring ? computedScores[index] ?? row.score : row.score,
      clan_id: clanIdByName.get(row.clan) ?? "",
      created_by: userId,
      updated_by: userId,
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
    const scoreValues = nextRows.map((row) => getScoredValue(row) ?? row.score);
    setComputedScores(scoreValues);
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
    const { data } = await supabase.auth.getUser();
    const userId = data.user?.id;
    if (!userId) {
      setCommitStatus("You must be logged in to commit data.");
      setIsCommitting(false);
      return;
    }
    const clanNames = Array.from(new Set(rows.map((row) => row.clan)));
    const { data: clanRows, error: clanFetchError } = await supabase
      .from("clans")
      .select("id,name")
      .in("name", clanNames);
    if (clanFetchError) {
      setCommitStatus(`Failed to load clans: ${clanFetchError.message}`);
      setIsCommitting(false);
      return;
    }
    const existingClanNames = new Set((clanRows ?? []).map((row) => row.name));
    const missingClanNames = clanNames.filter((name) => !existingClanNames.has(name));
    if (missingClanNames.length > 0) {
      const { error: clanInsertError } = await supabase
        .from("clans")
        .insert(missingClanNames.map((name) => ({ name })));
      if (clanInsertError) {
        setCommitStatus(`Failed to create clans: ${clanInsertError.message}`);
        setIsCommitting(false);
        return;
      }
    }
    const { data: finalClans, error: clanReloadError } = await supabase
      .from("clans")
      .select("id,name")
      .in("name", clanNames);
    if (clanReloadError) {
      setCommitStatus(`Failed to load clans: ${clanReloadError.message}`);
      setIsCommitting(false);
      return;
    }
    const clanIdByName = new Map<string, string>(
      (finalClans ?? []).map((clan) => [clan.name, clan.id]),
    );
    const { data: existingGameAccount } = await supabase
      .from("game_accounts")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    let gameAccountId = existingGameAccount?.id ?? "";
    if (!gameAccountId) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("user_db,username")
        .eq("id", userId)
        .maybeSingle();
      const fallbackUsername = profileData?.username ?? profileData?.user_db ?? "game-account";
      const { data: gameAccountData, error: gameAccountError } = await supabase
        .from("game_accounts")
        .upsert(
          {
            user_id: userId,
            game_username: fallbackUsername,
          },
          { onConflict: "user_id,game_username" },
        )
        .select("id")
        .single();
      if (gameAccountError) {
        setCommitStatus(`Failed to ensure game account: ${gameAccountError.message}`);
        setIsCommitting(false);
        return;
      }
      gameAccountId = gameAccountData?.id ?? "";
    }
    const membershipPayload = Array.from(clanIdByName.values()).map((clanId) => ({
      clan_id: clanId,
      game_account_id: gameAccountId,
      is_active: true,
    }));
    const { error: membershipError } = await supabase
      .from("game_account_clan_memberships")
      .upsert(membershipPayload, { onConflict: "game_account_id,clan_id" });
    if (membershipError) {
      setCommitStatus(`Failed to ensure clan membership: ${membershipError.message}`);
      setIsCommitting(false);
      return;
    }
    const payload = getCommitRows(userId, clanIdByName);
    if (payload.some((row) => !row.clan_id)) {
      setCommitStatus("Some rows have unknown clan names.");
      setIsCommitting(false);
      return;
    }
    const { error } = await supabase.from("chest_entries").insert(payload);
    if (error) {
      setCommitStatus(`Commit failed: ${error.message}`);
      setIsCommitting(false);
      return;
    }
    setCommitStatus(`Committed ${payload.length} rows.`);
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
        <button className="button" type="button" onClick={() => setShowDiff((value) => !value)}>
          {showDiff ? "Hide Diff" : "Preview Diff"}
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
            <div className="list-item">
              <span>Apply corrections</span>
              <RadixSelect
                ariaLabel="Apply corrections"
                value={applyCorrections ? "true" : "false"}
                onValueChange={(value) => {
                  const nextValue = value === "true";
                  setApplyCorrections(nextValue);
                  const baseRows = nextValue ? originalRows.map(applyRuleCorrections) : originalRows;
                  const nextRows = applyManualEdits(baseRows, manualEdits);
                  setRows(nextRows);
                  setComputedScores(nextRows.map((row) => getScoredValue(row) ?? row.score));
                  const { warnings, errors: validationIssues } = evaluateValidationResults(nextRows);
                  setValidationMessages(warnings);
                  setValidationErrors(validationIssues);
                }}
                options={[
                  { value: "true", label: "true" },
                  { value: "false", label: "false" },
                ]}
              />
            </div>
            <div className="list-item">
              <span>Apply scoring</span>
              <RadixSelect
                ariaLabel="Apply scoring"
                value={applyScoring ? "true" : "false"}
                onValueChange={(value) => setApplyScoring(value === "true")}
                options={[
                  { value: "true", label: "true" },
                  { value: "false", label: "false" },
                ]}
              />
            </div>
        </div>
        {statusMessage ? <p className="text-muted">{statusMessage}</p> : null}
          {commitStatus ? <p className="text-muted">{commitStatus}</p> : null}
        </section>
        {showDiff ? (
          <section className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Preview Diff</div>
                <div className="card-subtitle">Corrections and scoring changes</div>
              </div>
            </div>
            <div className="list">
              {rows.length === 0 ? (
                <div className="list-item">
                  <span>No rows to compare</span>
                </div>
              ) : (
                rows.slice(0, 6).map((row, index) => {
                  const originalRow = originalRows[index] ?? row;
                  const diffParts: string[] = [];
                  if (originalRow.player !== row.player) {
                    diffParts.push(`player: ${originalRow.player} → ${row.player}`);
                  }
                  if (originalRow.source !== row.source) {
                    diffParts.push(`source: ${originalRow.source} → ${row.source}`);
                  }
                  if (originalRow.chest !== row.chest) {
                    diffParts.push(`chest: ${originalRow.chest} → ${row.chest}`);
                  }
                  if (originalRow.clan !== row.clan) {
                    diffParts.push(`clan: ${originalRow.clan} → ${row.clan}`);
                  }
                  if (applyScoring && computedScores[index] !== undefined && computedScores[index] !== row.score) {
                    diffParts.push(`score: ${row.score} → ${computedScores[index]}`);
                  }
                  return (
                    <div key={`${row.date}-${row.player}-${row.chest}`} className="list-item">
                      <span>{diffParts.length ? diffParts.join(" • ") : "No changes"}</span>
                      <span className="badge">{row.player}</span>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        ) : null}
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
            rows.slice(0, 50).map((row, index) => (
              <div className="row" key={`${row.date}-${row.player}-${row.chest}-${index}`}>
                <input
                  type="checkbox"
                  checked={selectedRows.includes(index)}
                  onChange={() => toggleSelectRow(index)}
                />
                <DatePicker value={row.date} onChange={(value) => updateRowValue(index, "date", value)} />
                <input
                  value={row.player}
                  onChange={(event) => updateRowValue(index, "player", event.target.value)}
                />
                <input
                  value={row.source}
                  onChange={(event) => updateRowValue(index, "source", event.target.value)}
                />
                <input
                  value={row.chest}
                  onChange={(event) => updateRowValue(index, "chest", event.target.value)}
                />
                <input
                  value={applyScoring ? String(computedScores[index] ?? row.score) : String(row.score)}
                  onChange={(event) => updateRowValue(index, "score", event.target.value)}
                  disabled={applyScoring}
                />
                <RadixSelect
                  ariaLabel="Clan"
                  value={row.clan}
                  onValueChange={(value) => updateRowValue(index, "clan", value)}
                  options={[
                    ...(!availableClans.includes(row.clan) ? [{ value: row.clan, label: row.clan }] : []),
                    ...availableClans.map((clan) => ({ value: clan, label: clan })),
                  ]}
                />
              </div>
            ))
          )}
        </section>
      </div>
    </>
  );
}

export default DataImportClient;
