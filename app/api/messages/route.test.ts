import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockAuth, createUnauthorizedResult, createChainableMock, setChainResult } from "@/test";
import { NextRequest } from "next/server";

vi.mock("next/server", async (importOriginal) => {
  const mod = await importOriginal<typeof import("next/server")>();
  return { ...mod, after: vi.fn((fn: () => void) => fn()) };
});

vi.mock("@/lib/api/require-auth");
vi.mock("@/lib/api/logger", () => ({ captureApiError: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({
  strictLimiter: { check: vi.fn().mockReturnValue(null) },
  standardLimiter: { check: vi.fn().mockReturnValue(null) },
  relaxedLimiter: { check: vi.fn().mockReturnValue(null) },
}));

vi.mock("@/lib/messages/profile-utils", () => ({
  loadMessageProfilesByIds: vi.fn().mockResolvedValue({}),
  resolveMessageProfileLabel: vi.fn().mockReturnValue("TestUser"),
}));

vi.mock("@/lib/messages/broadcast-targeting", () => ({
  resolveBroadcastRecipients: vi.fn().mockResolvedValue([]),
  userMatchesBroadcastTargetingSync: vi.fn().mockReturnValue(true),
  loadUserBroadcastContext: vi.fn().mockResolvedValue({}),
  canUserReplyToBroadcast: vi.fn().mockResolvedValue(true),
}));

const mockSvcFrom = vi.fn();
vi.mock("@/lib/supabase/service-role-client", () => ({
  default: vi.fn(() => ({ from: mockSvcFrom })),
}));

vi.mock("@/lib/supabase/role-access", () => ({
  default: vi.fn().mockResolvedValue(false),
}));

import { requireAuth } from "@/lib/api/require-auth";
import getIsContentManager from "@/lib/supabase/role-access";
import { GET, POST } from "./route";

function makeGetRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL("/api/messages", "http://localhost:3000");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url);
}

function makePostRequest(body: unknown): NextRequest {
  return new NextRequest(new URL("/api/messages", "http://localhost:3000"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/messages", () => {
  let mockAuth: ReturnType<typeof createMockAuth>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth = createMockAuth();
    vi.mocked(requireAuth).mockResolvedValue(mockAuth.authResult);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireAuth).mockResolvedValue(createUnauthorizedResult() as never);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid query params", async () => {
    const res = await GET(makeGetRequest({ type: "invalid-type" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Invalid query");
  });

  it("returns empty data when no messages", async () => {
    const recipientsChain = createChainableMock();
    setChainResult(recipientsChain, { data: [], error: null });
    const broadcastChain = createChainableMock();
    setChainResult(broadcastChain, { data: [], error: null });

    mockSvcFrom.mockImplementation((table: string) => {
      if (table === "message_recipients") return recipientsChain;
      if (table === "messages") return broadcastChain;
      return createChainableMock();
    });

    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual([]);
  });

  it("returns 500 on recipient query error", async () => {
    const recipientsChain = createChainableMock();
    setChainResult(recipientsChain, { data: null, error: { message: "DB error" } });

    mockSvcFrom.mockImplementation((table: string) => {
      if (table === "message_recipients") return recipientsChain;
      return createChainableMock();
    });

    const res = await GET(makeGetRequest({ type: "private" }));
    expect(res.status).toBe(500);
  });

  it("returns 500 on unexpected error", async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error("unexpected"));
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(500);
  });
});

