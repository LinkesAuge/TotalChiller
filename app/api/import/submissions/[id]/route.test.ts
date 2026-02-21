import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createMockAuth,
  createUnauthorizedResult,
  createForbiddenResult,
  createChainableMock,
  setChainResult,
} from "@/test";
import { NextRequest } from "next/server";

vi.mock("@/lib/api/require-auth");
vi.mock("@/lib/api/require-admin");
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

import { requireAuth } from "@/lib/api/require-auth";
import { requireAdmin } from "@/lib/api/require-admin";
import { GET, DELETE } from "./route";

const validUuid = "550e8400-e29b-41d4-a716-446655440000";

function makeGetRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL(`/api/import/submissions/${validUuid}`, "http://localhost:3000");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url);
}

function makeDeleteRequest(): NextRequest {
  return new NextRequest(new URL(`/api/import/submissions/${validUuid}`, "http://localhost:3000"), {
    method: "DELETE",
  });
}

function makeContext(id: string = validUuid) {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/import/submissions/[id]", () => {
  let mockAuth: ReturnType<typeof createMockAuth>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth = createMockAuth();
    vi.mocked(requireAuth).mockResolvedValue(mockAuth.authResult);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireAuth).mockResolvedValue(createUnauthorizedResult() as never);
    const res = await GET(makeGetRequest(), makeContext());
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid submission ID", async () => {
    const res = await GET(makeGetRequest(), makeContext("bad-id"));
    expect(res.status).toBe(400);
  });

  it("returns 404 when submission not found", async () => {
    const subChain = createChainableMock();
    setChainResult(subChain, { data: null, error: null });

    mockAuth.mockFrom.mockReturnValue(subChain);

    const res = await GET(makeGetRequest(), makeContext());
    expect(res.status).toBe(404);
  });

  it("returns submission detail with staged entries", async () => {
    const subChain = createChainableMock();
    setChainResult(subChain, {
      data: {
        id: validUuid,
        clan_id: "clan-1",
        submitted_by: "user-1",
        submission_type: "chests",
        status: "pending",
      },
      error: null,
    });

    const profileChain = createChainableMock();
    setChainResult(profileChain, {
      data: { id: "user-1", display_name: "Test User" },
      error: null,
    });

    const itemsChain = createChainableMock();
    setChainResult(itemsChain, { data: [], error: null, count: 0 });

    const statusChain = createChainableMock();
    setChainResult(statusChain, { data: [], error: null });

    const membershipChain = createChainableMock();
    setChainResult(membershipChain, { data: [], error: null });

    mockAuth.mockFrom.mockImplementation((table: string) => {
      if (table === "data_submissions") return subChain;
      if (table === "profiles") return profileChain;
      if (table === "staged_chest_entries") {
        const callCount = mockAuth.mockFrom.mock.calls.filter((c: string[]) => c[0] === "staged_chest_entries").length;
        return callCount <= 1 ? itemsChain : statusChain;
      }
      return createChainableMock();
    });

    mockSvcFrom.mockReturnValue(membershipChain);

    const res = await GET(makeGetRequest(), makeContext());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.submission.id).toBe(validUuid);
    expect(body.data.clanGameAccounts).toEqual([]);
  });

  it("returns 500 when submission query fails", async () => {
    const errorChain = createChainableMock();
    setChainResult(errorChain, { data: null, error: { message: "DB error" } });

    mockAuth.mockFrom.mockReturnValue(errorChain);

    const res = await GET(makeGetRequest(), makeContext());
    expect(res.status).toBe(500);
  });

  it("returns 500 on unexpected error", async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error("boom"));
    const res = await GET(makeGetRequest(), makeContext());
    expect(res.status).toBe(500);
  });

  it("applies item_status filter", async () => {
    const subChain = createChainableMock();
    setChainResult(subChain, {
      data: { id: validUuid, clan_id: "clan-1", submitted_by: "user-1", submission_type: "chests", status: "pending" },
      error: null,
    });

    const profileChain = createChainableMock();
    setChainResult(profileChain, { data: { id: "user-1", display_name: "Test User" }, error: null });

    const itemsChain = createChainableMock();
    setChainResult(itemsChain, { data: [], error: null, count: 0 });

    const statusChain = createChainableMock();
    setChainResult(statusChain, { data: [], error: null });

    const membershipChain2 = createChainableMock();
    setChainResult(membershipChain2, { data: [], error: null });

    mockAuth.mockFrom.mockImplementation((table: string) => {
      if (table === "data_submissions") return subChain;
      if (table === "profiles") return profileChain;
      if (table === "staged_chest_entries") {
        const callCount = mockAuth.mockFrom.mock.calls.filter((c: string[]) => c[0] === "staged_chest_entries").length;
        return callCount <= 1 ? itemsChain : statusChain;
      }
      return createChainableMock();
    });

    mockSvcFrom.mockReturnValue(membershipChain2);

    const res = await GET(makeGetRequest({ item_status: "pending" }), makeContext());
    expect(res.status).toBe(200);
    expect(itemsChain.eq).toHaveBeenCalledWith("item_status", "pending");
  });

  it("returns 400 for invalid query params", async () => {
    const res = await GET(makeGetRequest({ page: "0" }), makeContext());
    expect(res.status).toBe(400);
  });

  it("returns 500 when items query fails", async () => {
    const subChain = createChainableMock();
    setChainResult(subChain, {
      data: { id: validUuid, clan_id: "clan-1", submitted_by: "user-1", submission_type: "chests", status: "pending" },
      error: null,
    });

    const profileChain = createChainableMock();
    setChainResult(profileChain, { data: { id: "user-1", display_name: "Test User" }, error: null });

    const itemsChain = createChainableMock();
    setChainResult(itemsChain, { data: null, error: { message: "DB error" }, count: null });

    mockAuth.mockFrom.mockImplementation((table: string) => {
      if (table === "data_submissions") return subChain;
      if (table === "profiles") return profileChain;
      if (table === "staged_chest_entries") return itemsChain;
      return createChainableMock();
    });

    const res = await GET(makeGetRequest(), makeContext());
    expect(res.status).toBe(500);
  });

  it("returns 500 when status counts query fails", async () => {
    const subChain = createChainableMock();
    setChainResult(subChain, {
      data: { id: validUuid, clan_id: "clan-1", submitted_by: "user-1", submission_type: "chests", status: "pending" },
      error: null,
    });

    const profileChain = createChainableMock();
    setChainResult(profileChain, { data: { id: "user-1", display_name: "Test User" }, error: null });

    const itemsChain = createChainableMock();
    setChainResult(itemsChain, { data: [], error: null, count: 0 });

    const statusChain = createChainableMock();
    setChainResult(statusChain, { data: null, error: { message: "DB error" } });

    mockAuth.mockFrom.mockImplementation((table: string) => {
      if (table === "data_submissions") return subChain;
      if (table === "profiles") return profileChain;
      if (table === "staged_chest_entries") {
        const callCount = mockAuth.mockFrom.mock.calls.filter((c: string[]) => c[0] === "staged_chest_entries").length;
        return callCount <= 1 ? itemsChain : statusChain;
      }
      return createChainableMock();
    });

    const res = await GET(makeGetRequest(), makeContext());
    expect(res.status).toBe(500);
  });
});

