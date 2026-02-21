// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

const mockPushToast = vi.fn();
const mockPush = vi.fn();
const stableSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => stableSearchParams,
  usePathname: () => "/bugs",
}));

vi.mock("@/app/components/toast-provider", () => ({
  useToast: vi.fn(() => ({ pushToast: mockPushToast })),
}));

import { useBugs } from "./use-bugs";
import type { BugReportListItem, BugReportCategory } from "./bugs-types";

const MOCK_REPORT: BugReportListItem = {
  id: "bug-1",
  title: "Test Bug",
  description: "Description of bug",
  status: "open",
  priority: "high",
  page_url: "/test",
  reporter_id: "user-1",
  category_id: "cat-1",
  created_at: "2026-01-15T10:00:00Z",
  updated_at: "2026-01-15T10:00:00Z",
  resolved_at: null,
  closed_at: null,
  category_name: "UI",
  category_slug: "ui",
  reporter: { username: "testuser", display_name: "Test User" },
  comment_count: 2,
  screenshot_count: 1,
};

const MOCK_CATEGORY: BugReportCategory = {
  id: "cat-1",
  name: "UI",
  slug: "ui",
  sort_order: 1,
  created_at: "2026-01-01T00:00:00Z",
};

describe("useBugs", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url.includes("/api/bugs/categories")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: [MOCK_CATEGORY] }),
          });
        }
        if (url.match(/\/api\/bugs\?/) || url === "/api/bugs") {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: [MOCK_REPORT] }),
          });
        }
        if (url.match(/\/api\/bugs\/bug-1$/)) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                data: { ...MOCK_REPORT, screenshots: [] },
              }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      }),
    );
  });

  it("starts in loading state and loads data", async () => {
    const { result } = renderHook(() => useBugs());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.reports).toHaveLength(1);
    expect(result.current.reports[0]!.title).toBe("Test Bug");
    expect(result.current.categories).toHaveLength(1);
  });

  it("provides sorted reports", async () => {
    const { result } = renderHook(() => useBugs());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.sortedReports).toHaveLength(1);
    expect(result.current.filter.sort).toBe("newest");
  });

  it("updates filter state", async () => {
    const { result } = renderHook(() => useBugs());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.updateFilter({ status: "open", priority: "high" });
    });

    expect(result.current.filter.status).toBe("open");
    expect(result.current.filter.priority).toBe("high");
  });

  it("filters reports by priority", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url.includes("/api/bugs/categories")) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
        }
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              data: [MOCK_REPORT, { ...MOCK_REPORT, id: "bug-2", title: "Low Bug", priority: "low" }],
            }),
        });
      }),
    );

    const { result } = renderHook(() => useBugs());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.updateFilter({ priority: "high" });
    });

    expect(result.current.sortedReports).toHaveLength(1);
    expect(result.current.sortedReports[0]!.priority).toBe("high");
  });

  it("submits a new bug report", async () => {
    const { result } = renderHook(() => useBugs());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let success = false;
    await act(async () => {
      success = await result.current.submitReport({
        title: "New Bug",
        description: "New bug description",
        categoryId: "cat-1",
        pageUrl: "/page",
        screenshotPaths: [],
      });
    });

    expect(success).toBe(true);
    expect(mockPushToast).toHaveBeenCalledWith("Bug report submitted.");
  });

  it("handles submit failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string, options?: RequestInit) => {
        if (options?.method === "POST") {
          return Promise.resolve({ ok: false });
        }
        if (url.includes("/api/bugs/categories")) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
      }),
    );

    const { result } = renderHook(() => useBugs());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let success = false;
    await act(async () => {
      success = await result.current.submitReport({
        title: "Fail Bug",
        description: "Will fail",
        categoryId: "",
        pageUrl: "",
        screenshotPaths: [],
      });
    });

    expect(success).toBe(false);
    expect(mockPushToast).toHaveBeenCalledWith("Failed to submit bug report.");
  });

  it("updates a report", async () => {
    const { result } = renderHook(() => useBugs());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let success = false;
    await act(async () => {
      success = await result.current.updateReport("bug-1", { status: "resolved" });
    });

    expect(success).toBe(true);
    expect(mockPushToast).toHaveBeenCalledWith("Report updated.");
  });

  it("deletes a report", async () => {
    const { result } = renderHook(() => useBugs());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let success = false;
    await act(async () => {
      success = await result.current.deleteReport("bug-1");
    });

    expect(success).toBe(true);
    expect(mockPushToast).toHaveBeenCalledWith("Report deleted.");
  });

  it("opens detail view and loads report", async () => {
    const { result } = renderHook(() => useBugs());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      result.current.openDetail("bug-1");
    });

    expect(result.current.view).toBe("detail");
    expect(mockPush).toHaveBeenCalledWith("/bugs?report=bug-1", { scroll: false });

    await waitFor(() => {
      expect(result.current.selectedReport).not.toBeNull();
    });
  });

  it("navigates back to list", async () => {
    const { result } = renderHook(() => useBugs());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.backToList();
    });

    expect(result.current.view).toBe("list");
    expect(result.current.selectedReport).toBeNull();
  });

  it("handles load failure gracefully", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url.includes("/api/bugs/categories")) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
        }
        return Promise.resolve({ ok: false });
      }),
    );

    const { result } = renderHook(() => useBugs());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockPushToast).toHaveBeenCalledWith("Failed to load bug reports.");
  });
});
