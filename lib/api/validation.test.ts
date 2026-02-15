import { describe, it, expect } from "vitest";
import {
  uuidSchema,
  notificationSettingsSchema,
  analyticsQuerySchema,
  messageQuerySchema,
  escapeLikePattern,
} from "./validation";

/* ------------------------------------------------------------------ */
/*  uuidSchema                                                         */
/* ------------------------------------------------------------------ */

describe("uuidSchema", () => {
  it("accepts a valid UUID v4", () => {
    const result = uuidSchema.safeParse("a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11");
    expect(result.success).toBe(true);
  });

  it("rejects a non-UUID string", () => {
    const result = uuidSchema.safeParse("not-a-uuid");
    expect(result.success).toBe(false);
  });

  it("rejects an empty string", () => {
    const result = uuidSchema.safeParse("");
    expect(result.success).toBe(false);
  });

  it("rejects a number", () => {
    const result = uuidSchema.safeParse(12345);
    expect(result.success).toBe(false);
  });

  it("includes 'Invalid UUID format' in error message", () => {
    const result = uuidSchema.safeParse("bad");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain("Invalid UUID format");
    }
  });
});

/* ------------------------------------------------------------------ */
/*  notificationSettingsSchema                                         */
/* ------------------------------------------------------------------ */

describe("notificationSettingsSchema", () => {
  it("accepts a single boolean field", () => {
    const result = notificationSettingsSchema.safeParse({ messages_enabled: true });
    expect(result.success).toBe(true);
  });

  it("accepts multiple boolean fields", () => {
    const result = notificationSettingsSchema.safeParse({
      messages_enabled: true,
      news_enabled: false,
      events_enabled: true,
      system_enabled: false,
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty object (at least one setting required)", () => {
    const result = notificationSettingsSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects unknown fields (strict mode)", () => {
    const result = notificationSettingsSchema.safeParse({ messages_enabled: true, unknown_field: true });
    expect(result.success).toBe(false);
  });

  it("rejects non-boolean values for settings", () => {
    const result = notificationSettingsSchema.safeParse({ messages_enabled: "yes" });
    expect(result.success).toBe(false);
  });

  it("accepts partial settings (only some fields)", () => {
    const result = notificationSettingsSchema.safeParse({ events_enabled: true });
    expect(result.success).toBe(true);
  });

  it("accepts bugs_email_enabled as a standalone field", () => {
    const result = notificationSettingsSchema.safeParse({ bugs_email_enabled: true });
    expect(result.success).toBe(true);
  });

  it("accepts bugs_email_enabled alongside other fields", () => {
    const result = notificationSettingsSchema.safeParse({
      messages_enabled: true,
      bugs_email_enabled: false,
    });
    expect(result.success).toBe(true);
  });

  it("accepts all five notification fields together", () => {
    const result = notificationSettingsSchema.safeParse({
      messages_enabled: true,
      news_enabled: false,
      events_enabled: true,
      system_enabled: false,
      bugs_email_enabled: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects non-boolean for bugs_email_enabled", () => {
    const result = notificationSettingsSchema.safeParse({ bugs_email_enabled: "yes" });
    expect(result.success).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/*  analyticsQuerySchema                                                */
/* ------------------------------------------------------------------ */

describe("analyticsQuerySchema", () => {
  it("accepts an empty object (all fields have defaults)", () => {
    const result = analyticsQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.clanId).toBe("");
      expect(result.data.gameAccountId).toBe("");
      expect(result.data.dateFrom).toBe("");
      expect(result.data.dateTo).toBe("");
      expect(result.data.player).toBe("");
      expect(result.data.source).toBe("");
    }
  });

  it("accepts valid UUID for clanId", () => {
    const result = analyticsQuerySchema.safeParse({ clanId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid UUID for clanId", () => {
    const result = analyticsQuerySchema.safeParse({ clanId: "not-a-uuid" });
    expect(result.success).toBe(false);
  });

  it("accepts valid UUID for gameAccountId", () => {
    const result = analyticsQuerySchema.safeParse({ gameAccountId: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid UUID for gameAccountId", () => {
    const result = analyticsQuerySchema.safeParse({ gameAccountId: "bad" });
    expect(result.success).toBe(false);
  });

  it("accepts valid YYYY-MM-DD for dateFrom", () => {
    const result = analyticsQuerySchema.safeParse({ dateFrom: "2026-02-11" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid date format for dateFrom", () => {
    const result = analyticsQuerySchema.safeParse({ dateFrom: "02/11/2026" });
    expect(result.success).toBe(false);
  });

  it("rejects partial date for dateFrom", () => {
    const result = analyticsQuerySchema.safeParse({ dateFrom: "2026-02" });
    expect(result.success).toBe(false);
  });

  it("accepts valid YYYY-MM-DD for dateTo", () => {
    const result = analyticsQuerySchema.safeParse({ dateTo: "2026-12-31" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid date format for dateTo", () => {
    const result = analyticsQuerySchema.safeParse({ dateTo: "not-a-date" });
    expect(result.success).toBe(false);
  });

  it("accepts short player filter", () => {
    const result = analyticsQuerySchema.safeParse({ player: "TestPlayer" });
    expect(result.success).toBe(true);
  });

  it("rejects player filter exceeding 100 characters", () => {
    const result = analyticsQuerySchema.safeParse({ player: "x".repeat(101) });
    expect(result.success).toBe(false);
  });

  it("accepts short source filter", () => {
    const result = analyticsQuerySchema.safeParse({ source: "DataSource" });
    expect(result.success).toBe(true);
  });

  it("rejects source filter exceeding 100 characters", () => {
    const result = analyticsQuerySchema.safeParse({ source: "x".repeat(101) });
    expect(result.success).toBe(false);
  });

  it("accepts all fields together", () => {
    const result = analyticsQuerySchema.safeParse({
      clanId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      gameAccountId: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
      dateFrom: "2026-01-01",
      dateTo: "2026-12-31",
      player: "TestPlayer",
      source: "DataSource",
    });
    expect(result.success).toBe(true);
  });
});

/* ── messageQuerySchema ── */

describe("messageQuerySchema", () => {
  it("defaults to type=all and search='' when empty", () => {
    const result = messageQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe("all");
      expect(result.data.search).toBe("");
    }
  });

  it("accepts valid type values", () => {
    for (const type of ["all", "private", "broadcast", "clan"]) {
      const result = messageQuerySchema.safeParse({ type });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid type value", () => {
    const result = messageQuerySchema.safeParse({ type: "invalid" });
    expect(result.success).toBe(false);
  });

  it("accepts a search term", () => {
    const result = messageQuerySchema.safeParse({ search: "hello" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.search).toBe("hello");
    }
  });

  it("rejects search term exceeding 200 characters", () => {
    const result = messageQuerySchema.safeParse({ search: "x".repeat(201) });
    expect(result.success).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/*  escapeLikePattern                                                  */
/* ------------------------------------------------------------------ */

describe("escapeLikePattern", () => {
  it("escapes percent signs", () => {
    expect(escapeLikePattern("100%")).toBe("100\\%");
  });

  it("escapes underscores", () => {
    expect(escapeLikePattern("some_field")).toBe("some\\_field");
  });

  it("escapes backslashes", () => {
    expect(escapeLikePattern("path\\to")).toBe("path\\\\to");
  });

  it("escapes all special characters together", () => {
    expect(escapeLikePattern("%_\\")).toBe("\\%\\_\\\\");
  });

  it("leaves normal text unchanged", () => {
    expect(escapeLikePattern("hello world")).toBe("hello world");
  });

  it("handles empty string", () => {
    expect(escapeLikePattern("")).toBe("");
  });
});
