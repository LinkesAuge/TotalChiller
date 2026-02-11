import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  toDateString,
  getMonday,
  calculateTrend,
  formatNumber,
  formatRelativeTime,
  extractAuthorName,
} from "./dashboard-utils";

describe("toDateString", () => {
  it("formats a date as YYYY-MM-DD using local time", () => {
    const actual = toDateString(new Date(2026, 1, 11, 15, 30)); // Feb 11 local
    expect(actual).toBe("2026-02-11");
  });

  it("handles year boundaries", () => {
    const actual = toDateString(new Date(2025, 11, 31, 23, 59)); // Dec 31 local
    expect(actual).toBe("2025-12-31");
  });

  it("pads single-digit months and days", () => {
    const actual = toDateString(new Date(2026, 0, 5)); // Jan 5 local
    expect(actual).toBe("2026-01-05");
  });
});

describe("getMonday", () => {
  it("returns Monday for a Wednesday", () => {
    const wed = new Date(2026, 1, 11, 12, 0); // Wed Feb 11 local
    const monday = getMonday(wed);
    expect(monday.getDay()).toBe(1);
    expect(toDateString(monday)).toBe("2026-02-09");
  });

  it("returns same day for a Monday", () => {
    const mon = new Date(2026, 1, 9, 12, 0); // Mon Feb 9 local
    const monday = getMonday(mon);
    expect(toDateString(monday)).toBe("2026-02-09");
  });

  it("returns previous Monday for a Sunday", () => {
    const sun = new Date(2026, 1, 15, 12, 0); // Sun Feb 15 local
    const monday = getMonday(sun);
    expect(monday.getDay()).toBe(1);
    expect(toDateString(monday)).toBe("2026-02-09");
  });

  it("returns Monday for a Saturday", () => {
    const sat = new Date(2026, 1, 14, 12, 0); // Sat Feb 14 local
    const monday = getMonday(sat);
    expect(toDateString(monday)).toBe("2026-02-09");
  });
});

describe("calculateTrend", () => {
  it("returns 0 when both values are 0", () => {
    expect(calculateTrend(0, 0)).toBe(0);
  });

  it("returns 100 when previous is 0 and current is positive", () => {
    expect(calculateTrend(50, 0)).toBe(100);
  });

  it("returns positive percentage for increase", () => {
    expect(calculateTrend(150, 100)).toBe(50);
  });

  it("returns negative percentage for decrease", () => {
    expect(calculateTrend(75, 100)).toBe(-25);
  });

  it("returns 0 for no change", () => {
    expect(calculateTrend(100, 100)).toBe(0);
  });

  it("rounds to nearest integer", () => {
    expect(calculateTrend(133, 100)).toBe(33);
  });
});

describe("formatNumber", () => {
  it("formats small numbers as-is", () => {
    expect(formatNumber(0)).toBe("0");
    expect(formatNumber(42)).toBe("42");
    expect(formatNumber(999)).toBe("999");
  });

  it("formats thousands with K suffix", () => {
    expect(formatNumber(1000)).toBe("1.0K");
    expect(formatNumber(1500)).toBe("1.5K");
    expect(formatNumber(99999)).toBe("100.0K");
  });

  it("formats millions with M suffix", () => {
    expect(formatNumber(1000000)).toBe("1.0M");
    expect(formatNumber(2500000)).toBe("2.5M");
  });
});

describe("formatRelativeTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-11T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 'just now' for very recent timestamps", () => {
    expect(formatRelativeTime("2026-02-11T12:00:00Z")).toBe("just now");
  });

  it("returns minutes for timestamps under 1 hour ago", () => {
    expect(formatRelativeTime("2026-02-11T11:30:00Z")).toBe("30m");
  });

  it("returns hours for timestamps under 24 hours ago", () => {
    expect(formatRelativeTime("2026-02-11T06:00:00Z")).toBe("6h");
  });

  it("returns days for timestamps over 24 hours ago", () => {
    expect(formatRelativeTime("2026-02-09T12:00:00Z")).toBe("2d");
  });
});

describe("extractAuthorName", () => {
  it("returns null for null input", () => {
    expect(extractAuthorName(null)).toBeNull();
  });

  it("prefers display_name over username", () => {
    expect(extractAuthorName({ display_name: "John", username: "john123" })).toBe("John");
  });

  it("falls back to username when display_name is null", () => {
    expect(extractAuthorName({ display_name: null, username: "john123" })).toBe("john123");
  });

  it("returns null when both are null", () => {
    expect(extractAuthorName({ display_name: null, username: null })).toBeNull();
  });

  it("returns null when both are empty strings", () => {
    expect(extractAuthorName({ display_name: "", username: "" })).toBeNull();
  });
});
