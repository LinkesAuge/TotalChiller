import type { DisplayEvent, EventRow, RecurrenceType } from "./events-types";
import { toDateString } from "@/lib/dashboard-utils";
import { TIMEZONE, berlinDateParts } from "@/lib/timezone";

/* ── Date helpers ── */

/**
 * Convert a Date (or UTC ISO string) to a local "YYYY-MM-DDTHH:mm" string
 * suitable for datetime-local inputs and Flatpickr.
 *
 * Avoids the common pitfall of `.toISOString().slice(0,16)` which keeps
 * UTC digits and drops the "Z", causing the value to be mis-interpreted
 * as local time.
 */
export function toLocalDateTimeString(input: Date | string): string {
  const d = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) return "";
  const p = berlinDateParts(d);
  const yyyy = p.year;
  const mm = String(p.month).padStart(2, "0");
  const dd = String(p.day).padStart(2, "0");
  const hh = String(p.hours).padStart(2, "0");
  const mi = String(p.minutes).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

/** Human-readable duration from a decimal hours value (e.g. 1.5 → "1h 30min"). */
export function formatDurationFromHours(hours: number): string {
  if (hours <= 0) return "—";
  const totalMin = Math.round(hours * 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0 && m > 0) return `${h}h ${m}min`;
  if (h > 0) return `${h}h`;
  return `${m}min`;
}

/** Human-readable duration from two ISO timestamps. Shows days for multi-day events. */
export function formatDuration(startsAt: string, endsAt: string): string {
  const ms = new Date(endsAt).getTime() - new Date(startsAt).getTime();
  if (ms <= 0) return "Open-ended";
  const totalMin = Math.round(ms / 60000);
  const d = Math.floor(totalMin / 1440);
  const h = Math.floor((totalMin % 1440) / 60);
  const m = totalMin % 60;
  if (d > 0 && h > 0) return `${d}d ${h}h`;
  if (d > 0) return `${d}d`;
  if (h > 0 && m > 0) return `${h}h ${m}min`;
  if (h > 0) return `${h}h`;
  return `${m}min`;
}

/** Check whether an event spans more than one calendar day. */
export function isMultiDayEvent(startsAt: string, endsAt: string): boolean {
  const start = berlinDateParts(startsAt);
  const end = berlinDateParts(endsAt);
  return (
    new Date(endsAt).getTime() > new Date(startsAt).getTime() &&
    (end.year !== start.year || end.month !== start.month || end.day !== start.day)
  );
}

/** Format a compact date range string (e.g. "09. Feb 10:00 – 11. Feb 18:00"). */
export function formatDateRange(startsAt: string, endsAt: string, locale: string): string {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const dateOpts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", timeZone: TIMEZONE };
  const timeOpts: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit", timeZone: TIMEZONE };
  const startDate = start.toLocaleDateString(locale, dateOpts);
  const startTime = start.toLocaleTimeString(locale, timeOpts);
  const endDate = end.toLocaleDateString(locale, dateOpts);
  const endTime = end.toLocaleTimeString(locale, timeOpts);
  return `${startDate} ${startTime} – ${endDate} ${endTime}`;
}

export function parseDateKey(dateKey: string): Date | null {
  const [yearRaw, monthRaw, dayRaw] = dateKey.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  if (!year || !month || !day) {
    return null;
  }
  const d = new Date(year, month - 1, day);
  /* Reject invalid dates like Feb 30 (JS rolls over to Mar 2). */
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) {
    return null;
  }
  return d;
}

export function getDateRangeKeys(startIso: string, endIso: string): readonly string[] {
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return [];
  }
  const sp = berlinDateParts(start);
  const ep = berlinDateParts(end);
  const cursor = new Date(sp.year, sp.month - 1, sp.day);
  const limit = new Date(ep.year, ep.month - 1, ep.day);
  const keys: string[] = [];
  let guard = 0;
  while (cursor <= limit && guard < 120) {
    keys.push(toDateString(cursor));
    cursor.setDate(cursor.getDate() + 1);
    guard += 1;
  }
  return keys;
}

/* ── Recurrence expansion (module-level, pure) ── */

export function advanceCursorDate(cursor: Date, type: RecurrenceType): void {
  if (type === "daily") {
    cursor.setDate(cursor.getDate() + 1);
  } else if (type === "weekly") {
    cursor.setDate(cursor.getDate() + 7);
  } else if (type === "biweekly") {
    cursor.setDate(cursor.getDate() + 14);
  } else if (type === "monthly") {
    /* Clamp to last day of target month to avoid rollover
       (e.g. Jan 31 + 1 month → Feb 28, not Mar 2/3). */
    const originalDay = cursor.getDate();
    cursor.setDate(1);
    cursor.setMonth(cursor.getMonth() + 1);
    const maxDay = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    cursor.setDate(Math.min(originalDay, maxDay));
  }
}

