import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockAuth, createUnauthorizedResult, createChainableMock, setChainResult } from "@/test";

vi.mock("@/lib/api/require-auth");
vi.mock("@/lib/api/logger", () => ({ captureApiError: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({
  strictLimiter: { check: vi.fn().mockReturnValue(null) },
  standardLimiter: { check: vi.fn().mockReturnValue(null) },
  relaxedLimiter: { check: vi.fn().mockReturnValue(null) },
}));

import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api/require-auth";
import { GET } from "./route";

function makeRequest(): NextRequest {
  return new NextRequest(new URL("/api/notifications", "http://localhost:3000"));
}

describe("GET /api/notifications", () => {
  let mockAuth: ReturnType<typeof createMockAuth>;

  beforeEach(() => {
    mockAuth = createMockAuth();
    vi.mocked(requireAuth).mockResolvedValue(mockAuth.authResult);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireAuth).mockResolvedValue(createUnauthorizedResult() as never);
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it("returns empty data when all notification types are disabled", async () => {
    const settingsChain = createChainableMock();
    setChainResult(settingsChain, {
      data: {
        messages_enabled: false,
        news_enabled: false,
        events_enabled: false,
        system_enabled: false,
      },
      error: null,
    });
    mockAuth.mockFrom.mockReturnValue(settingsChain);

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ data: [], unread_count: 0 });
  });

  it("returns notifications filtered by user preferences", async () => {
    const settingsChain = createChainableMock();
    setChainResult(settingsChain, {
      data: {
        messages_enabled: true,
        news_enabled: true,
        events_enabled: false,
        system_enabled: false,
      },
      error: null,
    });

    const notifications = [
      {
        id: "n1",
        type: "message",
        title: "Msg",
        body: null,
        reference_id: null,
        is_read: false,
        created_at: "2025-01-01",
      },
      {
        id: "n2",
        type: "news",
        title: "News",
        body: null,
        reference_id: null,
        is_read: true,
        created_at: "2025-01-02",
      },
    ];
    const notificationsChain = createChainableMock();
    setChainResult(notificationsChain, { data: notifications, error: null });

    let callCount = 0;
    mockAuth.mockFrom.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? settingsChain : notificationsChain;
    });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(2);
    expect(body.unread_count).toBe(1);
  });

  it("returns default preferences when no settings row exists", async () => {
    const settingsChain = createChainableMock();
    setChainResult(settingsChain, { data: null, error: null });

    const notifications = [
      {
        id: "n1",
        type: "message",
        title: "Msg",
        body: null,
        reference_id: null,
        is_read: false,
        created_at: "2025-01-01",
      },
    ];
    const notificationsChain = createChainableMock();
    setChainResult(notificationsChain, { data: notifications, error: null });

    let callCount = 0;
    mockAuth.mockFrom.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? settingsChain : notificationsChain;
    });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
  });

  it("returns 500 when notification fetch fails", async () => {
    const settingsChain = createChainableMock();
    setChainResult(settingsChain, { data: null, error: null });

    const notificationsChain = createChainableMock();
    setChainResult(notificationsChain, { data: null, error: { message: "DB error" } });

    let callCount = 0;
    mockAuth.mockFrom.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? settingsChain : notificationsChain;
    });

    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain("Failed to load");
  });

  it("returns 500 on unexpected exception", async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error("boom"));
    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Internal server error.");
  });
});
