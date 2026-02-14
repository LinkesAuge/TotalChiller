import { describe, it, expect } from "vitest";

// Pure computation helpers mirroring usePagination logic (no React)
function totalPages(totalItems: number, pageSize: number): number {
  return Math.max(1, Math.ceil(totalItems / pageSize));
}

function startIndex(page: number, pageSize: number): number {
  return (page - 1) * pageSize;
}

function endIndex(page: number, pageSize: number, totalItems: number): number {
  return Math.min(page * pageSize, totalItems);
}

function clampPageValue(raw: string, totalPagesVal: number): number | null {
  const num = Number(raw);
  if (Number.isNaN(num)) return null;
  if (num < 1) return 1;
  if (num > totalPagesVal) return totalPagesVal;
  return num;
}

describe("usePagination pure logic", () => {
  describe("totalPages", () => {
    it("0 items = 1", () => {
      expect(totalPages(0, 50)).toBe(1);
    });
    it("1 item = 1", () => {
      expect(totalPages(1, 50)).toBe(1);
    });
    it("50 items = 1", () => {
      expect(totalPages(50, 50)).toBe(1);
    });
    it("51 items = 2", () => {
      expect(totalPages(51, 50)).toBe(2);
    });
    it("100 items = 2", () => {
      expect(totalPages(100, 50)).toBe(2);
    });
    it("101 items = 3", () => {
      expect(totalPages(101, 50)).toBe(3);
    });
    it("10 items / pageSize 5 = 2", () => {
      expect(totalPages(10, 5)).toBe(2);
    });
    it("11 items / pageSize 5 = 3", () => {
      expect(totalPages(11, 5)).toBe(3);
    });
  });

  describe("startIndex", () => {
    it("page 1 = 0", () => {
      expect(startIndex(1, 50)).toBe(0);
    });
    it("page 2 with pageSize 50 = 50", () => {
      expect(startIndex(2, 50)).toBe(50);
    });
    it("page 3 with pageSize 25 = 50", () => {
      expect(startIndex(3, 25)).toBe(50);
    });
  });

  describe("endIndex", () => {
    it("page 1 / pageSize 50 / totalItems 100 = 50", () => {
      expect(endIndex(1, 50, 100)).toBe(50);
    });
    it("page 2 / pageSize 50 / totalItems 75 = 75 (clamped)", () => {
      expect(endIndex(2, 50, 75)).toBe(75);
    });
    it("page 1 / pageSize 50 / totalItems 30 = 30", () => {
      expect(endIndex(1, 50, 30)).toBe(30);
    });
  });

  describe("clampPageValue", () => {
    it('"1" = 1', () => {
      expect(clampPageValue("1", 10)).toBe(1);
    });
    it('"abc" = null', () => {
      expect(clampPageValue("abc", 10)).toBeNull();
    });
    it('"0" = 1', () => {
      expect(clampPageValue("0", 10)).toBe(1);
    });
    it('"-5" = 1', () => {
      expect(clampPageValue("-5", 10)).toBe(1);
    });
    it('"999" with totalPages 10 = 10', () => {
      expect(clampPageValue("999", 10)).toBe(10);
    });
    it('"5" with totalPages 10 = 5', () => {
      expect(clampPageValue("5", 10)).toBe(5);
    });
  });
});
