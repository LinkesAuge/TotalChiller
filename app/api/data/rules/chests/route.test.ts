import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createMockAuth,
  createUnauthorizedResult,
  createChainableMock,
  setChainResult,
  createTestRequest,
} from "@/test";

vi.mock("@/lib/api/require-auth");
vi.mock("@/lib/api/logger", () => ({ captureApiError: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({
  strictLimiter: { check: vi.fn().mockReturnValue(null) },
  standardLimiter: { check: vi.fn().mockReturnValue(null) },
  relaxedLimiter: { check: vi.fn().mockReturnValue(null) },
}));

import { requireAuth } from "@/lib/api/require-auth";
import { GET, POST, PUT, DELETE } from "./route";

const CLAN_ID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const GOAL_ID = "cccccccc-dddd-4eee-8fff-aaaaaaaaaaaa";
const ACCOUNT_ID = "11111111-2222-4333-8444-555555555555";

describe("GET /api/data/rules/chests", () => {
  let mockAuth: ReturnType<typeof createMockAuth>;

  beforeEach(() => {
    mockAuth = createMockAuth();
    vi.mocked(requireAuth).mockResolvedValue(mockAuth.authResult);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireAuth).mockResolvedValue(createUnauthorizedResult() as never);
    const req = createTestRequest("/api/data/rules/chests", { searchParams: { clan_id: CLAN_ID } });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 for missing clan_id", async () => {
    const req = createTestRequest("/api/data/rules/chests");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("returns 403 when not a member or admin", async () => {
    mockAuth.mockRpc.mockResolvedValueOnce({ data: false, error: null });
    mockAuth.mockRpc.mockResolvedValueOnce({ data: false, error: null });
    const req = createTestRequest("/api/data/rules/chests", { searchParams: { clan_id: CLAN_ID } });
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it("returns chest goals with player names", async () => {
    mockAuth.mockRpc.mockResolvedValueOnce({ data: true, error: null });
    mockAuth.mockRpc.mockResolvedValueOnce({ data: false, error: null });

    const chain = createChainableMock();
    setChainResult(chain, {
      data: [
        {
          id: GOAL_ID,
          period: "daily",
          target_count: 5,
          game_account_id: ACCOUNT_ID,
          game_accounts: { game_username: "Player1" },
        },
        { id: "g2", period: "weekly", target_count: 30, game_account_id: null, game_accounts: null },
      ],
      error: null,
    });
    mockAuth.mockFrom.mockReturnValue(chain);

    const req = createTestRequest("/api/data/rules/chests", { searchParams: { clan_id: CLAN_ID } });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(2);
    expect(body.data[0].player_name).toBe("Player1");
    expect(body.data[1].player_name).toBeNull();
  });

  it("returns 500 on database error", async () => {
    mockAuth.mockRpc.mockResolvedValueOnce({ data: true, error: null });
    mockAuth.mockRpc.mockResolvedValueOnce({ data: false, error: null });

    const chain = createChainableMock();
    setChainResult(chain, { data: null, error: { message: "DB Error" } });
    mockAuth.mockFrom.mockReturnValue(chain);

    const req = createTestRequest("/api/data/rules/chests", { searchParams: { clan_id: CLAN_ID } });
    const res = await GET(req);
    expect(res.status).toBe(500);
  });
});

describe("POST /api/data/rules/chests", () => {
  let mockAuth: ReturnType<typeof createMockAuth>;

  beforeEach(() => {
    mockAuth = createMockAuth();
    vi.mocked(requireAuth).mockResolvedValue(mockAuth.authResult);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireAuth).mockResolvedValue(createUnauthorizedResult() as never);
    const req = createTestRequest("/api/data/rules/chests", {
      method: "POST",
      body: { clan_id: CLAN_ID, period: "daily", target_count: 5 },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid body", async () => {
    const req = createTestRequest("/api/data/rules/chests", { method: "POST", body: { clan_id: CLAN_ID } });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when target_count is 0", async () => {
    const req = createTestRequest("/api/data/rules/chests", {
      method: "POST",
      body: { clan_id: CLAN_ID, period: "daily", target_count: 0 },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid period", async () => {
    const req = createTestRequest("/api/data/rules/chests", {
      method: "POST",
      body: { clan_id: CLAN_ID, period: "yearly", target_count: 5 },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 403 when not admin", async () => {
    mockAuth.mockRpc.mockResolvedValueOnce({ data: false, error: null });
    const req = createTestRequest("/api/data/rules/chests", {
      method: "POST",
      body: { clan_id: CLAN_ID, period: "daily", target_count: 5 },
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("returns 404 when game_account_id not in clan", async () => {
    mockAuth.mockRpc.mockResolvedValueOnce({ data: true, error: null });

    const membershipChain = createChainableMock();
    setChainResult(membershipChain, { data: null, error: null });
    mockAuth.mockFrom.mockReturnValue(membershipChain);

    const req = createTestRequest("/api/data/rules/chests", {
      method: "POST",
      body: { clan_id: CLAN_ID, game_account_id: ACCOUNT_ID, period: "daily", target_count: 5 },
    });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it("creates clan-wide goal successfully", async () => {
    mockAuth.mockRpc.mockResolvedValueOnce({ data: true, error: null });

    const insertChain = createChainableMock();
    setChainResult(insertChain, { data: { id: GOAL_ID, period: "daily", target_count: 5 }, error: null });
    mockAuth.mockFrom.mockReturnValue(insertChain);

    const req = createTestRequest("/api/data/rules/chests", {
      method: "POST",
      body: { clan_id: CLAN_ID, period: "daily", target_count: 5 },
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.id).toBe(GOAL_ID);
  });

  it("returns 409 on duplicate goal", async () => {
    mockAuth.mockRpc.mockResolvedValueOnce({ data: true, error: null });

    const insertChain = createChainableMock();
    setChainResult(insertChain, { data: null, error: { code: "23505", message: "unique violation" } });
    mockAuth.mockFrom.mockReturnValue(insertChain);

    const req = createTestRequest("/api/data/rules/chests", {
      method: "POST",
      body: { clan_id: CLAN_ID, period: "daily", target_count: 5 },
    });
    const res = await POST(req);
    expect(res.status).toBe(409);
  });
});

describe("PUT /api/data/rules/chests", () => {
  let mockAuth: ReturnType<typeof createMockAuth>;

  beforeEach(() => {
    mockAuth = createMockAuth();
    vi.mocked(requireAuth).mockResolvedValue(mockAuth.authResult);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireAuth).mockResolvedValue(createUnauthorizedResult() as never);
    const req = createTestRequest("/api/data/rules/chests", {
      method: "PUT",
      body: { id: GOAL_ID, clan_id: CLAN_ID, target_count: 10 },
    });
    const res = await PUT(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 for missing required fields", async () => {
    const req = createTestRequest("/api/data/rules/chests", { method: "PUT", body: {} });
    const res = await PUT(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when no fields to update", async () => {
    mockAuth.mockRpc.mockResolvedValueOnce({ data: true, error: null });
    const req = createTestRequest("/api/data/rules/chests", {
      method: "PUT",
      body: { id: GOAL_ID, clan_id: CLAN_ID },
    });
    const res = await PUT(req);
    expect(res.status).toBe(400);
  });

  it("returns 403 when not admin", async () => {
    mockAuth.mockRpc.mockResolvedValueOnce({ data: false, error: null });
    const req = createTestRequest("/api/data/rules/chests", {
      method: "PUT",
      body: { id: GOAL_ID, clan_id: CLAN_ID, target_count: 10 },
    });
    const res = await PUT(req);
    expect(res.status).toBe(403);
  });

  it("updates goal successfully", async () => {
    mockAuth.mockRpc.mockResolvedValueOnce({ data: true, error: null });

    const updateChain = createChainableMock();
    setChainResult(updateChain, { data: null, error: null });
    mockAuth.mockFrom.mockReturnValue(updateChain);

    const req = createTestRequest("/api/data/rules/chests", {
      method: "PUT",
      body: { id: GOAL_ID, clan_id: CLAN_ID, target_count: 10 },
    });
    const res = await PUT(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe(GOAL_ID);
  });

  it("returns 409 on duplicate period conflict", async () => {
    mockAuth.mockRpc.mockResolvedValueOnce({ data: true, error: null });

    const updateChain = createChainableMock();
    setChainResult(updateChain, { data: null, error: { code: "23505", message: "unique violation" } });
    mockAuth.mockFrom.mockReturnValue(updateChain);

    const req = createTestRequest("/api/data/rules/chests", {
      method: "PUT",
      body: { id: GOAL_ID, clan_id: CLAN_ID, period: "weekly" },
    });
    const res = await PUT(req);
    expect(res.status).toBe(409);
  });
});

describe("DELETE /api/data/rules/chests", () => {
  let mockAuth: ReturnType<typeof createMockAuth>;

  beforeEach(() => {
    mockAuth = createMockAuth();
    vi.mocked(requireAuth).mockResolvedValue(mockAuth.authResult);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireAuth).mockResolvedValue(createUnauthorizedResult() as never);
    const req = createTestRequest("/api/data/rules/chests", {
      searchParams: { clan_id: CLAN_ID, id: GOAL_ID },
      method: "DELETE",
    });
    const res = await DELETE(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 for missing id", async () => {
    const req = createTestRequest("/api/data/rules/chests", {
      searchParams: { clan_id: CLAN_ID },
      method: "DELETE",
    });
    const res = await DELETE(req);
    expect(res.status).toBe(400);
  });

  it("returns 403 when not admin", async () => {
    mockAuth.mockRpc.mockResolvedValueOnce({ data: false, error: null });
    const req = createTestRequest("/api/data/rules/chests", {
      searchParams: { clan_id: CLAN_ID, id: GOAL_ID },
      method: "DELETE",
    });
    const res = await DELETE(req);
    expect(res.status).toBe(403);
  });

  it("deletes goal successfully", async () => {
    mockAuth.mockRpc.mockResolvedValueOnce({ data: true, error: null });

    const chain = createChainableMock();
    setChainResult(chain, { data: null, error: null });
    mockAuth.mockFrom.mockReturnValue(chain);

    const req = createTestRequest("/api/data/rules/chests", {
      searchParams: { clan_id: CLAN_ID, id: GOAL_ID },
      method: "DELETE",
    });
    const res = await DELETE(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.deleted).toBe(true);
  });

  it("returns 500 on database error", async () => {
    mockAuth.mockRpc.mockResolvedValueOnce({ data: true, error: null });

    const chain = createChainableMock();
    setChainResult(chain, { data: null, error: { message: "DB Error" } });
    mockAuth.mockFrom.mockReturnValue(chain);

    const req = createTestRequest("/api/data/rules/chests", {
      searchParams: { clan_id: CLAN_ID, id: GOAL_ID },
      method: "DELETE",
    });
    const res = await DELETE(req);
    expect(res.status).toBe(500);
  });
});
