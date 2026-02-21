import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockAuth, createUnauthorizedResult, createChainableMock, setChainResult } from "@/test";

vi.mock("@/lib/api/require-auth");
vi.mock("@/lib/api/logger", () => ({ captureApiError: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({
  strictLimiter: { check: vi.fn().mockReturnValue(null) },
  standardLimiter: { check: vi.fn().mockReturnValue(null) },
  relaxedLimiter: { check: vi.fn().mockReturnValue(null) },
}));

const mockServiceFrom = vi.fn();
vi.mock("@/lib/supabase/service-role-client", () => ({
  default: vi.fn(() => ({ from: mockServiceFrom })),
}));

import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api/require-auth";
import { POST, GET, PATCH } from "./route";

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";
const USER_ID = "test-user-id";

function makePostRequest(body: unknown): NextRequest {
  return new NextRequest(new URL("/api/game-accounts", "http://localhost:3000"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeGetRequest(): NextRequest {
  return new NextRequest(new URL("/api/game-accounts", "http://localhost:3000"));
}

function makePatchRequest(body: unknown): NextRequest {
  return new NextRequest(new URL("/api/game-accounts", "http://localhost:3000"), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/game-accounts", () => {
  let mockAuth: ReturnType<typeof createMockAuth>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth = createMockAuth();
    vi.mocked(requireAuth).mockResolvedValue(mockAuth.authResult);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireAuth).mockResolvedValue(createUnauthorizedResult() as never);
    const res = await POST(makePostRequest({ game_username: "Player1" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid body", async () => {
    const res = await POST(makePostRequest(null));
    expect(res.status).toBe(400);
  });

  it("returns 400 for too-short username", async () => {
    const res = await POST(makePostRequest({ game_username: "A" }));
    expect(res.status).toBe(400);
  });

  it("returns 409 when user already has an account with this name", async () => {
    const lookupChain = createChainableMock();
    setChainResult(lookupChain, {
      data: [{ id: VALID_UUID, user_id: USER_ID, approval_status: "pending" }],
      error: null,
    });
    mockServiceFrom.mockReturnValue(lookupChain);

    const res = await POST(makePostRequest({ game_username: "Player1" }));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toContain("already have");
  });

  it("returns 409 when another user claimed the name", async () => {
    const lookupChain = createChainableMock();
    setChainResult(lookupChain, {
      data: [{ id: VALID_UUID, user_id: "other-user", approval_status: "approved" }],
      error: null,
    });
    mockServiceFrom.mockReturnValue(lookupChain);

    const res = await POST(makePostRequest({ game_username: "Player1" }));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toContain("claimed by another");
  });

  it("returns 500 when lookup query fails", async () => {
    const lookupChain = createChainableMock();
    setChainResult(lookupChain, { data: null, error: { message: "DB error" } });
    mockServiceFrom.mockReturnValue(lookupChain);

    const res = await POST(makePostRequest({ game_username: "Player1" }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain("Failed to check");
  });

  it("creates game account and returns 201", async () => {
    const lookupChain = createChainableMock();
    setChainResult(lookupChain, { data: [], error: null });
    mockServiceFrom.mockReturnValue(lookupChain);

    const inserted = { id: VALID_UUID, game_username: "Player1", approval_status: "pending", created_at: "2025-01-01" };
    const insertChain = createChainableMock();
    setChainResult(insertChain, { data: inserted, error: null });

    const profileChain = createChainableMock();
    setChainResult(profileChain, { data: { default_game_account_id: null }, error: null });

    const updateProfileChain = createChainableMock();
    setChainResult(updateProfileChain, { data: null, error: null });

    let authCallCount = 0;
    mockAuth.mockFrom.mockImplementation(() => {
      authCallCount++;
      if (authCallCount === 1) return insertChain;
      if (authCallCount === 2) return profileChain;
      return updateProfileChain;
    });

    const res = await POST(makePostRequest({ game_username: "Player1" }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.game_username).toBe("Player1");
  });

  it("returns 409 on unique constraint violation", async () => {
    const lookupChain = createChainableMock();
    setChainResult(lookupChain, { data: [], error: null });
    mockServiceFrom.mockReturnValue(lookupChain);

    const insertChain = createChainableMock();
    setChainResult(insertChain, { data: null, error: { message: "duplicate", code: "23505" } });
    mockAuth.mockFrom.mockReturnValue(insertChain);

    const res = await POST(makePostRequest({ game_username: "Player1" }));
    expect(res.status).toBe(409);
  });

  it("returns 500 when insert fails (non-unique error)", async () => {
    const lookupChain = createChainableMock();
    setChainResult(lookupChain, { data: [], error: null });
    mockServiceFrom.mockReturnValue(lookupChain);

    const insertChain = createChainableMock();
    setChainResult(insertChain, { data: null, error: { message: "DB error", code: "42000" } });
    mockAuth.mockFrom.mockReturnValue(insertChain);

    const res = await POST(makePostRequest({ game_username: "Player1" }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain("Failed to create");
  });

  it("returns 500 on unexpected exception", async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error("boom"));
    const res = await POST(makePostRequest({ game_username: "Player1" }));
    expect(res.status).toBe(500);
  });
});

describe("GET /api/game-accounts", () => {
  let mockAuth: ReturnType<typeof createMockAuth>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth = createMockAuth();
    vi.mocked(requireAuth).mockResolvedValue(mockAuth.authResult);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireAuth).mockResolvedValue(createUnauthorizedResult() as never);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(401);
  });

  it("returns accounts and default id", async () => {
    const accounts = [
      { id: VALID_UUID, game_username: "Player1", approval_status: "approved", created_at: "2025-01-01" },
    ];

    const accountsChain = createChainableMock();
    setChainResult(accountsChain, { data: accounts, error: null });

    const profileChain = createChainableMock();
    setChainResult(profileChain, { data: { default_game_account_id: VALID_UUID }, error: null });

    let callCount = 0;
    mockAuth.mockFrom.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? accountsChain : profileChain;
    });

    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.default_game_account_id).toBe(VALID_UUID);
  });

  it("returns 500 when fetch fails", async () => {
    const accountsChain = createChainableMock();
    setChainResult(accountsChain, { data: null, error: { message: "DB error" } });

    const profileChain = createChainableMock();
    setChainResult(profileChain, { data: null, error: null });

    let callCount = 0;
    mockAuth.mockFrom.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? accountsChain : profileChain;
    });

    const res = await GET(makeGetRequest());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain("Failed to load");
  });

  it("returns 500 on unexpected exception", async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error("boom"));
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(500);
  });
});

