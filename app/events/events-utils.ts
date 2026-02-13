import type { DisplayEvent, EventRow, RecurrenceType } from "./events-types";
import { toDateString } from "@/lib/dashboard-utils";

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
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
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
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  return (
    end.getTime() > start.getTime() &&
    (end.getFullYear() !== start.getFullYear() ||
      end.getMonth() !== start.getMonth() ||
      end.getDate() !== start.getDate())
  );
}

/** Format a compact date range string (e.g. "09. Feb 10:00 – 11. Feb 18:00"). */
export function formatDateRange(startsAt: string, endsAt: string, locale: string): string {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const dateOpts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  const timeOpts: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" };
  const startDate = start.toLocaleDateString(locale, dateOpts);
  const startTime = start.toLocaleTimeString(locale, timeOpts);
  const endDate = end.toLocaleDateString(locale, dateOpts);
  const endTime = end.toLocaleTimeString(locale, timeOpts);
  return `${startDate} ${startTime} – ${endDate} ${endTime}`;
}

/** @deprecated Use `toDateString` from `@/lib/dashboard-utils` directly. Re-exported for backward compatibility. */
export function toDateKey(date: Date): string {
  return toDateString(date);
}

export function parseDateKey(dateKey: string): Date | null {
  const [yearRaw, monthRaw, dayRaw] = dateKey.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  if (!year || !month || !day) {
    return null;
  }
  return new Date(year, month - 1, day);
}

export function getDateRangeKeys(startIso: string, endIso: string): readonly string[] {
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return [];
  }
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const limit = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const keys: string[] = [];
  let guard = 0;
  while (cursor <= limit && guard < 120) {
    keys.push(toDateKey(cursor));
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
    cursor.setMonth(cursor.getMonth() + 1);
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
      isVirtual: false,
    });
    if (ev.recurrence_type === "none") continue;
    const durationMs = new Date(ev.ends_at).getTime() - new Date(ev.starts_at).getTime();
    const cursor = new Date(ev.starts_at);
    const recEnd = ev.recurrence_end_date ? new Date(ev.recurrence_end_date + "T23:59:59") : horizon;
    const effectiveEnd = recEnd < horizon ? recEnd : horizon;
    let guard = 0;
    advanceCursorDate(cursor, ev.recurrence_type);
    while (cursor <= effectiveEnd && guard < 200) {
      const occStart = new Date(cursor);
      const occEnd = new Date(cursor.getTime() + durationMs);
      results.push({
        id: ev.id,
        displayKey: `${ev.id}:${toDateKey(occStart)}:${guard}`,
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
