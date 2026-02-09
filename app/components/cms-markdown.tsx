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

/* ─── Component ─── */

/**
 * Renders CMS content as Markdown with configurable embed support.
 * Uses `.cms-md` CSS class that inherits parent styles.
 */
function CmsMarkdown({ content, features, className }: CmsMarkdownProps): JSX.Element {
  /* Memoize components so react-markdown doesn't re-create them on every render */
  const components = useMemo(
    () => buildMarkdownComponents("cms-md", features),
    [features],
  );

  /* Normalize Windows line endings only — no other transformations */
  const normalizedContent = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  return (
    <div className={`cms-md${className ? ` ${className}` : ""}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {normalizedContent}
      </ReactMarkdown>
    </div>
  );
}

export default CmsMarkdown;