describe("PATCH /api/game-accounts", () => {
  let mockAuth: ReturnType<typeof createMockAuth>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth = createMockAuth();
    vi.mocked(requireAuth).mockResolvedValue(mockAuth.authResult);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireAuth).mockResolvedValue(createUnauthorizedResult() as never);
    const res = await PATCH(makePatchRequest({ default_game_account_id: VALID_UUID }));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid body", async () => {
    const res = await PATCH(makePatchRequest(null));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid uuid", async () => {
    const res = await PATCH(makePatchRequest({ default_game_account_id: "not-a-uuid" }));
    expect(res.status).toBe(400);
  });

  it("returns 404 when game account not found", async () => {
    const chain = createChainableMock();
    setChainResult(chain, { data: null, error: null });
    mockAuth.mockFrom.mockReturnValue(chain);

    const res = await PATCH(makePatchRequest({ default_game_account_id: VALID_UUID }));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain("not found");
  });

  it("returns 400 when account is not approved", async () => {
    const accountChain = createChainableMock();
    setChainResult(accountChain, {
      data: { id: VALID_UUID, user_id: USER_ID, approval_status: "pending" },
      error: null,
    });
    mockAuth.mockFrom.mockReturnValue(accountChain);

    const res = await PATCH(makePatchRequest({ default_game_account_id: VALID_UUID }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("approved");
  });

  it("sets default game account successfully", async () => {
    const accountChain = createChainableMock();
    setChainResult(accountChain, {
      data: { id: VALID_UUID, user_id: USER_ID, approval_status: "approved" },
      error: null,
    });

    const updateChain = createChainableMock();
    setChainResult(updateChain, { data: null, error: null });

    let callCount = 0;
    mockAuth.mockFrom.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? accountChain : updateChain;
    });

    const res = await PATCH(makePatchRequest({ default_game_account_id: VALID_UUID }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.default_game_account_id).toBe(VALID_UUID);
  });

  it("clears default game account (null) successfully", async () => {
    const updateChain = createChainableMock();
    setChainResult(updateChain, { data: null, error: null });
    mockAuth.mockFrom.mockReturnValue(updateChain);

    const res = await PATCH(makePatchRequest({ default_game_account_id: null }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.default_game_account_id).toBeNull();
  });

  it("returns 500 when profile update fails", async () => {
    const accountChain = createChainableMock();
    setChainResult(accountChain, {
      data: { id: VALID_UUID, user_id: USER_ID, approval_status: "approved" },
      error: null,
    });

    const updateChain = createChainableMock();
    setChainResult(updateChain, { data: null, error: { message: "DB error" } });

    let callCount = 0;
    mockAuth.mockFrom.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? accountChain : updateChain;
    });

    const res = await PATCH(makePatchRequest({ default_game_account_id: VALID_UUID }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain("Failed to update");
  });

  it("returns 500 on unexpected exception", async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error("boom"));
    const res = await PATCH(makePatchRequest({ default_game_account_id: VALID_UUID }));
    expect(res.status).toBe(500);
  });
});
