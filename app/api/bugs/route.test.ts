import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createMockAuth,
  createUnauthorizedResult,
  createChainableMock,
  setChainResult,
  createTestRequest,
  parseResponse,
} from "@/test";

vi.mock("@/lib/api/require-auth");
vi.mock("@/lib/api/logger", () => ({ captureApiError: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({
  strictLimiter: { check: vi.fn().mockReturnValue(null) },
  standardLimiter: { check: vi.fn().mockReturnValue(null) },
  relaxedLimiter: { check: vi.fn().mockReturnValue(null) },
}));
vi.mock("@/lib/email/send-email", () => ({ sendEmail: vi.fn() }));
vi.mock("@/lib/email/bug-report-email", () => ({ buildBugReportEmail: vi.fn().mockReturnValue("<html>email</html>") }));

const mockFrom = vi.fn();
vi.mock("@/lib/supabase/service-role-client", () => ({
  default: vi.fn(() => ({ from: mockFrom })),
}));

import { requireAuth } from "@/lib/api/require-auth";
import { GET, POST } from "./route";

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

describe("GET /api/bugs", () => {
  let mockAuth: ReturnType<typeof createMockAuth>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth = createMockAuth();
    vi.mocked(requireAuth).mockResolvedValue(mockAuth.authResult);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireAuth).mockResolvedValue(createUnauthorizedResult() as never);
    const req = createTestRequest("/api/bugs");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid query parameters", async () => {
    const req = createTestRequest("/api/bugs", {
      searchParams: { search: "a".repeat(201) },
    });
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("returns bug reports on success", async () => {
    const reportsChain = createChainableMock({
      data: [
        {
          id: VALID_UUID,
          title: "Test Bug",
          description: "Desc",
          status: "open",
          bug_report_categories: { name: "UI", slug: "ui" },
          profiles: { username: "user1", display_name: "User One" },
        },
      ],
      error: null,
    });
    const commentsChain = createChainableMock({ data: [{ report_id: VALID_UUID }], error: null });
    const screenshotsChain = createChainableMock({ data: [], error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === "bug_reports") return reportsChain;
      if (table === "bug_report_comments") return commentsChain;
      if (table === "bug_report_screenshots") return screenshotsChain;
      return createChainableMock();
    });

    const req = createTestRequest("/api/bugs");
    const { status, body } = await parseResponse(await GET(req));
    expect(status).toBe(200);
    const data = (body as { data: unknown[] }).data;
    expect(data).toHaveLength(1);
    expect((data[0] as Record<string, unknown>).category_name).toBe("UI");
    expect((data[0] as Record<string, unknown>).comment_count).toBe(1);
  });

  it("returns 500 when DB query fails", async () => {
    const failChain = createChainableMock({ data: null, error: { message: "DB error" } });
    mockFrom.mockReturnValue(failChain);

    const req = createTestRequest("/api/bugs");
    const res = await GET(req);
    expect(res.status).toBe(500);
  });

  it("filters by status and category", async () => {
    const reportsChain = createChainableMock({ data: [], error: null });
    const commentsChain = createChainableMock({ data: [], error: null });
    const screenshotsChain = createChainableMock({ data: [], error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === "bug_reports") return reportsChain;
      if (table === "bug_report_comments") return commentsChain;
      if (table === "bug_report_screenshots") return screenshotsChain;
      return createChainableMock();
    });

    const req = createTestRequest("/api/bugs", {
      searchParams: { status: "open", category: VALID_UUID },
    });
    const { status } = await parseResponse(await GET(req));
    expect(status).toBe(200);
    expect(reportsChain.eq).toHaveBeenCalledWith("status", "open");
    expect(reportsChain.eq).toHaveBeenCalledWith("category_id", VALID_UUID);
  });
});

