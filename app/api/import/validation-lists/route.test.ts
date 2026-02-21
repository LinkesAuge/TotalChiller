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

const mockSvcFrom = vi.fn();
vi.mock("@/lib/supabase/service-role-client", () => ({
  default: vi.fn(() => ({ from: mockSvcFrom })),
}));

import { requireAuthWithBearer } from "@/lib/api/require-auth";
import { GET, POST } from "./route";

const clanUuid = "550e8400-e29b-41d4-a716-446655440000";

function makeGetRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL("/api/import/validation-lists", "http://localhost:3000");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url, {
    headers: { Authorization: "Bearer test-token" },
  });
}

function makePostRequest(body: unknown): NextRequest {
  return new NextRequest(new URL("/api/import/validation-lists", "http://localhost:3000"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer test-token",
    },
    body: JSON.stringify(body),
  });
}

describe("GET /api/import/validation-lists", () => {
  let mockAuth: ReturnType<typeof createMockAuth>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth = createMockAuth();
    vi.mocked(requireAuthWithBearer).mockResolvedValue(mockAuth.authResult);

    mockAuth.mockRpc.mockImplementation((fn: string) => {
      if (fn === "is_clan_member") return Promise.resolve({ data: true, error: null });
      if (fn === "is_any_admin") return Promise.resolve({ data: false, error: null });
      return Promise.resolve({ data: null, error: null });
    });
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireAuthWithBearer).mockResolvedValue(createUnauthorizedResult() as never);
    const res = await GET(makeGetRequest({ clan_id: clanUuid }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when clan_id is missing", async () => {
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid clan_id format", async () => {
    const res = await GET(makeGetRequest({ clan_id: "bad-id" }));
    expect(res.status).toBe(400);
  });

  it("returns 403 when user is not clan member", async () => {
    mockAuth.mockRpc.mockResolvedValue({ data: false, error: null });
    const res = await GET(makeGetRequest({ clan_id: clanUuid }));
    expect(res.status).toBe(403);
  });

  it("returns corrections and known names", async () => {
    const correctionsChain = createChainableMock();
    setChainResult(correctionsChain, {
      data: [
        { entity_type: "player", ocr_text: "Plyr1", corrected_text: "Player1", updated_at: "2025-01-01T00:00:00Z" },
      ],
      error: null,
    });

    const knownNamesChain = createChainableMock();
    setChainResult(knownNamesChain, {
      data: [{ entity_type: "player", name: "Player1" }],
      error: null,
    });

    mockSvcFrom.mockImplementation((table: string) => {
      if (table === "ocr_corrections") return correctionsChain;
      if (table === "known_names") return knownNamesChain;
      return createChainableMock();
    });

    const res = await GET(makeGetRequest({ clan_id: clanUuid }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.corrections.player).toHaveProperty("Plyr1", "Player1");
    expect(body.data.knownNames.player).toContain("Player1");
    expect(body.data.lastUpdatedAt).toBe("2025-01-01T00:00:00Z");
  });

  it("returns empty data when no corrections exist", async () => {
    const emptyChain = createChainableMock();
    setChainResult(emptyChain, { data: [], error: null });

    mockSvcFrom.mockReturnValue(emptyChain);

    const res = await GET(makeGetRequest({ clan_id: clanUuid }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.corrections.player).toEqual({});
    expect(body.data.knownNames.player).toEqual([]);
    expect(body.data.lastUpdatedAt).toBeNull();
  });

  it("returns 500 on unexpected error", async () => {
    vi.mocked(requireAuthWithBearer).mockRejectedValue(new Error("boom"));
    const res = await GET(makeGetRequest({ clan_id: clanUuid }));
    expect(res.status).toBe(500);
  });
});

describe("POST /api/import/validation-lists", () => {
  let mockAuth: ReturnType<typeof createMockAuth>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth = createMockAuth();
    vi.mocked(requireAuthWithBearer).mockResolvedValue(mockAuth.authResult);

    mockAuth.mockRpc.mockImplementation((fn: string) => {
      if (fn === "is_clan_member") return Promise.resolve({ data: true, error: null });
      if (fn === "is_any_admin") return Promise.resolve({ data: false, error: null });
      return Promise.resolve({ data: null, error: null });
    });
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireAuthWithBearer).mockResolvedValue(createUnauthorizedResult() as never);
    const res = await POST(makePostRequest({ clanId: clanUuid }));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid body", async () => {
    const res = await POST(makePostRequest({ clanId: "not-a-uuid" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for malformed JSON", async () => {
    const req = new NextRequest(new URL("/api/import/validation-lists", "http://localhost:3000"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-token",
      },
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 403 when user is not clan member", async () => {
    mockAuth.mockRpc.mockResolvedValue({ data: false, error: null });
    const res = await POST(
      makePostRequest({
        clanId: clanUuid,
        knownPlayerNames: ["Player1"],
      }),
    );
    expect(res.status).toBe(403);
  });

  it("upserts known names and corrections", async () => {
    const upsertChain = createChainableMock();
    setChainResult(upsertChain, { data: [{ id: "1" }], error: null });

    mockSvcFrom.mockReturnValue(upsertChain);

    const res = await POST(
      makePostRequest({
        clanId: clanUuid,
        knownPlayerNames: ["Player1", "Player2"],
        corrections: {
          player: { Plyr1: "Player1" },
        },
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.knownNamesUpserted).toBeDefined();
    expect(body.data.correctionsUpserted).toBeDefined();
  });

  it("handles empty known names and corrections", async () => {
    const res = await POST(
      makePostRequest({
        clanId: clanUuid,
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.knownNamesUpserted).toBe(0);
    expect(body.data.correctionsUpserted).toBe(0);
  });

  it("returns 500 on unexpected error", async () => {
    vi.mocked(requireAuthWithBearer).mockRejectedValue(new Error("boom"));
    const res = await POST(
      makePostRequest({
        clanId: clanUuid,
        knownPlayerNames: ["P1"],
      }),
    );
    expect(res.status).toBe(500);
  });
});
