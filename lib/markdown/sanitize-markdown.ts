/**
 * sanitizeMarkdown — Unified content sanitizer for all markdown rendering.
 *
 * Merges the CMS sanitizer (sanitizeCmsMarkdown) and news normalizer
 * (normalizeContent) into a single function used by AppMarkdown.
 *
 * Processing steps:
 * 1. Normalize Windows line endings (\r\n, \r → \n)
 * 2. Convert fancy bullets (•, –, —) to markdown list syntax (- )
 * 3. Ensure blank line before numbered lists when preceded by a non-list line
 * 4. Ensure blank line before dash lists when preceded by a non-list line
 * 5. Convert remaining single newlines to hard breaks (two trailing spaces + \n),
 *    but NOT immediately before list markers (- or 1.) to keep lists tight
 * 6. Fix broken bold: **word ** → **word**
 * 7. Fix broken italic: *word * → *word*
 *
 * Critical: Steps 3–4 use ^(?!- )(?!\d+\. ) to avoid inserting blank lines
 * between consecutive list items (which would create "loose lists" with <p> tags).
 * Steps 6–7 use [^\S\n]+ (horizontal whitespace only) instead of \s+ to prevent
 * matching across line boundaries and eating newlines between bold text.
 */

/**
 * Sanitize raw markdown content for consistent rendering.
 * Normalizes line endings, converts line breaks to hard breaks,
 * fixes common formatting mistakes, and ensures proper list spacing.
 */
export function sanitizeMarkdown(raw: string): string {
  let s = raw;

  /* 1. Normalize line endings */
  s = s.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  /* 2. Convert fancy bullets to markdown list syntax */
  s = s.replace(/^[ \t]*[•–—][ \t]*/gm, "- ");

  /* 3. Ensure blank line before numbered lists when preceded by a non-list line.
        The ^(?!- )(?!\d+\. ) anchor ensures we only match paragraph → list
        transitions, never list-item → list-item (which would create loose lists). */
  s = s.replace(/^(?!- )(?!\d+\. )(.+)\n(\d+\.\s)/gm, "$1\n\n$2");

  /* 4. Ensure blank line before dash-list when preceded by a non-list line.
        Same guard: only fires for paragraph → list, not between consecutive items. */
  s = s.replace(/^(?!- )(?!\d+\. )(.+)\n(- )/gm, "$1\n\n$2");

  /* 5. Convert single newlines to hard breaks (two trailing spaces + \n).
        Only targets lone \n that are NOT adjacent to another \n AND NOT
        immediately before a list marker (- or 1.), preserving tight list
        structure and paragraph breaks (\n\n) as-is. */
  s = s.replace(/(?<!\n)\n(?!\n)(?!- )(?!\d+\. )/g, "  \n");

  /* 6. Fix broken bold: **word ** → **word**
        Uses [^\S\n]+ (horizontal whitespace only) instead of \s+ to avoid
        matching across line breaks between two separate ** pairs. */
  s = s.replace(/\*\*((?:(?!\*\*).)+?)[^\S\n]+\*\*/g, "**$1**");

  /* 7. Fix broken italic: *word * → *word*
        Negative look-behind/ahead ensure we don't touch ** bold markers.
        Uses [^\S\n]+ to avoid eating newlines. */
  s = s.replace(/(?<!\*)\*((?:(?!\*).)+?)[^\S\n]+\*(?!\*)/g, "*$1*");

  return s;
}
