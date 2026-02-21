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
import { POST } from "./route";

const clanUuid = "550e8400-e29b-41d4-a716-446655440000";

function makeValidPayload(overrides: Record<string, unknown> = {}) {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    source: "ChillerBuddy",
    clan: {
      localClanId: "local-1",
      name: "Test Clan",
      websiteClanId: clanUuid,
    },
    data: {
      chests: [
        {
          chestName: "Gold Chest",
          playerName: "Player1",
          source: "War",
          openedAt: new Date().toISOString(),
        },
      ],
    },
    ...overrides,
  };
}

function makeRequest(body: unknown): NextRequest {
  return new NextRequest(new URL("/api/import/submit", "http://localhost:3000"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer test-token",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/import/submit", () => {
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
    const res = await POST(makeRequest(makeValidPayload()));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid JSON", async () => {
    const req = new NextRequest(new URL("/api/import/submit", "http://localhost:3000"), {
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

  it("returns 400 for invalid payload schema", async () => {
    const res = await POST(makeRequest({ version: 2, data: {} }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when clan_id is missing", async () => {
    const payload = makeValidPayload({
      clan: { localClanId: "local-1", name: "Test", websiteClanId: null },
    });
    const res = await POST(makeRequest(payload));
    expect(res.status).toBe(400);
  });

  it("returns 403 when user is not clan member", async () => {
    mockAuth.mockRpc.mockResolvedValue({ data: false, error: null });

    const res = await POST(makeRequest(makeValidPayload()));
    expect(res.status).toBe(403);
  });

  it("creates submission successfully", async () => {
    const submissionChain = createChainableMock();
    setChainResult(submissionChain, { data: { id: "sub-1" }, error: null });

    const stagedChain = createChainableMock();
    setChainResult(stagedChain, { data: null, error: null });

    const membershipChain = createChainableMock();
    setChainResult(membershipChain, { data: [], error: null });

    const correctionsChain = createChainableMock();
    setChainResult(correctionsChain, { data: [], error: null });

    mockSvcFrom.mockImplementation((table: string) => {
      if (table === "data_submissions") return submissionChain;
      if (table === "staged_chest_entries") return stagedChain;
      if (table === "game_account_clan_memberships") return membershipChain;
      if (table === "ocr_corrections") return correctionsChain;
      return createChainableMock();
    });

    const res = await POST(makeRequest(makeValidPayload()));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.submissions).toHaveLength(1);
    expect(body.data.submissions[0].type).toBe("chests");
  });

  it("handles payload with multiple data types", async () => {
    const submissionChain = createChainableMock();
    setChainResult(submissionChain, { data: { id: "sub-1" }, error: null });
    submissionChain.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

    const stagedChain = createChainableMock();
    setChainResult(stagedChain, { data: null, error: null });

    const membershipChain = createChainableMock();
    setChainResult(membershipChain, { data: [], error: null });

    const correctionsChain = createChainableMock();
    setChainResult(correctionsChain, { data: [], error: null });

    mockSvcFrom.mockImplementation((table: string) => {
      if (table === "data_submissions") return submissionChain;
      if (table === "game_account_clan_memberships") return membershipChain;
      if (table === "ocr_corrections") return correctionsChain;
      return stagedChain;
    });

    const payload = makeValidPayload({
      data: {
        chests: [{ chestName: "Gold", playerName: "P1", source: "War", openedAt: new Date().toISOString() }],
        members: [{ playerName: "P1", score: 100, capturedAt: new Date().toISOString() }],
        events: [{ playerName: "P1", eventPoints: 50, capturedAt: new Date().toISOString() }],
      },
    });

    const res = await POST(makeRequest(payload));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.submissions).toHaveLength(3);
  });

  it("returns 500 on unexpected error", async () => {
    vi.mocked(requireAuthWithBearer).mockRejectedValue(new Error("boom"));
    const res = await POST(makeRequest(makeValidPayload()));
    expect(res.status).toBe(500);
  });

  it("auto-matches player name with direct match", async () => {
    const membershipChain = createChainableMock();
    setChainResult(membershipChain, {
      data: [{ game_accounts: { id: "ga-1", game_username: "Player1" } }],
      error: null,
    });

    const correctionsChain = createChainableMock();
    setChainResult(correctionsChain, { data: [], error: null });

    const submissionChain = createChainableMock();
    setChainResult(submissionChain, { data: { id: "sub-1" }, error: null });

    const stagedChain = createChainableMock();
    setChainResult(stagedChain, { data: null, error: null });

    mockSvcFrom.mockImplementation((table: string) => {
      if (table === "game_account_clan_memberships") return membershipChain;
      if (table === "ocr_corrections") return correctionsChain;
      if (table === "data_submissions") return submissionChain;
      if (table === "staged_chest_entries") return stagedChain;
      return createChainableMock();
    });

    const res = await POST(makeRequest(makeValidPayload()));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.submissions[0].autoMatchedCount).toBe(1);

    const insertedRows = stagedChain.insert.mock.calls[0]![0];
    expect(insertedRows[0].item_status).toBe("auto_matched");
    expect(insertedRows[0].matched_game_account_id).toBe("ga-1");
  });

  it("auto-matches player name case-insensitively", async () => {
    const membershipChain = createChainableMock();
    setChainResult(membershipChain, {
      data: [{ game_accounts: { id: "ga-1", game_username: "player1" } }],
      error: null,
    });

    const correctionsChain = createChainableMock();
    setChainResult(correctionsChain, { data: [], error: null });

    const submissionChain = createChainableMock();
    setChainResult(submissionChain, { data: { id: "sub-1" }, error: null });

    const stagedChain = createChainableMock();
    setChainResult(stagedChain, { data: null, error: null });

    mockSvcFrom.mockImplementation((table: string) => {
      if (table === "game_account_clan_memberships") return membershipChain;
      if (table === "ocr_corrections") return correctionsChain;
      if (table === "data_submissions") return submissionChain;
      if (table === "staged_chest_entries") return stagedChain;
      return createChainableMock();
    });

    const res = await POST(makeRequest(makeValidPayload()));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.submissions[0].autoMatchedCount).toBe(1);

    const insertedRows = stagedChain.insert.mock.calls[0]![0];
    expect(insertedRows[0].item_status).toBe("auto_matched");
    expect(insertedRows[0].matched_game_account_id).toBe("ga-1");
  });

  it("auto-matches via OCR correction chain", async () => {
    const membershipChain = createChainableMock();
    setChainResult(membershipChain, {
      data: [{ game_accounts: { id: "ga-1", game_username: "Player1" } }],
      error: null,
    });

    const correctionsChain = createChainableMock();
    setChainResult(correctionsChain, {
      data: [{ ocr_text: "plyr1", corrected_text: "Player1" }],
      error: null,
    });

    const submissionChain = createChainableMock();
    setChainResult(submissionChain, { data: { id: "sub-1" }, error: null });

    const stagedChain = createChainableMock();
    setChainResult(stagedChain, { data: null, error: null });

    mockSvcFrom.mockImplementation((table: string) => {
      if (table === "game_account_clan_memberships") return membershipChain;
      if (table === "ocr_corrections") return correctionsChain;
      if (table === "data_submissions") return submissionChain;
      if (table === "staged_chest_entries") return stagedChain;
      return createChainableMock();
    });

    const payload = makeValidPayload({
      data: {
        chests: [{ chestName: "Gold Chest", playerName: "plyr1", source: "War", openedAt: new Date().toISOString() }],
      },
    });

    const res = await POST(makeRequest(payload));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.submissions[0].autoMatchedCount).toBe(1);

    const insertedRows = stagedChain.insert.mock.calls[0]![0];
    expect(insertedRows[0].item_status).toBe("auto_matched");
    expect(insertedRows[0].matched_game_account_id).toBe("ga-1");
  });

  it("marks unmatched when no game account or correction exists", async () => {
    const membershipChain = createChainableMock();
    setChainResult(membershipChain, { data: [], error: null });

    const correctionsChain = createChainableMock();
    setChainResult(correctionsChain, { data: [], error: null });

    const submissionChain = createChainableMock();
    setChainResult(submissionChain, { data: { id: "sub-1" }, error: null });

    const stagedChain = createChainableMock();
    setChainResult(stagedChain, { data: null, error: null });

    mockSvcFrom.mockImplementation((table: string) => {
      if (table === "game_account_clan_memberships") return membershipChain;
      if (table === "ocr_corrections") return correctionsChain;
      if (table === "data_submissions") return submissionChain;
      if (table === "staged_chest_entries") return stagedChain;
      return createChainableMock();
    });

    const res = await POST(makeRequest(makeValidPayload()));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.submissions[0].autoMatchedCount).toBe(0);
    expect(body.data.submissions[0].unmatchedCount).toBe(1);

    const insertedRows = stagedChain.insert.mock.calls[0]![0];
    expect(insertedRows[0].item_status).toBe("pending");
    expect(insertedRows[0].matched_game_account_id).toBeNull();
  });

  it("sets source to api_push when X-Source header is present", async () => {
    const submissionChain = createChainableMock();
    setChainResult(submissionChain, { data: { id: "sub-1" }, error: null });

    const stagedChain = createChainableMock();
    setChainResult(stagedChain, { data: null, error: null });

    const membershipChain = createChainableMock();
    setChainResult(membershipChain, { data: [], error: null });

    const correctionsChain = createChainableMock();
    setChainResult(correctionsChain, { data: [], error: null });

    mockSvcFrom.mockImplementation((table: string) => {
      if (table === "data_submissions") return submissionChain;
      if (table === "staged_chest_entries") return stagedChain;
      if (table === "game_account_clan_memberships") return membershipChain;
      if (table === "ocr_corrections") return correctionsChain;
      return createChainableMock();
    });

    const req = new NextRequest(new URL("/api/import/submit", "http://localhost:3000"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-token",
        "X-Source": "api_push",
      },
      body: JSON.stringify(makeValidPayload()),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);

    const insertArgs = submissionChain.insert.mock.calls[0]![0];
    expect(insertArgs.source).toBe("api_push");
  });

  it("defaults source to file_import without X-Source header", async () => {
    const submissionChain = createChainableMock();
    setChainResult(submissionChain, { data: { id: "sub-1" }, error: null });

    const stagedChain = createChainableMock();
    setChainResult(stagedChain, { data: null, error: null });

    const membershipChain = createChainableMock();
    setChainResult(membershipChain, { data: [], error: null });

    const correctionsChain = createChainableMock();
    setChainResult(correctionsChain, { data: [], error: null });

    mockSvcFrom.mockImplementation((table: string) => {
      if (table === "data_submissions") return submissionChain;
      if (table === "staged_chest_entries") return stagedChain;
      if (table === "game_account_clan_memberships") return membershipChain;
      if (table === "ocr_corrections") return correctionsChain;
      return createChainableMock();
    });

    const res = await POST(makeRequest(makeValidPayload()));
    expect(res.status).toBe(201);

    const insertArgs = submissionChain.insert.mock.calls[0]![0];
    expect(insertArgs.source).toBe("file_import");
  });

  it("resolves clan_id from query param when websiteClanId is null", async () => {
    const submissionChain = createChainableMock();
    setChainResult(submissionChain, { data: { id: "sub-1" }, error: null });

    const stagedChain = createChainableMock();
    setChainResult(stagedChain, { data: null, error: null });

    const membershipChain = createChainableMock();
    setChainResult(membershipChain, { data: [], error: null });

    const correctionsChain = createChainableMock();
    setChainResult(correctionsChain, { data: [], error: null });

    mockSvcFrom.mockImplementation((table: string) => {
      if (table === "data_submissions") return submissionChain;
      if (table === "staged_chest_entries") return stagedChain;
      if (table === "game_account_clan_memberships") return membershipChain;
      if (table === "ocr_corrections") return correctionsChain;
      return createChainableMock();
    });

    const payload = makeValidPayload({
      clan: { localClanId: "local-1", name: "Test", websiteClanId: null },
    });
    const req = new NextRequest(new URL(`/api/import/submit?clan_id=${clanUuid}`, "http://localhost:3000"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-token",
      },
      body: JSON.stringify(payload),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
  });

  it("allows non-member admin to submit", async () => {
    mockAuth.mockRpc.mockImplementation((fn: string) => {
      if (fn === "is_clan_member") return Promise.resolve({ data: false, error: null });
      if (fn === "is_any_admin") return Promise.resolve({ data: true, error: null });
      return Promise.resolve({ data: null, error: null });
    });

    const submissionChain = createChainableMock();
    setChainResult(submissionChain, { data: { id: "sub-1" }, error: null });

    const stagedChain = createChainableMock();
    setChainResult(stagedChain, { data: null, error: null });

    const membershipChain = createChainableMock();
    setChainResult(membershipChain, { data: [], error: null });

    const correctionsChain = createChainableMock();
    setChainResult(correctionsChain, { data: [], error: null });

    mockSvcFrom.mockImplementation((table: string) => {
      if (table === "data_submissions") return submissionChain;
      if (table === "staged_chest_entries") return stagedChain;
      if (table === "game_account_clan_memberships") return membershipChain;
      if (table === "ocr_corrections") return correctionsChain;
      return createChainableMock();
    });

    const res = await POST(makeRequest(makeValidPayload()));
    expect(res.status).toBe(201);
  });

  it("returns 500 when submission insert fails", async () => {
    const submissionChain = createChainableMock();
    setChainResult(submissionChain, { data: null, error: { message: "insert failed" } });

    const membershipChain = createChainableMock();
    setChainResult(membershipChain, { data: [], error: null });

    const correctionsChain = createChainableMock();
    setChainResult(correctionsChain, { data: [], error: null });

    mockSvcFrom.mockImplementation((table: string) => {
      if (table === "data_submissions") return submissionChain;
      if (table === "game_account_clan_memberships") return membershipChain;
      if (table === "ocr_corrections") return correctionsChain;
      return createChainableMock();
    });

    const res = await POST(makeRequest(makeValidPayload()));
    expect(res.status).toBe(500);
  });

  it("returns 500 when staged entries insert fails", async () => {
    const submissionChain = createChainableMock();
    setChainResult(submissionChain, { data: { id: "sub-1" }, error: null });

    const stagedChain = createChainableMock();
    setChainResult(stagedChain, { data: null, error: { message: "staged insert failed" } });

    const membershipChain = createChainableMock();
    setChainResult(membershipChain, { data: [], error: null });

    const correctionsChain = createChainableMock();
    setChainResult(correctionsChain, { data: [], error: null });

    mockSvcFrom.mockImplementation((table: string) => {
      if (table === "data_submissions") return submissionChain;
      if (table === "staged_chest_entries") return stagedChain;
      if (table === "game_account_clan_memberships") return membershipChain;
      if (table === "ocr_corrections") return correctionsChain;
      return createChainableMock();
    });

    const res = await POST(makeRequest(makeValidPayload()));
    expect(res.status).toBe(500);
  });

  it("upserts validation lists when provided", async () => {
    const submissionChain = createChainableMock();
    setChainResult(submissionChain, { data: { id: "sub-1" }, error: null });

    const stagedChain = createChainableMock();
    setChainResult(stagedChain, { data: null, error: null });

    const membershipChain = createChainableMock();
    setChainResult(membershipChain, { data: [], error: null });

    const correctionsReadChain = createChainableMock();
    setChainResult(correctionsReadChain, { data: [], error: null });

    const knownNamesChain = createChainableMock();
    setChainResult(knownNamesChain, { data: null, error: null });

    const correctionsWriteChain = createChainableMock();
    setChainResult(correctionsWriteChain, { data: null, error: null });

    let ocrCallCount = 0;
    mockSvcFrom.mockImplementation((table: string) => {
      if (table === "data_submissions") return submissionChain;
      if (table === "staged_chest_entries") return stagedChain;
      if (table === "game_account_clan_memberships") return membershipChain;
      if (table === "known_names") return knownNamesChain;
      if (table === "ocr_corrections") {
        ocrCallCount++;
        return ocrCallCount === 1 ? correctionsReadChain : correctionsWriteChain;
      }
      return createChainableMock();
    });

    const payload = makeValidPayload({
      validationLists: {
        knownPlayerNames: ["P1"],
        corrections: { player: { Plyr: "Player" } },
      },
    });

    const res = await POST(makeRequest(payload));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.validationListsUpdated).toBe(true);

    expect(knownNamesChain.upsert).toHaveBeenCalled();
    expect(knownNamesChain.upsert.mock.calls[0]![0]).toEqual([
      { clan_id: clanUuid, entity_type: "player", name: "P1" },
    ]);

    expect(correctionsWriteChain.upsert).toHaveBeenCalled();
    expect(correctionsWriteChain.upsert.mock.calls[0]![0]).toEqual([
      {
        clan_id: clanUuid,
        entity_type: "player",
        ocr_text: "Plyr",
        corrected_text: "Player",
        created_by: "test-user-id",
      },
    ]);
  });

  it("creates a single submission for members-only payload", async () => {
    const submissionChain = createChainableMock();
    setChainResult(submissionChain, { data: { id: "sub-1" }, error: null });
    submissionChain.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

    const stagedChain = createChainableMock();
    setChainResult(stagedChain, { data: null, error: null });

    const membershipChain = createChainableMock();
    setChainResult(membershipChain, { data: [], error: null });

    const correctionsChain = createChainableMock();
    setChainResult(correctionsChain, { data: [], error: null });

    mockSvcFrom.mockImplementation((table: string) => {
      if (table === "data_submissions") return submissionChain;
      if (table === "staged_member_entries") return stagedChain;
      if (table === "game_account_clan_memberships") return membershipChain;
      if (table === "ocr_corrections") return correctionsChain;
      return createChainableMock();
    });

    const payload = makeValidPayload({
      data: {
        members: [{ playerName: "P1", score: 100, capturedAt: new Date().toISOString() }],
      },
    });

    const res = await POST(makeRequest(payload));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.submissions).toHaveLength(1);
    expect(body.data.submissions[0].type).toBe("members");
  });

  it("creates a single submission for events-only payload", async () => {
    const submissionChain = createChainableMock();
    setChainResult(submissionChain, { data: { id: "sub-1" }, error: null });

    const stagedChain = createChainableMock();
    setChainResult(stagedChain, { data: null, error: null });

    const membershipChain = createChainableMock();
    setChainResult(membershipChain, { data: [], error: null });

    const correctionsChain = createChainableMock();
    setChainResult(correctionsChain, { data: [], error: null });

    mockSvcFrom.mockImplementation((table: string) => {
      if (table === "data_submissions") return submissionChain;
      if (table === "staged_event_entries") return stagedChain;
      if (table === "game_account_clan_memberships") return membershipChain;
      if (table === "ocr_corrections") return correctionsChain;
      return createChainableMock();
    });

    const payload = makeValidPayload({
      data: {
        events: [{ playerName: "P1", eventPoints: 50, capturedAt: new Date().toISOString() }],
      },
    });

    const res = await POST(makeRequest(payload));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.submissions).toHaveLength(1);
    expect(body.data.submissions[0].type).toBe("events");
  });
});
