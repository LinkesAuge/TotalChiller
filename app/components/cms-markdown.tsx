"use client";

/**
 * CmsMarkdown — Configurable Markdown renderer for CMS page content.
 *
 * Uses the same shared renderers as ForumMarkdown but with its own CSS class
 * prefix (.cms-md) that inherits parent font-size/line-height/color.
 *
 * Features:
 * - YouTube, image, and video embeds (configurable via `features` prop)
 * - No thumbnail extraction (CMS doesn't need it)
 * - No preview truncation (CMS always shows full content)
 * - CSS class `.cms-md` inherits parent styles instead of overriding them
 */

import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { buildMarkdownComponents, type MarkdownFeatures } from "./markdown-renderers";

/* ─── Types ─── */

interface CmsMarkdownProps {
  /** Markdown content to render */
  readonly content: string;
  /** Feature toggles for embeds, code blocks, tables */
  readonly features?: MarkdownFeatures;
  /** Additional CSS class name */
  readonly className?: string;
}

/* ─── Content sanitizer ─── */

/**
 * Fixes common Markdown formatting mistakes that break react-markdown parsing.
 *
 * CommonMark spec: a right-flanking delimiter run (closing ** or *) must NOT
 * be preceded by Unicode whitespace. So `**word **` is not valid bold — the
 * space before `**` prevents it from being a closing delimiter.
 *
 * This sanitizer:
 * 1. Normalizes Windows line endings
 * 2. Fixes `**word **` → `**word**` (broken bold)
 * 3. Fixes `*word *` → `*word*` (broken italic, without touching bold **)
 */
function sanitizeCmsMarkdown(raw: string): string {
  let s = raw;

  /* 1. Normalize line endings */
  s = s.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  /* 2. Fix broken bold: **word ** → **word**
        Uses negative lookahead (?!\*\*) inside the content group to avoid
        matching across two separate ** pairs. */
  s = s.replace(/\*\*((?:(?!\*\*).)+?)\s+\*\*/g, "**$1**");

  /* 3. Fix broken italic: *word * → *word*
        Negative look-behind/ahead ensure we don't touch ** bold markers. */
  s = s.replace(/(?<!\*)\*((?:(?!\*).)+?)\s+\*(?!\*)/g, "*$1*");

  return s;
}

/* ─── Component ─── */

/**
 * Renders CMS content as Markdown with configurable embed support.
 * Uses `.cms-md` CSS class that inherits parent styles.
 */
function CmsMarkdown({ content, features, className }: CmsMarkdownProps): JSX.Element {
  /* Memoize components so react-markdown doesn't re-create them on every render */
  const components = useMemo(() => buildMarkdownComponents("cms-md", features), [features]);

  /* Sanitize content: fix line endings + broken emphasis markers */
  const normalizedContent = sanitizeCmsMarkdown(content);

  return (
    <div className={`cms-md${className ? ` ${className}` : ""}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={components}>
        {normalizedContent}
      </ReactMarkdown>
    </div>
  );
}

export default CmsMarkdown;
