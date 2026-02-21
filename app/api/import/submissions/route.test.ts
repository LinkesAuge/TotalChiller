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

import { requireAuth } from "@/lib/api/require-auth";
import { GET } from "./route";

const clanUuid = "550e8400-e29b-41d4-a716-446655440000";

function makeRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL("/api/import/submissions", "http://localhost:3000");
  url.searchParams.set("clan_id", clanUuid);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url);
}

describe("GET /api/import/submissions", () => {
  let mockAuth: ReturnType<typeof createMockAuth>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth = createMockAuth();
    vi.mocked(requireAuth).mockResolvedValue(mockAuth.authResult);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireAuth).mockResolvedValue(createUnauthorizedResult() as never);
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it("returns 400 for missing clan_id", async () => {
    const url = new URL("/api/import/submissions", "http://localhost:3000");
    const res = await GET(new NextRequest(url));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid clan_id format", async () => {
    const url = new URL("/api/import/submissions", "http://localhost:3000");
    url.searchParams.set("clan_id", "not-a-uuid");
    const res = await GET(new NextRequest(url));
    expect(res.status).toBe(400);
  });

  it("returns submissions with pagination", async () => {
    const submissionsChain = createChainableMock();
    setChainResult(submissionsChain, {
      data: [
        {
          id: "sub-1",
          clan_id: clanUuid,
          submitted_by: "user-1",
          submission_type: "chests",
          status: "pending",
          created_at: new Date().toISOString(),
        },
      ],
      error: null,
      count: 1,
    });

    const profilesChain = createChainableMock();
    setChainResult(profilesChain, {
      data: [{ id: "user-1", display_name: "Test User" }],
      error: null,
    });

    mockAuth.mockFrom.mockImplementation((table: string) => {
      if (table === "data_submissions") return submissionsChain;
      if (table === "profiles") return profilesChain;
      return createChainableMock();
    });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.submissions).toHaveLength(1);
    expect(body.data.total).toBe(1);
    expect(body.data.page).toBe(1);
  });

  it("returns 500 when query fails", async () => {
    const errorChain = createChainableMock();
    setChainResult(errorChain, { data: null, error: { message: "DB error" }, count: undefined });

    mockAuth.mockFrom.mockReturnValue(errorChain);

    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
  });

  it("returns 500 on unexpected error", async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error("boom"));
    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
  });

  it("applies status filter", async () => {
    const submissionsChain = createChainableMock();
    setChainResult(submissionsChain, { data: [], error: null, count: 0 });

    mockAuth.mockFrom.mockReturnValue(submissionsChain);

    const res = await GET(makeRequest({ status: "pending" }));
    expect(res.status).toBe(200);
    expect(submissionsChain.eq).toHaveBeenCalledWith("status", "pending");
  });

  it("applies type filter", async () => {
    const submissionsChain = createChainableMock();
    setChainResult(submissionsChain, { data: [], error: null, count: 0 });

    mockAuth.mockFrom.mockReturnValue(submissionsChain);

    const res = await GET(makeRequest({ type: "chests" }));
    expect(res.status).toBe(200);
    expect(submissionsChain.eq).toHaveBeenCalledWith("submission_type", "chests");
  });

  it("returns 400 for invalid status value", async () => {
    const res = await GET(makeRequest({ status: "invalid" }));
    expect(res.status).toBe(400);
  });

  it("returns empty array when no submissions exist", async () => {
    const submissionsChain = createChainableMock();
    setChainResult(submissionsChain, { data: [], error: null, count: 0 });

    mockAuth.mockFrom.mockReturnValue(submissionsChain);

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.submissions).toEqual([]);
    expect(body.data.total).toBe(0);
  });

  it("sets profiles to null when profile is missing", async () => {
    const submissionsChain = createChainableMock();
    setChainResult(submissionsChain, {
      data: [{ id: "sub-1", clan_id: clanUuid, submitted_by: "user-1", submission_type: "chests", status: "pending" }],
      error: null,
      count: 1,
    });

    const profilesChain = createChainableMock();
    setChainResult(profilesChain, { data: [], error: null });

    mockAuth.mockFrom.mockImplementation((table: string) => {
      if (table === "data_submissions") return submissionsChain;
      if (table === "profiles") return profilesChain;
      return createChainableMock();
    });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.submissions[0].profiles).toBeNull();
  });
});
