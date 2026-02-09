"use client";

/**
 * Shared markdown renderer utilities used by both CmsMarkdown and ForumMarkdown.
 * Provides media detection helpers and configurable react-markdown component overrides.
 */

import type { Components } from "react-markdown";

/* ─── Media detection helpers ─── */

const YOUTUBE_REGEX = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/;
const IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|gif|webp|svg|bmp|avif)(\?.*)?$/i;
const VIDEO_EXTENSIONS = /\.(mp4|webm|ogg)(\?.*)?$/i;

/** Extract YouTube video ID from a URL, or null. */
export function extractYouTubeId(url: string): string | null {
  const match = url.match(YOUTUBE_REGEX);
  return match ? match[1] : null;
}

/** Check if a URL is a direct image link. */
export function isImageUrl(url: string): boolean {
  return IMAGE_EXTENSIONS.test(url);
}

/** Check if a URL is a direct video link. */
export function isVideoUrl(url: string): boolean {
  return VIDEO_EXTENSIONS.test(url);
}

/* ─── Feature flags ─── */

export interface MarkdownFeatures {
  /** Enable YouTube auto-embed for links (default: true) */
  youtubeEmbed?: boolean;
  /** Enable auto-embed for direct image URLs in links (default: true) */
  imageEmbed?: boolean;
  /** Enable auto-embed for direct video URLs in links (default: true) */
  videoEmbed?: boolean;
  /** Enable code block rendering (default: true) */
  codeBlocks?: boolean;
  /** Enable table rendering (default: true) */
  tables?: boolean;
}

const DEFAULT_FEATURES: Required<MarkdownFeatures> = {
  youtubeEmbed: true,
  imageEmbed: true,
  videoEmbed: true,
  codeBlocks: true,
  tables: true,
};

/* ─── Component builders ─── */

/**
 * Build react-markdown component overrides based on feature flags and a CSS prefix.
 * The prefix is used for CSS class names (e.g. "forum-md" or "cms-md").
 */
export function buildMarkdownComponents(
  prefix: string,
  features: MarkdownFeatures = {},
): Components {
  const f = { ...DEFAULT_FEATURES, ...features };

  return {
    /* Render images with constrained size and rounded corners */
    img: ({ src, alt, ...rest }) => {
      if (!src) return null;
      return (
        <span className={`${prefix}-media`}>
          <img
            src={src}
            alt={alt ?? ""}
            loading="lazy"
            className={`${prefix}-image`}
            {...rest}
          />
        </span>
      );
    },

    /* Render links — optionally auto-embed YouTube, images, and videos */
    a: ({ href, children, ...rest }) => {
      if (!href) return <a {...rest}>{children}</a>;

      /* YouTube embed */
      if (f.youtubeEmbed) {
        const ytId = extractYouTubeId(href);
        if (ytId) {
          return (
            <span className={`${prefix}-media`}>
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${ytId}`}
                title="YouTube video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className={`${prefix}-video`}
              />
            </span>
          );
        }
      }

      /* Direct image URL */
      if (f.imageEmbed && isImageUrl(href)) {
        return (
          <span className={`${prefix}-media`}>
            <img
              src={href}
              alt={typeof children === "string" ? children : ""}
              loading="lazy"
              className={`${prefix}-image`}
            />
          </span>
        );
      }

      /* Direct video URL */
      if (f.videoEmbed && isVideoUrl(href)) {
        return (
          <span className={`${prefix}-media`}>
            <video src={href} controls className={`${prefix}-video`} preload="metadata" />
          </span>
        );
      }

      /* Normal link */
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className={`${prefix}-link`} {...rest}>
          {children}
        </a>
      );
    },

    /* Style code blocks */
    code: f.codeBlocks
      ? ({ className, children, ...rest }) => {
          const isInline = !className;
          if (isInline) {
            return <code className={`${prefix}-code-inline`} {...rest}>{children}</code>;
          }
          return (
            <code className={`${prefix}-code-block ${className ?? ""}`} {...rest}>
              {children}
            </code>
          );
        }
      : ({ children, ...rest }) => <code className={`${prefix}-code-inline`} {...rest}>{children}</code>,

    pre: ({ children, ...rest }) => (
      <pre className={`${prefix}-pre`} {...rest}>{children}</pre>
    ),

    blockquote: ({ children, ...rest }) => (
      <blockquote className={`${prefix}-blockquote`} {...rest}>{children}</blockquote>
    ),

    table: f.tables
      ? ({ children, ...rest }) => (
          <div className={`${prefix}-table-wrap`}>
            <table className={`${prefix}-table`} {...rest}>{children}</table>
          </div>
        )
      : () => null,
  };
}
