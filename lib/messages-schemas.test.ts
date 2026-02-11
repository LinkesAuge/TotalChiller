/**
 * Unit tests for message-related Zod schemas and utility functions.
 *
 * Validates:
 * - SEND_MESSAGE_SCHEMA: input validation for POST /api/messages
 * - BATCH_MARK_READ_SCHEMA: input validation for PATCH /api/messages
 * - deduplicateOutgoing: broadcast deduplication logic
 */
import { describe, test, expect } from "vitest";
import { z } from "zod";

/* ── Re-declare schemas locally (mirroring route.ts) to test validation
      without importing Next.js server code that requires runtime context. ── */

const SEND_MESSAGE_SCHEMA = z.object({
  recipient_id: z.string().uuid().optional(),
  recipient_ids: z.array(z.string().uuid()).max(50).optional(),
  subject: z.string().max(200).optional(),
  content: z.string().min(1).max(10_000),
});

const BATCH_MARK_READ_SCHEMA = z.object({
  messageIds: z.array(z.string().uuid()).min(1).max(500),
});

function deduplicateOutgoing<T extends { broadcast_group_id: string | null }>(rows: readonly T[]): T[] {
  const seenGroups = new Set<string>();
  const result: T[] = [];
  for (const row of rows) {
    if (row.broadcast_group_id) {
      if (seenGroups.has(row.broadcast_group_id)) continue;
      seenGroups.add(row.broadcast_group_id);
    }
    result.push(row);
  }
  return result;
}

/* ------------------------------------------------------------------ */
/*  SEND_MESSAGE_SCHEMA                                                */
/* ------------------------------------------------------------------ */

describe("SEND_MESSAGE_SCHEMA", () => {
  test("accepts valid single-recipient message", () => {
    const input = {
      recipient_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      content: "Hello!",
    };
    expect(SEND_MESSAGE_SCHEMA.safeParse(input).success).toBe(true);
  });

  test("accepts valid multi-recipient message", () => {
    const input = {
      recipient_ids: ["a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11", "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22"],
      content: "Hello everyone!",
      subject: "Group message",
    };
    expect(SEND_MESSAGE_SCHEMA.safeParse(input).success).toBe(true);
  });

  test("rejects empty content", () => {
    const input = { recipient_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11", content: "" };
    const result = SEND_MESSAGE_SCHEMA.safeParse(input);
    expect(result.success).toBe(false);
  });

  test("rejects content exceeding 10000 characters", () => {
    const input = {
      recipient_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      content: "x".repeat(10_001),
    };
    const result = SEND_MESSAGE_SCHEMA.safeParse(input);
    expect(result.success).toBe(false);
  });

  test("rejects invalid UUID for recipient_id", () => {
    const input = { recipient_id: "not-a-uuid", content: "Hello" };
    const result = SEND_MESSAGE_SCHEMA.safeParse(input);
    expect(result.success).toBe(false);
  });

  test("rejects recipient_ids exceeding 50", () => {
    const ids = Array.from({ length: 51 }, (_, i) => `a0eebc99-9c0b-4ef8-bb6d-6bb9bd38${String(i).padStart(4, "0")}`);
    const input = { recipient_ids: ids, content: "Hello" };
    const result = SEND_MESSAGE_SCHEMA.safeParse(input);
    expect(result.success).toBe(false);
  });

  test("rejects subject exceeding 200 characters", () => {
    const input = {
      recipient_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      content: "Hello",
      subject: "x".repeat(201),
    };
    const result = SEND_MESSAGE_SCHEMA.safeParse(input);
    expect(result.success).toBe(false);
  });

  test("accepts message without subject or recipient_id (both optional)", () => {
    const input = { content: "Just content" };
    expect(SEND_MESSAGE_SCHEMA.safeParse(input).success).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/*  BATCH_MARK_READ_SCHEMA                                             */
/* ------------------------------------------------------------------ */

describe("BATCH_MARK_READ_SCHEMA", () => {
  test("accepts valid array of UUIDs", () => {
    const input = {
      messageIds: ["a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11", "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22"],
    };
    expect(BATCH_MARK_READ_SCHEMA.safeParse(input).success).toBe(true);
  });

  test("accepts single UUID", () => {
    const input = { messageIds: ["a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"] };
    expect(BATCH_MARK_READ_SCHEMA.safeParse(input).success).toBe(true);
  });

  test("rejects empty array", () => {
    const result = BATCH_MARK_READ_SCHEMA.safeParse({ messageIds: [] });
    expect(result.success).toBe(false);
  });

  test("rejects array exceeding 500 items", () => {
    const ids = Array.from({ length: 501 }, (_, i) => `a0eebc99-9c0b-4ef8-bb6d-6bb9bd38${String(i).padStart(4, "0")}`);
    const result = BATCH_MARK_READ_SCHEMA.safeParse({ messageIds: ids });
    expect(result.success).toBe(false);
  });

  test("rejects non-UUID strings", () => {
    const result = BATCH_MARK_READ_SCHEMA.safeParse({ messageIds: ["not-a-uuid"] });
    expect(result.success).toBe(false);
  });

  test("rejects missing messageIds", () => {
    const result = BATCH_MARK_READ_SCHEMA.safeParse({});
    expect(result.success).toBe(false);
  });

  test("rejects non-array messageIds", () => {
    const result = BATCH_MARK_READ_SCHEMA.safeParse({ messageIds: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" });
    expect(result.success).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/*  deduplicateOutgoing                                                */
/* ------------------------------------------------------------------ */

describe("deduplicateOutgoing", () => {
  test("keeps messages without broadcast_group_id", () => {
    const rows = [
      { id: "1", broadcast_group_id: null },
      { id: "2", broadcast_group_id: null },
    ];
    expect(deduplicateOutgoing(rows)).toHaveLength(2);
  });

  test("deduplicates messages with same broadcast_group_id", () => {
    const rows = [
      { id: "1", broadcast_group_id: "group-a" },
      { id: "2", broadcast_group_id: "group-a" },
      { id: "3", broadcast_group_id: "group-a" },
    ];
    const result = deduplicateOutgoing(rows);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  test("keeps first of each broadcast group", () => {
    const rows = [
      { id: "1", broadcast_group_id: "group-a" },
      { id: "2", broadcast_group_id: "group-b" },
      { id: "3", broadcast_group_id: "group-a" },
      { id: "4", broadcast_group_id: "group-b" },
    ];
    const result = deduplicateOutgoing(rows);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.id)).toEqual(["1", "2"]);
  });

  test("handles mixed null and grouped messages", () => {
    const rows = [
      { id: "1", broadcast_group_id: null },
      { id: "2", broadcast_group_id: "group-a" },
      { id: "3", broadcast_group_id: null },
      { id: "4", broadcast_group_id: "group-a" },
    ];
    const result = deduplicateOutgoing(rows);
    expect(result).toHaveLength(3);
    expect(result.map((r) => r.id)).toEqual(["1", "2", "3"]);
  });

  test("returns empty array for empty input", () => {
    expect(deduplicateOutgoing([])).toEqual([]);
  });
});
