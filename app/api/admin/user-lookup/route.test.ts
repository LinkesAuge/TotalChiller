import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockAuth, createUnauthorizedResult, createChainableMock } from "@/test";

vi.mock("@/lib/api/require-auth");
vi.mock("@/lib/api/logger", () => ({ captureApiError: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({
  strictLimiter: { check: vi.fn().mockReturnValue(null) },
  standardLimiter: { check: vi.fn().mockReturnValue(null) },
  relaxedLimiter: { check: vi.fn().mockReturnValue(null) },
}));

import { requireAuth } from "@/lib/api/require-auth";
import { POST } from "./route";

const VALID_CLAN_ID = "550e8400-e29b-41d4-a716-446655440000";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/admin/user-lookup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/admin/user-lookup", () => {
  let mockAuth: ReturnType<typeof createMockAuth>;

  beforeEach(() => {
    mockAuth = createMockAuth();
    vi.mocked(requireAuth).mockResolvedValue(mockAuth.authResult);
    mockAuth.mockRpc.mockResolvedValue({ data: true, error: null });
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireAuth).mockResolvedValue(createUnauthorizedResult() as never);
    const res = await POST(makeRequest({ identifier: "user@test.com", clanId: VALID_CLAN_ID }));
    expect(res.status).toBe(401);
  });

  it("returns 400 for missing lookup fields", async () => {
    const res = await POST(makeRequest({ clanId: VALID_CLAN_ID }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid input.");
  });

  it("returns 400 for missing clanId", async () => {
    const res = await POST(makeRequest({ identifier: "someone" }));
    expect(res.status).toBe(400);
  });

  it("returns 403 when user is not clan admin", async () => {
    mockAuth.mockRpc.mockResolvedValue({ data: false, error: null });
    const chain = createChainableMock();
    mockAuth.mockFrom.mockReturnValue(chain);
    const res = await POST(makeRequest({ identifier: "user@test.com", clanId: VALID_CLAN_ID }));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Forbidden.");
  });

  it("returns 403 when rpc errors", async () => {
    mockAuth.mockRpc.mockResolvedValue({ data: null, error: { message: "rpc fail" } });
    const res = await POST(makeRequest({ identifier: "user@test.com", clanId: VALID_CLAN_ID }));
    expect(res.status).toBe(403);
  });

  it("returns profile id on email lookup", async () => {
    const chain = createChainableMock({ data: { id: "profile-123" }, error: null });
    mockAuth.mockFrom.mockReturnValue(chain);
    const res = await POST(makeRequest({ email: "user@test.com", clanId: VALID_CLAN_ID }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe("profile-123");
  });

  it("returns profile id on username lookup", async () => {
    const chain = createChainableMock({ data: { id: "profile-456" }, error: null });
    mockAuth.mockFrom.mockReturnValue(chain);
    const res = await POST(makeRequest({ username: "testuser", clanId: VALID_CLAN_ID }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe("profile-456");
  });

  it("returns 404 when user not found", async () => {
    const chain = createChainableMock({ data: null, error: null });
    mockAuth.mockFrom.mockReturnValue(chain);
    const res = await POST(makeRequest({ username: "nobody", clanId: VALID_CLAN_ID }));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("User not found.");
  });

  it("returns 500 when profile lookup fails", async () => {
    const chain = createChainableMock({ data: null, error: { message: "DB error" } });
    mockAuth.mockFrom.mockReturnValue(chain);
    const res = await POST(makeRequest({ identifier: "someone@test.com", clanId: VALID_CLAN_ID }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to look up user.");
  });
});
