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
import { GET } from "./route";

function makeRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL("/api/messages/sent", "http://localhost:3000");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url);
}

describe("GET /api/messages/sent", () => {
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

  it("returns 400 for invalid query params", async () => {
    const res = await GET(makeRequest({ type: "invalid" }));
    expect(res.status).toBe(400);
  });

  it("returns empty sent list", async () => {
    const messagesChain = createChainableMock();
    setChainResult(messagesChain, { data: [], error: null });

    mockSvcFrom.mockImplementation(() => messagesChain);

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual([]);
  });

  it("returns sent messages with recipients", async () => {
    const msgId = "550e8400-e29b-41d4-a716-446655440000";
    const messagesChain = createChainableMock();
    setChainResult(messagesChain, {
      data: [
        {
          id: msgId,
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
    setChainResult(recipientsChain, {
      data: [{ message_id: msgId, recipient_id: "recipient-1" }],
      error: null,
    });

    mockSvcFrom.mockImplementation((table: string) => {
      if (table === "messages") return messagesChain;
      if (table === "message_recipients") return recipientsChain;
      return createChainableMock();
    });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.length).toBe(1);
  });

  it("returns 500 when message query fails", async () => {
    const messagesChain = createChainableMock();
    setChainResult(messagesChain, { data: null, error: { message: "DB error" } });

    mockSvcFrom.mockImplementation(() => messagesChain);

    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
  });

  it("filters by search term", async () => {
    const messagesChain = createChainableMock();
    setChainResult(messagesChain, {
      data: [
        {
          id: "msg-1",
          sender_id: "test-user-id",
          subject: "Important update",
          content: "Details here",
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
      if (table === "messages") return messagesChain;
      if (table === "message_recipients") return recipientsChain;
      return createChainableMock();
    });

    const res = await GET(makeRequest({ search: "nonexistent-search-xyz" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual([]);
  });

  it("returns 500 on unexpected error", async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error("boom"));
    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
  });
});
