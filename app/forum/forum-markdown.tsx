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
   
  while ((linkMatch = MD_LINK_RE.exec(content)) !== null) {
    urls.push(linkMatch[2]);
  }
  let bareMatch: RegExpExecArray | null;
   
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
