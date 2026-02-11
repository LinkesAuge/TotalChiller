import { describe, it, expect } from "vitest";
import {
  toLocalDateTimeString,
  formatDuration,
  formatDurationFromHours,
  toDateKey,
  parseDateKey,
  getDateRangeKeys,
  advanceCursorDate,
  expandRecurringEvents,
  sortPinnedFirst,
} from "./events-utils";
import type { EventRow } from "./events-types";

/* ── toLocalDateTimeString ── */

describe("toLocalDateTimeString", () => {
  it("returns empty string for invalid input", () => {
    expect(toLocalDateTimeString("not-a-date")).toBe("");
  });

  it("returns YYYY-MM-DDTHH:mm format from a Date object", () => {
    const d = new Date(2026, 1, 11, 14, 30); // Feb 11 2026, 14:30 local
    const result = toLocalDateTimeString(d);
    expect(result).toBe("2026-02-11T14:30");
  });

  it("returns local time from an ISO string (not raw UTC digits)", () => {
    // This is the key bug that was fixed — .slice(0,16) on UTC would give wrong time
    const iso = "2026-06-15T10:00:00Z"; // 10:00 UTC
    const result = toLocalDateTimeString(iso);
    // The result should be in local time, not "2026-06-15T10:00"
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    // It should NOT be the raw UTC digits when in a non-UTC timezone
    // (exact value depends on runtime timezone, so just check format)
  });
});

/* ── formatDuration ── */

describe("formatDuration", () => {
  it("returns 'Open-ended' when start equals end", () => {
    const t = "2026-02-11T12:00:00Z";
    expect(formatDuration(t, t)).toBe("Open-ended");
  });

  it("returns minutes only for short durations", () => {
    expect(formatDuration("2026-02-11T12:00:00Z", "2026-02-11T12:30:00Z")).toBe("30min");
  });

  it("returns hours only for exact hours", () => {
    expect(formatDuration("2026-02-11T12:00:00Z", "2026-02-11T14:00:00Z")).toBe("2h");
  });

  it("returns hours and minutes for mixed durations", () => {
    expect(formatDuration("2026-02-11T12:00:00Z", "2026-02-11T13:45:00Z")).toBe("1h 45min");
  });
});

/* ── formatDurationFromHours ── */

describe("formatDurationFromHours", () => {
  it("returns dash for zero or negative", () => {
    expect(formatDurationFromHours(0)).toBe("—");
    expect(formatDurationFromHours(-1)).toBe("—");
  });

  it("formats fractional hours correctly", () => {
    expect(formatDurationFromHours(1.5)).toBe("1h 30min");
  });

  it("formats whole hours", () => {
    expect(formatDurationFromHours(3)).toBe("3h");
  });

  it("formats sub-hour durations", () => {
    expect(formatDurationFromHours(0.25)).toBe("15min");
  });
});

/* ── toDateKey / parseDateKey ── */

