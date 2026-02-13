import { describe, it, expect } from "vitest";
import { compareValues } from "./use-sortable";

/* ------------------------------------------------------------------ */
/*  compareValues                                                      */
/* ------------------------------------------------------------------ */

describe("compareValues", () => {
  describe("string comparison", () => {
    it("returns negative when left < right in ascending order", () => {
      const left = "apple";
      const right = "banana";
      const actual = compareValues(left, right, "asc");
      expect(actual).toBeLessThan(0);
    });

    it("returns positive when left > right in ascending order", () => {
      const left = "zebra";
      const right = "apple";
      const actual = compareValues(left, right, "asc");
      expect(actual).toBeGreaterThan(0);
    });

    it("returns 0 when strings are equal in ascending order", () => {
      const left = "same";
      const right = "same";
      const actual = compareValues(left, right, "asc");
      expect(actual).toBe(0);
    });

    it("returns negative when left > right in descending order", () => {
      const left = "zebra";
      const right = "apple";
      const actual = compareValues(left, right, "desc");
      expect(actual).toBeLessThan(0);
    });

    it("returns positive when left < right in descending order", () => {
      const left = "apple";
      const right = "banana";
      const actual = compareValues(left, right, "desc");
      expect(actual).toBeGreaterThan(0);
    });

    it("uses case-insensitive comparison (sensitivity base)", () => {
      const left = "Apple";
      const right = "apple";
      const actual = compareValues(left, right, "asc");
      expect(actual).toBe(0);
    });
  });

  describe("number comparison", () => {
    it("returns negative when left < right in ascending order", () => {
      const left = 10;
      const right = 20;
      const actual = compareValues(left, right, "asc");
      expect(actual).toBe(-10);
    });

    it("returns positive when left > right in ascending order", () => {
      const left = 100;
      const right = 50;
      const actual = compareValues(left, right, "asc");
      expect(actual).toBe(50);
    });

    it("returns 0 when numbers are equal in ascending order", () => {
      const left = 42;
      const right = 42;
      const actual = compareValues(left, right, "asc");
      expect(actual).toBe(0);
    });

    it("returns negative when left > right in descending order", () => {
      const left = 100;
      const right = 50;
      const actual = compareValues(left, right, "desc");
      expect(actual).toBeLessThan(0);
    });

    it("returns positive when left < right in descending order", () => {
      const left = 10;
      const right = 20;
      const actual = compareValues(left, right, "desc");
      expect(actual).toBeGreaterThan(0);
    });

    it("handles negative numbers", () => {
      const actual = compareValues(-5, 5, "asc");
      expect(actual).toBe(-10);
    });

    it("handles zero", () => {
      const actual = compareValues(0, 0, "asc");
      expect(actual).toBe(0);
    });
  });

  describe("null and undefined handling", () => {
    it("sorts null/undefined to end in ascending order (left null)", () => {
      const actual = compareValues(null, "a", "asc");
      expect(actual).toBe(1);
    });

    it("sorts null/undefined to end in ascending order (right null)", () => {
      const actual = compareValues("a", null, "asc");
      expect(actual).toBe(-1);
    });

    it("sorts null/undefined to end in ascending order (left undefined)", () => {
      const actual = compareValues(undefined, "a", "asc");
      expect(actual).toBe(1);
    });

    it("sorts null/undefined to end in ascending order (right undefined)", () => {
      const actual = compareValues("a", undefined, "asc");
      expect(actual).toBe(-1);
    });

    it("sorts null/undefined to start in descending order (left null)", () => {
      const actual = compareValues(null, "a", "desc");
      expect(actual).toBe(-1);
    });

    it("sorts null/undefined to start in descending order (right null)", () => {
      const actual = compareValues("a", null, "desc");
      expect(actual).toBe(1);
    });

    it("returns 0 when both are null", () => {
      const actual = compareValues(null, null, "asc");
      expect(actual).toBe(0);
    });

    it("returns 0 when both are undefined", () => {
      const actual = compareValues(undefined, undefined, "asc");
      expect(actual).toBe(0);
    });

    it("treats null and undefined as distinct (null sorts after undefined in asc)", () => {
      const actual = compareValues(null, undefined, "asc");
      expect(actual).toBe(1);
    });
  });

  describe("equal values", () => {
    it("returns 0 for equal strings", () => {
      const actual = compareValues("identical", "identical", "asc");
      expect(actual).toBe(0);
    });

    it("returns 0 for equal numbers", () => {
      const actual = compareValues(999, 999, "desc");
      expect(actual).toBe(0);
    });

    it("returns 0 when left === right (same reference for objects not applicable - primitives)", () => {
      const val = 42;
      const actual = compareValues(val, val, "asc");
      expect(actual).toBe(0);
    });
  });

  describe("mixed types (coerced to string)", () => {
    it("compares number and string via string coercion (42 and '42' are equal)", () => {
      const actual = compareValues(42, "42", "asc");
      expect(actual).toBe(0);
    });

    it("compares number and different string as unequal", () => {
      const actual = compareValues(42, "100", "asc");
      expect(actual).not.toBe(0);
    });
  });
});
