/**
 * Unit tests for forum-categories Zod schemas.
 *
 * Re-declares schemas locally (mirroring app/api/admin/forum-categories/route.ts)
 * to test validation without importing Next.js server code.
 */
import { describe, it, expect } from "vitest";
import { z } from "zod";

const UUID_SCHEMA = z.string().uuid();

const CREATE_CATEGORY_SCHEMA = z.object({
  clan_id: z.string().uuid(),
  name: z.string().trim().min(1),
  slug: z.string().trim().optional(),
  description: z.string().nullable().optional(),
  sort_order: z.number().int().min(0).optional(),
});

const UPDATE_CATEGORY_SCHEMA = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).optional(),
  slug: z.string().trim().optional(),
  description: z.string().nullable().optional(),
  sort_order: z.number().int().min(0).optional(),
});

const VALID_UUID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

/* ------------------------------------------------------------------ */
/*  UUID_SCHEMA (used for query params)                                */
/* ------------------------------------------------------------------ */

describe("UUID_SCHEMA (forum-categories)", () => {
  it("accepts a valid UUID", () => {
    expect(UUID_SCHEMA.safeParse(VALID_UUID).success).toBe(true);
  });

  it("rejects a non-UUID string", () => {
    expect(UUID_SCHEMA.safeParse("not-a-uuid").success).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(UUID_SCHEMA.safeParse("").success).toBe(false);
  });

  it("rejects null", () => {
    expect(UUID_SCHEMA.safeParse(null).success).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/*  CREATE_CATEGORY_SCHEMA                                             */
/* ------------------------------------------------------------------ */

describe("CREATE_CATEGORY_SCHEMA", () => {
  it("accepts valid minimal input (clan_id + name)", () => {
    const result = CREATE_CATEGORY_SCHEMA.safeParse({ clan_id: VALID_UUID, name: "General" });
    expect(result.success).toBe(true);
  });

  it("accepts full input", () => {
    const input = {
      clan_id: VALID_UUID,
      name: "General Discussion",
      slug: "general-discussion",
      description: "A place for general topics",
      sort_order: 5,
    };
    const result = CREATE_CATEGORY_SCHEMA.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("rejects invalid clan_id", () => {
    expect(CREATE_CATEGORY_SCHEMA.safeParse({ clan_id: "bad", name: "Test" }).success).toBe(false);
  });

  it("rejects missing clan_id", () => {
    expect(CREATE_CATEGORY_SCHEMA.safeParse({ name: "Test" }).success).toBe(false);
  });

  it("rejects empty name (after trim)", () => {
    expect(CREATE_CATEGORY_SCHEMA.safeParse({ clan_id: VALID_UUID, name: "   " }).success).toBe(false);
  });

  it("rejects missing name", () => {
    expect(CREATE_CATEGORY_SCHEMA.safeParse({ clan_id: VALID_UUID }).success).toBe(false);
  });

  it("accepts null description", () => {
    const result = CREATE_CATEGORY_SCHEMA.safeParse({ clan_id: VALID_UUID, name: "Test", description: null });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.description).toBeNull();
  });

  it("rejects negative sort_order", () => {
    const input = { clan_id: VALID_UUID, name: "Test", sort_order: -1 };
    expect(CREATE_CATEGORY_SCHEMA.safeParse(input).success).toBe(false);
  });

  it("accepts sort_order of 0", () => {
    const input = { clan_id: VALID_UUID, name: "Test", sort_order: 0 };
    expect(CREATE_CATEGORY_SCHEMA.safeParse(input).success).toBe(true);
  });

  it("rejects non-integer sort_order", () => {
    const input = { clan_id: VALID_UUID, name: "Test", sort_order: 1.5 };
    expect(CREATE_CATEGORY_SCHEMA.safeParse(input).success).toBe(false);
  });

  it("trims whitespace from name", () => {
    const result = CREATE_CATEGORY_SCHEMA.safeParse({ clan_id: VALID_UUID, name: "  General  " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.name).toBe("General");
  });
});

/* ------------------------------------------------------------------ */
/*  UPDATE_CATEGORY_SCHEMA                                             */
/* ------------------------------------------------------------------ */

describe("UPDATE_CATEGORY_SCHEMA", () => {
  it("accepts valid id + name update", () => {
    const result = UPDATE_CATEGORY_SCHEMA.safeParse({ id: VALID_UUID, name: "Renamed" });
    expect(result.success).toBe(true);
  });

  it("accepts id-only (all other fields optional)", () => {
    const result = UPDATE_CATEGORY_SCHEMA.safeParse({ id: VALID_UUID });
    expect(result.success).toBe(true);
  });

  it("rejects invalid id (non-UUID)", () => {
    expect(UPDATE_CATEGORY_SCHEMA.safeParse({ id: "bad", name: "Test" }).success).toBe(false);
  });

  it("rejects missing id", () => {
    expect(UPDATE_CATEGORY_SCHEMA.safeParse({ name: "Test" }).success).toBe(false);
  });

  it("accepts slug update", () => {
    const result = UPDATE_CATEGORY_SCHEMA.safeParse({ id: VALID_UUID, slug: "new-slug" });
    expect(result.success).toBe(true);
  });

  it("accepts description set to null", () => {
    const result = UPDATE_CATEGORY_SCHEMA.safeParse({ id: VALID_UUID, description: null });
    expect(result.success).toBe(true);
  });

  it("rejects negative sort_order", () => {
    expect(UPDATE_CATEGORY_SCHEMA.safeParse({ id: VALID_UUID, sort_order: -1 }).success).toBe(false);
  });

  it("accepts sort_order update", () => {
    const result = UPDATE_CATEGORY_SCHEMA.safeParse({ id: VALID_UUID, sort_order: 10 });
    expect(result.success).toBe(true);
  });
});
