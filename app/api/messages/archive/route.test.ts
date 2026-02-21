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

const mockSvcFrom = vi.fn();
vi.mock("@/lib/supabase/service-role-client", () => ({
  default: vi.fn(() => ({ from: mockSvcFrom })),
}));

import { requireAuth } from "@/lib/api/require-auth";
import { GET, POST } from "./route";

function makeGetRequest(): NextRequest {
  return new NextRequest(new URL("/api/messages/archive", "http://localhost:3000"));
}

function makePostRequest(body: unknown): NextRequest {
  return new NextRequest(new URL("/api/messages/archive", "http://localhost:3000"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/messages/archive", () => {
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

  it("returns empty archive", async () => {
    const emptyChain = createChainableMock();
    setChainResult(emptyChain, { data: [], error: null });

    mockSvcFrom.mockReturnValue(emptyChain);

    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual([]);
  });

  it("returns 500 when recipients query fails", async () => {
    const errorChain = createChainableMock();
    setChainResult(errorChain, { data: null, error: { message: "DB error" } });
    const okChain = createChainableMock();
    setChainResult(okChain, { data: [], error: null });

    let recipientsCalled = false;
    mockSvcFrom.mockImplementation((table: string) => {
      if (table === "message_recipients" && !recipientsCalled) {
        recipientsCalled = true;
        return errorChain;
      }
      if (table === "message_dismissals") return okChain;
      if (table === "messages") return okChain;
      return okChain;
    });

    const res = await GET(makeGetRequest());
    expect(res.status).toBe(500);
  });

  it("returns 500 on unexpected error", async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error("boom"));
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(500);
  });
});

