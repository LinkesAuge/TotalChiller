import { describe, it, expect } from "vitest";
import { formatFileSize } from "./design-system-types";

/* ------------------------------------------------------------------ */
/*  formatFileSize                                                     */
/* ------------------------------------------------------------------ */

describe("formatFileSize", () => {
  describe("bytes", () => {
    it("formats 1 byte as '1 B'", () => {
      const input = 1;
      const actual = formatFileSize(input);
      expect(actual).toBe("1 B");
    });

    it("formats 500 bytes as '500 B'", () => {
      const input = 500;
      const actual = formatFileSize(input);
      expect(actual).toBe("500 B");
    });

    it("formats 1023 bytes as '1023 B'", () => {
      const input = 1023;
      const actual = formatFileSize(input);
      expect(actual).toBe("1023 B");
    });
  });

  describe("kilobytes", () => {
    it("formats 1024 bytes as '1.0 KB'", () => {
      const input = 1024;
      const actual = formatFileSize(input);
      expect(actual).toBe("1.0 KB");
    });

    it("formats 2048 bytes as '2.0 KB'", () => {
      const input = 2048;
      const actual = formatFileSize(input);
      expect(actual).toBe("2.0 KB");
    });

    it("formats 1536 bytes as '1.5 KB'", () => {
      const input = 1536;
      const actual = formatFileSize(input);
      expect(actual).toBe("1.5 KB");
    });

    it("formats 1024 * 1024 - 1 bytes as KB", () => {
      const input = 1024 * 1024 - 1;
      const actual = formatFileSize(input);
      expect(actual).toBe("1024.0 KB");
    });
  });

  describe("megabytes", () => {
    it("formats 1 MB as '1.0 MB'", () => {
      const input = 1024 * 1024;
      const actual = formatFileSize(input);
      expect(actual).toBe("1.0 MB");
    });

    it("formats 2.5 MB correctly", () => {
      const input = Math.round(2.5 * 1024 * 1024);
      const actual = formatFileSize(input);
      expect(actual).toBe("2.5 MB");
    });

    it("formats 100 MB correctly", () => {
      const input = 100 * 1024 * 1024;
      const actual = formatFileSize(input);
      expect(actual).toBe("100.0 MB");
    });
  });

  describe("gigabytes (very large numbers)", () => {
    it("formats 1 GB as MB (function only goes up to MB)", () => {
      const input = 1024 * 1024 * 1024;
      const actual = formatFileSize(input);
      expect(actual).toBe("1024.0 MB");
    });

    it("formats 3 GB as MB", () => {
      const input = 3 * 1024 * 1024 * 1024;
      const actual = formatFileSize(input);
      expect(actual).toBe("3072.0 MB");
    });
  });

  describe("zero and null", () => {
    it("returns em dash for null", () => {
      const actual = formatFileSize(null);
      expect(actual).toBe("—");
    });

    it("returns em dash for zero", () => {
      const actual = formatFileSize(0);
      expect(actual).toBe("—");
    });
  });

  describe("edge cases", () => {
    it("formats fractional bytes (rounds in display)", () => {
      const input = 512;
      const actual = formatFileSize(input);
      expect(actual).toBe("512 B");
    });

    it("formats 102.4 KB with one decimal", () => {
      const input = Math.round(102.4 * 1024);
      const actual = formatFileSize(input);
      expect(actual).toBe("102.4 KB");
    });

    it("handles very small non-zero value", () => {
      const input = 1;
      const actual = formatFileSize(input);
      expect(actual).toBe("1 B");
    });
  });
});
