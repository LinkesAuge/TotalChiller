import { describe, it, expect } from "vitest";
import { extractThumbnail } from "./forum-thumbnail";

/* ------------------------------------------------------------------ */
/*  extractThumbnail                                                    */
/* ------------------------------------------------------------------ */

describe("extractThumbnail", () => {
  describe("YouTube thumbnail from markdown", () => {
    it("extracts YouTube thumbnail from markdown link", () => {
      const inputContent = "Check this [video](https://www.youtube.com/watch?v=dQw4w9WgXcQ)";
      const actual = extractThumbnail(inputContent);
      expect(actual).not.toBeNull();
      expect(actual?.type).toBe("youtube");
      expect(actual?.thumbnailUrl).toBe("https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg");
      expect(actual?.sourceUrl).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    });

    it("extracts YouTube thumbnail from youtu.be short link", () => {
      const inputContent = "See [here](https://youtu.be/dQw4w9WgXcQ)";
      const actual = extractThumbnail(inputContent);
      expect(actual).not.toBeNull();
      expect(actual?.type).toBe("youtube");
      expect(actual?.thumbnailUrl).toBe("https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg");
    });

    it("extracts YouTube thumbnail from bare URL", () => {
      const inputContent = "https://www.youtube.com/watch?v=abc12345678";
      const actual = extractThumbnail(inputContent);
      expect(actual).not.toBeNull();
      expect(actual?.type).toBe("youtube");
      expect(actual?.thumbnailUrl).toBe("https://img.youtube.com/vi/abc12345678/mqdefault.jpg");
    });

    it("prefers markdown image over YouTube when image comes first", () => {
      const inputContent = "![alt](https://example.com/photo.jpg) and [yt](https://youtube.com/watch?v=abc)";
      const actual = extractThumbnail(inputContent);
      expect(actual).not.toBeNull();
      expect(actual?.type).toBe("image");
      expect(actual?.thumbnailUrl).toBe("https://example.com/photo.jpg");
    });
  });

  describe("image thumbnail from markdown", () => {
    it("extracts image from markdown image syntax", () => {
      const inputContent = "![My image](https://example.com/pic.png)";
      const actual = extractThumbnail(inputContent);
      expect(actual).not.toBeNull();
      expect(actual?.type).toBe("image");
      expect(actual?.thumbnailUrl).toBe("https://example.com/pic.png");
      expect(actual?.sourceUrl).toBe("https://example.com/pic.png");
    });

    it("extracts image from markdown link with image extension", () => {
      const inputContent = "Check [this](https://cdn.example.com/photo.jpg)";
      const actual = extractThumbnail(inputContent);
      expect(actual).not.toBeNull();
      expect(actual?.type).toBe("image");
      expect(actual?.thumbnailUrl).toBe("https://cdn.example.com/photo.jpg");
    });

    it("recognizes webp and gif as images", () => {
      const inputWebp = "[pic](https://example.com/anim.webp)";
      const inputGif = "[pic](https://example.com/anim.gif)";
      const actualWebp = extractThumbnail(inputWebp);
      const actualGif = extractThumbnail(inputGif);
      expect(actualWebp?.type).toBe("image");
      expect(actualGif?.type).toBe("image");
    });
  });

  describe("video thumbnail from markdown", () => {
    it("extracts video URL (type video, empty thumbnailUrl)", () => {
      const inputContent = "[video](https://example.com/clip.mp4)";
      const actual = extractThumbnail(inputContent);
      expect(actual).not.toBeNull();
      expect(actual?.type).toBe("video");
      expect(actual?.thumbnailUrl).toBe("");
      expect(actual?.sourceUrl).toBe("https://example.com/clip.mp4");
    });

    it("recognizes webm and ogg as video", () => {
      const inputWebm = "[vid](https://example.com/stream.webm)";
      const inputOgg = "[vid](https://example.com/audio.ogg)";
      const actualWebm = extractThumbnail(inputWebm);
      const actualOgg = extractThumbnail(inputOgg);
      expect(actualWebm?.type).toBe("video");
      expect(actualOgg?.type).toBe("video");
    });
  });

  describe("no thumbnail found (plain text)", () => {
    it("returns null for plain text without URLs", () => {
      const inputContent = "Just some plain text with no links.";
      const actual = extractThumbnail(inputContent);
      expect(actual).toBeNull();
    });

    it("returns null for text with only non-URL content", () => {
      const inputContent = "Hello world! No media here.";
      const actual = extractThumbnail(inputContent);
      expect(actual).toBeNull();
    });
  });

  describe("edge cases", () => {
    it("returns null for empty string", () => {
      const inputContent = "";
      const actual = extractThumbnail(inputContent);
      expect(actual).toBeNull();
    });

    it("returns null for null", () => {
      const actual = extractThumbnail(null);
      expect(actual).toBeNull();
    });

    it("returns null for undefined", () => {
      const actual = extractThumbnail(undefined);
      expect(actual).toBeNull();
    });

    it("handles malformed markdown image (incomplete)", () => {
      const inputContent = "![broken";
      const actual = extractThumbnail(inputContent);
      expect(actual).toBeNull();
    });

    it("handles malformed URL in markdown link", () => {
      const inputContent = "[link](not-a-valid-url)";
      const actual = extractThumbnail(inputContent);
      expect(actual).toBeNull();
    });

    it("extracts first link when multiple links exist", () => {
      const inputContent = "[first](https://example.com/first.jpg) [second](https://example.com/second.png)";
      const actual = extractThumbnail(inputContent);
      expect(actual).not.toBeNull();
      expect(actual?.sourceUrl).toBe("https://example.com/first.jpg");
    });

    it("returns link type for non-media URL when no image/video/youtube", () => {
      const inputContent = "[article](https://example.com/article)";
      const actual = extractThumbnail(inputContent);
      expect(actual).not.toBeNull();
      expect(actual?.type).toBe("link");
      expect(actual?.thumbnailUrl).toBe("");
      expect(actual?.sourceUrl).toBe("https://example.com/article");
    });

    it("handles markdown with query params in image URL", () => {
      const inputContent = "![img](https://example.com/photo.jpg?size=large)";
      const actual = extractThumbnail(inputContent);
      expect(actual).not.toBeNull();
      expect(actual?.type).toBe("image");
      expect(actual?.thumbnailUrl).toBe("https://example.com/photo.jpg?size=large");
    });
  });
});