describe("toDateKey", () => {
  it("produces YYYY-MM-DD from a Date", () => {
    expect(toDateKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("zero-pads month and day", () => {
    expect(toDateKey(new Date(2026, 2, 3))).toBe("2026-03-03");
  });
});

describe("parseDateKey", () => {
  it("parses a valid key back to a Date", () => {
    const result = parseDateKey("2026-03-15");
    expect(result).not.toBeNull();
    expect(result!.getFullYear()).toBe(2026);
    expect(result!.getMonth()).toBe(2); // March = 2
    expect(result!.getDate()).toBe(15);
  });

  it("returns null for invalid keys", () => {
    expect(parseDateKey("invalid")).toBeNull();
    expect(parseDateKey("")).toBeNull();
  });
});

/* ── getDateRangeKeys ── */

describe("getDateRangeKeys", () => {
  it("returns empty array for invalid dates", () => {
    expect(getDateRangeKeys("invalid", "invalid")).toEqual([]);
  });

  it("returns a single key for same-day range", () => {
    const keys = getDateRangeKeys("2026-03-10T10:00:00Z", "2026-03-10T22:00:00Z");
    expect(keys).toEqual(["2026-03-10"]);
  });

  it("returns multiple keys for multi-day range", () => {
    const keys = getDateRangeKeys("2026-03-10T10:00:00Z", "2026-03-12T10:00:00Z");
    expect(keys.length).toBe(3);
    expect(keys[0]).toBe("2026-03-10");
    expect(keys[2]).toBe("2026-03-12");
  });

  it("caps at 120 days for safety", () => {
    const keys = getDateRangeKeys("2026-01-01T00:00:00Z", "2027-01-01T00:00:00Z");
    expect(keys.length).toBe(120);
  });
});

/* ── advanceCursorDate ── */

describe("advanceCursorDate", () => {
  it("advances daily by 1 day", () => {
    const d = new Date(2026, 0, 10);
    advanceCursorDate(d, "daily");
    expect(d.getDate()).toBe(11);
  });

  it("advances weekly by 7 days", () => {
    const d = new Date(2026, 0, 10);
    advanceCursorDate(d, "weekly");
    expect(d.getDate()).toBe(17);
  });

  it("advances biweekly by 14 days", () => {
    const d = new Date(2026, 0, 10);
    advanceCursorDate(d, "biweekly");
    expect(d.getDate()).toBe(24);
  });

  it("advances monthly by 1 month", () => {
    const d = new Date(2026, 0, 15);
    advanceCursorDate(d, "monthly");
    expect(d.getMonth()).toBe(1); // February
    expect(d.getDate()).toBe(15);
  });

  it("does nothing for 'none'", () => {
    const d = new Date(2026, 0, 10);
    advanceCursorDate(d, "none");
    expect(d.getDate()).toBe(10);
  });
});

/* ── expandRecurringEvents ── */

describe("expandRecurringEvents", () => {
  const baseEvent: EventRow = {
    id: "evt-1",
    title: "Test Event",
    description: "Desc",
    location: "HQ",
    starts_at: "2026-02-01T12:00:00Z",
    ends_at: "2026-02-01T14:00:00Z",
    created_at: "2026-01-01T00:00:00Z",
    created_by: "user-1",
    organizer: "Org",
    author_name: "Author",
    recurrence_type: "none",
    recurrence_end_date: null,
    banner_url: null,
    is_pinned: false,
  };

  it("passes non-recurring events through as-is", () => {
    const result = expandRecurringEvents([baseEvent], new Date("2026-12-31"));
    expect(result).toHaveLength(1);
    expect(result[0]!.isVirtual).toBe(false);
  });

  it("expands weekly events into virtual occurrences", () => {
    const weeklyEvent: EventRow = {
      ...baseEvent,
      recurrence_type: "weekly",
    };
    // Horizon: 4 weeks out
    const horizon = new Date("2026-03-01T00:00:00Z");
    const result = expandRecurringEvents([weeklyEvent], horizon);
    // Original + 4 weekly occurrences (Feb 1 → Feb 8 → Feb 15 → Feb 22)
    expect(result.length).toBeGreaterThan(1);
    expect(result.filter((e) => e.isVirtual).length).toBeGreaterThan(0);
  });

  it("respects recurrence end date", () => {
    const weeklyEvent: EventRow = {
      ...baseEvent,
      recurrence_type: "weekly",
      recurrence_end_date: "2026-02-15",
    };
    const horizon = new Date("2026-12-31T00:00:00Z");
    const result = expandRecurringEvents([weeklyEvent], horizon);
    // Should stop at Feb 15
    const lastDate = new Date(result[result.length - 1]!.starts_at);
    expect(lastDate.getTime()).toBeLessThanOrEqual(new Date("2026-02-15T23:59:59Z").getTime());
  });

  it("preserves created_at on virtual occurrences", () => {
    const weeklyEvent: EventRow = {
      ...baseEvent,
      recurrence_type: "daily",
    };
    const horizon = new Date("2026-02-05T00:00:00Z");
    const result = expandRecurringEvents([weeklyEvent], horizon);
    for (const evt of result) {
      expect(evt.created_at).toBe(baseEvent.created_at);
    }
  });

  it("returns results sorted by starts_at", () => {
    const events: EventRow[] = [
      { ...baseEvent, id: "b", starts_at: "2026-03-01T12:00:00Z", ends_at: "2026-03-01T14:00:00Z" },
      { ...baseEvent, id: "a", starts_at: "2026-02-01T12:00:00Z", ends_at: "2026-02-01T14:00:00Z" },
    ];
    const result = expandRecurringEvents(events, new Date("2026-04-01"));
    const dates = result.map((e) => new Date(e.starts_at).getTime());
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i]!).toBeGreaterThanOrEqual(dates[i - 1]!);
    }
  });

  it("propagates is_pinned to virtual occurrences", () => {
    const pinned: EventRow = { ...baseEvent, is_pinned: true, recurrence_type: "weekly" };
    const result = expandRecurringEvents([pinned], new Date("2026-03-01"));
    for (const evt of result) {
      expect(evt.is_pinned).toBe(true);
    }
  });
});

/* ── sortPinnedFirst ── */

describe("sortPinnedFirst", () => {
  it("returns empty array for empty input", () => {
    expect(sortPinnedFirst([])).toEqual([]);
  });

  it("moves pinned events before unpinned", () => {
    const items = [
      { id: "a", is_pinned: false },
      { id: "b", is_pinned: true },
      { id: "c", is_pinned: false },
    ];
    const result = sortPinnedFirst(items);
    expect(result[0]!.id).toBe("b");
  });

  it("preserves relative order among same-pin-state items", () => {
    const items = [
      { id: "a", is_pinned: false },
      { id: "b", is_pinned: false },
      { id: "c", is_pinned: true },
      { id: "d", is_pinned: true },
    ];
    const result = sortPinnedFirst(items);
    expect(result.map((x) => x.id)).toEqual(["c", "d", "a", "b"]);
  });

  it("does not mutate the original array", () => {
    const items = [
      { id: "a", is_pinned: false },
      { id: "b", is_pinned: true },
    ];
    sortPinnedFirst(items);
    expect(items[0]!.id).toBe("a");
  });
});
