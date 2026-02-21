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

vi.mock("@/lib/messages/profile-utils", () => ({
  loadMessageProfilesByIds: vi.fn().mockResolvedValue({}),
  mapRecipientsWithProfiles: vi.fn().mockReturnValue([]),
}));

vi.mock("@/lib/messages/broadcast-targeting", () => ({
  userMatchesBroadcastTargeting: vi.fn().mockResolvedValue(true),
  canUserReplyToBroadcast: vi.fn().mockResolvedValue(false),
}));

vi.mock("@/lib/supabase/role-access", () => ({
  default: vi.fn().mockResolvedValue(false),
}));

const mockSvcFrom = vi.fn();
vi.mock("@/lib/supabase/service-role-client", () => ({
  default: vi.fn(() => ({ from: mockSvcFrom })),
}));

import { requireAuth } from "@/lib/api/require-auth";
import { GET, DELETE } from "./route";

const validUuid = "550e8400-e29b-41d4-a716-446655440000";

function makeRequest(method: string = "GET"): NextRequest {
  return new NextRequest(new URL(`/api/messages/thread/${validUuid}`, "http://localhost:3000"), { method });
}

function makeContext(threadId: string = validUuid) {
  return { params: Promise.resolve({ threadId }) };
}

describe("DELETE /api/messages/thread/[threadId]", () => {
  let mockAuth: ReturnType<typeof createMockAuth>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth = createMockAuth();
    vi.mocked(requireAuth).mockResolvedValue(mockAuth.authResult);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireAuth).mockResolvedValue(createUnauthorizedResult() as never);
    const res = await DELETE(makeRequest("DELETE"), makeContext());
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid thread ID format", async () => {
    const res = await DELETE(makeRequest("DELETE"), makeContext("bad-id"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Invalid thread ID");
  });

  it("returns 404 when thread not found", async () => {
    const msgsChain = createChainableMock();
    setChainResult(msgsChain, { data: [], error: null });

    mockSvcFrom.mockReturnValue(msgsChain);

    const res = await DELETE(makeRequest("DELETE"), makeContext());
    expect(res.status).toBe(404);
  });

  it("deletes private thread messages", async () => {
    const msgsChain = createChainableMock();
    setChainResult(msgsChain, {
      data: [{ id: validUuid, message_type: "private" }],
      error: null,
    });

    const recipientsChain = createChainableMock();
    setChainResult(recipientsChain, { data: null, error: null });

    mockSvcFrom.mockImplementation((table: string) => {
      if (table === "messages") return msgsChain;
      if (table === "message_recipients") return recipientsChain;
      return createChainableMock();
    });

    const res = await DELETE(makeRequest("DELETE"), makeContext());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.deleted).toBe(true);
    expect(body.data.thread_id).toBe(validUuid);
  });

  it("deletes broadcast thread messages via dismissals", async () => {
    const msgsChain = createChainableMock();
    setChainResult(msgsChain, {
      data: [{ id: validUuid, message_type: "broadcast" }],
      error: null,
    });

    const dismissalsChain = createChainableMock();
    setChainResult(dismissalsChain, { data: null, error: null });

    mockSvcFrom.mockImplementation((table: string) => {
      if (table === "messages") return msgsChain;
      if (table === "message_dismissals") return dismissalsChain;
      return createChainableMock();
    });

    const res = await DELETE(makeRequest("DELETE"), makeContext());
    expect(res.status).toBe(200);
  });

  it("returns 500 when message query fails", async () => {
    const msgsChain = createChainableMock();
    setChainResult(msgsChain, { data: null, error: { message: "DB error" } });

    mockSvcFrom.mockReturnValue(msgsChain);

    const res = await DELETE(makeRequest("DELETE"), makeContext());
    expect(res.status).toBe(500);
  });

  it("returns 500 on unexpected error", async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error("boom"));
    const res = await DELETE(makeRequest("DELETE"), makeContext());
    expect(res.status).toBe(500);
  });
});

