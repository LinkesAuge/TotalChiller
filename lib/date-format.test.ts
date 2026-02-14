import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { formatLocalDateTime, formatTimeAgo } from "./date-format";

describe("formatLocalDateTime", () => {
  it("returns empty string for empty input", () => {
    expect(formatLocalDateTime("")).toBe("");
  });

  it("returns the original value for an invalid date", () => {
    expect(formatLocalDateTime("not-a-date")).toBe("not-a-date");
  });

  it("formats a valid ISO string in de-DE locale by default", () => {
    const result = formatLocalDateTime("2026-03-15T14:30:00Z");
    // Should contain date parts (day, month, year) and time parts
    expect(result).toMatch(/15/);
    expect(result).toMatch(/03/);
    expect(result).toMatch(/2026/);
  });

  it("formats with a custom locale", () => {
    const result = formatLocalDateTime("2026-03-15T14:30:00Z", "en-US");
    expect(result).toMatch(/03/);
    expect(result).toMatch(/15/);
    expect(result).toMatch(/2026/);
  });

  it("defaults to de-DE locale", () => {
    const inputDate = "2026-01-05T09:15:00Z";
    expect(formatLocalDateTime(inputDate)).toBe(formatLocalDateTime(inputDate, "de-DE"));
  });
});

describe("formatTimeAgo", () => {
  const NOW = new Date("2026-06-15T12:00:00Z").getTime();
  const mockT = (key: string, values?: Record<string, number>) => {
    if (values?.count !== undefined) return `${key}:${values.count}`;
    return key;
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns justNow for less than 60 seconds ago", () => {
    const date = new Date(NOW - 30_000).toISOString();
    expect(formatTimeAgo(date, mockT)).toBe("justNow");
  });

  it("returns minutesAgo for less than 60 minutes", () => {
    const date = new Date(NOW - 5 * 60_000).toISOString();
    expect(formatTimeAgo(date, mockT)).toBe("minutesAgo:5");
  });

  it("returns hoursAgo for less than 24 hours", () => {
    const date = new Date(NOW - 3 * 3_600_000).toISOString();
    expect(formatTimeAgo(date, mockT)).toBe("hoursAgo:3");
  });

  it("returns daysAgo for less than 7 days", () => {
    const date = new Date(NOW - 2 * 86_400_000).toISOString();
    expect(formatTimeAgo(date, mockT)).toBe("daysAgo:2");
  });

  it("returns locale-formatted date for 7+ days", () => {
    const date = new Date(NOW - 10 * 86_400_000).toISOString();
    const result = formatTimeAgo(date, mockT, "en-US");
    // Should be a date string, not a translation key
    expect(result).toMatch(/\d/);
    expect(result).not.toBe("daysAgo:10");
  });
});
