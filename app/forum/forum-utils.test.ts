import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { computeHotRank } from "./forum-utils";

/* ------------------------------------------------------------------ */
/*  computeHotRank                                                     */
/* ------------------------------------------------------------------ */

describe("computeHotRank", () => {
  const baseTime = new Date("2025-02-13T12:00:00Z").getTime();

  function toIso(ms: number): string {
    return new Date(ms).toISOString();
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(baseTime);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("recent posts with high scores", () => {
    it("ranks recent high-score posts higher", () => {
      const createdAt = toIso(baseTime - 3600000);
      const inputScore = 100;
      const actual = computeHotRank(inputScore, createdAt);
      const ageHours = 1;
      const magnitude = Math.log2(Math.max(100, 1) + 1);
      const expected = magnitude - ageHours / 6;
      expect(actual).toBeCloseTo(expected, 5);
      expect(actual).toBeGreaterThan(0);
    });

    it("recent post with score 10 has positive hot rank", () => {
      const createdAt = toIso(baseTime - 60000);
      const inputScore = 10;
      const actual = computeHotRank(inputScore, createdAt);
      expect(actual).toBeGreaterThan(0);
    });
  });

  describe("old posts with high scores", () => {
    it("ranks old high-score posts lower than recent ones", () => {
      const recentCreatedAt = toIso(baseTime - 3600000);
      const oldCreatedAt = toIso(baseTime - 86400000 * 7);
      const inputScore = 100;
      const recentRank = computeHotRank(inputScore, recentCreatedAt);
      const oldRank = computeHotRank(inputScore, oldCreatedAt);
      expect(oldRank).toBeLessThan(recentRank);
    });

    it("old post with high score can have negative hot rank", () => {
      const createdAt = toIso(baseTime - 86400000 * 30);
      const inputScore = 1000;
      const actual = computeHotRank(inputScore, createdAt);
      expect(actual).toBeLessThan(0);
    });
  });

  describe("recent posts with low scores", () => {
    it("ranks recent low-score posts lower than high-score recent posts", () => {
      const createdAt = toIso(baseTime - 3600000);
      const highScoreRank = computeHotRank(100, createdAt);
      const lowScoreRank = computeHotRank(1, createdAt);
      expect(lowScoreRank).toBeLessThan(highScoreRank);
    });

    it("recent post with score 1 has small positive hot rank", () => {
      const createdAt = toIso(baseTime - 60000);
      const inputScore = 1;
      const actual = computeHotRank(inputScore, createdAt);
      const magnitude = Math.log2(2);
      const expected = magnitude - 1 / 60 / 6;
      expect(actual).toBeCloseTo(expected, 5);
      expect(actual).toBeGreaterThan(0);
    });
  });

  describe("edge cases", () => {
    it("handles zero score", () => {
      const createdAt = toIso(baseTime - 3600000);
      const inputScore = 0;
      const actual = computeHotRank(inputScore, createdAt);
      const magnitude = Math.log2(Math.max(0, 1) + 1);
      const ageHours = 1;
      const expected = magnitude - ageHours / 6;
      expect(actual).toBeCloseTo(expected, 5);
    });

    it("handles negative score", () => {
      const createdAt = toIso(baseTime - 3600000);
      const inputScore = -10;
      const actual = computeHotRank(inputScore, createdAt);
      const magnitude = Math.log2(11);
      const ageHours = 1;
      const expected = -magnitude - ageHours / 6;
      expect(actual).toBeCloseTo(expected, 5);
      expect(actual).toBeLessThan(0);
    });

    it("handles very old date", () => {
      const createdAt = "2000-01-01T00:00:00Z";
      const inputScore = 1000;
      const actual = computeHotRank(inputScore, createdAt);
      expect(actual).toBeLessThan(0);
    });

    it("handles score of 1 (minimum magnitude)", () => {
      const createdAt = toIso(baseTime);
      const inputScore = 1;
      const actual = computeHotRank(inputScore, createdAt);
      const magnitude = Math.log2(2);
      expect(actual).toBeCloseTo(magnitude, 5);
    });

    it("handles very high score", () => {
      const createdAt = toIso(baseTime - 3600000);
      const inputScore = 1000000;
      const actual = computeHotRank(inputScore, createdAt);
      const magnitude = Math.log2(1000001);
      const ageHours = 1;
      const expected = magnitude - ageHours / 6;
      expect(actual).toBeCloseTo(expected, 5);
    });
  });
});
