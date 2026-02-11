"use client";

/**
 * AppMarkdown — Unified markdown renderer for the entire application.
 *
 * Replaces both CmsMarkdown and ForumMarkdown with a single component.
 * Visual style is controlled by the `variant` prop:
 * - "cms"   → `.cms-md` CSS (inherits parent font-size/line-height/color)
 * - "forum" → `.forum-md` CSS (fixed 0.88rem with own colors)
 *
 * Features:
 * - Unified content sanitization via sanitizeMarkdown()
 * - YouTube, image, and video auto-embeds (configurable via `features`)
 * - Preview mode with truncation and simplified renderers
 * - remarkGfm + remarkBreaks for full GFM support with line breaks
 */

import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { sanitizeMarkdown } from "./sanitize-markdown";
import { buildMarkdownComponents, buildPreviewComponents, type MarkdownFeatures } from "./renderers";

/* ─── Types ─── */

/** Visual variant determining CSS class prefix. */
type MarkdownVariant = "cms" | "forum";

/** CSS prefix for each variant. */
const VARIANT_PREFIX: Record<MarkdownVariant, string> = {
  cms: "cms-md",
  forum: "forum-md",
};

interface AppMarkdownProps {
  /** Markdown content to render. */
  readonly content: string;
  /** Visual variant: "cms" inherits parent styles, "forum" uses fixed sizing. Default: "forum". */
  readonly variant?: MarkdownVariant;
  /** Feature toggles for embeds, code blocks, tables. */
  readonly features?: MarkdownFeatures;
  /** Truncated preview mode (disables media embeds). Default: false. */
  readonly preview?: boolean;
  /** Maximum character length for preview truncation. Default: 200. */
  readonly previewLength?: number;
  /** Additional CSS class name. */
  readonly className?: string;
}

/* ─── Helpers ─── */

/** Truncate content for list preview, keeping whole words. */
function truncateForPreview(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  return (lastSpace > 0 ? truncated.substring(0, lastSpace) : truncated) + "…";
}

/* ─── Component ─── */

/**
 * Renders markdown content with configurable visual style and embed support.
 * All content is sanitized (line break normalization, emphasis fixes, list spacing).
 */
function AppMarkdown({
  content,
  variant = "forum",
  features,
  preview = false,
  previewLength = 200,
  className,
}: AppMarkdownProps): JSX.Element {
  const prefix = VARIANT_PREFIX[variant];

  /* Memoize component overrides so react-markdown doesn't re-create them every render */
  const components = useMemo(
    () => (preview ? buildPreviewComponents(prefix) : buildMarkdownComponents(prefix, features)),
    [prefix, features, preview],
  );

  /* Sanitize content: normalize line endings, fix emphasis, convert line breaks */
  const sanitized = sanitizeMarkdown(content);
  const displayContent = preview ? truncateForPreview(sanitized, previewLength) : sanitized;

  const cssClass = preview ? `${prefix} ${prefix}-preview` : prefix;

  return (
    <div className={`${cssClass}${className ? ` ${className}` : ""}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={components}>
        {displayContent}
      </ReactMarkdown>
    </div>
  );
}

export default AppMarkdown;
export type { AppMarkdownProps, MarkdownVariant, MarkdownFeatures };