describe("POST /api/bugs", () => {
  let mockAuth: ReturnType<typeof createMockAuth>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth = createMockAuth();
    vi.mocked(requireAuth).mockResolvedValue(mockAuth.authResult);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireAuth).mockResolvedValue(createUnauthorizedResult() as never);
    const req = createTestRequest("/api/bugs", {
      method: "POST",
      body: { title: "Bug", description: "Desc" },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid body", async () => {
    const req = createTestRequest("/api/bugs", {
      method: "POST",
      body: { title: "" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("creates a bug report and returns 201", async () => {
    const insertChain = createChainableMock();
    setChainResult(insertChain, {
      data: { id: VALID_UUID, title: "Bug", status: "open", created_at: "2025-01-01" },
      error: null,
    });

    const profileChain = createChainableMock();
    setChainResult(profileChain, {
      data: { display_name: "Admin", username: "admin", email: "admin@test.com" },
      error: null,
    });

    const rolesChain = createChainableMock({ data: [], error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === "bug_reports") return insertChain;
      if (table === "profiles") return profileChain;
      if (table === "user_roles") return rolesChain;
      return createChainableMock();
    });

    const req = createTestRequest("/api/bugs", {
      method: "POST",
      body: { title: "Bug", description: "Desc" },
    });
    const { status, body } = await parseResponse(await POST(req));
    expect(status).toBe(201);
    expect((body as { data: { id: string } }).data.id).toBe(VALID_UUID);
  });

  it("returns 500 when insert fails", async () => {
    const failChain = createChainableMock();
    setChainResult(failChain, { data: null, error: { message: "Insert error" } });
    mockFrom.mockReturnValue(failChain);

    const req = createTestRequest("/api/bugs", {
      method: "POST",
      body: { title: "Bug", description: "Desc" },
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it("creates a bug report with screenshots", async () => {
    const insertChain = createChainableMock();
    setChainResult(insertChain, {
      data: { id: VALID_UUID, title: "Bug", status: "open", created_at: "2025-01-01" },
      error: null,
    });

    const screenshotChain = createChainableMock({ data: null, error: null });

    const profileChain = createChainableMock();
    setChainResult(profileChain, {
      data: { display_name: "Admin", username: "admin", email: "admin@test.com" },
      error: null,
    });

    const rolesChain = createChainableMock({ data: [], error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === "bug_reports") return insertChain;
      if (table === "bug_report_screenshots") return screenshotChain;
      if (table === "profiles") return profileChain;
      if (table === "user_roles") return rolesChain;
      return createChainableMock();
    });

    const req = createTestRequest("/api/bugs", {
      method: "POST",
      body: {
        title: "Bug",
        description: "Desc",
        screenshot_paths: ["path/to/shot1.png", "path/to/shot2.png"],
      },
    });
    const { status } = await parseResponse(await POST(req));
    expect(status).toBe(201);
    expect(screenshotChain.insert).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ report_id: VALID_UUID, storage_path: "path/to/shot1.png" })]),
    );
  });

  it("sends email to opted-in admins on create", async () => {
    const { sendEmail } = await import("@/lib/email/send-email");

    const insertChain = createChainableMock();
    setChainResult(insertChain, {
      data: { id: VALID_UUID, title: "Bug", status: "open", created_at: "2025-01-01" },
      error: null,
    });

    const profileChain = createChainableMock();
    setChainResult(profileChain, {
      data: { display_name: "Reporter", username: "reporter", email: "reporter@test.com" },
      error: null,
    });

    const rolesChain = createChainableMock({ data: [{ user_id: "admin-1" }], error: null });
    const optedInChain = createChainableMock({ data: [{ user_id: "admin-1" }], error: null });
    const adminProfilesChain = createChainableMock({ data: [{ id: "admin-1", email: "admin@test.com" }], error: null });

    let profileCallIdx = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === "bug_reports") return insertChain;
      if (table === "profiles") {
        profileCallIdx++;
        if (profileCallIdx === 1) return profileChain;
        return adminProfilesChain;
      }
      if (table === "user_roles") return rolesChain;
      if (table === "user_notification_settings") return optedInChain;
      return createChainableMock();
    });

    const req = createTestRequest("/api/bugs", {
      method: "POST",
      body: { title: "Email Bug", description: "Desc", category_id: VALID_UUID },
    });
    await POST(req);
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "admin@test.com" }));
  });
});

