// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: any) => {
    const React = require("react");
    return React.createElement("img", props);
  },
}));

vi.mock("./forum-thumbnail", () => ({}));

import { UpArrow, DownArrow, CommentIcon, PostThumbnailBox } from "./forum-icons";

describe("forum-icons", () => {
  it("UpArrow renders an SVG", () => {
    const { container } = render(<UpArrow />);
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("DownArrow renders an SVG", () => {
    const { container } = render(<DownArrow />);
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("CommentIcon renders an SVG", () => {
    const { container } = render(<CommentIcon />);
    expect(container.querySelector("svg")).toBeTruthy();
  });

  describe("PostThumbnailBox", () => {
    it("returns null when thumbnail is null", () => {
      const { container } = render(<PostThumbnailBox thumbnail={null} />);
      expect(container.innerHTML).toBe("");
    });

    it("renders image thumbnail with img tag", () => {
      const thumbnail = {
        type: "image" as const,
        thumbnailUrl: "https://example.com/thumb.jpg",
        sourceUrl: "https://example.com/img.jpg",
      };
      const { container } = render(<PostThumbnailBox thumbnail={thumbnail} />);
      const img = container.querySelector("img");
      expect(img).toBeTruthy();
      expect(img!.getAttribute("src")).toBe("https://example.com/thumb.jpg");
      expect(img!.getAttribute("alt")).toBe("Image thumbnail");
    });

    it("renders YouTube thumbnail with play indicator", () => {
      const thumbnail = {
        type: "youtube" as const,
        thumbnailUrl: "https://img.youtube.com/vi/abc/0.jpg",
        sourceUrl: "https://youtube.com/watch?v=abc",
      };
      const { container } = render(<PostThumbnailBox thumbnail={thumbnail} />);
      const img = container.querySelector("img");
      expect(img).toBeTruthy();
      expect(img!.getAttribute("alt")).toBe("Video thumbnail");
      const play = container.querySelector(".forum-thumb-play");
      expect(play).toBeTruthy();
    });

    it("renders video icon when type=video and no thumbnailUrl", () => {
      const thumbnail = {
        type: "video" as const,
        thumbnailUrl: "",
        sourceUrl: "https://example.com/video.mp4",
      };
      const { container } = render(<PostThumbnailBox thumbnail={thumbnail} />);
      expect(container.querySelector("img")).toBeNull();
      expect(container.querySelector("svg")).toBeTruthy();
      expect(container.querySelector(".forum-thumb-icon")).toBeTruthy();
    });

    it("renders link icon when type=link and no thumbnailUrl", () => {
      const thumbnail = {
        type: "link" as const,
        thumbnailUrl: "",
        sourceUrl: "https://example.com/article",
      };
      const { container } = render(<PostThumbnailBox thumbnail={thumbnail} />);
      expect(container.querySelector("img")).toBeNull();
      expect(container.querySelector("svg")).toBeTruthy();
      expect(container.querySelector(".forum-thumb-icon")).toBeTruthy();
    });

    it("returns null for unknown type", () => {
      const thumbnail = {
        type: "audio" as any,
        thumbnailUrl: "",
        sourceUrl: "https://example.com/audio.mp3",
      };
      const { container } = render(<PostThumbnailBox thumbnail={thumbnail} />);
      expect(container.innerHTML).toBe("");
    });
  });
});
