import { describe, it, expect } from "vitest";
import { isCustomBanner, BANNER_PRESETS, type BannerPreset } from "./banner-presets";

describe("isCustomBanner", () => {
  it("returns false for empty string", () => {
    expect(isCustomBanner("", BANNER_PRESETS)).toBe(false);
  });

  it("returns false when URL matches a preset", () => {
    const presetSrc = BANNER_PRESETS[0]!.src;
    expect(isCustomBanner(presetSrc, BANNER_PRESETS)).toBe(false);
  });

  it("returns false for multiple preset URLs", () => {
    expect(isCustomBanner("/assets/game/banners/banner_gold_dragon.png", BANNER_PRESETS)).toBe(false);
    expect(isCustomBanner("/assets/game/banners/banner_ragnarok_clan_event_708x123.png", BANNER_PRESETS)).toBe(false);
  });

  it("returns true when URL does not match any preset (custom banner)", () => {
    expect(isCustomBanner("https://example.com/custom.png", BANNER_PRESETS)).toBe(true);
  });

  it("returns true for /uploads/banner.jpg (custom upload path)", () => {
    expect(isCustomBanner("/uploads/banner.jpg", BANNER_PRESETS)).toBe(true);
  });

  it("returns true for various custom URLs", () => {
    expect(isCustomBanner("https://cdn.example.com/my-banner.png", BANNER_PRESETS)).toBe(true);
    expect(isCustomBanner("/custom/uploaded/image.webp", BANNER_PRESETS)).toBe(true);
  });

  it("returns true when presets array is empty and url is non-empty", () => {
    const emptyPresets: readonly BannerPreset[] = [];
    expect(isCustomBanner("https://example.com/any.png", emptyPresets)).toBe(true);
  });

  it("returns false when url matches preset in custom presets array", () => {
    const customPresets: readonly BannerPreset[] = [{ src: "/my/preset.png", label: "My Preset" }];
    expect(isCustomBanner("/my/preset.png", customPresets)).toBe(false);
  });
});
