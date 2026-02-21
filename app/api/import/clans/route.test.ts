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

import { requireAuthWithBearer } from "@/lib/api/require-auth";
import { GET } from "./route";

function makeRequest(): NextRequest {
  return new NextRequest(new URL("/api/import/clans", "http://localhost:3000"), {
    headers: { Authorization: "Bearer test-token" },
  });
}

describe("GET /api/import/clans", () => {
  let mockAuth: ReturnType<typeof createMockAuth>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth = createMockAuth();
    vi.mocked(requireAuthWithBearer).mockResolvedValue(mockAuth.authResult);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireAuthWithBearer).mockResolvedValue(createUnauthorizedResult() as never);
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it("returns clans and default clan id", async () => {
    const profileChain = createChainableMock();
    setChainResult(profileChain, {
      data: { default_clan_id: "clan-1" },
      error: null,
    });

    const clansChain = createChainableMock();
    setChainResult(clansChain, {
      data: [
        {
          clan_id: "clan-1",
          clans: { id: "clan-1", name: "Test Clan" },
          game_accounts: { id: "ga-1", game_username: "Player1" },
        },
      ],
      error: null,
    });

    mockAuth.mockFrom.mockImplementation((table: string) => {
      if (table === "profiles") return profileChain;
      if (table === "game_account_clan_memberships") return clansChain;
      return createChainableMock();
    });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.defaultClanId).toBe("clan-1");
    expect(body.data.clans).toHaveLength(1);
    expect(body.data.clans[0].name).toBe("Test Clan");
  });

  it("returns empty clans list when no memberships", async () => {
    const profileChain = createChainableMock();
    setChainResult(profileChain, { data: { default_clan_id: null }, error: null });

    const clansChain = createChainableMock();
    setChainResult(clansChain, { data: [], error: null });

    mockAuth.mockFrom.mockImplementation((table: string) => {
      if (table === "profiles") return profileChain;
      if (table === "game_account_clan_memberships") return clansChain;
      return createChainableMock();
    });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.defaultClanId).toBeNull();
    expect(body.data.clans).toEqual([]);
  });

  it("returns 500 on unexpected error", async () => {
    vi.mocked(requireAuthWithBearer).mockRejectedValue(new Error("boom"));
    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
  });
});
