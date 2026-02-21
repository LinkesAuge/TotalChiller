// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next-intl", () => ({
  useTranslations: vi.fn(() => vi.fn((key: string) => key)),
  useLocale: vi.fn(() => "de"),
}));
vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: any) => {
    const React = require("react");
    return React.createElement("img", props);
  },
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

vi.mock("../../hooks/use-supabase", () => ({
  useSupabase: () => ({ from: vi.fn(), auth: { getUser: vi.fn() } }),
}));

vi.mock("../../hooks/use-clan-context", () => ({
  __esModule: true,
  default: () => ({ clanId: "clan-1" }),
}));

vi.mock("@/lib/hooks/use-user-role", () => ({
  useUserRole: vi.fn(() => ({ isAdmin: true, isContentManager: true, loading: false })),
}));

vi.mock("@/lib/hooks/use-pagination", () => ({
  usePagination: () => ({
    page: 1,
    pageSize: 20,
    totalPages: 1,
    startIndex: 0,
    setPage: vi.fn(),
  }),
}));

vi.mock("../../components/data-state", () => ({
  __esModule: true,
  default: ({ children, isLoading, isEmpty, emptyMessage, loadingMessage }: any) => {
    const React = require("react");
    if (isLoading) return React.createElement("div", { "data-testid": "loading" }, loadingMessage || "Loading...");
    if (isEmpty) return React.createElement("div", { "data-testid": "empty" }, emptyMessage || "Empty");
    return children;
  },
}));

vi.mock("../../components/pagination-bar", () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock("../../components/ui/game-alert", () => ({
  __esModule: true,
  default: ({ children, title, variant }: any) => {
    const React = require("react");
    return React.createElement("div", { "data-testid": `alert-${variant}`, role: "alert" }, [
      React.createElement("strong", { key: "t" }, title),
      children,
    ]);
  },
}));

vi.mock("@/lib/api/import-schemas", () => ({
  ImportPayloadSchema: {
    safeParse: vi.fn((data: any) => {
      if (data?.version === 1 && data?.data) return { success: true, data };
      return { success: false, error: { issues: [{ path: ["root"], message: "invalid" }] } };
    }),
  },
}));

globalThis.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: () =>
    Promise.resolve({
      data: {
        submissions: [
          {
            id: "s1",
            submission_type: "chests",
            status: "pending",
            item_count: 10,
            matched_count: 5,
            approved_count: 0,
            rejected_count: 0,
            created_at: "2024-01-01T00:00:00Z",
            profiles: { id: "p1", display_name: "Tester" },
          },
        ],
        total: 1,
        page: 1,
        perPage: 20,
      },
    }),
});

import { useTranslations } from "next-intl";
import { useUserRole } from "@/lib/hooks/use-user-role";
import DataTab from "./data-tab";

