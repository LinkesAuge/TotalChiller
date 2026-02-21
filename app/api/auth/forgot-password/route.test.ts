import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSupabase } from "@/test";

vi.mock("@/lib/api/logger", () => ({ captureApiError: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({
  strictLimiter: { check: vi.fn().mockReturnValue(null) },
  standardLimiter: { check: vi.fn().mockReturnValue(null) },
  relaxedLimiter: { check: vi.fn().mockReturnValue(null) },
}));

let mockSupabase: ReturnType<typeof createMockSupabase>;
vi.mock("@/lib/supabase/server-client", () => ({
  default: vi.fn(async () => mockSupabase.supabase),
}));

import { NextRequest } from "next/server";
import { POST } from "./route";

const ORIGIN = "http://localhost:3000";

function makeRequest(body: unknown, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(new URL("/api/auth/forgot-password", ORIGIN), {
    method: "POST",
    headers: { "Content-Type": "application/json", origin: ORIGIN, ...headers },
    body: JSON.stringify(body),
  });
}

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    email: "user@example.com",
    turnstileToken: "",
    redirectTo: `${ORIGIN}/auth/callback?next=/auth/update`,
    ...overrides,
  };
}

describe("POST /api/auth/forgot-password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabase();
  });

  it("returns 400 for invalid body", async () => {
    const res = await POST(makeRequest({ email: "not-an-email" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.errorKey).toBe("invalidRequest");
  });

  it("returns 400 for missing body", async () => {
    const req = new NextRequest(new URL("/api/auth/forgot-password", ORIGIN), {
      method: "POST",
      headers: { "Content-Type": "application/json", origin: ORIGIN },
      body: "invalid-json{",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when redirectTo is a different origin", async () => {
    const res = await POST(makeRequest(validBody({ redirectTo: "https://evil.com/callback" })));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.errorKey).toBe("invalidRequest");
  });

  it("sends password reset and returns ok with cookie", async () => {
    const res = await POST(makeRequest(validBody()));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);

    const cookieHeader = res.headers.get("set-cookie");
    expect(cookieHeader).toContain("auth_redirect_next");
  });

  it("returns 400 when Supabase reset fails", async () => {
    (mockSupabase.supabase.auth.resetPasswordForEmail as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: null,
      error: { message: "User not found" },
    });

    const res = await POST(makeRequest(validBody()));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.errorKey).toBe("resetFailed");
  });

  it("returns 500 on unexpected exception", async () => {
    (mockSupabase.supabase.auth.resetPasswordForEmail as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("boom"));

    const res = await POST(makeRequest(validBody()));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.errorKey).toBe("unknownError");
  });

  it("sets auth_redirect_next cookie to /auth/update by default", async () => {
    const res = await POST(makeRequest(validBody({ redirectTo: `${ORIGIN}/auth/callback` })));
    expect(res.status).toBe(200);
    const cookieHeader = res.headers.get("set-cookie");
    expect(cookieHeader).toContain("auth_redirect_next");
    expect(cookieHeader).toContain("%2Fauth%2Fupdate");
  });
});
