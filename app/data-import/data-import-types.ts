/**
 * Shared types and constants for the data import feature.
 */

export interface CsvRow {
  readonly date: string;
  readonly player: string;
  readonly source: string;
  readonly chest: string;
  readonly score: number;
  readonly clan: string;
}

export interface ParseError {
  readonly line: number;
  readonly message: string;
}

export interface ParseResult {
  readonly rows: CsvRow[];
  readonly errors: ParseError[];
  readonly headerErrors: string[];
}

export interface CommitRow {
  readonly collected_date: string;
  readonly player: string;
  readonly source: string;
  readonly chest: string;
  readonly score: number;
  readonly clan: string;
}

export interface CorrectionMatch {
  readonly value: string;
  readonly wasCorrected: boolean;
  readonly ruleId?: string;
  readonly from?: string;
  readonly to?: string;
  readonly ruleField?: string;
}

export type RowEdits = Partial<CsvRow>;
export type CorrectionField = "player" | "source" | "chest" | "clan";
export type CorrectionMap = Record<number, Partial<Record<CorrectionField, CorrectionMatch>>>;
export type ImportSortKey = "index" | "date" | "player" | "source" | "chest" | "score" | "clan";

export interface IndexedRow {
  readonly row: CsvRow;
  readonly index: number;
}

export const REQUIRED_HEADERS: readonly string[] = ["DATE", "PLAYER", "SOURCE", "CHEST", "SCORE", "CLAN"];

export const COMMIT_STATUS_TIMEOUT_MS: number = 5000;

export const importSortOptions: readonly { value: ImportSortKey; labelKey: string }[] = [
  { value: "index", labelKey: "tableHeaderIndex" },
  { value: "date", labelKey: "tableHeaderDate" },
  { value: "player", labelKey: "tableHeaderPlayer" },
  { value: "source", labelKey: "tableHeaderSource" },
  { value: "chest", labelKey: "tableHeaderChest" },
  { value: "score", labelKey: "tableHeaderScore" },
  { value: "clan", labelKey: "tableHeaderClan" },
];
