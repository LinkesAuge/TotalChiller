import { describe, it, expect } from "vitest";
import {
  FORUM_IMAGES_BUCKET,
  MESSAGE_IMAGES_BUCKET,
  BUG_SCREENSHOTS_BUCKET,
  BUG_MAX_SCREENSHOTS,
  BUG_MAX_SCREENSHOT_BYTES,
  BUG_ACCEPTED_IMAGE_TYPES,
} from "./constants";

describe("constants", () => {
  it("defines storage bucket names as non-empty strings", () => {
    expect(FORUM_IMAGES_BUCKET).toBe("forum-images");
    expect(MESSAGE_IMAGES_BUCKET).toBe("message-images");
    expect(BUG_SCREENSHOTS_BUCKET).toBe("bug-screenshots");
  });

  it("defines bug screenshot limits", () => {
    expect(BUG_MAX_SCREENSHOTS).toBe(5);
    expect(BUG_MAX_SCREENSHOT_BYTES).toBe(5 * 1024 * 1024);
  });

  it("defines accepted image MIME types", () => {
    expect(BUG_ACCEPTED_IMAGE_TYPES).toContain("image/jpeg");
    expect(BUG_ACCEPTED_IMAGE_TYPES).toContain("image/png");
    expect(BUG_ACCEPTED_IMAGE_TYPES).toContain("image/gif");
    expect(BUG_ACCEPTED_IMAGE_TYPES).toContain("image/webp");
    expect(BUG_ACCEPTED_IMAGE_TYPES).toHaveLength(4);
  });
});
