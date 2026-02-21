import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockAuth, createUnauthorizedResult, createChainableMock, setChainResult } from "@/test";
import { NextRequest } from "next/server";

vi.mock("@/lib/api/require-auth");
vi.mock("@/lib/api/logger", () => ({ captureApiError: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({
  strictLimiter: { check: vi.fn().mockReturnValue(null) },
  standardLimiter: { check: vi.fn().mockReturnValue(null) },
  relaxedLimiter: { check: vi.fn().mockReturnValue(null) },
}));

vi.mock("@/lib/messages/profile-utils", () => ({
  resolveMessageProfileLabel: vi
    .fn()
    .mockImplementation(
      (profile: { display_name: string | null; username: string | null } | null, fallback: string) =>
        profile?.display_name ?? profile?.username ?? fallback,
    ),
}));

const mockSvcFrom = vi.fn();
vi.mock("@/lib/supabase/service-role-client", () => ({
  default: vi.fn(() => ({ from: mockSvcFrom })),
}));

import { requireAuth } from "@/lib/api/require-auth";
import { GET } from "./route";

function makeRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL("/api/messages/search-recipients", "http://localhost:3000");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url);
}

describe("GET /api/messages/search-recipients", () => {
  let mockAuth: ReturnType<typeof createMockAuth>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth = createMockAuth();
    vi.mocked(requireAuth).mockResolvedValue(mockAuth.authResult);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireAuth).mockResolvedValue(createUnauthorizedResult() as never);
    const res = await GET(makeRequest({ q: "test" }));
    expect(res.status).toBe(401);
  });

  it("returns empty array when query is too short", async () => {
    const res = await GET(makeRequest({ q: "a" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual([]);
  });

  it("returns empty array when no query provided", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual([]);
  });

  it("returns matching profiles", async () => {
    const profileSearchChain = createChainableMock();
    setChainResult(profileSearchChain, {
      data: [{ id: "user-1", username: "testplayer", display_name: "Test Player" }],
      error: null,
    });

    const gameAccountSearchChain = createChainableMock();
    setChainResult(gameAccountSearchChain, { data: [], error: null });

    const profileDetailChain = createChainableMock();
    setChainResult(profileDetailChain, {
      data: [{ id: "user-1", username: "testplayer", display_name: "Test Player" }],
      error: null,
    });

    const gameAccountDetailChain = createChainableMock();
    setChainResult(gameAccountDetailChain, { data: [], error: null });

    let profileCallCount = 0;
    let gameAccountCallCount = 0;
    mockSvcFrom.mockImplementation((table: string) => {
      if (table === "profiles") {
        profileCallCount++;
        return profileCallCount === 1 ? profileSearchChain : profileDetailChain;
      }
      if (table === "game_accounts") {
        gameAccountCallCount++;
        return gameAccountCallCount === 1 ? gameAccountSearchChain : gameAccountDetailChain;
      }
      return createChainableMock();
    });

    const res = await GET(makeRequest({ q: "test" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.length).toBe(1);
    expect(body.data[0].id).toBe("user-1");
  });

  it("returns empty when no matches found", async () => {
    const emptyChain = createChainableMock();
    setChainResult(emptyChain, { data: [], error: null });

    mockSvcFrom.mockReturnValue(emptyChain);

    const res = await GET(makeRequest({ q: "nonexistent" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual([]);
  });

  it("returns 500 on unexpected error", async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error("boom"));
    const res = await GET(makeRequest({ q: "test" }));
    expect(res.status).toBe(500);
  });
});
