/**
 * Lightweight thumbnail extraction for forum posts.
 * Extracted from forum-markdown to allow dynamic import of the heavy ForumMarkdown component.
 */

import { extractYouTubeId, isImageUrl, isVideoUrl } from "../components/markdown-renderers";

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
    return { type: "image", thumbnailUrl: imgMatch[1] ?? "", sourceUrl: imgMatch[1] ?? "" };
  }

  /* Collect all URLs from markdown links + bare URLs */
  const urls: string[] = [];
  let linkMatch: RegExpExecArray | null;

  while ((linkMatch = MD_LINK_RE.exec(content)) !== null) {
    urls.push(linkMatch[2] ?? "");
  }
  let bareMatch: RegExpExecArray | null;

  while ((bareMatch = BARE_URL_RE.exec(content)) !== null) {
    urls.push(bareMatch[1] ?? "");
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
