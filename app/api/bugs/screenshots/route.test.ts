import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockAuth, createUnauthorizedResult, parseResponse } from "@/test";

vi.mock("@/lib/api/require-auth");
vi.mock("@/lib/api/logger", () => ({ captureApiError: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({
  strictLimiter: { check: vi.fn().mockReturnValue(null) },
  standardLimiter: { check: vi.fn().mockReturnValue(null) },
  relaxedLimiter: { check: vi.fn().mockReturnValue(null) },
}));
vi.mock("@/lib/markdown/app-markdown-toolbar", () => ({
  generateStoragePath: vi.fn().mockReturnValue("test-user-id/123_bug_test.png"),
}));

const mockUpload = vi.fn();
const mockGetPublicUrl = vi.fn();
vi.mock("@/lib/supabase/service-role-client", () => ({
  default: vi.fn(() => ({
    storage: {
      from: vi.fn().mockReturnValue({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      }),
    },
  })),
}));

import { requireAuth } from "@/lib/api/require-auth";
import { POST } from "./route";
import { NextRequest } from "next/server";

function makeUploadRequest(file?: File): NextRequest {
  const formData = new FormData();
  if (file) formData.append("file", file);
  return new NextRequest(new URL("/api/bugs/screenshots", "http://localhost:3000"), {
    method: "POST",
    body: formData,
    headers: { "x-real-ip": "127.0.0.1" },
  });
}

describe("POST /api/bugs/screenshots", () => {
  let mockAuth: ReturnType<typeof createMockAuth>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth = createMockAuth();
    vi.mocked(requireAuth).mockResolvedValue(mockAuth.authResult);
    mockUpload.mockResolvedValue({ data: { path: "test-path" }, error: null });
    mockGetPublicUrl.mockReturnValue({ data: { publicUrl: "https://example.com/screenshot.png" } });
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireAuth).mockResolvedValue(createUnauthorizedResult() as never);
    const file = new File(["img"], "test.png", { type: "image/png" });
    const req = makeUploadRequest(file);
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when no file provided", async () => {
    const req = makeUploadRequest();
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid file type", async () => {
    const file = new File(["data"], "doc.pdf", { type: "application/pdf" });
    const req = makeUploadRequest(file);
    const res = await POST(req);
    expect(res.status).toBe(400);
    const { body } = await parseResponse(res);
    expect((body as { error: string }).error).toContain("Invalid file type");
  });

  it("returns 400 for oversized file", async () => {
    const bigContent = new Uint8Array(6 * 1024 * 1024);
    const file = new File([bigContent], "big.png", { type: "image/png" });
    const req = makeUploadRequest(file);
    const res = await POST(req);
    expect(res.status).toBe(400);
    const { body } = await parseResponse(res);
    expect((body as { error: string }).error).toContain("too large");
  });

  it("uploads screenshot and returns 201", async () => {
    const file = new File(["imgdata"], "test.png", { type: "image/png" });
    const req = makeUploadRequest(file);
    const { status, body } = await parseResponse(await POST(req));
    expect(status).toBe(201);
    const data = (body as { data: Record<string, string> }).data;
    expect(data.storage_path).toBe("test-user-id/123_bug_test.png");
    expect(data.public_url).toBe("https://example.com/screenshot.png");
    expect(data.file_name).toBe("test.png");
  });

  it("returns 500 when upload fails", async () => {
    mockUpload.mockResolvedValue({ data: null, error: { message: "Upload error" } });
    const file = new File(["imgdata"], "test.png", { type: "image/png" });
    const req = makeUploadRequest(file);
    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});
