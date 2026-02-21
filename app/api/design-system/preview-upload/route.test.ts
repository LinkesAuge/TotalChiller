import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockAuth, createForbiddenResult, createChainableMock, setChainResult, parseResponse } from "@/test";
import { NextRequest } from "next/server";

vi.mock("@/lib/api/require-admin");
vi.mock("@/lib/api/logger", () => ({ captureApiError: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({
  strictLimiter: { check: vi.fn().mockReturnValue(null) },
  standardLimiter: { check: vi.fn().mockReturnValue(null) },
  relaxedLimiter: { check: vi.fn().mockReturnValue(null) },
}));
vi.mock("fs/promises", () => ({
  writeFile: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
}));

const mockFrom = vi.fn();
vi.mock("@/lib/supabase/service-role-client", () => ({
  default: vi.fn(() => ({ from: mockFrom })),
}));

import { requireAdmin } from "@/lib/api/require-admin";
import { POST } from "./route";

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

function makeUploadRequest(fields: Record<string, string | File>): NextRequest {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }
  return new NextRequest(new URL("/api/design-system/preview-upload", "http://localhost:3000"), {
    method: "POST",
    body: formData,
    headers: { "x-real-ip": "127.0.0.1" },
  });
}

describe("POST /api/design-system/preview-upload", () => {
  let mockAuth: ReturnType<typeof createMockAuth>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth = createMockAuth();
    vi.mocked(requireAdmin).mockResolvedValue(mockAuth.authResult);
  });

  it("returns 403 when not admin", async () => {
    vi.mocked(requireAdmin).mockResolvedValue(createForbiddenResult() as never);
    const file = new File(["img"], "preview.png", { type: "image/png" });
    const req = makeUploadRequest({ file, element_id: VALID_UUID });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("returns 400 when file or element_id missing", async () => {
    const req = makeUploadRequest({ element_id: VALID_UUID });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid element_id format", async () => {
    const file = new File(["img"], "preview.png", { type: "image/png" });
    const req = makeUploadRequest({ file, element_id: "not-a-uuid" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for unsupported file type", async () => {
    const file = new File(["data"], "file.gif", { type: "image/gif" });
    const req = makeUploadRequest({ file, element_id: VALID_UUID });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const { body } = await parseResponse(res);
    expect((body as { error: string }).error).toContain("Unsupported file type");
  });

  it("returns 400 for oversized file", async () => {
    const bigContent = new Uint8Array(3 * 1024 * 1024);
    const file = new File([bigContent], "big.png", { type: "image/png" });
    const req = makeUploadRequest({ file, element_id: VALID_UUID });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const { body } = await parseResponse(res);
    expect((body as { error: string }).error).toContain("too large");
  });

  it("uploads preview and updates element on success", async () => {
    const chain = createChainableMock();
    setChainResult(chain, {
      data: { id: VALID_UUID, name: "Button", preview_image: `/design-system-previews/${VALID_UUID}.png` },
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    const file = new File(["imgdata"], "preview.png", { type: "image/png" });
    const req = makeUploadRequest({ file, element_id: VALID_UUID });
    const { status, body } = await parseResponse(await POST(req));
    expect(status).toBe(200);
    const result = body as { data: Record<string, string>; path: string };
    expect(result.path).toBe(`/design-system-previews/${VALID_UUID}.png`);
  });

  it("returns 500 when DB update fails", async () => {
    const chain = createChainableMock();
    setChainResult(chain, { data: null, error: { message: "DB error" } });
    mockFrom.mockReturnValue(chain);

    const file = new File(["imgdata"], "preview.png", { type: "image/png" });
    const req = makeUploadRequest({ file, element_id: VALID_UUID });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});
