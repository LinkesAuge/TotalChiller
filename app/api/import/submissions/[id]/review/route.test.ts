import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockAuth, createForbiddenResult, createChainableMock, setChainResult } from "@/test";
import { NextRequest } from "next/server";

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

import { requireAdmin } from "@/lib/api/require-admin";
import { POST } from "./route";

const validUuid = "550e8400-e29b-41d4-a716-446655440000";
const itemUuid = "660e8400-e29b-41d4-a716-446655440001";
const itemUuid2 = "770e8400-e29b-41d4-a716-446655440002";

function makeRequest(body: unknown): NextRequest {
  return new NextRequest(new URL(`/api/import/submissions/${validUuid}/review`, "http://localhost:3000"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeContext(id: string = validUuid) {
  return { params: Promise.resolve({ id }) };
}

describe("POST /api/import/submissions/[id]/review", () => {
  let mockAuth: ReturnType<typeof createMockAuth>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth = createMockAuth();
    vi.mocked(requireAdmin).mockResolvedValue(mockAuth.authResult);
  });

  it("returns 403 when not admin", async () => {
    vi.mocked(requireAdmin).mockResolvedValue(createForbiddenResult() as never);
    const res = await POST(makeRequest({ action: "approve_all" }), makeContext());
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid submission ID", async () => {
    const res = await POST(makeRequest({ action: "approve_all" }), makeContext("bad-id"));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid body (no action or items)", async () => {
    const res = await POST(makeRequest({}), makeContext());
    expect(res.status).toBe(400);
  });

  it("returns 404 when submission not found", async () => {
    const subChain = createChainableMock();
    setChainResult(subChain, { data: null, error: { message: "not found" } });

    mockSvcFrom.mockReturnValue(subChain);

    const res = await POST(makeRequest({ action: "approve_all" }), makeContext());
    expect(res.status).toBe(404);
  });

  it("returns 409 when submission is not reviewable", async () => {
    const subChain = createChainableMock();
    setChainResult(subChain, {
      data: { id: validUuid, clan_id: "clan-1", submission_type: "chests", status: "approved" },
      error: null,
    });

    mockSvcFrom.mockReturnValue(subChain);

    const res = await POST(makeRequest({ action: "approve_all" }), makeContext());
    expect(res.status).toBe(409);
  });

  it("processes reject_all bulk action", async () => {
    const subChain = createChainableMock();
    setChainResult(subChain, {
      data: { id: validUuid, clan_id: "clan-1", submission_type: "chests", status: "pending" },
      error: null,
    });

    const stagedChain = createChainableMock();
    setChainResult(stagedChain, { data: [], error: null });

    const updateChain = createChainableMock();
    setChainResult(updateChain, { data: null, error: null });

    mockSvcFrom.mockImplementation((table: string) => {
      if (table === "data_submissions") return subChain;
      if (table === "staged_chest_entries") return stagedChain;
      return createChainableMock();
    });

    const res = await POST(makeRequest({ action: "reject_all" }), makeContext());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.submissionStatus).toBeDefined();
  });

  it("processes per-item actions", async () => {
    const subChain = createChainableMock();
    setChainResult(subChain, {
      data: { id: validUuid, clan_id: "clan-1", submission_type: "chests", status: "pending" },
      error: null,
    });

    const stagedChain = createChainableMock();
    setChainResult(stagedChain, { data: [], error: null });

    const updateChain = createChainableMock();
    setChainResult(updateChain, { data: null, error: null });

    mockSvcFrom.mockImplementation((table: string) => {
      if (table === "data_submissions") return subChain;
      if (table === "staged_chest_entries") return stagedChain;
      return createChainableMock();
    });

    const res = await POST(
      makeRequest({
        items: [{ id: itemUuid, action: "approve" }],
      }),
      makeContext(),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeDefined();
  });

  it("returns 500 on unexpected error", async () => {
    vi.mocked(requireAdmin).mockRejectedValue(new Error("boom"));
    const res = await POST(makeRequest({ action: "approve_all" }), makeContext());
    expect(res.status).toBe(500);
  });

  it("rejects non-admin (moderator only)", async () => {
    vi.mocked(requireAdmin).mockResolvedValue(createForbiddenResult() as never);
    const res = await POST(makeRequest({ action: "reject_all" }), makeContext());
    expect(res.status).toBe(403);
  });

  it("approve_all copies items to production and returns approved status", async () => {
    const subGetChain = createChainableMock();
    setChainResult(subGetChain, {
      data: { id: validUuid, clan_id: "clan-1", submission_type: "chests", status: "pending" },
      error: null,
    });

    const subUpdateChain = createChainableMock();
    setChainResult(subUpdateChain, { data: null, error: null });

    const stagedItems = [
      {
        id: "item-1",
        player_name: "Player1",
        item_status: "pending",
        matched_game_account_id: null,
        chest_name: "Gold Chest",
        source: "War",
        level: 25,
        opened_at: "2024-01-01T00:00:00Z",
      },
      {
        id: "item-2",
        player_name: "Player2",
        item_status: "pending",
        matched_game_account_id: null,
        chest_name: "Silver Chest",
        source: "Battle",
        level: 20,
        opened_at: "2024-01-02T00:00:00Z",
      },
    ];

    const stagedSelectChain = createChainableMock();
    setChainResult(stagedSelectChain, { data: stagedItems, error: null });

    const stagedUpdateChain = createChainableMock();
    setChainResult(stagedUpdateChain, { data: null, error: null });

    const stagedCountChain = createChainableMock();
    setChainResult(stagedCountChain, {
      data: [{ item_status: "approved" }, { item_status: "approved" }],
      error: null,
    });

    const prodInsertChain = createChainableMock();
    setChainResult(prodInsertChain, { data: [{ id: "prod-1" }, { id: "prod-2" }], error: null });

    let dataSubCalls = 0;
    let stagedCalls = 0;

    mockSvcFrom.mockImplementation((table: string) => {
      if (table === "data_submissions") {
        dataSubCalls++;
        return dataSubCalls === 1 ? subGetChain : subUpdateChain;
      }
      if (table === "staged_chest_entries") {
        stagedCalls++;
        if (stagedCalls === 1) return stagedSelectChain;
        if (stagedCalls === 2) return stagedUpdateChain;
        return stagedCountChain;
      }
      if (table === "chest_entries") return prodInsertChain;
      return createChainableMock();
    });

    const res = await POST(makeRequest({ action: "approve_all" }), makeContext());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.submissionStatus).toBe("approved");
    expect(body.data.productionRowsCreated).toBe(2);
    expect(body.data.approvedCount).toBe(2);
    expect(body.data.rejectedCount).toBe(0);
  });

  it("approve_matched only approves auto_matched items", async () => {
    const subGetChain = createChainableMock();
    setChainResult(subGetChain, {
      data: { id: validUuid, clan_id: "clan-1", submission_type: "chests", status: "pending" },
      error: null,
    });

    const subUpdateChain = createChainableMock();
    setChainResult(subUpdateChain, { data: null, error: null });

    const matchedItems = [
      {
        id: "item-1",
        player_name: "Player1",
        item_status: "auto_matched",
        matched_game_account_id: "ga-1",
        chest_name: "Gold Chest",
        source: "War",
        level: 25,
        opened_at: "2024-01-01T00:00:00Z",
      },
    ];

    const stagedSelectChain = createChainableMock();
    setChainResult(stagedSelectChain, { data: matchedItems, error: null });

    const stagedUpdateChain = createChainableMock();
    setChainResult(stagedUpdateChain, { data: null, error: null });

    const stagedCountChain = createChainableMock();
    setChainResult(stagedCountChain, {
      data: [{ item_status: "approved" }, { item_status: "pending" }],
      error: null,
    });

    const prodInsertChain = createChainableMock();
    setChainResult(prodInsertChain, { data: [{ id: "prod-1" }], error: null });

    let dataSubCalls = 0;
    let stagedCalls = 0;

    mockSvcFrom.mockImplementation((table: string) => {
      if (table === "data_submissions") {
        dataSubCalls++;
        return dataSubCalls === 1 ? subGetChain : subUpdateChain;
      }
      if (table === "staged_chest_entries") {
        stagedCalls++;
        if (stagedCalls === 1) return stagedSelectChain;
        if (stagedCalls === 2) return stagedUpdateChain;
        return stagedCountChain;
      }
      if (table === "chest_entries") return prodInsertChain;
      return createChainableMock();
    });

    const res = await POST(makeRequest({ action: "approve_matched" }), makeContext());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.productionRowsCreated).toBe(1);
    expect(body.data.approvedCount).toBe(1);
  });

  it("reject_all sets submissionStatus to rejected", async () => {
    const subGetChain = createChainableMock();
    setChainResult(subGetChain, {
      data: { id: validUuid, clan_id: "clan-1", submission_type: "chests", status: "pending" },
      error: null,
    });

    const subUpdateChain = createChainableMock();
    setChainResult(subUpdateChain, { data: null, error: null });

    const stagedUpdateChain = createChainableMock();
    setChainResult(stagedUpdateChain, { data: null, error: null });

    const stagedCountChain = createChainableMock();
    setChainResult(stagedCountChain, {
      data: [{ item_status: "rejected" }, { item_status: "rejected" }, { item_status: "rejected" }],
      error: null,
    });

    let dataSubCalls = 0;
    let stagedCalls = 0;

    mockSvcFrom.mockImplementation((table: string) => {
      if (table === "data_submissions") {
        dataSubCalls++;
        return dataSubCalls === 1 ? subGetChain : subUpdateChain;
      }
      if (table === "staged_chest_entries") {
        stagedCalls++;
        return stagedCalls === 1 ? stagedUpdateChain : stagedCountChain;
      }
      return createChainableMock();
    });

    const res = await POST(makeRequest({ action: "reject_all" }), makeContext());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.submissionStatus).toBe("rejected");
    expect(body.data.productionRowsCreated).toBe(0);
    expect(body.data.rejectedCount).toBe(3);
  });

  it("approve_matched with mixed statuses results in partial submissionStatus", async () => {
    const subGetChain = createChainableMock();
    setChainResult(subGetChain, {
      data: { id: validUuid, clan_id: "clan-1", submission_type: "chests", status: "pending" },
      error: null,
    });

    const subUpdateChain = createChainableMock();
    setChainResult(subUpdateChain, { data: null, error: null });

    const matchedItems = [
      {
        id: "item-1",
        player_name: "Player1",
        item_status: "auto_matched",
        matched_game_account_id: "ga-1",
        chest_name: "Gold Chest",
        source: "War",
        level: 25,
        opened_at: "2024-01-01T00:00:00Z",
      },
    ];

    const stagedSelectChain = createChainableMock();
    setChainResult(stagedSelectChain, { data: matchedItems, error: null });

    const stagedUpdateChain = createChainableMock();
    setChainResult(stagedUpdateChain, { data: null, error: null });

    const stagedCountChain = createChainableMock();
    setChainResult(stagedCountChain, {
      data: [{ item_status: "approved" }, { item_status: "pending" }, { item_status: "pending" }],
      error: null,
    });

    const prodInsertChain = createChainableMock();
    setChainResult(prodInsertChain, { data: [{ id: "prod-1" }], error: null });

    let dataSubCalls = 0;
    let stagedCalls = 0;

    mockSvcFrom.mockImplementation((table: string) => {
      if (table === "data_submissions") {
        dataSubCalls++;
        return dataSubCalls === 1 ? subGetChain : subUpdateChain;
      }
      if (table === "staged_chest_entries") {
        stagedCalls++;
        if (stagedCalls === 1) return stagedSelectChain;
        if (stagedCalls === 2) return stagedUpdateChain;
        return stagedCountChain;
      }
      if (table === "chest_entries") return prodInsertChain;
      return createChainableMock();
    });

    const res = await POST(makeRequest({ action: "approve_matched" }), makeContext());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.submissionStatus).toBe("partial");
    expect(body.data.approvedCount).toBe(1);
    expect(body.data.rejectedCount).toBe(0);
  });

  it("per-item reject action returns 200 with rejected count", async () => {
    const subGetChain = createChainableMock();
    setChainResult(subGetChain, {
      data: { id: validUuid, clan_id: "clan-1", submission_type: "chests", status: "pending" },
      error: null,
    });

    const subUpdateChain = createChainableMock();
    setChainResult(subUpdateChain, { data: null, error: null });

    const stagedUpdateChain = createChainableMock();
    setChainResult(stagedUpdateChain, { data: null, error: null });

    const stagedCountChain = createChainableMock();
    setChainResult(stagedCountChain, {
      data: [{ item_status: "rejected" }],
      error: null,
    });

    let dataSubCalls = 0;
    let stagedCalls = 0;

    mockSvcFrom.mockImplementation((table: string) => {
      if (table === "data_submissions") {
        dataSubCalls++;
        return dataSubCalls === 1 ? subGetChain : subUpdateChain;
      }
      if (table === "staged_chest_entries") {
        stagedCalls++;
        return stagedCalls === 1 ? stagedUpdateChain : stagedCountChain;
      }
      return createChainableMock();
    });

    const res = await POST(makeRequest({ items: [{ id: itemUuid, action: "reject" }] }), makeContext());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.rejectedCount).toBe(1);
    expect(body.data.productionRowsCreated).toBe(0);
  });

  it("per-item mixed approve and reject actions", async () => {
    const subGetChain = createChainableMock();
    setChainResult(subGetChain, {
      data: { id: validUuid, clan_id: "clan-1", submission_type: "chests", status: "pending" },
      error: null,
    });

    const subUpdateChain = createChainableMock();
    setChainResult(subUpdateChain, { data: null, error: null });

    const approvedItem = {
      id: itemUuid,
      player_name: "Player1",
      item_status: "approved",
      matched_game_account_id: null,
      chest_name: "Gold Chest",
      source: "War",
      level: 25,
      opened_at: "2024-01-01T00:00:00Z",
    };

    const stagedApproveChain = createChainableMock();
    setChainResult(stagedApproveChain, { data: null, error: null });

    const stagedRejectChain = createChainableMock();
    setChainResult(stagedRejectChain, { data: null, error: null });

    const stagedSelectChain = createChainableMock();
    setChainResult(stagedSelectChain, { data: [approvedItem], error: null });

    const stagedCountChain = createChainableMock();
    setChainResult(stagedCountChain, {
      data: [{ item_status: "approved" }, { item_status: "rejected" }],
      error: null,
    });

    const prodInsertChain = createChainableMock();
    setChainResult(prodInsertChain, { data: [{ id: "prod-1" }], error: null });

    let dataSubCalls = 0;
    let stagedCalls = 0;

    mockSvcFrom.mockImplementation((table: string) => {
      if (table === "data_submissions") {
        dataSubCalls++;
        return dataSubCalls === 1 ? subGetChain : subUpdateChain;
      }
      if (table === "staged_chest_entries") {
        stagedCalls++;
        if (stagedCalls === 1) return stagedApproveChain;
        if (stagedCalls === 2) return stagedRejectChain;
        if (stagedCalls === 3) return stagedSelectChain;
        return stagedCountChain;
      }
      if (table === "chest_entries") return prodInsertChain;
      return createChainableMock();
    });

    const res = await POST(
      makeRequest({
        items: [
          { id: itemUuid, action: "approve" },
          { id: itemUuid2, action: "reject" },
        ],
      }),
      makeContext(),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.approvedCount).toBe(1);
    expect(body.data.rejectedCount).toBe(1);
    expect(body.data.productionRowsCreated).toBe(1);
  });

  it("returns 400 for unknown submission type", async () => {
    const subChain = createChainableMock();
    setChainResult(subChain, {
      data: { id: validUuid, clan_id: "clan-1", submission_type: "unknown", status: "pending" },
      error: null,
    });

    mockSvcFrom.mockReturnValue(subChain);

    const res = await POST(makeRequest({ action: "approve_all" }), makeContext());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Unknown submission type");
  });

  it("per-item approve with matchGameAccountId updates staged entry", async () => {
    const subGetChain = createChainableMock();
    setChainResult(subGetChain, {
      data: { id: validUuid, clan_id: "clan-1", submission_type: "chests", status: "pending" },
      error: null,
    });

    const subUpdateChain = createChainableMock();
    setChainResult(subUpdateChain, { data: null, error: null });

    const stagedMatchChain = createChainableMock();
    setChainResult(stagedMatchChain, { data: null, error: null });

    const stagedApproveChain = createChainableMock();
    setChainResult(stagedApproveChain, { data: null, error: null });

    const stagedSelectChain = createChainableMock();
    setChainResult(stagedSelectChain, {
      data: [
        {
          id: itemUuid,
          player_name: "P1",
          item_status: "approved",
          matched_game_account_id: "ga-99",
          chest_name: "Gold",
          source: "War",
          level: 10,
          opened_at: "2024-01-01",
        },
      ],
      error: null,
    });

    const stagedCountChain = createChainableMock();
    setChainResult(stagedCountChain, {
      data: [{ item_status: "approved" }],
      error: null,
    });

    const prodInsertChain = createChainableMock();
    setChainResult(prodInsertChain, { data: [{ id: "prod-1" }], error: null });

    let dataSubCalls = 0;
    let stagedCalls = 0;

    mockSvcFrom.mockImplementation((table: string) => {
      if (table === "data_submissions") {
        dataSubCalls++;
        return dataSubCalls === 1 ? subGetChain : subUpdateChain;
      }
      if (table === "staged_chest_entries") {
        stagedCalls++;
        if (stagedCalls === 1) return stagedMatchChain;
        if (stagedCalls === 2) return stagedApproveChain;
        if (stagedCalls === 3) return stagedSelectChain;
        return stagedCountChain;
      }
      if (table === "chest_entries") return prodInsertChain;
      return createChainableMock();
    });

    const res = await POST(
      makeRequest({
        items: [{ id: itemUuid, action: "approve", matchGameAccountId: "550e8400-e29b-41d4-a716-446655440099" }],
      }),
      makeContext(),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.approvedCount).toBe(1);
    expect(body.data.productionRowsCreated).toBe(1);
  });

  it("per-item approve with saveCorrection triggers upsertCorrections", async () => {
    const subGetChain = createChainableMock();
    setChainResult(subGetChain, {
      data: { id: validUuid, clan_id: "clan-1", submission_type: "chests", status: "pending" },
      error: null,
    });

    const subUpdateChain = createChainableMock();
    setChainResult(subUpdateChain, { data: null, error: null });

    const stagedMatchChain = createChainableMock();
    setChainResult(stagedMatchChain, { data: null, error: null });

    const stagedApproveChain = createChainableMock();
    setChainResult(stagedApproveChain, { data: null, error: null });

    const stagedSelectChain = createChainableMock();
    setChainResult(stagedSelectChain, {
      data: [
        {
          id: itemUuid,
          player_name: "Plyr1",
          item_status: "approved",
          matched_game_account_id: "ga-1",
          chest_name: "Gold",
          source: "War",
          level: 10,
          opened_at: "2024-01-01",
        },
      ],
      error: null,
    });

    const stagedCountChain = createChainableMock();
    setChainResult(stagedCountChain, {
      data: [{ item_status: "approved" }],
      error: null,
    });

    const prodInsertChain = createChainableMock();
    setChainResult(prodInsertChain, { data: [{ id: "prod-1" }], error: null });

    const correctionLookupChain = createChainableMock();
    setChainResult(correctionLookupChain, {
      data: [{ id: itemUuid, player_name: "Plyr1" }],
      error: null,
    });

    const accountLookupChain = createChainableMock();
    setChainResult(accountLookupChain, {
      data: [{ id: "550e8400-e29b-41d4-a716-446655440099", game_username: "RealPlayer1" }],
      error: null,
    });

    const ocrUpsertChain = createChainableMock();
    setChainResult(ocrUpsertChain, { data: null, error: null });

    let dataSubCalls = 0;
    let stagedCalls = 0;

    mockSvcFrom.mockImplementation((table: string) => {
      if (table === "data_submissions") {
        dataSubCalls++;
        return dataSubCalls === 1 ? subGetChain : subUpdateChain;
      }
      if (table === "staged_chest_entries") {
        stagedCalls++;
        if (stagedCalls === 1) return stagedMatchChain;
        if (stagedCalls === 2) return stagedApproveChain;
        if (stagedCalls === 3) return stagedSelectChain;
        if (stagedCalls === 4) return stagedCountChain;
        return correctionLookupChain;
      }
      if (table === "chest_entries") return prodInsertChain;
      if (table === "game_accounts") return accountLookupChain;
      if (table === "ocr_corrections") return ocrUpsertChain;
      return createChainableMock();
    });

    const res = await POST(
      makeRequest({
        items: [
          {
            id: itemUuid,
            action: "approve",
            matchGameAccountId: "550e8400-e29b-41d4-a716-446655440099",
            saveCorrection: true,
          },
        ],
      }),
      makeContext(),
    );
    expect(res.status).toBe(200);
  });

  it("handles members submission type in production mapping", async () => {
    const subGetChain = createChainableMock();
    setChainResult(subGetChain, {
      data: { id: validUuid, clan_id: "clan-1", submission_type: "members", status: "pending" },
      error: null,
    });

    const subUpdateChain = createChainableMock();
    setChainResult(subUpdateChain, { data: null, error: null });

    const stagedItems = [
      {
        id: "item-m1",
        player_name: "Player1",
        item_status: "pending",
        matched_game_account_id: null,
        coordinates: "X:100 Y:200",
        score: 5000,
        captured_at: "2024-03-01T00:00:00Z",
      },
    ];

    const stagedSelectChain = createChainableMock();
    setChainResult(stagedSelectChain, { data: stagedItems, error: null });

    const stagedUpdateChain = createChainableMock();
    setChainResult(stagedUpdateChain, { data: null, error: null });

    const stagedCountChain = createChainableMock();
    setChainResult(stagedCountChain, {
      data: [{ item_status: "approved" }],
      error: null,
    });

    const prodInsertChain = createChainableMock();
    setChainResult(prodInsertChain, { data: [{ id: "prod-m1" }], error: null });

    let dataSubCalls = 0;
    let stagedCalls = 0;

    mockSvcFrom.mockImplementation((table: string) => {
      if (table === "data_submissions") {
        dataSubCalls++;
        return dataSubCalls === 1 ? subGetChain : subUpdateChain;
      }
      if (table === "staged_member_entries") {
        stagedCalls++;
        if (stagedCalls === 1) return stagedSelectChain;
        if (stagedCalls === 2) return stagedUpdateChain;
        return stagedCountChain;
      }
      if (table === "member_snapshots") return prodInsertChain;
      return createChainableMock();
    });

    const res = await POST(makeRequest({ action: "approve_all" }), makeContext());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.productionRowsCreated).toBe(1);
  });

  it("handles events submission type in production mapping", async () => {
    const subGetChain = createChainableMock();
    setChainResult(subGetChain, {
      data: { id: validUuid, clan_id: "clan-1", submission_type: "events", status: "pending" },
      error: null,
    });

    const subUpdateChain = createChainableMock();
    setChainResult(subUpdateChain, { data: null, error: null });

    const stagedItems = [
      {
        id: "item-e1",
        player_name: "Player1",
        item_status: "pending",
        matched_game_account_id: null,
        event_points: 1500,
        event_name: "KvK",
        captured_at: "2024-03-01T00:00:00Z",
      },
    ];

    const stagedSelectChain = createChainableMock();
    setChainResult(stagedSelectChain, { data: stagedItems, error: null });

    const stagedUpdateChain = createChainableMock();
    setChainResult(stagedUpdateChain, { data: null, error: null });

    const stagedCountChain = createChainableMock();
    setChainResult(stagedCountChain, {
      data: [{ item_status: "approved" }],
      error: null,
    });

    const prodInsertChain = createChainableMock();
    setChainResult(prodInsertChain, { data: [{ id: "prod-e1" }], error: null });

    let dataSubCalls = 0;
    let stagedCalls = 0;

    mockSvcFrom.mockImplementation((table: string) => {
      if (table === "data_submissions") {
        dataSubCalls++;
        return dataSubCalls === 1 ? subGetChain : subUpdateChain;
      }
      if (table === "staged_event_entries") {
        stagedCalls++;
        if (stagedCalls === 1) return stagedSelectChain;
        if (stagedCalls === 2) return stagedUpdateChain;
        return stagedCountChain;
      }
      if (table === "event_results") return prodInsertChain;
      return createChainableMock();
    });

    const res = await POST(makeRequest({ action: "approve_all" }), makeContext());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.productionRowsCreated).toBe(1);
  });

  it("returns pending status when no items remain after review", async () => {
    const subGetChain = createChainableMock();
    setChainResult(subGetChain, {
      data: { id: validUuid, clan_id: "clan-1", submission_type: "chests", status: "pending" },
      error: null,
    });

    const subUpdateChain = createChainableMock();
    setChainResult(subUpdateChain, { data: null, error: null });

    const stagedUpdateChain = createChainableMock();
    setChainResult(stagedUpdateChain, { data: null, error: null });

    const stagedCountChain = createChainableMock();
    setChainResult(stagedCountChain, { data: [], error: null });

    let dataSubCalls = 0;
    let stagedCalls = 0;

    mockSvcFrom.mockImplementation((table: string) => {
      if (table === "data_submissions") {
        dataSubCalls++;
        return dataSubCalls === 1 ? subGetChain : subUpdateChain;
      }
      if (table === "staged_chest_entries") {
        stagedCalls++;
        return stagedCalls === 1 ? stagedUpdateChain : stagedCountChain;
      }
      return createChainableMock();
    });

    const res = await POST(makeRequest({ action: "reject_all" }), makeContext());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.submissionStatus).toBe("pending");
  });

  it("processes partial status submission", async () => {
    const subGetChain = createChainableMock();
    setChainResult(subGetChain, {
      data: { id: validUuid, clan_id: "clan-1", submission_type: "chests", status: "partial" },
      error: null,
    });

    const subUpdateChain = createChainableMock();
    setChainResult(subUpdateChain, { data: null, error: null });

    const stagedUpdateChain = createChainableMock();
    setChainResult(stagedUpdateChain, { data: null, error: null });

    const stagedCountChain = createChainableMock();
    setChainResult(stagedCountChain, {
      data: [{ item_status: "rejected" }],
      error: null,
    });

    let dataSubCalls = 0;
    let stagedCalls = 0;

    mockSvcFrom.mockImplementation((table: string) => {
      if (table === "data_submissions") {
        dataSubCalls++;
        return dataSubCalls === 1 ? subGetChain : subUpdateChain;
      }
      if (table === "staged_chest_entries") {
        stagedCalls++;
        return stagedCalls === 1 ? stagedUpdateChain : stagedCountChain;
      }
      return createChainableMock();
    });

    const res = await POST(makeRequest({ action: "reject_all" }), makeContext());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.submissionStatus).toBe("rejected");
  });

  it("returns 500 when submission status update fails", async () => {
    const subGetChain = createChainableMock();
    setChainResult(subGetChain, {
      data: { id: validUuid, clan_id: "clan-1", submission_type: "chests", status: "pending" },
      error: null,
    });

    const subUpdateChain = createChainableMock();
    setChainResult(subUpdateChain, { data: null, error: { message: "db write failed" } });

    const stagedUpdateChain = createChainableMock();
    setChainResult(stagedUpdateChain, { data: null, error: null });

    const stagedCountChain = createChainableMock();
    setChainResult(stagedCountChain, {
      data: [{ item_status: "rejected" }],
      error: null,
    });

    let dataSubCalls = 0;
    let stagedCalls = 0;

    mockSvcFrom.mockImplementation((table: string) => {
      if (table === "data_submissions") {
        dataSubCalls++;
        return dataSubCalls === 1 ? subGetChain : subUpdateChain;
      }
      if (table === "staged_chest_entries") {
        stagedCalls++;
        return stagedCalls === 1 ? stagedUpdateChain : stagedCountChain;
      }
      return createChainableMock();
    });

    const res = await POST(makeRequest({ action: "reject_all" }), makeContext());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain("Failed to update submission status");
  });
});