describe("DataTab", () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    vi.mocked(useTranslations).mockImplementation((() => vi.fn((key: string) => key)) as any);
    vi.mocked(useUserRole).mockReturnValue({ isAdmin: true, isContentManager: true, loading: false } as any);
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: {
            submissions: [
              {
                id: "s1",
                submission_type: "chests",
                status: "pending",
                item_count: 10,
                matched_count: 5,
                approved_count: 0,
                rejected_count: 0,
                created_at: "2024-01-01T00:00:00Z",
                profiles: { id: "p1", display_name: "Tester" },
              },
            ],
            total: 1,
            page: 1,
            perPage: 20,
          },
        }),
    });
  });

  it("renders without crashing", () => {
    render(<DataTab />);
    expect(screen.getByText("statusLabel")).toBeInTheDocument();
  });

  it("renders filter labels", () => {
    render(<DataTab />);
    expect(screen.getByText("statusLabel")).toBeInTheDocument();
    expect(screen.getByText("typeLabel")).toBeInTheDocument();
  });

  it("renders filter select controls", () => {
    render(<DataTab />);
    const selects = document.querySelectorAll("select");
    expect(selects.length).toBe(2);
  });

  it("fetches submissions on mount", () => {
    render(<DataTab />);
    expect(globalThis.fetch).toHaveBeenCalled();
  });

  it("shows submissions table after loading", async () => {
    render(<DataTab />);
    await waitFor(() => {
      expect(document.querySelector("section")).toBeInTheDocument();
    });
  });

  it("renders inline action buttons for pending submission", async () => {
    render(<DataTab />);
    await waitFor(() => {
      expect(screen.getByTitle("approveAll")).toBeInTheDocument();
    });
    expect(screen.getByTitle("rejectAll")).toBeInTheDocument();
    expect(screen.getByTitle("deleteSubmission")).toBeInTheDocument();
  });

  it("approve button calls review API", async () => {
    const user = userEvent.setup();
    render(<DataTab />);
    await waitFor(() => {
      expect(screen.getByTitle("approveAll")).toBeInTheDocument();
    });
    await user.click(screen.getByTitle("approveAll"));
    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/api/import/submissions/s1/review",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ action: "approve_all" }),
        }),
      );
    });
  });

  it("reject button calls review API", async () => {
    const user = userEvent.setup();
    render(<DataTab />);
    await waitFor(() => {
      expect(screen.getByTitle("rejectAll")).toBeInTheDocument();
    });
    await user.click(screen.getByTitle("rejectAll"));
    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/api/import/submissions/s1/review",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ action: "reject_all" }),
        }),
      );
    });
  });

  it("delete button shows confirm and calls delete API", async () => {
    const user = userEvent.setup();
    window.confirm = vi.fn(() => true);
    render(<DataTab />);
    await waitFor(() => {
      expect(screen.getByTitle("deleteSubmission")).toBeInTheDocument();
    });
    await user.click(screen.getByTitle("deleteSubmission"));
    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/api/import/submissions/s1",
        expect.objectContaining({ method: "DELETE" }),
      );
    });
  });

  it("delete cancelled when confirm returns false", async () => {
    const user = userEvent.setup();
    window.confirm = vi.fn(() => false);
    render(<DataTab />);
    await waitFor(() => {
      expect(screen.getByTitle("deleteSubmission")).toBeInTheDocument();
    });
    await user.click(screen.getByTitle("deleteSubmission"));
    expect(globalThis.fetch).not.toHaveBeenCalledWith(
      "/api/import/submissions/s1",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("buttons disabled while action in progress", async () => {
    const user = userEvent.setup();
    let resolveReview!: (value: unknown) => void;
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (typeof url === "string" && url.includes("/review")) {
        return new Promise((resolve) => {
          resolveReview = resolve;
        });
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              submissions: [
                {
                  id: "s1",
                  submission_type: "chests",
                  status: "pending",
                  item_count: 10,
                  matched_count: 5,
                  approved_count: 0,
                  rejected_count: 0,
                  created_at: "2024-01-01T00:00:00Z",
                  profiles: { id: "p1", display_name: "Tester" },
                },
              ],
              total: 1,
              page: 1,
              perPage: 20,
            },
          }),
      });
    });

    render(<DataTab />);
    await waitFor(() => {
      expect(screen.getByTitle("approveAll")).toBeInTheDocument();
    });

    await user.click(screen.getByTitle("approveAll"));

    await waitFor(() => {
      expect(screen.getByTitle("approveAll")).toBeDisabled();
      expect(screen.getByTitle("rejectAll")).toBeDisabled();
      expect(screen.getByTitle("deleteSubmission")).toBeDisabled();
    });

    resolveReview({ ok: true, json: () => Promise.resolve({}) });
  });

  it("action buttons not shown for non-reviewable submissions", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: {
            submissions: [
              {
                id: "s1",
                submission_type: "chests",
                status: "approved",
                item_count: 10,
                matched_count: 5,
                approved_count: 10,
                rejected_count: 0,
                created_at: "2024-01-01T00:00:00Z",
                profiles: { id: "p1", display_name: "Tester" },
              },
            ],
            total: 1,
            page: 1,
            perPage: 20,
          },
        }),
    });

    render(<DataTab />);
    await waitFor(() => {
      expect(screen.getByTitle("deleteSubmission")).toBeInTheDocument();
    });

    expect(screen.queryByTitle("approveAll")).not.toBeInTheDocument();
    expect(screen.queryByTitle("rejectAll")).not.toBeInTheDocument();
  });

  it("action buttons not shown when not content manager", async () => {
    vi.mocked(useUserRole).mockReturnValue({
      isAdmin: false,
      isContentManager: false,
      loading: false,
    } as any);

    render(<DataTab />);
    await waitFor(() => {
      expect(screen.getByText("viewDetail")).toBeInTheDocument();
    });

    expect(screen.queryByTitle("approveAll")).not.toBeInTheDocument();
    expect(screen.queryByTitle("rejectAll")).not.toBeInTheDocument();
    expect(screen.queryByTitle("deleteSubmission")).not.toBeInTheDocument();
  });

  it("view detail button navigates to detail", async () => {
    const user = userEvent.setup();

    const listResponse = {
      ok: true,
      json: () =>
        Promise.resolve({
          data: {
            submissions: [
              {
                id: "s1",
                submission_type: "chests",
                status: "pending",
                item_count: 10,
                matched_count: 5,
                approved_count: 0,
                rejected_count: 0,
                created_at: "2024-01-01T00:00:00Z",
                profiles: { id: "p1", display_name: "Tester" },
              },
            ],
            total: 1,
            page: 1,
            perPage: 20,
          },
        }),
    };
    const detailResponse = {
      ok: true,
      json: () =>
        Promise.resolve({
          data: {
            submission: {
              id: "s1",
              submission_type: "chests",
              status: "pending",
              item_count: 10,
              matched_count: 5,
              approved_count: 0,
              rejected_count: 0,
              created_at: "2024-01-01T00:00:00Z",
              profiles: { id: "p1", display_name: "Tester" },
            },
            items: [],
            total: 0,
            page: 1,
            perPage: 50,
            statusCounts: {},
          },
        }),
    };

    (globalThis.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (typeof url === "string" && url.includes("/submissions/s1")) return Promise.resolve(detailResponse);
      return Promise.resolve(listResponse);
    });

    render(<DataTab />);
    await waitFor(() => {
      expect(screen.getByText("viewDetail")).toBeInTheDocument();
    });

    await user.click(screen.getByText("viewDetail"));

    await waitFor(() => {
      expect(screen.getByText(/backToList/)).toBeInTheDocument();
    });
  });

  it("server busy indicator appears after delay", async () => {
    const user = userEvent.setup();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const listResponse = {
      ok: true,
      json: () =>
        Promise.resolve({
          data: {
            submissions: [
              {
                id: "s1",
                submission_type: "chests",
                status: "pending",
                item_count: 10,
                matched_count: 5,
                approved_count: 0,
                rejected_count: 0,
                created_at: "2024-01-01T00:00:00Z",
                profiles: { id: "p1", display_name: "Tester" },
              },
            ],
            total: 1,
            page: 1,
            perPage: 20,
          },
        }),
    };
    const detailResponse = {
      ok: true,
      json: () =>
        Promise.resolve({
          data: {
            submission: {
              id: "s1",
              submission_type: "chests",
              status: "pending",
              item_count: 10,
              matched_count: 5,
              approved_count: 0,
              rejected_count: 0,
              created_at: "2024-01-01T00:00:00Z",
              profiles: { id: "p1", display_name: "Tester" },
            },
            items: [],
            total: 0,
            page: 1,
            perPage: 50,
            statusCounts: {},
          },
        }),
    };

    (globalThis.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (typeof url === "string" && url.includes("/review")) return new Promise(() => {});
      if (typeof url === "string" && url.includes("/submissions/s1")) return Promise.resolve(detailResponse);
      return Promise.resolve(listResponse);
    });

    render(<DataTab />);
    await waitFor(() => {
      expect(screen.getByText("viewDetail")).toBeInTheDocument();
    });

    await user.click(screen.getByText("viewDetail"));
    await waitFor(() => {
      expect(screen.getByText("approveAll")).toBeInTheDocument();
    });

    await user.click(screen.getByText("approveAll"));

    await waitFor(
      () => {
        expect(screen.getByText("serverBusy")).toBeInTheDocument();
      },
      { timeout: 7000 },
    );

    consoleError.mockRestore();
  }, 10000);

  it("renders compact import dropzone in list view", async () => {
    render(<DataTab />);
    await waitFor(() => {
      expect(screen.getByText("dropzoneCta")).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /dropzoneCta/ })).toBeInTheDocument();
  });

  it("shows file name after file drop", async () => {
    render(<DataTab />);
    await waitFor(() => {
      expect(screen.getByText("dropzoneCta")).toBeInTheDocument();
    });

    const file = new File(['{"invalid": true}'], "export.json", { type: "application/json" });
    const dropzone = screen.getByRole("button", { name: /dropzoneCta/ });
    const input = dropzone.querySelector("input[type='file']") as HTMLInputElement;
    Object.defineProperty(input, "files", { value: [file] });
    input.dispatchEvent(new Event("change", { bubbles: true }));

    await waitFor(() => {
      expect(screen.getByText("export.json")).toBeInTheDocument();
    });
  });
});
