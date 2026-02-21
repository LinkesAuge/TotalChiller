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

import { requireAuth } from "@/lib/api/require-auth";
import { PATCH, DELETE } from "./route";

const validUuid = "550e8400-e29b-41d4-a716-446655440000";

function makeRequest(method: string): NextRequest {
  return new NextRequest(new URL(`/api/messages/${validUuid}`, "http://localhost:3000"), { method });
}

function makeContext(id: string = validUuid) {
  return { params: Promise.resolve({ id }) };
}

describe("PATCH /api/messages/[id]", () => {
  let mockAuth: ReturnType<typeof createMockAuth>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth = createMockAuth();
    vi.mocked(requireAuth).mockResolvedValue(mockAuth.authResult);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireAuth).mockResolvedValue(createUnauthorizedResult() as never);
    const res = await PATCH(makeRequest("PATCH"), makeContext());
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid ID format", async () => {
    const res = await PATCH(makeRequest("PATCH"), makeContext("not-a-uuid"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Invalid message ID");
  });

  it("marks private message as read", async () => {
    const msgChain = createChainableMock();
    setChainResult(msgChain, { data: { message_type: "private" }, error: null });

    const recipientsChain = createChainableMock();
    setChainResult(recipientsChain, { data: null, error: null });

    mockSvcFrom.mockImplementation((table: string) => {
      if (table === "messages") return msgChain;
      if (table === "message_recipients") return recipientsChain;
      return createChainableMock();
    });

    const res = await PATCH(makeRequest("PATCH"), makeContext());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.is_read).toBe(true);
  });

  it("marks broadcast message as read via message_reads", async () => {
    const msgChain = createChainableMock();
    setChainResult(msgChain, { data: { message_type: "broadcast" }, error: null });

    const readsChain = createChainableMock();
    setChainResult(readsChain, { data: null, error: null });

    mockSvcFrom.mockImplementation((table: string) => {
      if (table === "messages") return msgChain;
      if (table === "message_reads") return readsChain;
      return createChainableMock();
    });

    const res = await PATCH(makeRequest("PATCH"), makeContext());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.is_read).toBe(true);
  });

  it("returns 500 when update fails", async () => {
    const msgChain = createChainableMock();
    setChainResult(msgChain, { data: { message_type: "private" }, error: null });

    const recipientsChain = createChainableMock();
    setChainResult(recipientsChain, { data: null, error: { message: "DB error" } });

    mockSvcFrom.mockImplementation((table: string) => {
      if (table === "messages") return msgChain;
      if (table === "message_recipients") return recipientsChain;
      return createChainableMock();
    });

    const res = await PATCH(makeRequest("PATCH"), makeContext());
    expect(res.status).toBe(500);
  });

  it("returns 500 on unexpected error", async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error("boom"));
    const res = await PATCH(makeRequest("PATCH"), makeContext());
    expect(res.status).toBe(500);
  });
});

describe("DELETE /api/messages/[id]", () => {
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

  it("returns 400 for invalid ID format", async () => {
    const res = await DELETE(makeRequest("DELETE"), makeContext("bad-id"));
    expect(res.status).toBe(400);
  });

  it("soft-deletes a private message", async () => {
    const msgChain = createChainableMock();
    setChainResult(msgChain, { data: { message_type: "private" }, error: null });

    const recipientsChain = createChainableMock();
    setChainResult(recipientsChain, { data: [{ id: "entry-1" }], error: null });

    mockSvcFrom.mockImplementation((table: string) => {
      if (table === "messages") return msgChain;
      if (table === "message_recipients") return recipientsChain;
      return createChainableMock();
    });

    const res = await DELETE(makeRequest("DELETE"), makeContext());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.deleted).toBe(true);
  });

  it("soft-deletes a broadcast message via dismissals", async () => {
    const msgChain = createChainableMock();
    setChainResult(msgChain, { data: { message_type: "broadcast" }, error: null });

    const dismissalsChain = createChainableMock();
    setChainResult(dismissalsChain, { data: null, error: null });

    mockSvcFrom.mockImplementation((table: string) => {
      if (table === "messages") return msgChain;
      if (table === "message_dismissals") return dismissalsChain;
      return createChainableMock();
    });

    const res = await DELETE(makeRequest("DELETE"), makeContext());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.deleted).toBe(true);
  });

  it("returns 404 when private message not found", async () => {
    const msgChain = createChainableMock();
    setChainResult(msgChain, { data: { message_type: "private" }, error: null });

    const recipientsChain = createChainableMock();
    setChainResult(recipientsChain, { data: [], error: null });

    mockSvcFrom.mockImplementation((table: string) => {
      if (table === "messages") return msgChain;
      if (table === "message_recipients") return recipientsChain;
      return createChainableMock();
    });

    const res = await DELETE(makeRequest("DELETE"), makeContext());
    expect(res.status).toBe(404);
  });

  it("returns 500 when delete fails", async () => {
    const msgChain = createChainableMock();
    setChainResult(msgChain, { data: { message_type: "private" }, error: null });

    const recipientsChain = createChainableMock();
    setChainResult(recipientsChain, { data: null, error: { message: "DB error" } });

    mockSvcFrom.mockImplementation((table: string) => {
      if (table === "messages") return msgChain;
      if (table === "message_recipients") return recipientsChain;
      return createChainableMock();
    });

    const res = await DELETE(makeRequest("DELETE"), makeContext());
    expect(res.status).toBe(500);
  });

  it("returns 500 on unexpected error", async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error("boom"));
    const res = await DELETE(makeRequest("DELETE"), makeContext());
    expect(res.status).toBe(500);
  });
});
