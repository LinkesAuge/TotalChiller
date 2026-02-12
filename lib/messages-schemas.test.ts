/**
 * Unit tests for message-related Zod schemas (v2 — email model).
 *
 * Validates:
 * - SEND_SCHEMA: input validation for POST /api/messages (unified send)
 */
import { describe, test, expect } from "vitest";
import { z } from "zod";

/* ── Re-declare schema locally (mirroring route.ts) to test validation
      without importing Next.js server code that requires runtime context. ── */

const SEND_SCHEMA = z.object({
  recipient_ids: z.array(z.string().uuid()).min(1).max(500),
  subject: z.string().max(200).optional(),
  content: z.string().min(1).max(10_000),
  message_type: z.enum(["private", "broadcast", "clan"]).default("private"),
  parent_id: z.string().uuid().optional(),
  clan_id: z.string().uuid().optional(),
});

/* ------------------------------------------------------------------ */
/*  SEND_SCHEMA                                                        */
/* ------------------------------------------------------------------ */

describe("SEND_SCHEMA", () => {
  test("accepts valid single-recipient private message", () => {
    const input = {
      recipient_ids: ["a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"],
      content: "Hello!",
    };
    expect(SEND_SCHEMA.safeParse(input).success).toBe(true);
  });

  test("accepts valid multi-recipient private message", () => {
    const input = {
      recipient_ids: ["a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11", "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22"],
      content: "Hello everyone!",
      subject: "Group message",
    };
    expect(SEND_SCHEMA.safeParse(input).success).toBe(true);
  });

  test("accepts broadcast message type", () => {
    const input = {
      recipient_ids: ["a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"],
      content: "Broadcast content",
      message_type: "broadcast",
    };
    expect(SEND_SCHEMA.safeParse(input).success).toBe(true);
  });

  test("accepts clan message with clan_id", () => {
    const input = {
      recipient_ids: ["a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"],
      content: "Clan message",
      message_type: "clan",
      clan_id: "c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33",
    };
    expect(SEND_SCHEMA.safeParse(input).success).toBe(true);
  });

  test("accepts reply with parent_id", () => {
    const input = {
      recipient_ids: ["a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"],
      content: "Reply content",
      parent_id: "d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44",
    };
    expect(SEND_SCHEMA.safeParse(input).success).toBe(true);
  });

  test("defaults message_type to private", () => {
    const input = {
      recipient_ids: ["a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"],
      content: "Hello",
    };
    const result = SEND_SCHEMA.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.message_type).toBe("private");
    }
  });

  test("rejects empty content", () => {
    const input = {
      recipient_ids: ["a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"],
      content: "",
    };
    expect(SEND_SCHEMA.safeParse(input).success).toBe(false);
  });

  test("rejects content exceeding 10000 characters", () => {
    const input = {
      recipient_ids: ["a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"],
      content: "x".repeat(10_001),
    };
    expect(SEND_SCHEMA.safeParse(input).success).toBe(false);
  });

  test("rejects empty recipient_ids array", () => {
    const input = { recipient_ids: [], content: "Hello" };
    expect(SEND_SCHEMA.safeParse(input).success).toBe(false);
  });

  test("rejects invalid UUID in recipient_ids", () => {
    const input = { recipient_ids: ["not-a-uuid"], content: "Hello" };
    expect(SEND_SCHEMA.safeParse(input).success).toBe(false);
  });

  test("rejects recipient_ids exceeding 500", () => {
    const ids = Array.from({ length: 501 }, (_, i) => `a0eebc99-9c0b-4ef8-bb6d-6bb9bd38${String(i).padStart(4, "0")}`);
    const input = { recipient_ids: ids, content: "Hello" };
    expect(SEND_SCHEMA.safeParse(input).success).toBe(false);
  });

  test("rejects subject exceeding 200 characters", () => {
    const input = {
      recipient_ids: ["a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"],
      content: "Hello",
      subject: "x".repeat(201),
    };
    expect(SEND_SCHEMA.safeParse(input).success).toBe(false);
  });

  test("rejects invalid message_type", () => {
    const input = {
      recipient_ids: ["a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"],
      content: "Hello",
      message_type: "invalid",
    };
    expect(SEND_SCHEMA.safeParse(input).success).toBe(false);
  });

  test("rejects missing recipient_ids", () => {
    const input = { content: "Hello" };
    expect(SEND_SCHEMA.safeParse(input).success).toBe(false);
  });
});
