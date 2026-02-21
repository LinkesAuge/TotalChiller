import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@supabase/ssr", () => ({
  createBrowserClient: vi.fn(() => ({ auth: {}, from: vi.fn() })),
}));

vi.mock("./config", () => ({
  getSupabaseUrl: () => "https://test.supabase.co",
  getSupabaseAnonKey: () => "test-anon-key",
}));

import { createBrowserClient } from "@supabase/ssr";

describe("createSupabaseBrowserClient", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.mocked(createBrowserClient).mockClear();
  });

  it("creates a browser client with correct URL and key", async () => {
    const mod = await import("./browser-client");
    mod.default();
    expect(createBrowserClient).toHaveBeenCalledWith("https://test.supabase.co", "test-anon-key");
  });

  it("returns cached instance on subsequent calls", async () => {
    const mod = await import("./browser-client");
    const first = mod.default();
    const second = mod.default();
    expect(first).toBe(second);
    expect(createBrowserClient).toHaveBeenCalledTimes(1);
  });
});
