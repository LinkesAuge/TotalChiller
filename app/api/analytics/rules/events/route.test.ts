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
const RULE_SET_ID = "11111111-2222-4333-8444-555555555555";

const validTiers = [{ min_power: 0, max_power: 200, required_points: 3, sort_order: 0 }];

describe("GET /api/analytics/rules/events", () => {
  let mockAuth: ReturnType<typeof createMockAuth>;

  beforeEach(() => {
    mockAuth = createMockAuth();
    vi.mocked(requireAuth).mockResolvedValue(mockAuth.authResult);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireAuth).mockResolvedValue(createUnauthorizedResult() as never);
    const req = createTestRequest("/api/analytics/rules/events", { searchParams: { clan_id: CLAN_ID } });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 for missing clan_id", async () => {
    const req = createTestRequest("/api/analytics/rules/events");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("returns 403 when not a clan member", async () => {
    mockAuth.mockRpc.mockResolvedValueOnce({ data: false, error: null });
    mockAuth.mockRpc.mockResolvedValueOnce({ data: false, error: null });
    const req = createTestRequest("/api/analytics/rules/events", { searchParams: { clan_id: CLAN_ID } });
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it("returns rule sets for authorized member", async () => {
    mockAuth.mockRpc.mockResolvedValueOnce({ data: true, error: null });
    mockAuth.mockRpc.mockResolvedValueOnce({ data: false, error: null });

    const dataChain = createChainableMock();
    setChainResult(dataChain, {
      data: [
        {
          id: RULE_SET_ID,
          name: "Test Rule",
          is_active: true,
          clan_event_rule_tiers: [
            { id: "t1", min_power: 0, max_power: 200, required_points: 3, sort_order: 0, created_at: "" },
          ],
          clan_event_rule_set_events: [
            { event_type_id: "def1", clan_event_types: { id: "def1", name: "Ahnen Event" } },
          ],
        },
      ],
      error: null,
    });
    mockAuth.mockFrom.mockReturnValue(dataChain);

    const req = createTestRequest("/api/analytics/rules/events", { searchParams: { clan_id: CLAN_ID } });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].tiers).toHaveLength(1);
    expect(body.data[0].event_types).toEqual([{ id: "def1", name: "Ahnen Event" }]);
  });

  it("returns 500 on database error", async () => {
    mockAuth.mockRpc.mockResolvedValueOnce({ data: true, error: null });
    mockAuth.mockRpc.mockResolvedValueOnce({ data: false, error: null });

    const chain = createChainableMock();
    setChainResult(chain, { data: null, error: { message: "DB Error" } });
    mockAuth.mockFrom.mockReturnValue(chain);

    const req = createTestRequest("/api/analytics/rules/events", { searchParams: { clan_id: CLAN_ID } });
    const res = await GET(req);
    expect(res.status).toBe(500);
  });
});

describe("POST /api/analytics/rules/events", () => {
  let mockAuth: ReturnType<typeof createMockAuth>;

  beforeEach(() => {
    mockAuth = createMockAuth();
    vi.mocked(requireAuth).mockResolvedValue(mockAuth.authResult);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireAuth).mockResolvedValue(createUnauthorizedResult() as never);
    const req = createTestRequest("/api/analytics/rules/events", {
      method: "POST",
      body: { clan_id: CLAN_ID, name: "X", tiers: validTiers },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid body (missing name)", async () => {
    const req = createTestRequest("/api/analytics/rules/events", {
      method: "POST",
      body: { clan_id: CLAN_ID },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when tiers array is empty", async () => {
    const req = createTestRequest("/api/analytics/rules/events", {
      method: "POST",
      body: { clan_id: CLAN_ID, name: "Rule", tiers: [] },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when max_power <= min_power", async () => {
    const req = createTestRequest("/api/analytics/rules/events", {
      method: "POST",
      body: {
        clan_id: CLAN_ID,
        name: "Bad Tier",
        tiers: [{ min_power: 100, max_power: 50, required_points: 10, sort_order: 0 }],
      },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 403 when not admin", async () => {
    mockAuth.mockRpc.mockResolvedValueOnce({ data: false, error: null });
    const req = createTestRequest("/api/analytics/rules/events", {
      method: "POST",
      body: { clan_id: CLAN_ID, name: "Rule", tiers: validTiers },
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("creates rule set and returns 201", async () => {
    mockAuth.mockRpc.mockResolvedValueOnce({ data: true, error: null });

    const insertChain = createChainableMock();
    setChainResult(insertChain, { data: { id: RULE_SET_ID, name: "Rule" }, error: null });

    const tiersChain = createChainableMock();
    setChainResult(tiersChain, { data: null, error: null });

    let fromCallCount = 0;
    mockAuth.mockFrom.mockImplementation(() => {
      fromCallCount++;
      return fromCallCount === 1 ? insertChain : tiersChain;
    });

    const req = createTestRequest("/api/analytics/rules/events", {
      method: "POST",
      body: { clan_id: CLAN_ID, name: "Rule", tiers: validTiers },
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.id).toBe(RULE_SET_ID);
  });

  it("rolls back rule set if tier insert fails", async () => {
    mockAuth.mockRpc.mockResolvedValueOnce({ data: true, error: null });

    const insertChain = createChainableMock();
    setChainResult(insertChain, { data: { id: RULE_SET_ID }, error: null });

    const tiersChain = createChainableMock();
    setChainResult(tiersChain, { data: null, error: { message: "Insert failed" } });

    const deleteChain = createChainableMock();
    setChainResult(deleteChain, { data: null, error: null });

    let fromCallCount = 0;
    mockAuth.mockFrom.mockImplementation(() => {
      fromCallCount++;
      if (fromCallCount === 1) return insertChain;
      if (fromCallCount === 2) return tiersChain;
      return deleteChain;
    });

    const req = createTestRequest("/api/analytics/rules/events", {
      method: "POST",
      body: { clan_id: CLAN_ID, name: "Rule", tiers: validTiers },
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
    expect(mockAuth.mockFrom).toHaveBeenCalledWith("clan_event_rule_sets");
  });
});

describe("PUT /api/analytics/rules/events", () => {
  let mockAuth: ReturnType<typeof createMockAuth>;

  beforeEach(() => {
    mockAuth = createMockAuth();
    vi.mocked(requireAuth).mockResolvedValue(mockAuth.authResult);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireAuth).mockResolvedValue(createUnauthorizedResult() as never);
    const req = createTestRequest("/api/analytics/rules/events", {
      method: "PUT",
      body: { id: RULE_SET_ID, clan_id: CLAN_ID, name: "New" },
    });
    const res = await PUT(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid body", async () => {
    const req = createTestRequest("/api/analytics/rules/events", { method: "PUT", body: {} });
    const res = await PUT(req);
    expect(res.status).toBe(400);
  });

  it("returns 403 when not admin", async () => {
    mockAuth.mockRpc.mockResolvedValueOnce({ data: false, error: null });
    const req = createTestRequest("/api/analytics/rules/events", {
      method: "PUT",
      body: { id: RULE_SET_ID, clan_id: CLAN_ID, name: "New" },
    });
    const res = await PUT(req);
    expect(res.status).toBe(403);
  });

  it("returns 404 when rule set does not exist", async () => {
    mockAuth.mockRpc.mockResolvedValueOnce({ data: true, error: null });

    const existsChain = createChainableMock();
    setChainResult(existsChain, { data: null, error: null });
    mockAuth.mockFrom.mockReturnValue(existsChain);

    const req = createTestRequest("/api/analytics/rules/events", {
      method: "PUT",
      body: { id: RULE_SET_ID, clan_id: CLAN_ID, name: "New" },
    });
    const res = await PUT(req);
    expect(res.status).toBe(404);
  });

  it("updates rule set fields successfully", async () => {
    mockAuth.mockRpc.mockResolvedValueOnce({ data: true, error: null });

    const existsChain = createChainableMock();
    setChainResult(existsChain, { data: { id: RULE_SET_ID }, error: null });

    const updateChain = createChainableMock();
    setChainResult(updateChain, { data: null, error: null });

    let fromCallCount = 0;
    mockAuth.mockFrom.mockImplementation(() => {
      fromCallCount++;
      return fromCallCount === 1 ? existsChain : updateChain;
    });

    const req = createTestRequest("/api/analytics/rules/events", {
      method: "PUT",
      body: { id: RULE_SET_ID, clan_id: CLAN_ID, name: "Updated" },
    });
    const res = await PUT(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe(RULE_SET_ID);
  });
});

describe("DELETE /api/analytics/rules/events", () => {
  let mockAuth: ReturnType<typeof createMockAuth>;

  beforeEach(() => {
    mockAuth = createMockAuth();
    vi.mocked(requireAuth).mockResolvedValue(mockAuth.authResult);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireAuth).mockResolvedValue(createUnauthorizedResult() as never);
    const req = createTestRequest("/api/analytics/rules/events", {
      searchParams: { clan_id: CLAN_ID, id: RULE_SET_ID },
      method: "DELETE",
    });
    const res = await DELETE(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 for missing id", async () => {
    const req = createTestRequest("/api/analytics/rules/events", {
      searchParams: { clan_id: CLAN_ID },
      method: "DELETE",
    });
    const res = await DELETE(req);
    expect(res.status).toBe(400);
  });

  it("returns 403 when not admin", async () => {
    mockAuth.mockRpc.mockResolvedValueOnce({ data: false, error: null });
    const req = createTestRequest("/api/analytics/rules/events", {
      searchParams: { clan_id: CLAN_ID, id: RULE_SET_ID },
      method: "DELETE",
    });
    const res = await DELETE(req);
    expect(res.status).toBe(403);
  });

  it("deletes rule set successfully", async () => {
    mockAuth.mockRpc.mockResolvedValueOnce({ data: true, error: null });

    const chain = createChainableMock();
    setChainResult(chain, { data: null, error: null });
    mockAuth.mockFrom.mockReturnValue(chain);

    const req = createTestRequest("/api/analytics/rules/events", {
      searchParams: { clan_id: CLAN_ID, id: RULE_SET_ID },
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

    const req = createTestRequest("/api/analytics/rules/events", {
      searchParams: { clan_id: CLAN_ID, id: RULE_SET_ID },
      method: "DELETE",
    });
    const res = await DELETE(req);
    expect(res.status).toBe(500);
  });
});
