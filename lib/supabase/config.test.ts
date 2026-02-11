import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getSupabaseUrl, getSupabaseAnonKey, getSupabaseServiceRoleKey } from "./config";

/* ------------------------------------------------------------------ */
/*  Environment variable tests                                         */
/* ------------------------------------------------------------------ */

describe("getSupabaseUrl", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", undefined as unknown as string);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    process.env = originalEnv;
  });

  it("returns the URL when NEXT_PUBLIC_SUPABASE_URL is set", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    expect(getSupabaseUrl()).toBe("https://example.supabase.co");
  });

  it("throws when NEXT_PUBLIC_SUPABASE_URL is missing", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    expect(() => getSupabaseUrl()).toThrow("Missing NEXT_PUBLIC_SUPABASE_URL");
  });
});

describe("getSupabaseAnonKey", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", undefined as unknown as string);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    process.env = originalEnv;
  });

  it("returns the key when NEXT_PUBLIC_SUPABASE_ANON_KEY is set", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key-123");
    expect(getSupabaseAnonKey()).toBe("anon-key-123");
  });

  it("throws when NEXT_PUBLIC_SUPABASE_ANON_KEY is missing", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    expect(() => getSupabaseAnonKey()).toThrow("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");
  });
});

describe("getSupabaseServiceRoleKey", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", undefined as unknown as string);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    process.env = originalEnv;
  });

  it("returns the key when SUPABASE_SERVICE_ROLE_KEY is set", () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key-456");
    expect(getSupabaseServiceRoleKey()).toBe("service-role-key-456");
  });

  it("throws when SUPABASE_SERVICE_ROLE_KEY is missing", () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    expect(() => getSupabaseServiceRoleKey()).toThrow("Missing SUPABASE_SERVICE_ROLE_KEY");
  });
});
