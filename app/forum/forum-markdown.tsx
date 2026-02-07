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

/* ─── Thumbnail extraction ─── */

export interface PostThumbnail {
  /** "image" | "youtube" | "video" | "link" */
  readonly type: "image" | "youtube" | "video" | "link";
  /** URL of the thumbnail image to display */
  readonly thumbnailUrl: string;
  /** Original URL of the media / link */
  readonly sourceUrl: string;
}

/* Regex patterns for extracting media from markdown */
const MD_IMAGE_RE = /!\[[^\]]*\]\(([^)]+)\)/;
const MD_LINK_RE = /\[([^\]]*)\]\(([^)]+)\)/g;
const BARE_URL_RE = /(?:^|\s)(https?:\/\/[^\s)]+)/gm;

/**
 * Scans markdown content and returns info about the first media element found.
 * Priority: markdown images > YouTube links > direct image links > direct video links > first external link.
 */
export function extractThumbnail(content: string | null | undefined): PostThumbnail | null {
  if (!content) return null;

  /* 1. Markdown image syntax: ![alt](url) */
  const imgMatch = content.match(MD_IMAGE_RE);
  if (imgMatch) {
    return { type: "image", thumbnailUrl: imgMatch[1], sourceUrl: imgMatch[1] };
  }

  /* Collect all URLs from markdown links + bare URLs */
  const urls: string[] = [];
  let linkMatch: RegExpExecArray | null;
  // eslint-disable-next-line no-cond-assign
  while ((linkMatch = MD_LINK_RE.exec(content)) !== null) {
    urls.push(linkMatch[2]);
  }
  let bareMatch: RegExpExecArray | null;
  // eslint-disable-next-line no-cond-assign
  while ((bareMatch = BARE_URL_RE.exec(content)) !== null) {
    urls.push(bareMatch[1]);
  }

  /* 2. YouTube */
  for (const url of urls) {
    const ytId = extractYouTubeId(url);
    if (ytId) {
      return {
        type: "youtube",
        thumbnailUrl: `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`,
        sourceUrl: url,
      };
    }
  }

  /* 3. Direct image URL */
  for (const url of urls) {
    if (isImageUrl(url)) {
      return { type: "image", thumbnailUrl: url, sourceUrl: url };
    }
  }

  /* 4. Direct video URL */
  for (const url of urls) {
    if (isVideoUrl(url)) {
      return { type: "video", thumbnailUrl: "", sourceUrl: url };
    }
  }

  /* 5. Any external link (article) */
  for (const url of urls) {
    if (/^https?:\/\//.test(url)) {
      return { type: "link", thumbnailUrl: "", sourceUrl: url };
    }
  }

  return null;
}

export default ForumMarkdown;