/**
 * Expand recurring events into virtual occurrences up to a horizon date.
 * Non-recurring events pass through as-is.
 * Returns a sorted list of DisplayEvent.
 */
export function expandRecurringEvents(sourceEvents: readonly EventRow[], horizon: Date): DisplayEvent[] {
  const results: DisplayEvent[] = [];
  for (const ev of sourceEvents) {
    /* Always include the original event */
    results.push({
      id: ev.id,
      displayKey: ev.id,
      title: ev.title,
      description: ev.description,
      location: ev.location,
      starts_at: ev.starts_at,
      ends_at: ev.ends_at,
      created_at: ev.created_at,
      organizer: ev.organizer,
      author_name: ev.author_name,
      recurrence_type: ev.recurrence_type,
      recurrence_end_date: ev.recurrence_end_date,
      banner_url: ev.banner_url,
      is_pinned: ev.is_pinned,
      forum_post_id: ev.forum_post_id,
      updated_at: ev.updated_at,
      event_type_id: ev.event_type_id,
      isVirtual: false,
    });
    if (ev.recurrence_type === "none") continue;
    const durationMs = new Date(ev.ends_at).getTime() - new Date(ev.starts_at).getTime();
    const cursor = new Date(ev.starts_at);
    /* Use UTC end-of-day so the comparison with UTC-based starts_at is consistent. */
    const recEnd = ev.recurrence_end_date ? new Date(ev.recurrence_end_date + "T23:59:59Z") : horizon;
    const effectiveEnd = recEnd < horizon ? recEnd : horizon;
    let guard = 0;
    advanceCursorDate(cursor, ev.recurrence_type);
    while (cursor <= effectiveEnd && guard < 200) {
      const occStart = new Date(cursor);
      const occEnd = new Date(cursor.getTime() + durationMs);
      results.push({
        id: ev.id,
        displayKey: `${ev.id}:${toDateString(occStart)}:${guard}`,
        title: ev.title,
        description: ev.description,
        location: ev.location,
        starts_at: occStart.toISOString(),
        ends_at: occEnd.toISOString(),
        created_at: ev.created_at,
        organizer: ev.organizer,
        author_name: ev.author_name,
        recurrence_type: ev.recurrence_type,
        recurrence_end_date: ev.recurrence_end_date,
        banner_url: ev.banner_url,
        is_pinned: ev.is_pinned,
        forum_post_id: ev.forum_post_id,
        updated_at: ev.updated_at,
        event_type_id: ev.event_type_id,
        isVirtual: true,
      });
      advanceCursorDate(cursor, ev.recurrence_type);
      guard += 1;
    }
  }
  return results.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
}

/** Sort an array of DisplayEvents so pinned events appear first, preserving relative order otherwise. */
export function sortPinnedFirst<T extends { readonly is_pinned: boolean }>(events: readonly T[]): T[] {
  return [...events].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return 0;
  });
}

/* ── Shared display helpers ── */

/** Returns a short weekday abbreviation, day number, and month from a date string. */
export function getDateBadgeParts(dateString: string, locale: string): { weekday: string; day: string; month: string } {
  const d = new Date(dateString);
  return {
    weekday: d.toLocaleDateString(locale, { weekday: "short", timeZone: TIMEZONE }),
    day: String(berlinDateParts(d).day),
    month: d.toLocaleDateString(locale, { month: "short", timeZone: TIMEZONE }),
  };
}

/** Returns a short time string (HH:MM) from a date string. */
export function getShortTimeString(dateString: string, locale: string): string {
  return new Date(dateString).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", timeZone: TIMEZONE });
}

/**
 * Sort banner events for the split-banner calendar display.
 * Earlier start comes first; if starts are equal, earlier end comes first.
 */
export function sortBannerEvents<T extends { starts_at: string; ends_at: string }>(events: readonly T[]): readonly T[] {
  return [...events].sort((a, b) => {
    const startCmp = a.starts_at.localeCompare(b.starts_at);
    if (startCmp !== 0) return startCmp;
    return a.ends_at.localeCompare(b.ends_at);
  });
}

/** Returns a human-readable recurrence label from a recurrence type. */
export function getRecurrenceLabel(recurrenceType: string, t: (key: string) => string): string {
  switch (recurrenceType) {
    case "daily":
      return t("recurrenceDailyLabel");
    case "weekly":
      return t("recurrenceWeeklyLabel");
    case "biweekly":
      return t("recurrenceBiweeklyLabel");
    case "monthly":
      return t("recurrenceMonthlyLabel");
    default:
      return "";
  }
}
