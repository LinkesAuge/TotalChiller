import { describe, it, expect, vi } from "vitest";

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn((name: string) => (name === "sb-token" ? { value: "mock-cookie" } : undefined)),
    set: vi.fn(),
  }),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn((_url: string, _key: string, _opts: unknown) => ({
    auth: { getUser: vi.fn() },
    from: vi.fn(),
  })),
}));

vi.mock("./config", () => ({
  getSupabaseUrl: () => "https://test.supabase.co",
  getSupabaseAnonKey: () => "test-anon-key",
}));

vi.mock("react", async () => {
  const actual = await vi.importActual("react");
  return {
    ...actual,
    cache: (fn: Function) => fn,
  };
});

import { createServerClient } from "@supabase/ssr";
import createSupabaseServerClient from "./server-client";

describe("createSupabaseServerClient", () => {
  it("creates a server client with the correct URL and key", async () => {
    await createSupabaseServerClient();
    expect(createServerClient).toHaveBeenCalledWith(
      "https://test.supabase.co",
      "test-anon-key",
      expect.objectContaining({ cookies: expect.any(Object) }),
    );
  });

  it("returns a Supabase client object", async () => {
    const client = await createSupabaseServerClient();
    expect(client).toHaveProperty("auth");
    expect(client).toHaveProperty("from");
  });
});
