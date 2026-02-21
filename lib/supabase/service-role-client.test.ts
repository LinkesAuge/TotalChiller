import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({ auth: {}, from: vi.fn() })),
}));

vi.mock("./config", () => ({
  getSupabaseUrl: () => "https://test.supabase.co",
  getSupabaseServiceRoleKey: () => "test-service-role-key",
}));

import { createClient } from "@supabase/supabase-js";

describe("createSupabaseServiceRoleClient", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.mocked(createClient).mockClear();
  });

  it("creates a client with service role config", async () => {
    const mod = await import("./service-role-client");
    mod.default();
    expect(createClient).toHaveBeenCalledWith(
      "https://test.supabase.co",
      "test-service-role-key",
      expect.objectContaining({
        auth: { persistSession: false, autoRefreshToken: false },
      }),
    );
  });

  it("returns the same cached instance on subsequent calls", async () => {
    const mod = await import("./service-role-client");
    const first = mod.default();
    const second = mod.default();
    expect(first).toBe(second);
    expect(createClient).toHaveBeenCalledTimes(1);
  });
});
