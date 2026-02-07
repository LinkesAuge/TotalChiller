"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

/* ─── Video embed helpers ─── */

const YOUTUBE_REGEX = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/;
const IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|gif|webp|svg|bmp|avif)(\?.*)?$/i;
const VIDEO_EXTENSIONS = /\.(mp4|webm|ogg)(\?.*)?$/i;

/** Extract YouTube video ID from a URL, or null. */
function extractYouTubeId(url: string): string | null {
  const match = url.match(YOUTUBE_REGEX);
  return match ? match[1] : null;
}

/** Check if a URL is a direct image link. */
function isImageUrl(url: string): boolean {
  return IMAGE_EXTENSIONS.test(url);
}

/** Check if a URL is a direct video link. */
function isVideoUrl(url: string): boolean {
  return VIDEO_EXTENSIONS.test(url);
}

/* ─── Custom renderers for react-markdown ─── */

const markdownComponents: Components = {
  /* Render images with constrained size and rounded corners */
  img: ({ src, alt, ...rest }) => {
    if (!src) return null;
    return (
      <span className="forum-md-media">
        <img
          src={src}
          alt={alt ?? ""}
          loading="lazy"
          className="forum-md-image"
          {...rest}
        />
      </span>
    );
  },
  /* Render links — auto-embed YouTube, images, and videos */
  a: ({ href, children, ...rest }) => {
    if (!href) return <a {...rest}>{children}</a>;
    /* YouTube embed */
    const ytId = extractYouTubeId(href);
    if (ytId) {
      return (
        <span className="forum-md-media">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${ytId}`}
            title="YouTube video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="forum-md-video"
          />
        </span>
      );
    }
    /* Direct image URL */
    if (isImageUrl(href)) {
      return (
        <span className="forum-md-media">
          <img src={href} alt={typeof children === "string" ? children : ""} loading="lazy" className="forum-md-image" />
        </span>
      );
    }
    /* Direct video URL */
    if (isVideoUrl(href)) {
      return (
        <span className="forum-md-media">
          <video src={href} controls className="forum-md-video" preload="metadata" />
        </span>
      );
    }
    /* Normal link */
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="forum-md-link" {...rest}>
        {children}
      </a>
    );
  },
  /* Style code blocks */
  code: ({ className, children, ...rest }) => {
    const isInline = !className;
    if (isInline) {
      return <code className="forum-md-code-inline" {...rest}>{children}</code>;
    }
    return (
      <code className={`forum-md-code-block ${className ?? ""}`} {...rest}>
        {children}
      </code>
    );
  },
  pre: ({ children, ...rest }) => (
    <pre className="forum-md-pre" {...rest}>{children}</pre>
  ),
  blockquote: ({ children, ...rest }) => (
    <blockquote className="forum-md-blockquote" {...rest}>{children}</blockquote>
  ),
  table: ({ children, ...rest }) => (
    <div className="forum-md-table-wrap">
      <table className="forum-md-table" {...rest}>{children}</table>
    </div>
  ),
};

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
  blockquote: ({ children }) => <span style={{ fontStyle: "italic", color: "var(--color-text-muted)" }}>{children}</span>,
  table: () => <span className="forum-md-media-placeholder">[Table]</span>,
};

export default ForumMarkdown;
