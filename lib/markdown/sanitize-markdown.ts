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
 * 5. Collapse blank lines between consecutive list items (undo accidental
 *    loose-list creation from steps 3–4 when content lines of multi-line
 *    list items were mistaken for paragraphs)
 * 6. Convert remaining single newlines to hard breaks (two trailing spaces + \n),
 *    but NOT immediately before list markers (- or 1.) to keep lists tight
 * 7. Fix broken bold: **word ** → **word**
 * 8. Fix broken italic: *word * → *word*
 *
 * Critical: Steps 3–4 use ^(?!- )(?!\d+\. ) to avoid inserting blank lines
 * between consecutive list items (which would create "loose lists" with <p> tags).
 * Step 5 catches the remaining cases where multi-line list items triggered
 * false-positive blank line insertion (e.g. "1.\ncontent\n\n2." → "1.\ncontent\n2.").
 * Step 6 uses (?!\d+\.\s) (any whitespace, not just space) to also exclude bare
 * markers like "2.\n" from hard-break conversion, keeping list boundaries intact.
 * Steps 7–8 use [^\S\n]+ (horizontal whitespace only) instead of \s+ to prevent
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

  /* 5. Collapse blank lines between consecutive list items.
        Steps 3–4 can create loose lists when multi-line list items have their
        content text on a separate line from the marker (e.g. "1.\ncontent").
        The content line doesn't start with a marker, so step 3 inserts a blank
        line before the next marker: "content\n\n2." — making the list loose.
        This step detects list items (possibly with continuation content on the
        next line) separated by blank lines and collapses them back to single
        newlines for tight lists.
        The marker group handles both "1. content" and bare "1." (content on
        the next line). Continuation lines that aren't blank, markers, or dashes
        are included in the match. */
  s = s.replace(/^(\d+\.(?:[ \t].*)?(?:\n(?!\n)(?!\d+\.)(?!- ).+)*)\n\n(?=\d+\.)/gm, "$1\n");
  s = s.replace(/^(- .*(?:\n(?!\n)(?!\d+\.)(?!- ).+)*)\n\n(?=- )/gm, "$1\n");

  /* 6. Convert single newlines to hard breaks (two trailing spaces + \n).
        Only targets lone \n that are NOT adjacent to another \n AND NOT
        immediately before a list marker (- or 1.\s), preserving tight list
        structure and paragraph breaks (\n\n) as-is.
        Uses (?!\d+\.\s) instead of (?!\d+\. ) to also catch bare markers
        like "2.\n" (number-dot-newline) not just "2. " (number-dot-space). */
  s = s.replace(/(?<!\n)\n(?!\n)(?!- )(?!\d+\.\s)/g, "  \n");

  /* 7. Fix broken bold: **word ** → **word**
        Uses [^\S\n]+ (horizontal whitespace only) instead of \s+ to avoid
        matching across line breaks between two separate ** pairs. */
  s = s.replace(/\*\*((?:(?!\*\*).)+?)[^\S\n]+\*\*/g, "**$1**");

  /* 8. Fix broken italic: *word * → *word*
        Negative look-behind/ahead ensure we don't touch ** bold markers.
        Uses [^\S\n]+ to avoid eating newlines. */
  s = s.replace(/(?<!\*)\*((?:(?!\*).)+?)[^\S\n]+\*(?!\*)/g, "*$1*");

  return s;
}
