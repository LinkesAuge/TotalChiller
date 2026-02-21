// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const stableT = vi.fn((key: string) => key);
vi.mock("next-intl", () => ({
  useTranslations: vi.fn(() => stableT),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn() }),
  useParams: () => ({ id: "sub1" }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

const mockSupabase = {};
vi.mock("../../hooks/use-supabase", () => ({
  useSupabase: () => mockSupabase,
}));
vi.mock("@/lib/hooks/use-user-role", () => ({
  useUserRole: () => ({ isAdmin: false, isContentManager: false, loading: false }),
}));
vi.mock("../../components/data-state", () => ({
  __esModule: true,
  default: ({ children, isLoading, isEmpty, error, loadingMessage, emptyMessage, onRetry }: any) => {
    const React = require("react");
    if (isLoading) return React.createElement("div", null, loadingMessage);
    if (error)
      return React.createElement(
        "div",
        null,
        error,
        onRetry && React.createElement("button", { onClick: onRetry }, "Retry"),
      );
    if (isEmpty) return React.createElement("div", null, emptyMessage);
    return React.createElement("div", { "data-testid": "data-state" }, children);
  },
}));
vi.mock("../../components/pagination-bar", () => ({
  __esModule: true,
  default: () => {
    const React = require("react");
    return React.createElement("div", { "data-testid": "pagination" });
  },
}));
vi.mock("@/lib/hooks/use-pagination", () => ({
  usePagination: () => ({ page: 1, setPage: vi.fn(), totalItems: 0, pageSize: 50, totalPages: 0 }),
}));

import SubmissionDetailClient from "./submission-detail-client";

describe("SubmissionDetailClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis.fetch as any) = vi.fn();
  });

  it("renders loading state on initial load", () => {
    (globalThis.fetch as any).mockReturnValue(new Promise(() => {}));
    render(<SubmissionDetailClient />);
    expect(screen.getByText("loading")).toBeInTheDocument();
  });

  it("renders back to list button", () => {
    (globalThis.fetch as any).mockReturnValue(new Promise(() => {}));
    render(<SubmissionDetailClient />);
    expect(screen.getByText(/backToList/)).toBeInTheDocument();
  });

  it("renders empty state when submission not found", async () => {
    (globalThis.fetch as any).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Not found" }),
    });
    render(<SubmissionDetailClient />);
    await waitFor(() => {
      expect(screen.getByText("Not found")).toBeInTheDocument();
    });
  });

  it("renders submission detail when data is loaded", async () => {
    (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: {
            submission: {
              id: "sub1",
              submission_type: "chests",
              status: "pending",
              item_count: 10,
              matched_count: 5,
              approved_count: 3,
              rejected_count: 1,
              created_at: "2025-01-01T00:00:00Z",
              profiles: { display_name: "TestUser" },
            },
            items: [],
            total: 0,
            page: 1,
            perPage: 50,
            statusCounts: { pending: 5, auto_matched: 3, approved: 2 },
          },
        }),
    });
    render(<SubmissionDetailClient />);
    await waitFor(() => {
      expect(screen.getByText("chests")).toBeInTheDocument();
    });
  });

  it("renders status filter tabs", async () => {
    (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: {
            submission: {
              id: "sub1",
              submission_type: "chests",
              status: "pending",
              item_count: 5,
              matched_count: 2,
              approved_count: 1,
              rejected_count: 0,
              created_at: "2025-01-01T00:00:00Z",
              profiles: null,
            },
            items: [],
            total: 0,
            page: 1,
            perPage: 50,
            statusCounts: {},
          },
        }),
    });
    render(<SubmissionDetailClient />);
    await waitFor(() => {
      expect(screen.getByText("filterAll")).toBeInTheDocument();
      expect(screen.getByText("statusPending")).toBeInTheDocument();
      expect(screen.getByText("statusApproved")).toBeInTheDocument();
      expect(screen.getByText("statusRejected")).toBeInTheDocument();
    });
  });
});
