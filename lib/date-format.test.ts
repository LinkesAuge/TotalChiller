import { describe, it, expect } from "vitest";
import { formatLocalDateTime } from "./date-format";

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