describe("GET /api/bugs – search filter", () => {
  let mockAuth: ReturnType<typeof createMockAuth>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth = createMockAuth();
    vi.mocked(requireAuth).mockResolvedValue(mockAuth.authResult);
  });

  it("filters results by search term matching title", async () => {
    const reportsChain = createChainableMock({
      data: [
        {
          id: VALID_UUID,
          title: "Login crash",
          description: "N/A",
          status: "open",
          bug_report_categories: null,
          profiles: null,
        },
        {
          id: "660e8400-e29b-41d4-a716-446655440001",
          title: "UI glitch",
          description: "N/A",
          status: "open",
          bug_report_categories: null,
          profiles: null,
        },
      ],
      error: null,
    });
    const commentsChain = createChainableMock({ data: [], error: null });
    const screenshotsChain = createChainableMock({ data: [], error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === "bug_reports") return reportsChain;
      if (table === "bug_report_comments") return commentsChain;
      if (table === "bug_report_screenshots") return screenshotsChain;
      return createChainableMock();
    });

    const req = createTestRequest("/api/bugs", { searchParams: { search: "login" } });
    const { status, body } = await parseResponse(await GET(req));
    expect(status).toBe(200);
    const data = (body as { data: unknown[] }).data;
    expect(data).toHaveLength(1);
    expect((data[0] as Record<string, unknown>).title).toBe("Login crash");
  });

  it("returns empty array when search matches nothing", async () => {
    const reportsChain = createChainableMock({
      data: [
        {
          id: VALID_UUID,
          title: "Some Bug",
          description: "No match here",
          status: "open",
          bug_report_categories: null,
          profiles: null,
        },
      ],
      error: null,
    });
    const commentsChain = createChainableMock({ data: [], error: null });
    const screenshotsChain = createChainableMock({ data: [], error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === "bug_reports") return reportsChain;
      if (table === "bug_report_comments") return commentsChain;
      if (table === "bug_report_screenshots") return screenshotsChain;
      return createChainableMock();
    });

    const req = createTestRequest("/api/bugs", { searchParams: { search: "zzzzz" } });
    const { status, body } = await parseResponse(await GET(req));
    expect(status).toBe(200);
    expect((body as { data: unknown[] }).data).toHaveLength(0);
  });

  it("returns all items with status=all (does not filter by status)", async () => {
    const reportsChain = createChainableMock({ data: [], error: null });
    mockFrom.mockImplementation((table: string) => {
      if (table === "bug_reports") return reportsChain;
      return createChainableMock({ data: [], error: null });
    });

    const req = createTestRequest("/api/bugs", { searchParams: { status: "all" } });
    const { status } = await parseResponse(await GET(req));
    expect(status).toBe(200);
    expect(reportsChain.eq).not.toHaveBeenCalledWith("status", "all");
  });

  it("handles empty reports list (no comment/screenshot queries)", async () => {
    const reportsChain = createChainableMock({ data: [], error: null });
    const commentsChain = createChainableMock({ data: [], error: null });
    const screenshotsChain = createChainableMock({ data: [], error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === "bug_reports") return reportsChain;
      if (table === "bug_report_comments") return commentsChain;
      if (table === "bug_report_screenshots") return screenshotsChain;
      return createChainableMock();
    });

    const req = createTestRequest("/api/bugs");
    const { status, body } = await parseResponse(await GET(req));
    expect(status).toBe(200);
    expect((body as { data: unknown[] }).data).toHaveLength(0);
    expect(commentsChain.select).not.toHaveBeenCalled();
    expect(screenshotsChain.select).not.toHaveBeenCalled();
  });

  it("returns 500 on unexpected exception", async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error("boom"));
    const req = createTestRequest("/api/bugs");
    const res = await GET(req);
    expect(res.status).toBe(500);
  });
});
