import { z } from "zod";
import { DATE_REGEX } from "@/lib/constants";
import type { CsvRow, ParseError, ParseResult } from "./data-import-types";
import { REQUIRED_HEADERS } from "./data-import-types";

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

export function parseCsvLine(line: string): string[] {
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

export function parseCsvText(csvText: string): ParseResult {
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

export function getRowValidationErrors(nextRows: readonly CsvRow[]): ParseError[] {
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
