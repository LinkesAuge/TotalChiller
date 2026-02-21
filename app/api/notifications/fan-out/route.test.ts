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

vi.mock("@/lib/is-test-user", () => ({
  isTestUser: vi.fn().mockReturnValue(false),
}));

import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api/require-auth";
import { isTestUser } from "@/lib/is-test-user";
import { POST } from "./route";

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";
const CLAN_ID = "660e8400-e29b-41d4-a716-446655440000";
const USER_ID = "test-user-id";

function makeRequest(body: unknown): NextRequest {
  return new NextRequest(new URL("/api/notifications/fan-out", "http://localhost:3000"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    type: "news",
    reference_id: VALID_UUID,
    clan_id: CLAN_ID,
    title: "Test notification",
    body: "Test body",
    ...overrides,
  };
}

describe("POST /api/notifications/fan-out", () => {
  let mockAuth: ReturnType<typeof createMockAuth>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth = createMockAuth();
    vi.mocked(requireAuth).mockResolvedValue(mockAuth.authResult);
    vi.mocked(isTestUser).mockReturnValue(false);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireAuth).mockResolvedValue(createUnauthorizedResult() as never);
    const res = await POST(makeRequest(validBody()));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid input", async () => {
    const res = await POST(makeRequest({ type: "invalid" }));
    expect(res.status).toBe(400);
  });

  it("returns 404 when referenced record not found", async () => {
    const recordChain = createChainableMock();
    setChainResult(recordChain, { data: null, error: { message: "not found" } });
    mockServiceFrom.mockReturnValue(recordChain);

    const res = await POST(makeRequest(validBody()));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain("not found");
  });

  it("returns 403 when record belongs to a different clan", async () => {
    const recordChain = createChainableMock();
    setChainResult(recordChain, {
      data: { id: VALID_UUID, created_by: USER_ID, clan_id: "other-clan-id" },
      error: null,
    });
    mockServiceFrom.mockReturnValue(recordChain);

    const res = await POST(makeRequest(validBody()));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain("does not belong");
  });

  it("returns 403 when user is not the author", async () => {
    const recordChain = createChainableMock();
    setChainResult(recordChain, {
      data: { id: VALID_UUID, created_by: "other-user-id", clan_id: CLAN_ID },
      error: null,
    });
    mockServiceFrom.mockReturnValue(recordChain);

    const res = await POST(makeRequest(validBody()));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain("content you authored");
  });

  it("skips notifications for test users", async () => {
    vi.mocked(isTestUser).mockReturnValue(true);

    const recordChain = createChainableMock();
    setChainResult(recordChain, {
      data: { id: VALID_UUID, created_by: USER_ID, clan_id: CLAN_ID },
      error: null,
    });

    const profileChain = createChainableMock();
    setChainResult(profileChain, { data: { email: "test-e2e@example.com" }, error: null });

    let callCount = 0;
    mockServiceFrom.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? recordChain : profileChain;
    });

    const res = await POST(makeRequest(validBody()));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.skipped).toBe("test-user");
  });

  it("returns recipients: 0 when no clan members found", async () => {
    const recordChain = createChainableMock();
    setChainResult(recordChain, {
      data: { id: VALID_UUID, created_by: USER_ID, clan_id: CLAN_ID },
      error: null,
    });

    const profileChain = createChainableMock();
    setChainResult(profileChain, { data: { email: "real@company.com" }, error: null });

    const membershipsChain = createChainableMock();
    setChainResult(membershipsChain, { data: [], error: null });

    let callCount = 0;
    mockServiceFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return recordChain;
      if (callCount === 2) return profileChain;
      return membershipsChain;
    });

    const res = await POST(makeRequest(validBody()));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.recipients).toBe(0);
  });

  it("creates notifications for clan members and returns 201", async () => {
    const recordChain = createChainableMock();
    setChainResult(recordChain, {
      data: { id: VALID_UUID, created_by: USER_ID, clan_id: CLAN_ID },
      error: null,
    });

    const profileChain = createChainableMock();
    setChainResult(profileChain, { data: { email: "real@company.com" }, error: null });

    const membershipsChain = createChainableMock();
    setChainResult(membershipsChain, {
      data: [
        { game_accounts: { user_id: "member-1" } },
        { game_accounts: { user_id: "member-2" } },
        { game_accounts: { user_id: USER_ID } },
      ],
      error: null,
    });

    const insertChain = createChainableMock();
    setChainResult(insertChain, { data: null, error: null });

    let callCount = 0;
    mockServiceFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return recordChain;
      if (callCount === 2) return profileChain;
      if (callCount === 3) return membershipsChain;
      return insertChain;
    });

    const res = await POST(makeRequest(validBody()));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.recipients).toBe(2);
  });

  it("returns 500 when membership fetch fails", async () => {
    const recordChain = createChainableMock();
    setChainResult(recordChain, {
      data: { id: VALID_UUID, created_by: USER_ID, clan_id: CLAN_ID },
      error: null,
    });

    const profileChain = createChainableMock();
    setChainResult(profileChain, { data: { email: "real@company.com" }, error: null });

    const membershipsChain = createChainableMock();
    setChainResult(membershipsChain, { data: null, error: { message: "DB error" } });

    let callCount = 0;
    mockServiceFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return recordChain;
      if (callCount === 2) return profileChain;
      return membershipsChain;
    });

    const res = await POST(makeRequest(validBody()));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain("Failed to load clan");
  });

  it("returns 500 when notification insert fails", async () => {
    const recordChain = createChainableMock();
    setChainResult(recordChain, {
      data: { id: VALID_UUID, created_by: USER_ID, clan_id: CLAN_ID },
      error: null,
    });

    const profileChain = createChainableMock();
    setChainResult(profileChain, { data: { email: "real@company.com" }, error: null });

    const membershipsChain = createChainableMock();
    setChainResult(membershipsChain, {
      data: [{ game_accounts: { user_id: "member-1" } }],
      error: null,
    });

    const insertChain = createChainableMock();
    setChainResult(insertChain, { data: null, error: { message: "Insert error" } });

    let callCount = 0;
    mockServiceFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return recordChain;
      if (callCount === 2) return profileChain;
      if (callCount === 3) return membershipsChain;
      return insertChain;
    });

    const res = await POST(makeRequest(validBody()));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain("Failed to create");
  });

  it("returns 500 on unexpected exception", async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error("boom"));
    const res = await POST(makeRequest(validBody()));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Internal server error.");
  });

  it("uses 'events' table for event type", async () => {
    const recordChain = createChainableMock();
    setChainResult(recordChain, {
      data: { id: VALID_UUID, created_by: USER_ID, clan_id: CLAN_ID },
      error: null,
    });

    const profileChain = createChainableMock();
    setChainResult(profileChain, { data: { email: "real@company.com" }, error: null });

    const membershipsChain = createChainableMock();
    setChainResult(membershipsChain, { data: [], error: null });

    let callCount = 0;
    mockServiceFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return recordChain;
      if (callCount === 2) return profileChain;
      return membershipsChain;
    });

    await POST(makeRequest(validBody({ type: "event" })));
    expect(mockServiceFrom).toHaveBeenCalledWith("events");
  });
});
