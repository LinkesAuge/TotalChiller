import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockAuth, createForbiddenResult } from "@/test";

vi.mock("next/server", async (importOriginal) => {
  const mod = await importOriginal<typeof import("next/server")>();
  return { ...mod, after: vi.fn() };
});
vi.mock("@/lib/api/require-admin");
vi.mock("@/lib/api/logger", () => ({ captureApiError: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({
  strictLimiter: { check: vi.fn().mockReturnValue(null) },
  standardLimiter: { check: vi.fn().mockReturnValue(null) },
  relaxedLimiter: { check: vi.fn().mockReturnValue(null) },
}));

const mockFrom = vi.fn();
vi.mock("@/lib/supabase/service-role-client", () => ({
  default: vi.fn(() => ({ from: mockFrom })),
}));

import { requireAdmin } from "@/lib/api/require-admin";
import { PATCH, GET } from "./route";

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

function makeChain(result: { data: unknown; error: unknown } = { data: null, error: null }) {
  const c: Record<string, ReturnType<typeof vi.fn>> = {};
  const methods = ["select", "insert", "update", "upsert", "delete", "eq", "neq", "in", "order", "limit"];
  for (const m of methods) {
    c[m] = vi.fn().mockReturnValue(c);
  }
  c.single = vi.fn().mockResolvedValue(result);
  c.maybeSingle = vi.fn().mockResolvedValue(result);
  Object.defineProperty(c, "then", {
    value: (res?: ((v: unknown) => unknown) | null, rej?: ((v: unknown) => unknown) | null) =>
      Promise.resolve(result).then(res, rej),
    writable: true,
    enumerable: false,
    configurable: true,
  });
  return c;
}

function makePATCHRequest(body: unknown): Request {
  return new Request("http://localhost/api/admin/game-account-approvals", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeGETRequest(): Request {
  return new Request("http://localhost/api/admin/game-account-approvals", { method: "GET" });
}

/* ─── PATCH ─── */

describe("PATCH /api/admin/game-account-approvals", () => {
  let mockAuth: ReturnType<typeof createMockAuth>;

  beforeEach(() => {
    mockAuth = createMockAuth();
    vi.mocked(requireAdmin).mockResolvedValue(mockAuth.authResult);
    mockFrom.mockReset();
  });

  it("returns 403 when user is not admin", async () => {
    vi.mocked(requireAdmin).mockResolvedValue(createForbiddenResult() as never);
    const res = await PATCH(makePATCHRequest({ game_account_id: VALID_UUID, action: "approve" }) as never);
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid body", async () => {
    const res = await PATCH(makePATCHRequest({ game_account_id: "bad", action: "approve" }) as never);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid input.");
  });

  it("returns 400 for invalid action", async () => {
    const res = await PATCH(makePATCHRequest({ game_account_id: VALID_UUID, action: "ban" }) as never);
    expect(res.status).toBe(400);
  });

  it("returns 404 when game account not found", async () => {
    const lookupChain = makeChain({ data: null, error: { message: "not found" } });
    mockFrom.mockReturnValue(lookupChain);
    const res = await PATCH(makePATCHRequest({ game_account_id: VALID_UUID, action: "approve" }) as never);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Game account not found.");
  });

  it("returns 409 when account is not pending", async () => {
    const lookupChain = makeChain({
      data: { id: VALID_UUID, user_id: "u-1", game_username: "p1", approval_status: "approved" },
      error: null,
    });
    mockFrom.mockReturnValue(lookupChain);
    const res = await PATCH(makePATCHRequest({ game_account_id: VALID_UUID, action: "approve" }) as never);
    expect(res.status).toBe(409);
  });

  it("approves account successfully", async () => {
    const lookupChain = makeChain({
      data: { id: VALID_UUID, user_id: "u-1", game_username: "p1", approval_status: "pending" },
      error: null,
    });
    const updateChain = makeChain({ data: null, error: null });
    mockFrom.mockReturnValueOnce(lookupChain).mockReturnValueOnce(updateChain);
    const res = await PATCH(makePATCHRequest({ game_account_id: VALID_UUID, action: "approve" }) as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.approval_status).toBe("approved");
  });

  it("returns 500 when approve update fails", async () => {
    const lookupChain = makeChain({
      data: { id: VALID_UUID, user_id: "u-1", game_username: "p1", approval_status: "pending" },
      error: null,
    });
    const updateChain = makeChain({ data: null, error: { message: "update failed" } });
    mockFrom.mockReturnValueOnce(lookupChain).mockReturnValueOnce(updateChain);
    const res = await PATCH(makePATCHRequest({ game_account_id: VALID_UUID, action: "approve" }) as never);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to approve account.");
  });

  it("rejects account and deletes it", async () => {
    const lookupChain = makeChain({
      data: { id: VALID_UUID, user_id: "u-1", game_username: "p1", approval_status: "pending" },
      error: null,
    });
    const deleteChain = makeChain({ data: null, error: null });
    mockFrom.mockReturnValueOnce(lookupChain).mockReturnValueOnce(deleteChain);
    const res = await PATCH(makePATCHRequest({ game_account_id: VALID_UUID, action: "reject" }) as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.approval_status).toBe("rejected");
    expect(body.data.deleted).toBe(true);
  });

  it("returns 500 when reject delete fails", async () => {
    const lookupChain = makeChain({
      data: { id: VALID_UUID, user_id: "u-1", game_username: "p1", approval_status: "pending" },
      error: null,
    });
    const deleteChain = makeChain({ data: null, error: { message: "delete failed" } });
    mockFrom.mockReturnValueOnce(lookupChain).mockReturnValueOnce(deleteChain);
    const res = await PATCH(makePATCHRequest({ game_account_id: VALID_UUID, action: "reject" }) as never);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to reject account.");
  });
});

/* ─── GET ─── */

describe("GET /api/admin/game-account-approvals", () => {
  let mockAuth: ReturnType<typeof createMockAuth>;

  beforeEach(() => {
    mockAuth = createMockAuth();
    vi.mocked(requireAdmin).mockResolvedValue(mockAuth.authResult);
    mockFrom.mockReset();
  });

  it("returns 403 when user is not admin", async () => {
    vi.mocked(requireAdmin).mockResolvedValue(createForbiddenResult() as never);
    const res = await GET(makeGETRequest() as never);
    expect(res.status).toBe(403);
  });

  it("returns pending accounts with profiles", async () => {
    const accountsChain = makeChain({
      data: [
        { id: "acc-1", user_id: "u-1", game_username: "player1", approval_status: "pending", created_at: "2024-01-01" },
      ],
      error: null,
    });
    const profilesChain = makeChain({
      data: [{ id: "u-1", email: "p@test.com", username: "player1", display_name: "Player One" }],
      error: null,
    });
    mockFrom.mockReturnValueOnce(accountsChain).mockReturnValueOnce(profilesChain);
    const res = await GET(makeGETRequest() as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].game_username).toBe("player1");
    expect(body.data[0].profiles.email).toBe("p@test.com");
  });

  it("returns empty array when no pending accounts", async () => {
    const emptyChain = makeChain({ data: [], error: null });
    mockFrom.mockReturnValue(emptyChain);
    const res = await GET(makeGETRequest() as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual([]);
  });

  it("returns 500 when fetch fails", async () => {
    const errChain = makeChain({ data: null, error: { message: "DB error" } });
    mockFrom.mockReturnValue(errChain);
    const res = await GET(makeGETRequest() as never);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to load pending approvals.");
  });
});
