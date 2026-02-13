/**
 * Unit tests for the fan-out notification Zod schema.
 *
 * Re-declares the schema locally (mirroring app/api/notifications/fan-out/route.ts)
 * to test validation without importing Next.js server code.
 */
import { describe, it, expect } from "vitest";
import { z } from "zod";

const FAN_OUT_SCHEMA = z.object({
  type: z.enum(["news", "event"]),
  reference_id: z.string().uuid(),
  clan_id: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  body: z.string().max(2000).optional(),
});

const VALID_UUID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
const VALID_INPUT = {
  type: "news" as const,
  reference_id: VALID_UUID,
  clan_id: VALID_UUID,
  title: "Test Notification",
};

describe("FAN_OUT_SCHEMA", () => {
  it("accepts a valid news notification", () => {
    expect(FAN_OUT_SCHEMA.safeParse(VALID_INPUT).success).toBe(true);
  });

  it("accepts a valid event notification", () => {
    const input = { ...VALID_INPUT, type: "event" };
    expect(FAN_OUT_SCHEMA.safeParse(input).success).toBe(true);
  });

  it("accepts optional body", () => {
    const input = { ...VALID_INPUT, body: "Some description" };
    const result = FAN_OUT_SCHEMA.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.body).toBe("Some description");
  });

  it("accepts missing body (undefined)", () => {
    const result = FAN_OUT_SCHEMA.safeParse(VALID_INPUT);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.body).toBeUndefined();
  });

  it("rejects invalid type", () => {
    const input = { ...VALID_INPUT, type: "invalid" };
    expect(FAN_OUT_SCHEMA.safeParse(input).success).toBe(false);
  });

  it("rejects missing type", () => {
    const { type: _, ...noType } = VALID_INPUT;
    expect(FAN_OUT_SCHEMA.safeParse(noType).success).toBe(false);
  });

  it("rejects invalid reference_id (non-UUID)", () => {
    const input = { ...VALID_INPUT, reference_id: "not-a-uuid" };
    expect(FAN_OUT_SCHEMA.safeParse(input).success).toBe(false);
  });

  it("rejects missing reference_id", () => {
    const { reference_id: _, ...noRef } = VALID_INPUT;
    expect(FAN_OUT_SCHEMA.safeParse(noRef).success).toBe(false);
  });

  it("rejects invalid clan_id (non-UUID)", () => {
    const input = { ...VALID_INPUT, clan_id: "bad" };
    expect(FAN_OUT_SCHEMA.safeParse(input).success).toBe(false);
  });

  it("rejects missing clan_id", () => {
    const { clan_id: _, ...noClan } = VALID_INPUT;
    expect(FAN_OUT_SCHEMA.safeParse(noClan).success).toBe(false);
  });

  it("rejects empty title (after trim)", () => {
    const input = { ...VALID_INPUT, title: "   " };
    expect(FAN_OUT_SCHEMA.safeParse(input).success).toBe(false);
  });

  it("rejects title exceeding 200 characters", () => {
    const input = { ...VALID_INPUT, title: "x".repeat(201) };
    expect(FAN_OUT_SCHEMA.safeParse(input).success).toBe(false);
  });

  it("accepts title at exactly 200 characters", () => {
    const input = { ...VALID_INPUT, title: "x".repeat(200) };
    expect(FAN_OUT_SCHEMA.safeParse(input).success).toBe(true);
  });

  it("rejects body exceeding 2000 characters", () => {
    const input = { ...VALID_INPUT, body: "x".repeat(2001) };
    expect(FAN_OUT_SCHEMA.safeParse(input).success).toBe(false);
  });

  it("accepts body at exactly 2000 characters", () => {
    const input = { ...VALID_INPUT, body: "x".repeat(2000) };
    expect(FAN_OUT_SCHEMA.safeParse(input).success).toBe(true);
  });

  it("trims whitespace from title", () => {
    const input = { ...VALID_INPUT, title: "  Hello World  " };
    const result = FAN_OUT_SCHEMA.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.title).toBe("Hello World");
  });

  it("rejects entirely missing input", () => {
    expect(FAN_OUT_SCHEMA.safeParse({}).success).toBe(false);
  });

  it("rejects null input", () => {
    expect(FAN_OUT_SCHEMA.safeParse(null).success).toBe(false);
  });
});