describe("POST /api/messages/archive", () => {
  let mockAuth: ReturnType<typeof createMockAuth>;
  const validUuid = "550e8400-e29b-41d4-a716-446655440000";

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth = createMockAuth();
    vi.mocked(requireAuth).mockResolvedValue(mockAuth.authResult);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireAuth).mockResolvedValue(createUnauthorizedResult() as never);
    const res = await POST(makePostRequest({ type: "thread", ids: [validUuid], action: "archive" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid body", async () => {
    const res = await POST(makePostRequest({ type: "invalid", ids: [], action: "nope" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for malformed JSON", async () => {
    const req = new NextRequest(new URL("/api/messages/archive", "http://localhost:3000"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("archives sent messages successfully", async () => {
    const messagesChain = createChainableMock();
    setChainResult(messagesChain, { data: null, error: null });

    mockSvcFrom.mockImplementation((table: string) => {
      if (table === "messages") return messagesChain;
      return createChainableMock();
    });

    const res = await POST(makePostRequest({ type: "sent", ids: [validUuid], action: "archive" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.action).toBe("archive");
  });

  it("archives thread messages successfully", async () => {
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

    const res = await POST(makePostRequest({ type: "thread", ids: [validUuid], action: "archive" }));
    expect(res.status).toBe(200);
  });

  it("returns 404 when no thread messages found", async () => {
    const msgsChain = createChainableMock();
    setChainResult(msgsChain, { data: [], error: null });

    mockSvcFrom.mockImplementation(() => msgsChain);

    const res = await POST(makePostRequest({ type: "thread", ids: [validUuid], action: "archive" }));
    expect(res.status).toBe(404);
  });

  it("returns 500 when sent archive update fails", async () => {
    const messagesChain = createChainableMock();
    setChainResult(messagesChain, { data: null, error: { message: "DB error" } });

    mockSvcFrom.mockImplementation((table: string) => {
      if (table === "messages") return messagesChain;
      return createChainableMock();
    });

    const res = await POST(makePostRequest({ type: "sent", ids: [validUuid], action: "archive" }));
    expect(res.status).toBe(500);
  });

  it("returns 500 on unexpected error", async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error("boom"));
    const res = await POST(makePostRequest({ type: "sent", ids: [validUuid], action: "archive" }));
    expect(res.status).toBe(500);
  });

  it("unarchives sent messages", async () => {
    const messagesChain = createChainableMock();
    setChainResult(messagesChain, { data: null, error: null });

    mockSvcFrom.mockImplementation((table: string) => {
      if (table === "messages") return messagesChain;
      return createChainableMock();
    });

    const res = await POST(makePostRequest({ type: "sent", ids: [validUuid], action: "unarchive" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.action).toBe("unarchive");
    expect(messagesChain.update).toHaveBeenCalledWith(expect.objectContaining({ sender_archived_at: null }));
  });

  it("unarchives thread with broadcast messages", async () => {
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

    const res = await POST(makePostRequest({ type: "thread", ids: [validUuid], action: "unarchive" }));
    expect(res.status).toBe(200);
    expect(dismissalsChain.update).toHaveBeenCalledWith(expect.objectContaining({ archived_at: null }));
  });

  it("archives thread with broadcast messages via upsert", async () => {
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

    const res = await POST(makePostRequest({ type: "thread", ids: [validUuid], action: "archive" }));
    expect(res.status).toBe(200);
    expect(dismissalsChain.upsert).toHaveBeenCalled();
  });

  it("archives thread with mixed private and broadcast messages", async () => {
    const secondUuid = "660e8400-e29b-41d4-a716-446655440001";
    const msgsChain = createChainableMock();
    setChainResult(msgsChain, {
      data: [
        { id: validUuid, message_type: "private" },
        { id: secondUuid, message_type: "broadcast" },
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

    const res = await POST(makePostRequest({ type: "thread", ids: [validUuid], action: "archive" }));
    expect(res.status).toBe(200);
    expect(recipientsChain.update).toHaveBeenCalled();
    expect(dismissalsChain.upsert).toHaveBeenCalled();
  });

  it("returns 500 when thread message query fails", async () => {
    const msgsChain = createChainableMock();
    setChainResult(msgsChain, { data: null, error: { message: "DB error" } });

    mockSvcFrom.mockImplementation(() => msgsChain);

    const res = await POST(makePostRequest({ type: "thread", ids: [validUuid], action: "archive" }));
    expect(res.status).toBe(500);
  });

  it("returns 500 when batch archive ops fail", async () => {
    const msgsChain = createChainableMock();
    setChainResult(msgsChain, {
      data: [{ id: validUuid, message_type: "private" }],
      error: null,
    });

    const recipientsChain = createChainableMock();
    setChainResult(recipientsChain, { data: null, error: { message: "batch error" } });

    mockSvcFrom.mockImplementation((table: string) => {
      if (table === "messages") return msgsChain;
      if (table === "message_recipients") return recipientsChain;
      return createChainableMock();
    });

    const res = await POST(makePostRequest({ type: "thread", ids: [validUuid], action: "archive" }));
    expect(res.status).toBe(500);
  });
});

describe("GET /api/messages/archive – additional branches", () => {
  let mockAuth: ReturnType<typeof createMockAuth>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth = createMockAuth();
    vi.mocked(requireAuth).mockResolvedValue(mockAuth.authResult);
  });

  it("returns 500 when dismissals query fails", async () => {
    const recipientsChain = createChainableMock();
    setChainResult(recipientsChain, { data: [], error: null });
    const errorChain = createChainableMock();
    setChainResult(errorChain, { data: null, error: { message: "DB error" } });
    const okChain = createChainableMock();
    setChainResult(okChain, { data: [], error: null });

    mockSvcFrom.mockImplementation((table: string) => {
      if (table === "message_recipients") return recipientsChain;
      if (table === "message_dismissals") return errorChain;
      if (table === "messages") return okChain;
      return okChain;
    });

    const res = await GET(makeGetRequest());
    expect(res.status).toBe(500);
  });

  it("returns 500 when sent messages query fails", async () => {
    const okChain = createChainableMock();
    setChainResult(okChain, { data: [], error: null });
    const errorSentChain = createChainableMock();
    setChainResult(errorSentChain, { data: null, error: { message: "sent error" } });

    let msgCallIdx = 0;
    mockSvcFrom.mockImplementation((table: string) => {
      if (table === "message_recipients") return okChain;
      if (table === "message_dismissals") return okChain;
      if (table === "messages") {
        msgCallIdx++;
        return msgCallIdx === 1 ? errorSentChain : okChain;
      }
      return okChain;
    });

    const res = await GET(makeGetRequest());
    expect(res.status).toBe(500);
  });

  it("returns archived inbox items with thread grouping", async () => {
    const recipientsChain = createChainableMock();
    setChainResult(recipientsChain, {
      data: [{ message_id: "msg-1", archived_at: "2025-06-01T00:00:00Z" }],
      error: null,
    });
    const dismissalsChain = createChainableMock();
    setChainResult(dismissalsChain, { data: [], error: null });
    const sentChain = createChainableMock();
    setChainResult(sentChain, { data: [], error: null });

    const inboxMsgChain = createChainableMock();
    setChainResult(inboxMsgChain, {
      data: [
        {
          id: "msg-1",
          sender_id: "other-user",
          subject: "Archived thread",
          content: "Content",
          message_type: "private",
          thread_id: null,
          parent_id: null,
          created_at: "2025-05-01T00:00:00Z",
        },
      ],
      error: null,
    });

    let msgCallIdx = 0;
    mockSvcFrom.mockImplementation((table: string) => {
      if (table === "message_recipients") return recipientsChain;
      if (table === "message_dismissals") return dismissalsChain;
      if (table === "messages") {
        msgCallIdx++;
        return msgCallIdx === 1 ? sentChain : inboxMsgChain;
      }
      return createChainableMock();
    });

    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.length).toBe(1);
    expect(body.data[0].source).toBe("inbox");
    expect(body.data[0].subject).toBe("Archived thread");
  });
});
