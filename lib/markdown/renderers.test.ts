import { describe, it, expect } from "vitest";
import { extractYouTubeId, isImageUrl, isVideoUrl } from "./renderers";

/* ------------------------------------------------------------------ */
/*  extractYouTubeId                                                    */
/* ------------------------------------------------------------------ */

describe("extractYouTubeId", () => {
  it("extracts ID from watch URL", () => {
    const inputUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    const actual = extractYouTubeId(inputUrl);
    const expected = "dQw4w9WgXcQ";
    expect(actual).toBe(expected);
  });

  it("extracts ID from watch URL with extra query params", () => {
    const inputUrl = "https://www.youtube.com/watch?v=abc123XYZ01&list=PLxxx&t=10";
    const actual = extractYouTubeId(inputUrl);
    const expected = "abc123XYZ01";
    expect(actual).toBe(expected);
  });

  it("extracts ID from embed URL", () => {
    const inputUrl = "https://www.youtube.com/embed/dQw4w9WgXcQ";
    const actual = extractYouTubeId(inputUrl);
    const expected = "dQw4w9WgXcQ";
    expect(actual).toBe(expected);
  });

  it("extracts ID from shorts URL", () => {
    const inputUrl = "https://www.youtube.com/shorts/abc123XYZ01";
    const actual = extractYouTubeId(inputUrl);
    const expected = "abc123XYZ01";
    expect(actual).toBe(expected);
  });

  it("extracts ID from youtu.be short URL", () => {
    const inputUrl = "https://youtu.be/dQw4w9WgXcQ";
    const actual = extractYouTubeId(inputUrl);
    const expected = "dQw4w9WgXcQ";
    expect(actual).toBe(expected);
  });

  it("extracts ID from youtu.be with query params", () => {
    const inputUrl = "https://youtu.be/abc123XYZ01?si=xxx";
    const actual = extractYouTubeId(inputUrl);
    const expected = "abc123XYZ01";
    expect(actual).toBe(expected);
  });

  it("extracts ID with hyphens (valid YouTube ID chars)", () => {
    const inputUrl = "https://www.youtube.com/watch?v=abc-123_XYZ";
    const actual = extractYouTubeId(inputUrl);
    const expected = "abc-123_XYZ";
    expect(actual).toBe(expected);
  });

  it("returns null for non-YouTube URL", () => {
    const inputUrl = "https://vimeo.com/123456789";
    const actual = extractYouTubeId(inputUrl);
    expect(actual).toBeNull();
  });

  it("returns null for plain text", () => {
    const inputUrl = "not a url at all";
    const actual = extractYouTubeId(inputUrl);
    expect(actual).toBeNull();
  });

  it("returns null for empty string", () => {
    const inputUrl = "";
    const actual = extractYouTubeId(inputUrl);
    expect(actual).toBeNull();
  });

  it("returns null for URL that looks like YouTube but has no video ID", () => {
    const inputUrl = "https://www.youtube.com/";
    const actual = extractYouTubeId(inputUrl);
    expect(actual).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/*  isImageUrl                                                          */
/* ------------------------------------------------------------------ */

describe("isImageUrl", () => {
  it("returns true for .jpg extension", () => {
    const inputUrl = "https://example.com/image.jpg";
    const actual = isImageUrl(inputUrl);
    expect(actual).toBe(true);
  });

  it("returns true for .jpeg extension", () => {
    const inputUrl = "https://cdn.example.com/photo.jpeg";
    const actual = isImageUrl(inputUrl);
    expect(actual).toBe(true);
  });

  it("returns true for .png extension", () => {
    const inputUrl = "https://example.com/chart.png";
    const actual = isImageUrl(inputUrl);
    expect(actual).toBe(true);
  });

  it("returns true for .gif extension", () => {
    const inputUrl = "https://example.com/animation.gif";
    const actual = isImageUrl(inputUrl);
    expect(actual).toBe(true);
  });

  it("returns true for .webp extension", () => {
    const inputUrl = "https://example.com/modern.webp";
    const actual = isImageUrl(inputUrl);
    expect(actual).toBe(true);
  });

  it("returns true for .svg extension", () => {
    const inputUrl = "https://example.com/icon.svg";
    const actual = isImageUrl(inputUrl);
    expect(actual).toBe(true);
  });

  it("returns true for .bmp extension", () => {
    const inputUrl = "https://example.com/legacy.bmp";
    const actual = isImageUrl(inputUrl);
    expect(actual).toBe(true);
  });

  it("returns true for .avif extension", () => {
    const inputUrl = "https://example.com/optimized.avif";
    const actual = isImageUrl(inputUrl);
    expect(actual).toBe(true);
  });

  it("returns true for URL with query string", () => {
    const inputUrl = "https://example.com/image.png?size=large&format=webp";
    const actual = isImageUrl(inputUrl);
    expect(actual).toBe(true);
  });

  it("returns true for uppercase extension", () => {
    const inputUrl = "https://example.com/IMAGE.JPG";
    const actual = isImageUrl(inputUrl);
    expect(actual).toBe(true);
  });

  it("returns false for non-image URL", () => {
    const inputUrl = "https://example.com/page.html";
    const actual = isImageUrl(inputUrl);
    expect(actual).toBe(false);
  });

  it("returns false for video URL", () => {
    const inputUrl = "https://example.com/video.mp4";
    const actual = isImageUrl(inputUrl);
    expect(actual).toBe(false);
  });

  it("returns false for URL with image extension in path but not at end", () => {
    const inputUrl = "https://example.com/image.png/other";
    const actual = isImageUrl(inputUrl);
    expect(actual).toBe(false);
  });

  it("returns false for empty string", () => {
    const inputUrl = "";
    const actual = isImageUrl(inputUrl);
    expect(actual).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/*  isVideoUrl                                                          */
/* ------------------------------------------------------------------ */

describe("isVideoUrl", () => {
  it("returns true for .mp4 extension", () => {
    const inputUrl = "https://example.com/video.mp4";
    const actual = isVideoUrl(inputUrl);
    expect(actual).toBe(true);
  });

  it("returns true for .webm extension", () => {
    const inputUrl = "https://example.com/clip.webm";
    const actual = isVideoUrl(inputUrl);
    expect(actual).toBe(true);
  });

  it("returns true for .ogg extension", () => {
    const inputUrl = "https://example.com/audio-video.ogg";
    const actual = isVideoUrl(inputUrl);
    expect(actual).toBe(true);
  });

  it("returns true for URL with query string", () => {
    const inputUrl = "https://cdn.example.com/video.mp4?quality=hd";
    const actual = isVideoUrl(inputUrl);
    expect(actual).toBe(true);
  });

  it("returns true for uppercase extension", () => {
    const inputUrl = "https://example.com/VIDEO.MP4";
    const actual = isVideoUrl(inputUrl);
    expect(actual).toBe(true);
  });

  it("returns false for image URL", () => {
    const inputUrl = "https://example.com/image.jpg";
    const actual = isVideoUrl(inputUrl);
    expect(actual).toBe(false);
  });

  it("returns false for YouTube URL", () => {
    const inputUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    const actual = isVideoUrl(inputUrl);
    expect(actual).toBe(false);
  });

  it("returns false for .mov extension (not in supported list)", () => {
    const inputUrl = "https://example.com/video.mov";
    const actual = isVideoUrl(inputUrl);
    expect(actual).toBe(false);
  });

  it("returns false for empty string", () => {
    const inputUrl = "";
    const actual = isVideoUrl(inputUrl);
    expect(actual).toBe(false);
  });
});
