import { describe, it, expect } from "vitest";
import { normalizeString } from "./string-utils";

describe("normalizeString", () => {
  it("trims whitespace and lowercases", () => {
    expect(normalizeString("  Hello World  ")).toBe("hello world");
  });

  it("handles already normalized input", () => {
    expect(normalizeString("hello")).toBe("hello");
  });

  it("handles empty string", () => {
    expect(normalizeString("")).toBe("");
  });

  it("handles only whitespace", () => {
    expect(normalizeString("   ")).toBe("");
  });

  it("handles mixed case with leading/trailing whitespace", () => {
    expect(normalizeString("\t FoO BaR \n")).toBe("foo bar");
  });

  it("handles special characters unchanged", () => {
    expect(normalizeString(" Über-Résumé! ")).toBe("über-résumé!");
  });
});
