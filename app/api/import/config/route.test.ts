import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/api/logger", () => ({ captureApiError: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({
  strictLimiter: { check: vi.fn().mockReturnValue(null) },
  standardLimiter: { check: vi.fn().mockReturnValue(null) },
  relaxedLimiter: { check: vi.fn().mockReturnValue(null) },
}));

vi.mock("@/lib/supabase/config", () => ({
  getSupabaseUrl: vi.fn().mockReturnValue("https://test.supabase.co"),
  getSupabaseAnonKey: vi.fn().mockReturnValue("test-anon-key"),
}));

import { getSupabaseUrl } from "@/lib/supabase/config";
import { GET } from "./route";

function makeRequest(): NextRequest {
  return new NextRequest(new URL("/api/import/config", "http://localhost:3000"));
}

describe("GET /api/import/config", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns supabase config", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.supabaseUrl).toBe("https://test.supabase.co");
    expect(body.data.supabaseAnonKey).toBe("test-anon-key");
  });

  it("returns 500 when config functions throw", async () => {
    vi.mocked(getSupabaseUrl).mockImplementation(() => {
      throw new Error("Missing env var");
    });
    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
  });
});
