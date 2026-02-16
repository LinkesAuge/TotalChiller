import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { toDateString, formatRelativeTime, extractAuthorName } from "./dashboard-utils";

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
