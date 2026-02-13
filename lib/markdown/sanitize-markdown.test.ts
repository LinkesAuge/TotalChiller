import { describe, it, expect } from "vitest";
import { sanitizeMarkdown } from "./sanitize-markdown";

/* ------------------------------------------------------------------ */
/*  sanitizeMarkdown                                                   */
/* ------------------------------------------------------------------ */

describe("sanitizeMarkdown", () => {
  describe("line ending normalization", () => {
    it("converts CRLF to LF", () => {
      const inputMarkdown = "line one\r\nline two\r\nline three";
      const actual = sanitizeMarkdown(inputMarkdown);
      const expected = "line one  \nline two  \nline three";
      expect(actual).toBe(expected);
    });

    it("converts lone CR to LF", () => {
      const inputMarkdown = "line one\rline two\rline three";
      const actual = sanitizeMarkdown(inputMarkdown);
      const expected = "line one  \nline two  \nline three";
      expect(actual).toBe(expected);
    });

    it("preserves LF-only line endings", () => {
      const inputMarkdown = "line one\nline two";
      const actual = sanitizeMarkdown(inputMarkdown);
      const expected = "line one  \nline two";
      expect(actual).toBe(expected);
    });

    it("handles mixed CRLF and CR", () => {
      const inputMarkdown = "a\r\nb\rc\n";
      const actual = sanitizeMarkdown(inputMarkdown);
      expect(actual).not.toMatch(/\r/);
    });
  });

  describe("bullet list normalization", () => {
    it("converts bullet character (•) to markdown list syntax", () => {
      const inputMarkdown = "• item one\n• item two";
      const actual = sanitizeMarkdown(inputMarkdown);
      const expected = "- item one\n- item two";
      expect(actual).toBe(expected);
    });

    it("converts en-dash (–) to markdown list syntax", () => {
      const inputMarkdown = "– item one\n– item two";
      const actual = sanitizeMarkdown(inputMarkdown);
      const expected = "- item one\n- item two";
      expect(actual).toBe(expected);
    });

    it("converts em-dash (—) to markdown list syntax", () => {
      const inputMarkdown = "— item one\n— item two";
      const actual = sanitizeMarkdown(inputMarkdown);
      const expected = "- item one\n- item two";
      expect(actual).toBe(expected);
    });

    it("preserves leading whitespace before bullet conversion", () => {
      const inputMarkdown = "  • indented item";
      const actual = sanitizeMarkdown(inputMarkdown);
      const expected = "- indented item";
      expect(actual).toBe(expected);
    });

    it("leaves existing markdown dash lists unchanged", () => {
      const inputMarkdown = "- existing item\n- another item";
      const actual = sanitizeMarkdown(inputMarkdown);
      expect(actual).toBe(inputMarkdown);
    });
  });

  describe("hard break handling", () => {
    it("converts single newlines to hard breaks (two trailing spaces)", () => {
      const inputMarkdown = "line one\nline two";
      const actual = sanitizeMarkdown(inputMarkdown);
      const expected = "line one  \nline two";
      expect(actual).toBe(expected);
    });

    it("preserves double newlines as paragraph breaks", () => {
      const inputMarkdown = "paragraph one\n\nparagraph two";
      const actual = sanitizeMarkdown(inputMarkdown);
      expect(actual).toBe("paragraph one\n\nparagraph two");
    });

    it("does not add hard break before dash list marker", () => {
      const inputMarkdown = "intro text\n- list item";
      const actual = sanitizeMarkdown(inputMarkdown);
      expect(actual).toContain("\n\n- list item");
      expect(actual).not.toMatch(/intro text  \n- /);
    });

    it("does not add hard break before numbered list marker", () => {
      const inputMarkdown = "intro text\n1. list item";
      const actual = sanitizeMarkdown(inputMarkdown);
      expect(actual).toContain("\n\n1. list item");
    });
  });

  describe("bold normalization", () => {
    it("fixes broken bold with trailing space before closing markers", () => {
      const inputMarkdown = "**word **";
      const actual = sanitizeMarkdown(inputMarkdown);
      const expected = "**word**";
      expect(actual).toBe(expected);
    });

    it("fixes broken bold with multiple spaces", () => {
      const inputMarkdown = "**hello   **";
      const actual = sanitizeMarkdown(inputMarkdown);
      const expected = "**hello**";
      expect(actual).toBe(expected);
    });

    it("preserves correct bold formatting", () => {
      const inputMarkdown = "**correct**";
      const actual = sanitizeMarkdown(inputMarkdown);
      expect(actual).toBe(inputMarkdown);
    });
  });

  describe("italic normalization", () => {
    it("fixes broken italic with trailing space before closing marker", () => {
      const inputMarkdown = "*word *";
      const actual = sanitizeMarkdown(inputMarkdown);
      const expected = "*word*";
      expect(actual).toBe(expected);
    });

    it("fixes broken italic with multiple spaces", () => {
      const inputMarkdown = "*hello   *";
      const actual = sanitizeMarkdown(inputMarkdown);
      const expected = "*hello*";
      expect(actual).toBe(expected);
    });

    it("preserves correct italic formatting", () => {
      const inputMarkdown = "*correct*";
      const actual = sanitizeMarkdown(inputMarkdown);
      expect(actual).toBe(inputMarkdown);
    });

    it("does not corrupt bold when fixing italic", () => {
      const inputMarkdown = "**bold** and *italic *";
      const actual = sanitizeMarkdown(inputMarkdown);
      expect(actual).toContain("**bold**");
      expect(actual).toContain("*italic*");
    });
  });

  describe("numbered list spacing", () => {
    it("ensures blank line before numbered list when preceded by paragraph", () => {
      const inputMarkdown = "Some paragraph text\n1. first item";
      const actual = sanitizeMarkdown(inputMarkdown);
      expect(actual).toContain("\n\n1. first item");
      expect(actual).toContain("Some paragraph text");
    });

    it("does not insert blank line between consecutive numbered items", () => {
      const inputMarkdown = "1. first\n2. second\n3. third";
      const actual = sanitizeMarkdown(inputMarkdown);
      expect(actual).not.toMatch(/1\. first  \n\n2\./);
      expect(actual).toContain("1. first\n2. second");
    });
  });

  describe("edge cases", () => {
    it("returns empty string for empty input", () => {
      const inputMarkdown = "";
      const actual = sanitizeMarkdown(inputMarkdown);
      const expected = "";
      expect(actual).toBe(expected);
    });

    it("returns already-clean markdown unchanged for simple case", () => {
      const inputMarkdown = "Hello world";
      const actual = sanitizeMarkdown(inputMarkdown);
      expect(actual).toBe("Hello world");
    });

    it("handles markdown with only newlines", () => {
      const inputMarkdown = "\n\n";
      const actual = sanitizeMarkdown(inputMarkdown);
      expect(actual).toBe("\n\n");
    });

    it("handles mixed formatting in one string", () => {
      const inputMarkdown = "**bold ** and *italic *\r\n• bullet\nnext line";
      const actual = sanitizeMarkdown(inputMarkdown);
      expect(actual).toContain("**bold**");
      expect(actual).toContain("*italic*");
      expect(actual).toContain("- bullet");
      expect(actual).not.toMatch(/\r/);
    });

    it("handles multi-line list items with content on next line", () => {
      const inputMarkdown = "1.\ncontent line one\n\n2.\ncontent line two";
      const actual = sanitizeMarkdown(inputMarkdown);
      expect(actual).toContain("content line one\n2.");
      expect(actual).not.toContain("content line one\n\n2.");
    });
  });
});
