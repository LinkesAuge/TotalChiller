// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next-intl", () => ({
  useTranslations: vi.fn(() => vi.fn((key: string) => key)),
  useLocale: vi.fn(() => "de"),
}));
vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    const React = require("react");
    return React.createElement("img", props);
  },
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

function createSupabaseQueryChain(result = { data: [], error: null }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  const methods = ["select", "eq", "neq", "order", "limit", "not", "in", "range", "single", "maybeSingle"];
  for (const m of methods) {
    chain[m] = vi.fn(() => chain);
  }
  chain.then = vi.fn((resolve?: ((v: unknown) => unknown) | null) => Promise.resolve(result).then(resolve));
  Object.defineProperty(chain, "then", { enumerable: false, writable: true, configurable: true, value: chain.then });
  return chain;
}

const stableSupabase = {
  from: vi.fn(() => createSupabaseQueryChain()),
  auth: { getUser: vi.fn() },
};
vi.mock("../../hooks/use-supabase", () => ({
  useSupabase: () => stableSupabase,
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
  default: ({
    children,
    isLoading,
    isEmpty,
    emptyMessage,
    loadingMessage,
  }: {
    children?: React.ReactNode;
    isLoading?: boolean;
    isEmpty?: boolean;
    emptyMessage?: string;
    loadingMessage?: string;
  }) => {
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
  default: ({ children, title, variant }: { children?: React.ReactNode; title?: string; variant?: string }) => {
    const React = require("react");
    return React.createElement("div", { "data-testid": `alert-${variant}`, role: "alert" }, [
      React.createElement("strong", { key: "t" }, title),
      children,
    ]);
  },
}));

vi.mock("../../components/ui/radix-select", () => ({
  __esModule: true,
  default: ({
    value,
    onValueChange,
    options,
    disabled,
    placeholder,
  }: {
    value?: string;
    onValueChange?: (v: string) => void;
    options?: { value: string; label: string }[];
    disabled?: boolean;
    placeholder?: string;
  }) => {
    const React = require("react");
    return React.createElement(
      "select",
      {
        value: value ?? "",
        disabled,
        onChange: (e: React.ChangeEvent<HTMLSelectElement>) => onValueChange?.(e.target.value),
        "aria-label": placeholder,
      },
      (options ?? []).map((opt: { value: string; label: string }) =>
        React.createElement("option", { key: opt.value, value: opt.value }, opt.label),
      ),
    );
  },
}));

vi.mock("@/lib/api/import-schemas", () => ({
  ImportPayloadSchema: {
    safeParse: vi.fn((data: Record<string, unknown>) => {
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
    vi.mocked(useTranslations).mockImplementation((() =>
      vi.fn((key: string) => key)) as unknown as typeof useTranslations);
    vi.mocked(useUserRole).mockReturnValue({ isAdmin: true, isContentManager: true, loading: false } as ReturnType<
      typeof useUserRole
    >);
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
    } as ReturnType<typeof useUserRole>);

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

  it("handles fetch error showing error in DataState", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: () => Promise.reject(new Error("bad")),
    });

    render(<DataTab />);
    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalled();
    });
  });

  it("changes status filter and resets page", async () => {
    const user = userEvent.setup();
    render(<DataTab />);
    await waitFor(() => {
      expect(screen.getByText("statusLabel")).toBeInTheDocument();
    });
    const selects = document.querySelectorAll("select");
    const statusSelect = selects[0] as HTMLSelectElement;
    await user.selectOptions(statusSelect, "approved");
    expect(statusSelect.value).toBe("approved");
  });

  it("changes type filter", async () => {
    const user = userEvent.setup();
    render(<DataTab />);
    await waitFor(() => {
      expect(screen.getByText("typeLabel")).toBeInTheDocument();
    });
    const selects = document.querySelectorAll("select");
    const typeSelect = selects[1] as HTMLSelectElement;
    await user.selectOptions(typeSelect, "members");
    expect(typeSelect.value).toBe("members");
  });

  it("shows detail view with items for chests submission", async () => {
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
                item_count: 2,
                matched_count: 1,
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
              item_count: 2,
              matched_count: 1,
              approved_count: 0,
              rejected_count: 0,
              created_at: "2024-01-01T00:00:00Z",
              profiles: { id: "p1", display_name: "Tester" },
            },
            items: [
              {
                id: "e1",
                player_name: "Player1",
                item_status: "pending",
                created_at: "2024-01-01T00:00:00Z",
                game_accounts: null,
                chest_name: "Gold Chest",
                source: "War",
                level: 25,
                opened_at: "2024-01-15T00:00:00Z",
              },
              {
                id: "e2",
                player_name: "Player2",
                item_status: "auto_matched",
                created_at: "2024-01-01T00:00:00Z",
                game_accounts: { id: "ga-1", game_username: "P2Account" },
                chest_name: "Silver Chest",
                source: "Battle",
                level: null,
                opened_at: null,
              },
            ],
            total: 2,
            page: 1,
            perPage: 50,
            statusCounts: { pending: 1, auto_matched: 1 },
            clanGameAccounts: [{ id: "ga-1", game_username: "P2Account" }],
          },
        }),
    };

    (globalThis.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (typeof url === "string" && url.includes("/submissions/s1")) return Promise.resolve(detailResponse);
      return Promise.resolve(listResponse);
    });

    render(<DataTab />);
    await waitFor(() => expect(screen.getByText("viewDetail")).toBeInTheDocument());
    await user.click(screen.getByText("viewDetail"));

    await waitFor(() => {
      expect(screen.getByText("Player1")).toBeInTheDocument();
      expect(screen.getByText("Player2")).toBeInTheDocument();
      expect(screen.getByText("Gold Chest")).toBeInTheDocument();
    });
  });

  it("shows detail view with items for members submission", async () => {
    const user = userEvent.setup();

    const listResponse = {
      ok: true,
      json: () =>
        Promise.resolve({
          data: {
            submissions: [
              {
                id: "s2",
                submission_type: "members",
                status: "pending",
                item_count: 1,
                matched_count: 0,
                approved_count: 0,
                rejected_count: 0,
                created_at: "2024-02-01T00:00:00Z",
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
              id: "s2",
              submission_type: "members",
              status: "pending",
              item_count: 1,
              matched_count: 0,
              approved_count: 0,
              rejected_count: 0,
              created_at: "2024-02-01T00:00:00Z",
              profiles: { id: "p1", display_name: "Tester" },
            },
            items: [
              {
                id: "e1",
                player_name: "Player1",
                item_status: "pending",
                created_at: "2024-02-01T00:00:00Z",
                game_accounts: null,
                coordinates: "X:100 Y:200",
                score: 5000,
                captured_at: "2024-02-01T00:00:00Z",
              },
            ],
            total: 1,
            page: 1,
            perPage: 50,
            statusCounts: { pending: 1 },
            clanGameAccounts: [],
          },
        }),
    };

    (globalThis.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (typeof url === "string" && url.includes("/submissions/s2")) return Promise.resolve(detailResponse);
      return Promise.resolve(listResponse);
    });

    render(<DataTab />);
    await waitFor(() => expect(screen.getByText("viewDetail")).toBeInTheDocument());
    await user.click(screen.getByText("viewDetail"));

    await waitFor(() => {
      expect(screen.getByText("Player1")).toBeInTheDocument();
      expect(screen.getByText("X:100 Y:200")).toBeInTheDocument();
    });
  });

  it("shows detail view with events submission", async () => {
    const user = userEvent.setup();

    const listResponse = {
      ok: true,
      json: () =>
        Promise.resolve({
          data: {
            submissions: [
              {
                id: "s3",
                submission_type: "events",
                status: "pending",
                item_count: 1,
                matched_count: 0,
                approved_count: 0,
                rejected_count: 0,
                created_at: "2024-03-01T00:00:00Z",
                profiles: null,
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
              id: "s3",
              submission_type: "events",
              status: "pending",
              item_count: 1,
              matched_count: 0,
              approved_count: 0,
              rejected_count: 0,
              created_at: "2024-03-01T00:00:00Z",
              profiles: null,
            },
            items: [
              {
                id: "e1",
                player_name: "Player1",
                item_status: "pending",
                created_at: "2024-03-01T00:00:00Z",
                game_accounts: null,
                event_name: "KvK",
                event_points: 1500,
                captured_at: "2024-03-01T00:00:00Z",
              },
            ],
            total: 1,
            page: 1,
            perPage: 50,
            statusCounts: { pending: 1 },
            clanGameAccounts: [],
          },
        }),
    };

    (globalThis.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (typeof url === "string" && url.includes("/submissions/s3")) return Promise.resolve(detailResponse);
      return Promise.resolve(listResponse);
    });

    render(<DataTab />);
    await waitFor(() => expect(screen.getByText("viewDetail")).toBeInTheDocument());
    await user.click(screen.getByText("viewDetail"));

    await waitFor(() => {
      expect(screen.getByText("KvK")).toBeInTheDocument();
    });
  });

  it("back button returns to list from detail", async () => {
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
                item_count: 1,
                matched_count: 0,
                approved_count: 0,
                rejected_count: 0,
                created_at: "2024-01-01T00:00:00Z",
                profiles: null,
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
              item_count: 0,
              matched_count: 0,
              approved_count: 0,
              rejected_count: 0,
              created_at: "2024-01-01T00:00:00Z",
              profiles: null,
            },
            items: [],
            total: 0,
            page: 1,
            perPage: 50,
            statusCounts: {},
            clanGameAccounts: [],
          },
        }),
    };

    (globalThis.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (typeof url === "string" && url.includes("/submissions/s1")) return Promise.resolve(detailResponse);
      return Promise.resolve(listResponse);
    });

    render(<DataTab />);
    await waitFor(() => expect(screen.getByText("viewDetail")).toBeInTheDocument());
    await user.click(screen.getByText("viewDetail"));
    await waitFor(() => expect(screen.getByText(/backToList/)).toBeInTheDocument());
    await user.click(screen.getByText(/backToList/));
    await waitFor(() => expect(screen.getByText("viewDetail")).toBeInTheDocument());
  });

  it("handles fetch error for submissions list gracefully", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: () => Promise.reject(new Error("bad")),
    });

    render(<DataTab />);
    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalled();
    });
  });

  it("shows validation error for non-JSON file", async () => {
    render(<DataTab />);
    await waitFor(() => {
      expect(screen.getByText("dropzoneCta")).toBeInTheDocument();
    });

    const file = new File(["not json"], "data.txt", { type: "text/plain" });
    const dropzone = screen.getByRole("button", { name: /dropzoneCta/ });
    const input = dropzone.querySelector("input[type='file']") as HTMLInputElement;
    Object.defineProperty(input, "files", { value: [file] });
    input.dispatchEvent(new Event("change", { bubbles: true }));

    await waitFor(() => {
      expect(screen.getByText("data.txt")).toBeInTheDocument();
      expect(screen.getByText("errorNotJson")).toBeInTheDocument();
    });
  });

  it("shows row as not-reviewable for approved submission", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: {
            submissions: [
              {
                id: "s-approved",
                submission_type: "chests",
                status: "approved",
                item_count: 10,
                matched_count: 10,
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
    await waitFor(() => expect(screen.getByText("viewDetail")).toBeInTheDocument());
    expect(screen.queryByTitle("approveAll")).not.toBeInTheDocument();
    expect(screen.queryByTitle("rejectAll")).not.toBeInTheDocument();
  });
});