describe("DELETE /api/import/submissions/[id]", () => {
  let mockAuth: ReturnType<typeof createMockAuth>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth = createMockAuth();
    vi.mocked(requireAdmin).mockResolvedValue(mockAuth.authResult);
  });

  it("returns 403 when not admin", async () => {
    vi.mocked(requireAdmin).mockResolvedValue(createForbiddenResult() as never);
    const res = await DELETE(makeDeleteRequest(), makeContext());
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid submission ID", async () => {
    const res = await DELETE(makeDeleteRequest(), makeContext("bad-id"));
    expect(res.status).toBe(400);
  });

  it("returns 404 when submission not found", async () => {
    const fetchChain = createChainableMock();
    setChainResult(fetchChain, { data: null, error: null });

    mockSvcFrom.mockReturnValue(fetchChain);

    const res = await DELETE(makeDeleteRequest(), makeContext());
    expect(res.status).toBe(404);
  });

  it("deletes submission successfully regardless of status", async () => {
    const fetchChain = createChainableMock();
    setChainResult(fetchChain, {
      data: { id: validUuid, status: "pending" },
      error: null,
    });

    const deleteChain = createChainableMock();
    setChainResult(deleteChain, { data: null, error: null });

    let callCount = 0;
    mockSvcFrom.mockImplementation((table: string) => {
      if (table === "data_submissions") {
        callCount++;
        return callCount === 1 ? fetchChain : deleteChain;
      }
      return createChainableMock();
    });

    const res = await DELETE(makeDeleteRequest(), makeContext());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.deleted).toBe(true);
  });

  it("returns 500 when delete fails", async () => {
    const fetchChain = createChainableMock();
    setChainResult(fetchChain, {
      data: { id: validUuid, status: "pending" },
      error: null,
    });

    const deleteChain = createChainableMock();
    setChainResult(deleteChain, { data: null, error: { message: "DB error" } });

    let callCount = 0;
    mockSvcFrom.mockImplementation((table: string) => {
      if (table === "data_submissions") {
        callCount++;
        return callCount === 1 ? fetchChain : deleteChain;
      }
      return createChainableMock();
    });

    const res = await DELETE(makeDeleteRequest(), makeContext());
    expect(res.status).toBe(500);
  });

  it("returns 500 on unexpected error", async () => {
    vi.mocked(requireAdmin).mockRejectedValue(new Error("boom"));
    const res = await DELETE(makeDeleteRequest(), makeContext());
    expect(res.status).toBe(500);
  });

  it("deletes approved submission successfully", async () => {
    const fetchChain = createChainableMock();
    setChainResult(fetchChain, {
      data: { id: validUuid, status: "approved" },
      error: null,
    });

    const deleteChain = createChainableMock();
    setChainResult(deleteChain, { data: null, error: null });

    let callCount = 0;
    mockSvcFrom.mockImplementation((table: string) => {
      if (table === "data_submissions") {
        callCount++;
        return callCount === 1 ? fetchChain : deleteChain;
      }
      return createChainableMock();
    });

    const res = await DELETE(makeDeleteRequest(), makeContext());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.deleted).toBe(true);
  });

  it("deletes rejected submission successfully", async () => {
    const fetchChain = createChainableMock();
    setChainResult(fetchChain, {
      data: { id: validUuid, status: "rejected" },
      error: null,
    });

    const deleteChain = createChainableMock();
    setChainResult(deleteChain, { data: null, error: null });

    let callCount = 0;
    mockSvcFrom.mockImplementation((table: string) => {
      if (table === "data_submissions") {
        callCount++;
        return callCount === 1 ? fetchChain : deleteChain;
      }
      return createChainableMock();
    });

    const res = await DELETE(makeDeleteRequest(), makeContext());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.deleted).toBe(true);
  });

  it("returns 500 when fetch on lookup fails", async () => {
    const fetchChain = createChainableMock();
    setChainResult(fetchChain, { data: null, error: { message: "DB error" } });

    mockSvcFrom.mockReturnValue(fetchChain);

    const res = await DELETE(makeDeleteRequest(), makeContext());
    expect(res.status).toBe(500);
  });
});
