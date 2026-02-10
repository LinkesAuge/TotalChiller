"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import { buildMarkdownComponents, extractYouTubeId, isImageUrl, isVideoUrl } from "../components/markdown-renderers";

/* ─── Custom renderers for react-markdown (forum-specific) ─── */

const markdownComponents: Components = buildMarkdownComponents("forum-md");

/* ─── ForumMarkdown: renders markdown content with embeds ─── */

interface ForumMarkdownProps {
  readonly content: string;
  readonly preview?: boolean;
}

/**
 * Renders forum content as rich markdown with auto-embedded images/videos.
 * When `preview` is true, truncates to ~3 lines and disables media.
 */
function ForumMarkdown({ content, preview = false }: ForumMarkdownProps): JSX.Element {
  const displayContent = preview ? truncateForPreview(content, 200) : content;
  return (
    <div className={`forum-md${preview ? " forum-md-preview" : ""}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={preview ? previewComponents : markdownComponents}>
        {displayContent}
      </ReactMarkdown>
    </div>
  );
}

/** Truncate content for list preview, keeping whole words. */
function truncateForPreview(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  return (lastSpace > 0 ? truncated.substring(0, lastSpace) : truncated) + "…";
}

/** Simpler renderers for preview mode — no media embeds. */
const previewComponents: Components = {
  img: () => <span className="forum-md-media-placeholder">[Image]</span>,
  a: ({ href, children }) => {
    if (!href) return <>{children}</>;
    const ytId = extractYouTubeId(href);
    if (ytId) return <span className="forum-md-media-placeholder">[Video]</span>;
    if (isImageUrl(href)) return <span className="forum-md-media-placeholder">[Image]</span>;
    if (isVideoUrl(href)) return <span className="forum-md-media-placeholder">[Video]</span>;
    return <span className="forum-md-link">{children}</span>;
  },
  code: ({ children }) => <code className="forum-md-code-inline">{children}</code>,
  pre: ({ children }) => <>{children}</>,
  blockquote: ({ children }) => <span className="italic text-text-muted">{children}</span>,
  table: () => <span className="forum-md-media-placeholder">[Table]</span>,
};

export default ForumMarkdown;
