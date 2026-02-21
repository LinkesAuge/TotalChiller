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
import { GET, DELETE, PATCH } from "./route";

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
    setChainResult(itemsChain, { data: null, error: { message: "DB error" }, count: undefined });

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

/* ── PATCH tests ── */

function makePatchRequest(body: unknown): NextRequest {
  return new NextRequest(new URL(`/api/import/submissions/${validUuid}`, "http://localhost:3000"), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/import/submissions/[id]", () => {
  let mockAuth: ReturnType<typeof createMockAuth>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth = createMockAuth();
    vi.mocked(requireAuth).mockResolvedValue(mockAuth.authResult);
    mockAuth.mockRpc.mockImplementation((fn: string) => {
      if (fn === "is_any_admin") return Promise.resolve({ data: true, error: null });
      if (fn === "has_role") return Promise.resolve({ data: false, error: null });
      return Promise.resolve({ data: null, error: null });
    });
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireAuth).mockResolvedValue(createUnauthorizedResult() as never);
    const res = await PATCH(
      makePatchRequest({ entryId: "550e8400-e29b-41d4-a716-446655440001", matchGameAccountId: null }),
      makeContext(),
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 when user is neither admin nor moderator", async () => {
    mockAuth.mockRpc.mockResolvedValue({ data: false, error: null });
    const res = await PATCH(
      makePatchRequest({ entryId: "550e8400-e29b-41d4-a716-446655440001", matchGameAccountId: null }),
      makeContext(),
    );
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid submission ID", async () => {
    const res = await PATCH(
      makePatchRequest({ entryId: "550e8400-e29b-41d4-a716-446655440001", matchGameAccountId: null }),
      makeContext("bad-id"),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid body (missing entryId)", async () => {
    const res = await PATCH(makePatchRequest({ matchGameAccountId: null }), makeContext());
    expect(res.status).toBe(400);
  });

  it("returns 404 when submission not found", async () => {
    const subChain = createChainableMock();
    setChainResult(subChain, { data: null, error: { message: "not found" } });
    mockSvcFrom.mockReturnValue(subChain);

    const res = await PATCH(
      makePatchRequest({ entryId: "550e8400-e29b-41d4-a716-446655440001", matchGameAccountId: null }),
      makeContext(),
    );
    expect(res.status).toBe(404);
  });

  it("returns 500 for unknown submission type", async () => {
    const subChain = createChainableMock();
    setChainResult(subChain, {
      data: { id: validUuid, submission_type: "unknown_type", status: "pending" },
      error: null,
    });
    mockSvcFrom.mockReturnValue(subChain);

    const res = await PATCH(
      makePatchRequest({ entryId: "550e8400-e29b-41d4-a716-446655440001", matchGameAccountId: null }),
      makeContext(),
    );
    expect(res.status).toBe(500);
  });

  it("assigns game account and sets status to auto_matched", async () => {
    const subChain = createChainableMock();
    setChainResult(subChain, {
      data: { id: validUuid, clan_id: "clan-1", submission_type: "chests", status: "pending" },
      error: null,
    });

    const currentEntryChain = createChainableMock();
    setChainResult(currentEntryChain, {
      data: { item_status: "pending", player_name: "TestPlayer" },
      error: null,
    });

    const updateChain = createChainableMock();
    setChainResult(updateChain, {
      data: {
        id: "entry-1",
        player_name: "TestPlayer",
        item_status: "auto_matched",
        matched_game_account_id: "ga-1",
        game_accounts: { id: "ga-1", game_username: "CorrectName" },
      },
      error: null,
    });

    const countChain = createChainableMock();
    setChainResult(countChain, { data: null, error: null, count: 3 });

    const subUpdateChain = createChainableMock();
    setChainResult(subUpdateChain, { data: null, error: null });

    let subCalls = 0;
    let stagedCalls = 0;
    mockSvcFrom.mockImplementation((table: string) => {
      if (table === "data_submissions") {
        subCalls++;
        return subCalls === 1 ? subChain : subUpdateChain;
      }
      if (table === "staged_chest_entries") {
        stagedCalls++;
        if (stagedCalls === 1) return currentEntryChain;
        if (stagedCalls === 2) return updateChain;
        return countChain;
      }
      return createChainableMock();
    });

    const res = await PATCH(
      makePatchRequest({
        entryId: "550e8400-e29b-41d4-a716-446655440001",
        matchGameAccountId: "550e8400-e29b-41d4-a716-446655440002",
      }),
      makeContext(),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.item_status).toBe("auto_matched");
    expect(body.data.matchedCount).toBe(3);
    expect(body.data.game_accounts).toEqual({ id: "ga-1", game_username: "CorrectName" });
  });

  it("creates OCR correction when saveCorrection is true", async () => {
    const subChain = createChainableMock();
    setChainResult(subChain, {
      data: { id: validUuid, clan_id: "clan-1", submission_type: "chests", status: "pending" },
      error: null,
    });

    const updateChain = createChainableMock();
    setChainResult(updateChain, {
      data: {
        id: "entry-1",
        player_name: "OcrPlayerName",
        item_status: "auto_matched",
        matched_game_account_id: "ga-1",
        game_accounts: { id: "ga-1", game_username: "RealPlayerName" },
      },
      error: null,
    });

    const countChain = createChainableMock();
    setChainResult(countChain, { data: null, error: null, count: 1 });

    const subUpdateChain = createChainableMock();
    setChainResult(subUpdateChain, { data: null, error: null });

    const ocrUpsertChain = createChainableMock();
    setChainResult(ocrUpsertChain, { data: null, error: null });

    let svcCalls = 0;
    mockSvcFrom.mockImplementation((table: string) => {
      if (table === "data_submissions") {
        svcCalls++;
        return svcCalls === 1 ? subChain : subUpdateChain;
      }
      if (table === "staged_chest_entries") {
        svcCalls++;
        return svcCalls <= 3 ? updateChain : countChain;
      }
      if (table === "ocr_corrections") return ocrUpsertChain;
      return createChainableMock();
    });

    const res = await PATCH(
      makePatchRequest({
        entryId: "550e8400-e29b-41d4-a716-446655440001",
        matchGameAccountId: "550e8400-e29b-41d4-a716-446655440002",
        saveCorrection: true,
      }),
      makeContext(),
    );
    expect(res.status).toBe(200);
    expect(ocrUpsertChain.upsert).toHaveBeenCalledWith(
      {
        clan_id: "clan-1",
        entity_type: "player",
        ocr_text: "OcrPlayerName",
        corrected_text: "RealPlayerName",
      },
      { onConflict: "clan_id,entity_type,ocr_text" },
    );
  });

  it("clears assignment and sets status to pending when matchGameAccountId is null", async () => {
    const subChain = createChainableMock();
    setChainResult(subChain, {
      data: { id: validUuid, clan_id: "clan-1", submission_type: "members", status: "pending" },
      error: null,
    });

    const updateChain = createChainableMock();
    setChainResult(updateChain, {
      data: {
        id: "entry-1",
        player_name: "P1",
        item_status: "pending",
        matched_game_account_id: null,
        game_accounts: null,
      },
      error: null,
    });

    const countChain = createChainableMock();
    setChainResult(countChain, { data: null, error: null, count: 0 });

    const subUpdateChain = createChainableMock();
    setChainResult(subUpdateChain, { data: null, error: null });

    let svcCalls = 0;
    mockSvcFrom.mockImplementation((table: string) => {
      if (table === "data_submissions") {
        svcCalls++;
        return svcCalls === 1 ? subChain : subUpdateChain;
      }
      if (table === "staged_member_entries") {
        svcCalls++;
        return svcCalls <= 3 ? updateChain : countChain;
      }
      return createChainableMock();
    });

    const res = await PATCH(
      makePatchRequest({ entryId: "550e8400-e29b-41d4-a716-446655440001", matchGameAccountId: null }),
      makeContext(),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.item_status).toBe("pending");
  });

  it("returns 404 when entry not found in submission", async () => {
    const subChain = createChainableMock();
    setChainResult(subChain, {
      data: { id: validUuid, clan_id: "clan-1", submission_type: "chests", status: "pending" },
      error: null,
    });

    const updateChain = createChainableMock();
    setChainResult(updateChain, { data: null, error: null });

    mockSvcFrom.mockImplementation((table: string) => {
      if (table === "data_submissions") return subChain;
      if (table === "staged_chest_entries") return updateChain;
      return createChainableMock();
    });

    const res = await PATCH(
      makePatchRequest({ entryId: "550e8400-e29b-41d4-a716-446655440001", matchGameAccountId: null }),
      makeContext(),
    );
    expect(res.status).toBe(404);
  });

  it("returns 500 when update fails", async () => {
    const subChain = createChainableMock();
    setChainResult(subChain, {
      data: { id: validUuid, clan_id: "clan-1", submission_type: "chests", status: "pending" },
      error: null,
    });

    const currentEntryChain = createChainableMock();
    setChainResult(currentEntryChain, {
      data: { item_status: "pending", player_name: "TestPlayer" },
      error: null,
    });

    const updateChain = createChainableMock();
    setChainResult(updateChain, { data: null, error: { message: "DB error" } });

    let stagedCalls = 0;
    mockSvcFrom.mockImplementation((table: string) => {
      if (table === "data_submissions") return subChain;
      if (table === "staged_chest_entries") {
        stagedCalls++;
        return stagedCalls === 1 ? currentEntryChain : updateChain;
      }
      return createChainableMock();
    });

    const res = await PATCH(
      makePatchRequest({ entryId: "550e8400-e29b-41d4-a716-446655440001", matchGameAccountId: null }),
      makeContext(),
    );
    expect(res.status).toBe(500);
  });

  it("returns 500 on unexpected error", async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error("boom"));
    const res = await PATCH(
      makePatchRequest({ entryId: "550e8400-e29b-41d4-a716-446655440001", matchGameAccountId: null }),
      makeContext(),
    );
    expect(res.status).toBe(500);
  });

  it("allows moderator (non-admin) to assign", async () => {
    mockAuth.mockRpc.mockImplementation((fn: string) => {
      if (fn === "is_any_admin") return Promise.resolve({ data: false, error: null });
      if (fn === "has_role") return Promise.resolve({ data: true, error: null });
      return Promise.resolve({ data: null, error: null });
    });

    const subChain = createChainableMock();
    setChainResult(subChain, {
      data: { id: validUuid, clan_id: "clan-1", submission_type: "events", status: "pending" },
      error: null,
    });

    const updateChain = createChainableMock();
    setChainResult(updateChain, {
      data: {
        id: "entry-1",
        player_name: "P1",
        item_status: "auto_matched",
        matched_game_account_id: "ga-1",
        game_accounts: { id: "ga-1", game_username: "GA1" },
      },
      error: null,
    });

    const countChain = createChainableMock();
    setChainResult(countChain, { data: null, error: null, count: 1 });

    const subUpdateChain = createChainableMock();
    setChainResult(subUpdateChain, { data: null, error: null });

    let svcCalls = 0;
    mockSvcFrom.mockImplementation((table: string) => {
      if (table === "data_submissions") {
        svcCalls++;
        return svcCalls === 1 ? subChain : subUpdateChain;
      }
      if (table === "staged_event_entries") {
        svcCalls++;
        return svcCalls <= 3 ? updateChain : countChain;
      }
      return createChainableMock();
    });

    const res = await PATCH(
      makePatchRequest({
        entryId: "550e8400-e29b-41d4-a716-446655440001",
        matchGameAccountId: "550e8400-e29b-41d4-a716-446655440002",
      }),
      makeContext(),
    );
    expect(res.status).toBe(200);
  });
});

