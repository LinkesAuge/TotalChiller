/**
 * Central timezone utility — all date calculations and display use Europe/Berlin.
 *
 * Timestamps are stored as timestamptz (UTC) in the database.
 * This module ensures every "what day is it?" / "what week?" question
 * and every user-facing date string is answered in Europe/Berlin,
 * automatically handling CET ↔ CEST transitions via the Intl API.
 */

export const TIMEZONE = "Europe/Berlin";

/* ── Core conversion ── */

/** YYYY-MM-DD in Europe/Berlin for any Date or ISO string. */
export function toBerlinDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(date);
}

/** Today in Berlin as YYYY-MM-DD. */
export function berlinToday(): string {
  return toBerlinDate(new Date());
}

interface BerlinParts {
  year: number;
  month: number;
  day: number;
  dayOfWeek: number;
  hours: number;
  minutes: number;
}

/** Decompose a Date into its Berlin-local components. */
export function berlinDateParts(d?: Date | string): BerlinParts {
  const date = d ? (typeof d === "string" ? new Date(d) : d) : new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(date);

  const get = (type: string): string => parts.find((p) => p.type === type)?.value ?? "0";
  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    dayOfWeek: weekdayMap[get("weekday")] ?? 0,
    hours: Number(get("hour")) % 24,
    minutes: Number(get("minute")),
  };
}

/* ── Internal helpers ── */

/**
 * Safely produce a YYYY-MM-DD Berlin date from year/month(1-indexed)/day.
 * Handles day overflow and underflow via Date.UTC rollover (e.g. day -5 or day 35).
 */
function berlinDateFromYMD(year: number, month: number, day: number): string {
  const ref = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return toBerlinDate(ref);
}

/** Add (or subtract) days from a YYYY-MM-DD string, returning YYYY-MM-DD in Berlin. */
function addDaysBerlin(base: string, days: number): string {
  const [y, m, d] = base.split("-").map(Number);
  return berlinDateFromYMD(y!, m!, d! + days);
}

/**
 * UTC ISO string for midnight Berlin on a given date.
 * Correctly determines CET (+1) vs CEST (+2) for the given day by trying
 * both possible offsets and verifying the result.
 */
function berlinMidnightUTC(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const cetGuess = new Date(Date.UTC(y!, m! - 1, d!, -1, 0, 0, 0));
  const cetParts = berlinDateParts(cetGuess);
  if (cetParts.hours === 0 && cetParts.day === d!) {
    return cetGuess.toISOString();
  }
  return new Date(Date.UTC(y!, m! - 1, d!, -2, 0, 0, 0)).toISOString();
}

/* ── Week / day helpers (for DB query ranges) ── */

/** Monday YYYY-MM-DD of the current week in Berlin. */
function berlinWeekMonday(): string {
  const p = berlinDateParts();
  const diff = p.dayOfWeek === 0 ? 6 : p.dayOfWeek - 1;
  return berlinDateFromYMD(p.year, p.month, p.day - diff);
}

/** Monday of the current week in Berlin as UTC ISO string for DB filters. */
export function berlinWeekStartISO(): string {
  return berlinMidnightUTC(berlinWeekMonday());
}

/** Monday–Sunday of the current week as YYYY-MM-DD in Berlin. */
export function berlinWeekBounds(): { from: string; to: string } {
  const monday = berlinWeekMonday();
  const sunday = addDaysBerlin(monday, 6);
  return { from: monday, to: sunday };
}

/** Last week's Monday → this week's Monday as UTC ISO strings for DB range filters. */
export function berlinLastWeekBounds(): { start: string; end: string } {
  const thisMonday = berlinWeekMonday();
  const lastMonday = addDaysBerlin(thisMonday, -7);
  return {
    start: berlinMidnightUTC(lastMonday),
    end: berlinMidnightUTC(thisMonday),
  };
}

/** Last 7 Berlin-local days as YYYY-MM-DD strings (oldest first). */
export function berlinLast7Days(): string[] {
  const today = berlinToday();
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    days.push(addDaysBerlin(today, -i));
  }
  return days;
}

/** N days ago in Berlin as UTC ISO string for DB filters. */
export function berlinDaysAgoISO(n: number): string {
  const target = addDaysBerlin(berlinToday(), -n);
  return berlinMidnightUTC(target);
}

/** Compare-date for delta calculations (week/month back in Berlin), as UTC ISO string. */
export function berlinCompareDate(mode: "week" | "month"): string | null {
  if (mode === "week") {
    const lastMonday = addDaysBerlin(berlinWeekMonday(), -7);
    return berlinMidnightUTC(lastMonday);
  }
  if (mode === "month") {
    const p = berlinDateParts();
    const oneMonthAgo = berlinDateFromYMD(p.year, p.month - 1, p.day);
    return berlinMidnightUTC(oneMonthAgo);
  }
  return null;
}

/** Monday of the week a given date falls in (Berlin), as YYYY-MM-DD. */
export function berlinWeekKey(d: Date | string): string {
  const p = berlinDateParts(d);
  const diff = p.dayOfWeek === 0 ? 6 : p.dayOfWeek - 1;
  return berlinDateFromYMD(p.year, p.month, p.day - diff);
}

/* ── Frontend display helpers ── */

/** Formatted date: "21.02.2026" (de) or "Feb 21, 2026" (en). */
export function formatBerlinDate(d: Date | string, locale: string = "de-DE"): string {
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return String(d);
  return date.toLocaleDateString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: TIMEZONE,
  });
}

/** Formatted date + time: "21.02.2026, 14:30". */
export function formatBerlinDateTime(d: Date | string, locale: string = "de-DE"): string {
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return String(d);
  return date.toLocaleString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TIMEZONE,
  });
}

/** Berlin month bounds as YYYY-MM-DD. */
export function berlinMonthBounds(): { from: string; to: string } {
  const p = berlinDateParts();
  const firstDay = berlinDateFromYMD(p.year, p.month, 1);
  const lastDay = berlinDateFromYMD(p.year, p.month + 1, 0);
  return { from: firstDay, to: lastDay };
}