describe("POST /api/messages", () => {
  let mockAuth: ReturnType<typeof createMockAuth>;
  const validUuid = "550e8400-e29b-41d4-a716-446655440000";
  const recipientUuid = "660e8400-e29b-41d4-a716-446655440001";

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth = createMockAuth();
    vi.mocked(requireAuth).mockResolvedValue(mockAuth.authResult);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireAuth).mockResolvedValue(createUnauthorizedResult() as never);
    const res = await POST(makePostRequest({ recipient_ids: [recipientUuid], content: "hi" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new NextRequest(new URL("/api/messages", "http://localhost:3000"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid input", async () => {
    const res = await POST(makePostRequest({ recipient_ids: [], content: "" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Invalid input");
  });

  it("returns 400 when no recipients after filtering self", async () => {
    const res = await POST(makePostRequest({ recipient_ids: ["test-user-id"], content: "hi" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for clan broadcast without clan_id", async () => {
    vi.mocked(getIsContentManager).mockResolvedValue(true);
    const res = await POST(
      makePostRequest({
        recipient_ids: [recipientUuid],
        content: "hi",
        message_type: "clan",
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("clan_id");
  });

  it("returns 403 for broadcast by non-content-manager", async () => {
    vi.mocked(getIsContentManager).mockResolvedValue(false);
    const res = await POST(
      makePostRequest({
        recipient_ids: [recipientUuid],
        content: "hi",
        message_type: "broadcast",
      }),
    );
    expect(res.status).toBe(403);
  });

  it("returns 404 when recipient not found", async () => {
    const profilesChain = createChainableMock();
    setChainResult(profilesChain, { data: [], error: null });

    mockSvcFrom.mockImplementation((table: string) => {
      if (table === "profiles") return profilesChain;
      return createChainableMock();
    });

    const res = await POST(
      makePostRequest({
        recipient_ids: [recipientUuid],
        content: "hello",
      }),
    );
    expect(res.status).toBe(404);
  });

  it("creates message and returns 201 on success", async () => {
    const insertedMsg = {
      id: validUuid,
      sender_id: "test-user-id",
      subject: null,
      content: "hello",
      message_type: "private",
      thread_id: null,
      parent_id: null,
      created_at: new Date().toISOString(),
      target_ranks: null,
      target_roles: null,
      target_clan_id: null,
    };

    const profilesChain = createChainableMock();
    setChainResult(profilesChain, { data: [{ id: recipientUuid }], error: null });

    const messagesChain = createChainableMock();
    setChainResult(messagesChain, { data: insertedMsg, error: null });

    const recipientsChain = createChainableMock();
    setChainResult(recipientsChain, { data: null, error: null });

    const senderProfileChain = createChainableMock();
    setChainResult(senderProfileChain, { data: { display_name: "Sender", username: "sender" }, error: null });

    let profileCallIdx = 0;
    mockSvcFrom.mockImplementation((table: string) => {
      if (table === "profiles") {
        profileCallIdx++;
        return profileCallIdx === 1 ? profilesChain : senderProfileChain;
      }
      if (table === "messages") return messagesChain;
      if (table === "message_recipients") return recipientsChain;
      return createChainableMock();
    });

    const res = await POST(
      makePostRequest({
        recipient_ids: [recipientUuid],
        content: "hello",
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.id).toBe(validUuid);
    expect(body.recipient_count).toBe(1);
  });

  it("returns 500 when message insert fails", async () => {
    const profilesChain = createChainableMock();
    setChainResult(profilesChain, { data: [{ id: recipientUuid }], error: null });

    const messagesChain = createChainableMock();
    setChainResult(messagesChain, { data: null, error: { message: "insert error" } });

    mockSvcFrom.mockImplementation((table: string) => {
      if (table === "profiles") return profilesChain;
      if (table === "messages") return messagesChain;
      return createChainableMock();
    });

    const res = await POST(
      makePostRequest({
        recipient_ids: [recipientUuid],
        content: "hello",
      }),
    );
    expect(res.status).toBe(500);
  });

  it("returns 500 on unexpected error", async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error("boom"));
    const res = await POST(makePostRequest({ recipient_ids: [recipientUuid], content: "hi" }));
    expect(res.status).toBe(500);
  });

  it("returns 403 for clan broadcast by non-leader non-CM", async () => {
    const { canUserReplyToBroadcast } = await import("@/lib/messages/broadcast-targeting");
    vi.mocked(getIsContentManager).mockResolvedValue(false);
    vi.mocked(canUserReplyToBroadcast).mockResolvedValue(false);

    const clanId = "770e8400-e29b-41d4-a716-446655440002";
    const res = await POST(
      makePostRequest({
        recipient_ids: [recipientUuid],
        content: "clan msg",
        message_type: "clan",
        clan_id: clanId,
      }),
    );
    expect(res.status).toBe(403);
  });

  it("creates broadcast message when user is content manager", async () => {
    const { resolveBroadcastRecipients } = await import("@/lib/messages/broadcast-targeting");
    vi.mocked(getIsContentManager).mockResolvedValue(true);
    vi.mocked(resolveBroadcastRecipients).mockResolvedValue([recipientUuid]);

    const insertedMsg = {
      id: validUuid,
      sender_id: "test-user-id",
      subject: "Broadcast",
      content: "hello all",
      message_type: "broadcast",
      thread_id: null,
      parent_id: null,
      created_at: new Date().toISOString(),
      target_ranks: null,
      target_roles: null,
      target_clan_id: null,
    };

    const messagesChain = createChainableMock();
    setChainResult(messagesChain, { data: insertedMsg, error: null });

    const senderProfileChain = createChainableMock();
    setChainResult(senderProfileChain, { data: { display_name: "Sender", username: "sender" }, error: null });

    const notificationsChain = createChainableMock({ data: null, error: null });

    mockSvcFrom.mockImplementation((table: string) => {
      if (table === "messages") return messagesChain;
      if (table === "profiles") return senderProfileChain;
      if (table === "notifications") return notificationsChain;
      return createChainableMock();
    });

    const res = await POST(
      makePostRequest({
        recipient_ids: [recipientUuid],
        content: "hello all",
        subject: "Broadcast",
        message_type: "broadcast",
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.message_type).toBe("broadcast");
  });

  it("creates clan message with targeting", async () => {
    const { resolveBroadcastRecipients } = await import("@/lib/messages/broadcast-targeting");
    vi.mocked(getIsContentManager).mockResolvedValue(true);
    vi.mocked(resolveBroadcastRecipients).mockResolvedValue([recipientUuid]);

    const clanId = "770e8400-e29b-41d4-a716-446655440002";
    const insertedMsg = {
      id: validUuid,
      sender_id: "test-user-id",
      subject: null,
      content: "clan hi",
      message_type: "clan",
      thread_id: null,
      parent_id: null,
      created_at: new Date().toISOString(),
      target_ranks: ["leader"],
      target_roles: null,
      target_clan_id: clanId,
    };

    const messagesChain = createChainableMock();
    setChainResult(messagesChain, { data: insertedMsg, error: null });

    const senderProfileChain = createChainableMock();
    setChainResult(senderProfileChain, { data: { display_name: "Sender", username: "sender" }, error: null });

    mockSvcFrom.mockImplementation((table: string) => {
      if (table === "messages") return messagesChain;
      if (table === "profiles") return senderProfileChain;
      return createChainableMock();
    });

    const res = await POST(
      makePostRequest({
        recipient_ids: [recipientUuid],
        content: "clan hi",
        message_type: "clan",
        clan_id: clanId,
        target_ranks: ["leader"],
      }),
    );
    expect(res.status).toBe(201);
  });

  it("resolves parent thread when parent_id is provided", async () => {
    const parentId = "880e8400-e29b-41d4-a716-446655440003";
    const threadId = "990e8400-e29b-41d4-a716-446655440004";

    const profilesChain = createChainableMock();
    setChainResult(profilesChain, { data: [{ id: recipientUuid }], error: null });

    const parentMsgChain = createChainableMock();
    setChainResult(parentMsgChain, { data: { id: parentId, thread_id: threadId }, error: null });

    const insertedMsg = {
      id: validUuid,
      sender_id: "test-user-id",
      subject: null,
      content: "reply",
      message_type: "private",
      thread_id: threadId,
      parent_id: parentId,
      created_at: new Date().toISOString(),
      target_ranks: null,
      target_roles: null,
      target_clan_id: null,
    };
    const messagesInsertChain = createChainableMock();
    setChainResult(messagesInsertChain, { data: insertedMsg, error: null });

    const recipientsChain = createChainableMock({ data: null, error: null });
    const senderProfileChain = createChainableMock();
    setChainResult(senderProfileChain, { data: { display_name: "Sender", username: "sender" }, error: null });

    let profileCallIdx = 0;
    let msgCallIdx = 0;
    mockSvcFrom.mockImplementation((table: string) => {
      if (table === "profiles") {
        profileCallIdx++;
        return profileCallIdx === 1 ? profilesChain : senderProfileChain;
      }
      if (table === "messages") {
        msgCallIdx++;
        return msgCallIdx === 1 ? parentMsgChain : messagesInsertChain;
      }
      if (table === "message_recipients") return recipientsChain;
      return createChainableMock();
    });

    const res = await POST(
      makePostRequest({
        recipient_ids: [recipientUuid],
        content: "reply",
        parent_id: parentId,
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.thread_id).toBe(threadId);
  });

  it("returns 500 when recipient insert fails", async () => {
    const profilesChain = createChainableMock();
    setChainResult(profilesChain, { data: [{ id: recipientUuid }], error: null });

    const insertedMsg = {
      id: validUuid,
      sender_id: "test-user-id",
      subject: null,
      content: "hello",
      message_type: "private",
      thread_id: null,
      parent_id: null,
      created_at: new Date().toISOString(),
      target_ranks: null,
      target_roles: null,
      target_clan_id: null,
    };
    const messagesChain = createChainableMock();
    setChainResult(messagesChain, { data: insertedMsg, error: null });

    const recipientsChain = createChainableMock({ data: null, error: { message: "insert error" } });

    let profileCallIdx = 0;
    mockSvcFrom.mockImplementation((table: string) => {
      if (table === "profiles") {
        profileCallIdx++;
        return profileCallIdx === 1 ? profilesChain : createChainableMock();
      }
      if (table === "messages") return messagesChain;
      if (table === "message_recipients") return recipientsChain;
      return createChainableMock();
    });

    const res = await POST(makePostRequest({ recipient_ids: [recipientUuid], content: "hello" }));
    expect(res.status).toBe(500);
  });

  it("returns 500 when broadcast recipient resolution fails", async () => {
    const { resolveBroadcastRecipients } = await import("@/lib/messages/broadcast-targeting");
    vi.mocked(getIsContentManager).mockResolvedValue(true);
    vi.mocked(resolveBroadcastRecipients).mockRejectedValue(new Error("resolution failed"));

    const insertedMsg = {
      id: validUuid,
      sender_id: "test-user-id",
      subject: null,
      content: "broadcast",
      message_type: "broadcast",
      thread_id: null,
      parent_id: null,
      created_at: new Date().toISOString(),
      target_ranks: null,
      target_roles: null,
      target_clan_id: null,
    };
    const messagesChain = createChainableMock();
    setChainResult(messagesChain, { data: insertedMsg, error: null });

    mockSvcFrom.mockImplementation((table: string) => {
      if (table === "messages") return messagesChain;
      return createChainableMock();
    });

    const res = await POST(
      makePostRequest({
        recipient_ids: [recipientUuid],
        content: "broadcast",
        message_type: "broadcast",
      }),
    );
    expect(res.status).toBe(500);
  });
});

describe("GET /api/messages – filters", () => {
  let mockAuth: ReturnType<typeof createMockAuth>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth = createMockAuth();
    vi.mocked(requireAuth).mockResolvedValue(mockAuth.authResult);
  });

  it("returns inbox with private messages and thread grouping", async () => {
    const threadId = "770e8400-e29b-41d4-a716-446655440002";
    const recipientsChain = createChainableMock();
    setChainResult(recipientsChain, {
      data: [
        { message_id: "msg-1", is_read: false },
        { message_id: "msg-2", is_read: true },
      ],
      error: null,
    });

    const privateMsgsChain = createChainableMock();
    setChainResult(privateMsgsChain, {
      data: [
        {
          id: "msg-1",
          sender_id: "other-user",
          subject: "Hello",
          content: "Hi there",
          message_type: "private",
          thread_id: threadId,
          parent_id: null,
          created_at: new Date().toISOString(),
        },
        {
          id: "msg-2",
          sender_id: "other-user",
          subject: null,
          content: "Reply",
          message_type: "private",
          thread_id: threadId,
          parent_id: "msg-1",
          created_at: new Date(Date.now() - 60000).toISOString(),
        },
      ],
      error: null,
    });

    const broadcastChain = createChainableMock();
    setChainResult(broadcastChain, { data: [], error: null });

    let msgCallIdx = 0;
    mockSvcFrom.mockImplementation((table: string) => {
      if (table === "message_recipients") return recipientsChain;
      if (table === "messages") {
        msgCallIdx++;
        return msgCallIdx === 1 ? privateMsgsChain : broadcastChain;
      }
      return createChainableMock();
    });

    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.length).toBe(1);
    expect(body.data[0].thread_id).toBe(threadId);
    expect(body.data[0].message_count).toBe(2);
    expect(body.data[0].unread_count).toBe(1);
  });

  it("filters by type=private (skips broadcast queries)", async () => {
    const recipientsChain = createChainableMock();
    setChainResult(recipientsChain, { data: [], error: null });

    mockSvcFrom.mockImplementation((table: string) => {
      if (table === "message_recipients") return recipientsChain;
      return createChainableMock();
    });

    const res = await GET(makeGetRequest({ type: "private" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual([]);
  });

  it("filters by type=broadcast", async () => {
    const broadcastChain = createChainableMock();
    setChainResult(broadcastChain, { data: [], error: null });

    mockSvcFrom.mockImplementation((table: string) => {
      if (table === "messages") return broadcastChain;
      return createChainableMock();
    });

    const res = await GET(makeGetRequest({ type: "broadcast" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual([]);
  });

  it("applies search filter to messages", async () => {
    const recipientsChain = createChainableMock();
    setChainResult(recipientsChain, {
      data: [{ message_id: "msg-1", is_read: true }],
      error: null,
    });

    const privateMsgsChain = createChainableMock();
    setChainResult(privateMsgsChain, {
      data: [
        {
          id: "msg-1",
          sender_id: "other-user",
          subject: "Important meeting",
          content: "Details here",
          message_type: "private",
          thread_id: null,
          parent_id: null,
          created_at: new Date().toISOString(),
        },
      ],
      error: null,
    });

    const broadcastChain = createChainableMock();
    setChainResult(broadcastChain, { data: [], error: null });

    let msgCallIdx = 0;
    mockSvcFrom.mockImplementation((table: string) => {
      if (table === "message_recipients") return recipientsChain;
      if (table === "messages") {
        msgCallIdx++;
        return msgCallIdx === 1 ? privateMsgsChain : broadcastChain;
      }
      return createChainableMock();
    });

    const res = await GET(makeGetRequest({ search: "important" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.length).toBe(1);
  });

  it("returns 500 on private messages query error", async () => {
    const recipientsChain = createChainableMock();
    setChainResult(recipientsChain, {
      data: [{ message_id: "msg-1", is_read: true }],
      error: null,
    });

    const privateMsgsChain = createChainableMock();
    setChainResult(privateMsgsChain, { data: null, error: { message: "query error" } });

    mockSvcFrom.mockImplementation((table: string) => {
      if (table === "message_recipients") return recipientsChain;
      if (table === "messages") return privateMsgsChain;
      return createChainableMock();
    });

    const res = await GET(makeGetRequest({ type: "private" }));
    expect(res.status).toBe(500);
  });

  it("returns 500 on broadcast query error", async () => {
    const broadcastChain = createChainableMock();
    setChainResult(broadcastChain, { data: null, error: { message: "broadcast error" } });

    mockSvcFrom.mockImplementation((table: string) => {
      if (table === "messages") return broadcastChain;
      return createChainableMock();
    });

    const res = await GET(makeGetRequest({ type: "broadcast" }));
    expect(res.status).toBe(500);
  });
});