/* ── Additional GET edge-case tests ── */

describe("GET /api/import/submissions/[id] — additional branches", () => {
  let mockAuth: ReturnType<typeof createMockAuth>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth = createMockAuth();
    vi.mocked(requireAuth).mockResolvedValue(mockAuth.authResult);
  });

  it("returns 500 for unknown submission type", async () => {
    const subChain = createChainableMock();
    setChainResult(subChain, {
      data: { id: validUuid, clan_id: "clan-1", submitted_by: "user-1", submission_type: "widgets", status: "pending" },
      error: null,
    });

    const profileChain = createChainableMock();
    setChainResult(profileChain, { data: { id: "user-1", display_name: "Test User" }, error: null });

    mockAuth.mockFrom.mockImplementation((table: string) => {
      if (table === "data_submissions") return subChain;
      if (table === "profiles") return profileChain;
      return createChainableMock();
    });

    const res = await GET(makeGetRequest(), makeContext());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain("Unknown submission type");
  });

  it("computes status counts from multiple statuses", async () => {
    const subChain = createChainableMock();
    setChainResult(subChain, {
      data: { id: validUuid, clan_id: "clan-1", submitted_by: "user-1", submission_type: "chests", status: "partial" },
      error: null,
    });

    const profileChain = createChainableMock();
    setChainResult(profileChain, { data: { id: "user-1", display_name: "Test" }, error: null });

    const itemsChain = createChainableMock();
    setChainResult(itemsChain, { data: [{ id: "i1" }], error: null, count: 3 });

    const statusChain = createChainableMock();
    setChainResult(statusChain, {
      data: [
        { item_status: "approved" },
        { item_status: "approved" },
        { item_status: "pending" },
        { item_status: "rejected" },
      ],
      error: null,
    });

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

    const res = await GET(makeGetRequest({ page: "1", per_page: "10" }), makeContext());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.statusCounts).toEqual({ approved: 2, pending: 1, rejected: 1 });
  });

  it("returns sorted clan game accounts", async () => {
    const subChain = createChainableMock();
    setChainResult(subChain, {
      data: { id: validUuid, clan_id: "clan-1", submitted_by: "user-1", submission_type: "members", status: "pending" },
      error: null,
    });

    const profileChain = createChainableMock();
    setChainResult(profileChain, { data: { id: "user-1", display_name: "Test" }, error: null });

    const itemsChain = createChainableMock();
    setChainResult(itemsChain, { data: [], error: null, count: 0 });

    const statusChain = createChainableMock();
    setChainResult(statusChain, { data: [], error: null });

    const membershipChain = createChainableMock();
    setChainResult(membershipChain, {
      data: [
        { game_accounts: { id: "ga-2", game_username: "Zara" } },
        { game_accounts: { id: "ga-1", game_username: "Alpha" } },
      ],
      error: null,
    });

    mockAuth.mockFrom.mockImplementation((table: string) => {
      if (table === "data_submissions") return subChain;
      if (table === "profiles") return profileChain;
      if (table === "staged_member_entries") {
        const callCount = mockAuth.mockFrom.mock.calls.filter((c: string[]) => c[0] === "staged_member_entries").length;
        return callCount <= 1 ? itemsChain : statusChain;
      }
      return createChainableMock();
    });
    mockSvcFrom.mockReturnValue(membershipChain);

    const res = await GET(makeGetRequest(), makeContext());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.clanGameAccounts[0].game_username).toBe("Alpha");
    expect(body.data.clanGameAccounts[1].game_username).toBe("Zara");
  });
});
