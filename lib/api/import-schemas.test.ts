import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import {
  ImportPayloadSchema,
  ReviewRequestSchema,
  ValidationListPushSchema,
  SubmissionsQuerySchema,
  SubmissionDetailQuerySchema,
} from "./import-schemas";

/* ── Helpers ── */

function readFixture(name: string): unknown {
  const raw = readFileSync(join(__dirname, "../../Documentation/ChillerBuddy/test-fixtures", name), "utf-8");
  return JSON.parse(raw);
}

/* ── ImportPayloadSchema ── */

describe("ImportPayloadSchema", () => {
  it("accepts a chests-only payload", () => {
    const data = readFixture("sample-export-chests-only.json");
    const result = ImportPayloadSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("accepts a full payload (chests + members + events + validationLists)", () => {
    const data = readFixture("sample-export-full.json");
    const result = ImportPayloadSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("accepts a members+events payload with null eventName", () => {
    const data = readFixture("sample-export-members-events.json");
    const result = ImportPayloadSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("accepts a validation-only payload with empty data object", () => {
    const data = readFixture("sample-export-validation-only.json");
    const result = ImportPayloadSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("accepts null websiteClanId", () => {
    const result = ImportPayloadSchema.safeParse({
      version: 1,
      exportedAt: "2026-02-21T14:30:00.000Z",
      source: "test",
      clan: { localClanId: "test", name: "Test", websiteClanId: null },
      data: {},
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid UUID websiteClanId", () => {
    const result = ImportPayloadSchema.safeParse({
      version: 1,
      exportedAt: "2026-02-21T14:30:00.000Z",
      source: "test",
      clan: { localClanId: "test", name: "Test", websiteClanId: "f47ac10b-58cc-4372-a567-0e02b2c3d479" },
      data: {},
    });
    expect(result.success).toBe(true);
  });

  it("rejects version 2", () => {
    const result = ImportPayloadSchema.safeParse({
      version: 2,
      exportedAt: "2026-02-21T14:30:00.000Z",
      source: "test",
      clan: { localClanId: "test", name: "Test" },
      data: {},
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing exportedAt", () => {
    const result = ImportPayloadSchema.safeParse({
      version: 1,
      source: "test",
      clan: { localClanId: "test", name: "Test" },
      data: {},
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid datetime format in exportedAt", () => {
    const result = ImportPayloadSchema.safeParse({
      version: 1,
      exportedAt: "not-a-date",
      source: "test",
      clan: { localClanId: "test", name: "Test" },
      data: {},
    });
    expect(result.success).toBe(false);
  });

  it("rejects chest with empty playerName", () => {
    const result = ImportPayloadSchema.safeParse({
      version: 1,
      exportedAt: "2026-02-21T14:30:00.000Z",
      source: "test",
      clan: { localClanId: "test", name: "Test" },
      data: {
        chests: [{ chestName: "Chest", playerName: "", source: "War", openedAt: "2026-02-21T14:00:00.000Z" }],
      },
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative score in members", () => {
    const result = ImportPayloadSchema.safeParse({
      version: 1,
      exportedAt: "2026-02-21T14:30:00.000Z",
      source: "test",
      clan: { localClanId: "test", name: "Test" },
      data: {
        members: [{ playerName: "Test", score: -100, capturedAt: "2026-02-21T14:00:00.000Z" }],
      },
    });
    expect(result.success).toBe(false);
  });

  it("accepts zero score in members", () => {
    const result = ImportPayloadSchema.safeParse({
      version: 1,
      exportedAt: "2026-02-21T14:30:00.000Z",
      source: "test",
      clan: { localClanId: "test", name: "Test" },
      data: {
        members: [{ playerName: "Test", score: 0, capturedAt: "2026-02-21T14:00:00.000Z" }],
      },
    });
    expect(result.success).toBe(true);
  });

  it("accepts special characters in player names", () => {
    const result = ImportPayloadSchema.safeParse({
      version: 1,
      exportedAt: "2026-02-21T14:30:00.000Z",
      source: "test",
      clan: { localClanId: "test", name: "Test" },
      data: {
        members: [{ playerName: "König", score: 100, capturedAt: "2026-02-21T14:00:00.000Z" }],
      },
    });
    expect(result.success).toBe(true);
  });

  it("rejects non-integer score", () => {
    const result = ImportPayloadSchema.safeParse({
      version: 1,
      exportedAt: "2026-02-21T14:30:00.000Z",
      source: "test",
      clan: { localClanId: "test", name: "Test" },
      data: {
        members: [{ playerName: "Test", score: 1.5, capturedAt: "2026-02-21T14:00:00.000Z" }],
      },
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-UUID websiteClanId", () => {
    const result = ImportPayloadSchema.safeParse({
      version: 1,
      exportedAt: "2026-02-21T14:30:00.000Z",
      source: "test",
      clan: { localClanId: "test", name: "Test", websiteClanId: "not-a-uuid" },
      data: {},
    });
    expect(result.success).toBe(false);
  });
});

/* ── ReviewRequestSchema ── */

describe("ReviewRequestSchema", () => {
  it("accepts approve_all bulk action", () => {
    const result = ReviewRequestSchema.safeParse({ action: "approve_all" });
    expect(result.success).toBe(true);
  });

  it("accepts reject_all bulk action", () => {
    const result = ReviewRequestSchema.safeParse({ action: "reject_all" });
    expect(result.success).toBe(true);
  });

  it("accepts approve_matched bulk action", () => {
    const result = ReviewRequestSchema.safeParse({ action: "approve_matched" });
    expect(result.success).toBe(true);
  });

  it("accepts per-item approve actions", () => {
    const result = ReviewRequestSchema.safeParse({
      items: [
        { id: "f47ac10b-58cc-4372-a567-0e02b2c3d479", action: "approve" },
        { id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d", action: "reject", notes: "wrong player" },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("accepts per-item approve with manual match and saveCorrection", () => {
    const result = ReviewRequestSchema.safeParse({
      items: [
        {
          id: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
          action: "approve",
          matchGameAccountId: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
          saveCorrection: true,
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty request (no action and no items)", () => {
    const result = ReviewRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects empty items array", () => {
    const result = ReviewRequestSchema.safeParse({ items: [] });
    expect(result.success).toBe(false);
  });

  it("rejects invalid item UUID", () => {
    const result = ReviewRequestSchema.safeParse({
      items: [{ id: "not-a-uuid", action: "approve" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid bulk action", () => {
    const result = ReviewRequestSchema.safeParse({ action: "invalid_action" });
    expect(result.success).toBe(false);
  });
});

/* ── ValidationListPushSchema ── */

describe("ValidationListPushSchema", () => {
  it("accepts a full validation push", () => {
    const result = ValidationListPushSchema.safeParse({
      clanId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      knownPlayerNames: ["Strategus", "König"],
      knownChestNames: ["Army Chest"],
      knownSources: ["Clan War"],
      corrections: {
        player: { Stratequs: "Strategus" },
        chest: {},
        source: {},
      },
    });
    expect(result.success).toBe(true);
  });

  it("accepts minimal push (just clanId)", () => {
    const result = ValidationListPushSchema.safeParse({
      clanId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing clanId", () => {
    const result = ValidationListPushSchema.safeParse({
      knownPlayerNames: ["Test"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-UUID clanId", () => {
    const result = ValidationListPushSchema.safeParse({
      clanId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });
});

/* ── SubmissionsQuerySchema ── */

describe("SubmissionsQuerySchema", () => {
  it("accepts valid query with all params", () => {
    const result = SubmissionsQuerySchema.safeParse({
      clan_id: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      status: "pending",
      type: "chests",
      page: "2",
      per_page: "10",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.per_page).toBe(10);
    }
  });

  it("applies defaults for page and per_page", () => {
    const result = SubmissionsQuerySchema.safeParse({
      clan_id: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.per_page).toBe(20);
    }
  });

  it("rejects missing clan_id", () => {
    const result = SubmissionsQuerySchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects per_page above 50", () => {
    const result = SubmissionsQuerySchema.safeParse({
      clan_id: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      per_page: "100",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid status value", () => {
    const result = SubmissionsQuerySchema.safeParse({
      clan_id: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      status: "invalid",
    });
    expect(result.success).toBe(false);
  });
});

/* ── SubmissionDetailQuerySchema ── */

describe("SubmissionDetailQuerySchema", () => {
  it("applies defaults", () => {
    const result = SubmissionDetailQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.per_page).toBe(50);
    }
  });

  it("rejects per_page above 200", () => {
    const result = SubmissionDetailQuerySchema.safeParse({ per_page: "300" });
    expect(result.success).toBe(false);
  });

  it("accepts valid item_status filter", () => {
    const result = SubmissionDetailQuerySchema.safeParse({ item_status: "auto_matched" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid item_status", () => {
    const result = SubmissionDetailQuerySchema.safeParse({ item_status: "completed" });
    expect(result.success).toBe(false);
  });
});
