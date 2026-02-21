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
import { GET, PATCH } from "./route";

function makeGetRequest(): NextRequest {
  return new NextRequest(new URL("/api/notification-settings", "http://localhost:3000"));
}

function makePatchRequest(body: unknown): NextRequest {
  return new NextRequest(new URL("/api/notification-settings", "http://localhost:3000"), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/notification-settings", () => {
  let mockAuth: ReturnType<typeof createMockAuth>;

  beforeEach(() => {
    mockAuth = createMockAuth();
    vi.mocked(requireAuth).mockResolvedValue(mockAuth.authResult);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireAuth).mockResolvedValue(createUnauthorizedResult() as never);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(401);
  });

  it("returns existing settings", async () => {
    const settings = {
      messages_enabled: true,
      news_enabled: false,
      events_enabled: true,
      system_enabled: false,
      bugs_email_enabled: false,
    };
    const chain = createChainableMock();
    setChainResult(chain, { data: settings, error: null });
    mockAuth.mockFrom.mockReturnValue(chain);

    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual(settings);
  });

  it("creates default settings when none exist", async () => {
    const selectChain = createChainableMock();
    setChainResult(selectChain, { data: null, error: null });

    const defaults = {
      messages_enabled: true,
      news_enabled: true,
      events_enabled: true,
      system_enabled: true,
      bugs_email_enabled: false,
    };
    const upsertChain = createChainableMock();
    setChainResult(upsertChain, { data: defaults, error: null });

    let callCount = 0;
    mockAuth.mockFrom.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? selectChain : upsertChain;
    });

    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual(defaults);
  });

  it("returns 500 when upsert of defaults fails", async () => {
    const selectChain = createChainableMock();
    setChainResult(selectChain, { data: null, error: null });

    const upsertChain = createChainableMock();
    setChainResult(upsertChain, { data: null, error: { message: "DB error" } });

    let callCount = 0;
    mockAuth.mockFrom.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? selectChain : upsertChain;
    });

    const res = await GET(makeGetRequest());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain("Failed to load");
  });

  it("returns 500 on unexpected exception", async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error("boom"));
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(500);
  });
});

describe("PATCH /api/notification-settings", () => {
  let mockAuth: ReturnType<typeof createMockAuth>;

  beforeEach(() => {
    mockAuth = createMockAuth();
    vi.mocked(requireAuth).mockResolvedValue(mockAuth.authResult);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireAuth).mockResolvedValue(createUnauthorizedResult() as never);
    const res = await PATCH(makePatchRequest({ messages_enabled: true }));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid request body", async () => {
    const req = new NextRequest(new URL("/api/notification-settings", "http://localhost:3000"), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for empty body (no settings provided)", async () => {
    const res = await PATCH(makePatchRequest({}));
    expect(res.status).toBe(400);
  });

  it("returns 400 for extra unknown fields (strict schema)", async () => {
    const res = await PATCH(makePatchRequest({ unknown_field: true }));
    expect(res.status).toBe(400);
  });

  it("updates settings successfully", async () => {
    const updated = {
      messages_enabled: false,
      news_enabled: true,
      events_enabled: true,
      system_enabled: true,
      bugs_email_enabled: false,
    };
    const chain = createChainableMock();
    setChainResult(chain, { data: updated, error: null });
    mockAuth.mockFrom.mockReturnValue(chain);

    const res = await PATCH(makePatchRequest({ messages_enabled: false }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual(updated);
  });

  it("includes bugs_email_enabled when user is admin", async () => {
    mockAuth.mockRpc.mockResolvedValue({ data: true, error: null });

    const updated = {
      messages_enabled: true,
      news_enabled: true,
      events_enabled: true,
      system_enabled: true,
      bugs_email_enabled: true,
    };
    const chain = createChainableMock();
    setChainResult(chain, { data: updated, error: null });
    mockAuth.mockFrom.mockReturnValue(chain);

    const res = await PATCH(makePatchRequest({ bugs_email_enabled: true }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.bugs_email_enabled).toBe(true);
  });

  it("returns 500 when upsert fails", async () => {
    const chain = createChainableMock();
    setChainResult(chain, { data: null, error: { message: "DB error" } });
    mockAuth.mockFrom.mockReturnValue(chain);

    const res = await PATCH(makePatchRequest({ messages_enabled: true }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain("Failed to update");
  });

  it("returns 500 on unexpected exception", async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error("boom"));
    const res = await PATCH(makePatchRequest({ messages_enabled: true }));
    expect(res.status).toBe(500);
  });
});
