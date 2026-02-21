import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockAuth, createForbiddenResult } from "@/test";

vi.mock("@/lib/api/require-admin");
vi.mock("@/lib/api/logger", () => ({ captureApiError: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({
  strictLimiter: { check: vi.fn().mockReturnValue(null) },
  standardLimiter: { check: vi.fn().mockReturnValue(null) },
  relaxedLimiter: { check: vi.fn().mockReturnValue(null) },
}));

const mockFrom = vi.fn();
const mockInviteUserByEmail = vi.fn();
vi.mock("@/lib/supabase/service-role-client", () => ({
  default: vi.fn(() => ({
    from: mockFrom,
    auth: { admin: { inviteUserByEmail: mockInviteUserByEmail } },
  })),
}));

import { requireAdmin } from "@/lib/api/require-admin";
import { POST } from "./route";

function makeChain(result: { data: unknown; error: unknown } = { data: null, error: null }) {
  const c: Record<string, ReturnType<typeof vi.fn>> = {};
  const methods = ["select", "insert", "update", "upsert", "delete", "eq", "ilike", "order", "in"];
  for (const m of methods) {
    c[m] = vi.fn().mockReturnValue(c);
  }
  c.single = vi.fn().mockResolvedValue(result);
  c.maybeSingle = vi.fn().mockResolvedValue(result);
  Object.defineProperty(c, "then", {
    value: (res?: ((v: unknown) => unknown) | null, rej?: ((v: unknown) => unknown) | null) =>
      Promise.resolve(result).then(res, rej),
    writable: true,
    enumerable: false,
    configurable: true,
  });
  return c;
}

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/admin/create-user", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/admin/create-user", () => {
  let mockAuth: ReturnType<typeof createMockAuth>;

  beforeEach(() => {
    mockAuth = createMockAuth();
    vi.mocked(requireAdmin).mockResolvedValue(mockAuth.authResult);
    mockFrom.mockReset();
    mockInviteUserByEmail.mockReset();
  });

  it("returns 403 when user is not admin", async () => {
    vi.mocked(requireAdmin).mockResolvedValue(createForbiddenResult() as never);
    const res = await POST(makeRequest({ email: "a@b.com", username: "ab" }));
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid input", async () => {
    const res = await POST(makeRequest({ email: "bad", username: "x" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid input.");
  });

  it("returns 400 for missing body", async () => {
    const res = await POST(makeRequest(null));
    expect(res.status).toBe(400);
  });

  it("returns 409 when username already exists", async () => {
    const existing = makeChain({ data: { id: "existing-id" }, error: null });
    const noMatch = makeChain({ data: null, error: null });
    mockFrom.mockReturnValueOnce(existing).mockReturnValueOnce(noMatch);
    const res = await POST(makeRequest({ email: "new@example.com", username: "taken" }));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe("Username already exists.");
  });

  it("returns 409 when email already exists", async () => {
    const noMatch = makeChain({ data: null, error: null });
    const existing = makeChain({ data: { id: "existing-id" }, error: null });
    mockFrom.mockReturnValueOnce(noMatch).mockReturnValueOnce(existing);
    const res = await POST(makeRequest({ email: "taken@example.com", username: "newuser" }));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe("Email already exists.");
  });

  it("creates user and returns 201", async () => {
    const noMatch = makeChain({ data: null, error: null });
    const upsertOk = makeChain({ data: null, error: null });
    mockFrom.mockReturnValueOnce(noMatch).mockReturnValueOnce(noMatch).mockReturnValueOnce(upsertOk);
    mockInviteUserByEmail.mockResolvedValue({
      data: { user: { id: "new-user-id" } },
      error: null,
    });
    const res = await POST(makeRequest({ email: "new@example.com", username: "newuser" }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.id).toBe("new-user-id");
    expect(mockInviteUserByEmail).toHaveBeenCalledWith("new@example.com");
  });

  it("returns 500 when invite fails", async () => {
    const noMatch = makeChain({ data: null, error: null });
    mockFrom.mockReturnValueOnce(noMatch).mockReturnValueOnce(noMatch);
    mockInviteUserByEmail.mockResolvedValue({ data: { user: null }, error: { message: "Invite error" } });
    const res = await POST(makeRequest({ email: "new@example.com", username: "newuser" }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to create user.");
  });

  it("returns 500 when username validation query fails", async () => {
    const errChain = makeChain({ data: null, error: { message: "DB error" } });
    const noMatch = makeChain({ data: null, error: null });
    mockFrom.mockReturnValueOnce(errChain).mockReturnValueOnce(noMatch);
    const res = await POST(makeRequest({ email: "new@example.com", username: "newuser" }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to validate username.");
  });

  it("returns 409 for duplicate profile on upsert", async () => {
    const noMatch = makeChain({ data: null, error: null });
    const upsertFail = makeChain({
      data: null,
      error: { code: "23505", message: "profiles_user_db_unique" },
    });
    mockFrom.mockReturnValueOnce(noMatch).mockReturnValueOnce(noMatch).mockReturnValueOnce(upsertFail);
    mockInviteUserByEmail.mockResolvedValue({
      data: { user: { id: "new-user-id" } },
      error: null,
    });
    const res = await POST(makeRequest({ email: "new@example.com", username: "newuser" }));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe("Username already exists.");
  });
});
