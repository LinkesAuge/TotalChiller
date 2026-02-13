/**
 * Unit tests for the create-user Zod schema.
 *
 * Re-declares the schema locally (mirroring app/api/admin/create-user/route.ts)
 * to test validation without importing Next.js server code.
 */
import { describe, it, expect } from "vitest";
import { z } from "zod";

const CREATE_USER_SCHEMA = z.object({
  email: z.string().email(),
  username: z.string().min(2).max(32),
  displayName: z.string().min(1).max(64).optional(),
});

describe("CREATE_USER_SCHEMA", () => {
  it("accepts a valid email + username", () => {
    const result = CREATE_USER_SCHEMA.safeParse({ email: "user@example.com", username: "testuser" });
    expect(result.success).toBe(true);
  });

  it("accepts email + username + displayName", () => {
    const result = CREATE_USER_SCHEMA.safeParse({
      email: "user@example.com",
      username: "testuser",
      displayName: "Test User",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.displayName).toBe("Test User");
  });

  it("accepts displayName as optional (undefined)", () => {
    const result = CREATE_USER_SCHEMA.safeParse({ email: "user@example.com", username: "ab" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.displayName).toBeUndefined();
  });

  it("rejects missing email", () => {
    expect(CREATE_USER_SCHEMA.safeParse({ username: "testuser" }).success).toBe(false);
  });

  it("rejects invalid email", () => {
    expect(CREATE_USER_SCHEMA.safeParse({ email: "not-an-email", username: "testuser" }).success).toBe(false);
  });

  it("rejects missing username", () => {
    expect(CREATE_USER_SCHEMA.safeParse({ email: "user@example.com" }).success).toBe(false);
  });

  it("rejects username shorter than 2 characters", () => {
    expect(CREATE_USER_SCHEMA.safeParse({ email: "user@example.com", username: "a" }).success).toBe(false);
  });

  it("accepts username at exactly 2 characters", () => {
    expect(CREATE_USER_SCHEMA.safeParse({ email: "user@example.com", username: "ab" }).success).toBe(true);
  });

  it("rejects username longer than 32 characters", () => {
    const input = { email: "user@example.com", username: "x".repeat(33) };
    expect(CREATE_USER_SCHEMA.safeParse(input).success).toBe(false);
  });

  it("accepts username at exactly 32 characters", () => {
    const input = { email: "user@example.com", username: "x".repeat(32) };
    expect(CREATE_USER_SCHEMA.safeParse(input).success).toBe(true);
  });

  it("rejects displayName longer than 64 characters", () => {
    const input = { email: "user@example.com", username: "testuser", displayName: "x".repeat(65) };
    expect(CREATE_USER_SCHEMA.safeParse(input).success).toBe(false);
  });

  it("accepts displayName at exactly 64 characters", () => {
    const input = { email: "user@example.com", username: "testuser", displayName: "x".repeat(64) };
    expect(CREATE_USER_SCHEMA.safeParse(input).success).toBe(true);
  });

  it("rejects empty displayName (min 1)", () => {
    const input = { email: "user@example.com", username: "testuser", displayName: "" };
    expect(CREATE_USER_SCHEMA.safeParse(input).success).toBe(false);
  });

  it("rejects empty object", () => {
    expect(CREATE_USER_SCHEMA.safeParse({}).success).toBe(false);
  });
});
