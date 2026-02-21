// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { extractYouTubeId, isImageUrl, isVideoUrl } from "./renderers";

describe("extractYouTubeId", () => {
  it("extracts ID from youtube.com/watch?v=... URL", () => {
    expect(extractYouTubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("extracts ID from youtu.be/... URL", () => {
    expect(extractYouTubeId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("extracts ID from youtube.com/embed/... URL", () => {
    expect(extractYouTubeId("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("extracts ID from youtube.com/shorts/... URL", () => {
    expect(extractYouTubeId("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("returns null for non-YouTube URL", () => {
    expect(extractYouTubeId("https://example.com/video")).toBeNull();
  });
});

describe("isImageUrl", () => {
  it("returns true for .jpg, .png, .gif, .webp, .svg", () => {
    expect(isImageUrl("https://example.com/photo.jpg")).toBe(true);
    expect(isImageUrl("https://example.com/photo.png")).toBe(true);
    expect(isImageUrl("https://example.com/photo.gif")).toBe(true);
    expect(isImageUrl("https://example.com/photo.webp")).toBe(true);
    expect(isImageUrl("https://example.com/photo.svg")).toBe(true);
  });

  it("returns false for non-image URLs", () => {
    expect(isImageUrl("https://example.com/page.html")).toBe(false);
    expect(isImageUrl("https://example.com/doc.pdf")).toBe(false);
    expect(isImageUrl("https://example.com/")).toBe(false);
  });
});

describe("isVideoUrl", () => {
  it("returns true for .mp4, .webm, .ogg", () => {
    expect(isVideoUrl("https://example.com/clip.mp4")).toBe(true);
    expect(isVideoUrl("https://example.com/clip.webm")).toBe(true);
    expect(isVideoUrl("https://example.com/clip.ogg")).toBe(true);
  });

  it("returns false for non-video URLs", () => {
    expect(isVideoUrl("https://example.com/page.html")).toBe(false);
    expect(isVideoUrl("https://example.com/photo.jpg")).toBe(false);
    expect(isVideoUrl("https://example.com/")).toBe(false);
  });
});