describe("GET /api/messages/thread/[threadId]", () => {
  let mockAuth: ReturnType<typeof createMockAuth>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth = createMockAuth();
    vi.mocked(requireAuth).mockResolvedValue(mockAuth.authResult);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireAuth).mockResolvedValue(createUnauthorizedResult() as never);
    const res = await GET(makeRequest(), makeContext());
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid thread ID format", async () => {
    const res = await GET(makeRequest(), makeContext("bad-id"));
    expect(res.status).toBe(400);
  });

  it("returns empty thread when no messages exist", async () => {
    const msgsChain = createChainableMock();
    setChainResult(msgsChain, { data: [], error: null });

    mockSvcFrom.mockReturnValue(msgsChain);

    const res = await GET(makeRequest(), makeContext());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual([]);
  });

  it("returns thread messages when user is sender", async () => {
    const msgsChain = createChainableMock();
    setChainResult(msgsChain, {
      data: [
        {
          id: validUuid,
          sender_id: "test-user-id",
          subject: "Test",
          content: "Hello",
          message_type: "private",
          thread_id: null,
          parent_id: null,
          created_at: new Date().toISOString(),
          target_ranks: null,
          target_roles: null,
          target_clan_id: null,
        },
      ],
      error: null,
    });

    const recipientsChain = createChainableMock();
    setChainResult(recipientsChain, { data: [], error: null });

    const readsChain = createChainableMock();
    setChainResult(readsChain, { data: [], error: null });

    mockSvcFrom.mockImplementation((table: string) => {
      if (table === "messages") return msgsChain;
      if (table === "message_recipients") return recipientsChain;
      if (table === "message_reads") return readsChain;
      return createChainableMock();
    });

    const res = await GET(makeRequest(), makeContext());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.length).toBe(1);
    expect(body.meta.can_reply).toBe(true);
  });

  it("returns 404 when user has no access to thread", async () => {
    const msgsChain = createChainableMock();
    setChainResult(msgsChain, {
      data: [
        {
          id: validUuid,
          sender_id: "other-user",
          subject: "Test",
          content: "Hello",
          message_type: "private",
          thread_id: null,
          parent_id: null,
          created_at: new Date().toISOString(),
          target_ranks: null,
          target_roles: null,
          target_clan_id: null,
        },
      ],
      error: null,
    });

    const recipientsChain = createChainableMock();
    setChainResult(recipientsChain, { data: [], error: null });

    mockSvcFrom.mockImplementation((table: string) => {
      if (table === "messages") return msgsChain;
      if (table === "message_recipients") return recipientsChain;
      return createChainableMock();
    });

    const res = await GET(makeRequest(), makeContext());
    expect(res.status).toBe(404);
  });

  it("returns 500 when message query fails", async () => {
    const msgsChain = createChainableMock();
    setChainResult(msgsChain, { data: null, error: { message: "DB error" } });

    mockSvcFrom.mockReturnValue(msgsChain);

    const res = await GET(makeRequest(), makeContext());
    expect(res.status).toBe(500);
  });

  it("returns 500 on unexpected error", async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error("boom"));
    const res = await GET(makeRequest(), makeContext());
    expect(res.status).toBe(500);
  });

  it("returns thread with multiple replies including read states", async () => {
    const replyUuid = "660e8400-e29b-41d4-a716-446655440001";
    const now = new Date().toISOString();
    const msgsChain = createChainableMock();
    setChainResult(msgsChain, {
      data: [
        {
          id: validUuid,
          sender_id: "other-user",
          subject: "Thread root",
          content: "Hello",
          message_type: "private",
          thread_id: null,
          parent_id: null,
          created_at: new Date(Date.now() - 60000).toISOString(),
          target_ranks: null,
          target_roles: null,
          target_clan_id: null,
        },
        {
          id: replyUuid,
          sender_id: "test-user-id",
          subject: null,
          content: "Reply",
          message_type: "private",
          thread_id: validUuid,
          parent_id: validUuid,
          created_at: now,
          target_ranks: null,
          target_roles: null,
          target_clan_id: null,
        },
      ],
      error: null,
    });

    const recipientsChain = createChainableMock();
    setChainResult(recipientsChain, {
      data: [{ id: "entry-1", message_id: validUuid, is_read: false }],
      error: null,
    });

    const recipientsFetchChain = createChainableMock();
    setChainResult(recipientsFetchChain, {
      data: [
        { message_id: validUuid, recipient_id: "test-user-id" },
        { message_id: replyUuid, recipient_id: "other-user" },
      ],
      error: null,
    });

    const updateChain = createChainableMock({ data: null, error: null });

    let recipientCallIdx = 0;
    mockSvcFrom.mockImplementation((table: string) => {
      if (table === "messages") return msgsChain;
      if (table === "message_recipients") {
        recipientCallIdx++;
        if (recipientCallIdx === 1) return recipientsChain;
        if (recipientCallIdx === 2) return updateChain;
        return recipientsFetchChain;
      }
      return createChainableMock();
    });

    const res = await GET(makeRequest(), makeContext());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.length).toBe(2);
    expect(body.meta.can_reply).toBe(true);
  });

  it("returns thread with broadcast messages and checks targeting", async () => {
    const { userMatchesBroadcastTargeting, canUserReplyToBroadcast } =
      await import("@/lib/messages/broadcast-targeting");
    vi.mocked(userMatchesBroadcastTargeting).mockResolvedValue(true);
    vi.mocked(canUserReplyToBroadcast).mockResolvedValue(true);

    const msgsChain = createChainableMock();
    setChainResult(msgsChain, {
      data: [
        {
          id: validUuid,
          sender_id: "other-user",
          subject: "Broadcast",
          content: "Hello all",
          message_type: "broadcast",
          thread_id: null,
          parent_id: null,
          created_at: new Date().toISOString(),
          target_ranks: null,
          target_roles: null,
          target_clan_id: null,
        },
      ],
      error: null,
    });

    const recipientsChain = createChainableMock();
    setChainResult(recipientsChain, { data: [], error: null });

    const readsChain = createChainableMock();
    setChainResult(readsChain, { data: [{ message_id: validUuid }], error: null });

    const _upsertChain = createChainableMock({ data: null, error: null });

    mockSvcFrom.mockImplementation((table: string) => {
      if (table === "messages") return msgsChain;
      if (table === "message_recipients") return recipientsChain;
      if (table === "message_reads") {
        return readsChain;
      }
      return createChainableMock();
    });

    const res = await GET(makeRequest(), makeContext());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.length).toBe(1);
    expect(body.meta.can_reply).toBe(true);
  });

  it("returns 404 when user is not sender, not recipient, and not broadcast target", async () => {
    const { userMatchesBroadcastTargeting } = await import("@/lib/messages/broadcast-targeting");
    vi.mocked(userMatchesBroadcastTargeting).mockResolvedValue(false);

    const msgsChain = createChainableMock();
    setChainResult(msgsChain, {
      data: [
        {
          id: validUuid,
          sender_id: "other-user",
          subject: "Secret",
          content: "Not for you",
          message_type: "broadcast",
          thread_id: null,
          parent_id: null,
          created_at: new Date().toISOString(),
          target_ranks: ["leader"],
          target_roles: null,
          target_clan_id: null,
        },
      ],
      error: null,
    });

    const recipientsChain = createChainableMock();
    setChainResult(recipientsChain, { data: [], error: null });

    mockSvcFrom.mockImplementation((table: string) => {
      if (table === "messages") return msgsChain;
      if (table === "message_recipients") return recipientsChain;
      return createChainableMock();
    });

    const res = await GET(makeRequest(), makeContext());
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/messages/thread/[threadId] – additional branches", () => {
  let mockAuth: ReturnType<typeof createMockAuth>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth = createMockAuth();
    vi.mocked(requireAuth).mockResolvedValue(mockAuth.authResult);
  });

  it("deletes thread with mixed private and broadcast messages", async () => {
    const broadcastUuid = "660e8400-e29b-41d4-a716-446655440001";
    const msgsChain = createChainableMock();
    setChainResult(msgsChain, {
      data: [
        { id: validUuid, message_type: "private" },
        { id: broadcastUuid, message_type: "broadcast" },
      ],
      error: null,
    });

    const recipientsChain = createChainableMock();
    setChainResult(recipientsChain, { data: null, error: null });
    const dismissalsChain = createChainableMock();
    setChainResult(dismissalsChain, { data: null, error: null });

    mockSvcFrom.mockImplementation((table: string) => {
      if (table === "messages") return msgsChain;
      if (table === "message_recipients") return recipientsChain;
      if (table === "message_dismissals") return dismissalsChain;
      return createChainableMock();
    });

    const res = await DELETE(makeRequest("DELETE"), makeContext());
    expect(res.status).toBe(200);
    expect(recipientsChain.update).toHaveBeenCalled();
    expect(dismissalsChain.upsert).toHaveBeenCalled();
  });

  it("returns 500 when batch delete operations fail", async () => {
    const msgsChain = createChainableMock();
    setChainResult(msgsChain, {
      data: [{ id: validUuid, message_type: "private" }],
      error: null,
    });

    const recipientsChain = createChainableMock();
    setChainResult(recipientsChain, { data: null, error: { message: "delete error" } });

    mockSvcFrom.mockImplementation((table: string) => {
      if (table === "messages") return msgsChain;
      if (table === "message_recipients") return recipientsChain;
      return createChainableMock();
    });

    const res = await DELETE(makeRequest("DELETE"), makeContext());
    expect(res.status).toBe(500);
  });

  it("deletes clan message via dismissals", async () => {
    const msgsChain = createChainableMock();
    setChainResult(msgsChain, {
      data: [{ id: validUuid, message_type: "clan" }],
      error: null,
    });

    const dismissalsChain = createChainableMock();
    setChainResult(dismissalsChain, { data: null, error: null });

    mockSvcFrom.mockImplementation((table: string) => {
      if (table === "messages") return msgsChain;
      if (table === "message_dismissals") return dismissalsChain;
      return createChainableMock();
    });

    const res = await DELETE(makeRequest("DELETE"), makeContext());
    expect(res.status).toBe(200);
    expect(dismissalsChain.upsert).toHaveBeenCalled();
  });
});
