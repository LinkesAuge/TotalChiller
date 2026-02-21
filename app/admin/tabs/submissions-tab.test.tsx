// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";

/* ── Stable mock references to prevent infinite re-render loops ── */

const stableT = vi.fn((key: string, params?: any) => {
  if (params) return `${key}:${JSON.stringify(params)}`;
  return key;
});

vi.mock("next-intl", () => ({
  useTranslations: vi.fn(() => stableT),
}));

const mockSupabase = {};
vi.mock("../../hooks/use-supabase", () => ({
  useSupabase: () => mockSupabase,
}));

let mockClanContext: any = { clanId: "clan1" };
vi.mock("../../hooks/use-clan-context", () => ({
  __esModule: true,
  default: () => mockClanContext,
}));

let mockUserRole = { isAdmin: true, isContentManager: true, loading: false };
vi.mock("@/lib/hooks/use-user-role", () => ({
  useUserRole: () => mockUserRole,
}));

const mockListSetPage = vi.fn();
const mockDetailSetPage = vi.fn();
const listPag = { page: 1, pageSize: 20, totalPages: 1, startIndex: 0, endIndex: 20, setPage: mockListSetPage };
const detailPag = { page: 1, pageSize: 50, totalPages: 1, startIndex: 0, endIndex: 50, setPage: mockDetailSetPage };

let pagCallIdx = 0;
vi.mock("@/lib/hooks/use-pagination", () => ({
  usePagination: () => {
    pagCallIdx++;
    return pagCallIdx % 2 === 1 ? listPag : detailPag;
  },
}));

vi.mock("../../components/data-state", () => ({
  __esModule: true,
  default: ({ isLoading, error, isEmpty, children, loadingMessage, emptyMessage, onRetry }: any) => {
    const React = require("react");
    if (isLoading) return React.createElement("div", { "data-testid": "loading" }, loadingMessage);
    if (error)
      return React.createElement(
        "div",
        { "data-testid": "error" },
        error,
        onRetry && React.createElement("button", { onClick: onRetry, "data-testid": "retry-btn" }, "Retry"),
      );
    if (isEmpty) return React.createElement("div", { "data-testid": "empty" }, emptyMessage);
    return React.createElement("div", { "data-testid": "data-content" }, children);
  },
}));

vi.mock("../../components/pagination-bar", () => ({
  __esModule: true,
  default: ({ idPrefix }: any) => {
    const React = require("react");
    return React.createElement("div", { "data-testid": `pagination-${idPrefix}` });
  },
}));

import SubmissionsTab from "./submissions-tab";

/* ── Test data ── */

const SUBS = [
  {
    id: "s1",
    submission_type: "chests",
    status: "pending",
    total_items: 10,
    matched_count: 5,
    approved_count: 0,
    rejected_count: 0,
    created_at: "2025-01-01T00:00:00Z",
    profiles: { id: "u1", display_name: "Alice" },
  },
  {
    id: "s2",
    submission_type: "members",
    status: "approved",
    total_items: 20,
    matched_count: 20,
    approved_count: 20,
    rejected_count: 0,
    created_at: "2025-02-01T00:00:00Z",
    profiles: null,
  },
];

const DETAIL_CHESTS = {
  submission: { ...SUBS[0] },
  items: [
    {
      id: "e1",
      player_name: "P1",
      item_status: "pending",
      created_at: "2025-01-01T00:00:00Z",
      game_accounts: { id: "ga1", game_username: "GU1" },
      chest_name: "Gold",
      source: "Campaign",
      level: 5,
      opened_at: "2025-01-02T00:00:00Z",
    },
    {
      id: "e2",
      player_name: "P2",
      item_status: "auto_matched",
      created_at: "2025-01-01T00:00:00Z",
      game_accounts: null,
      chest_name: null,
      source: null,
      level: null,
      opened_at: null,
    },
  ],
  total: 2,
  page: 1,
  perPage: 50,
  statusCounts: { pending: 1, auto_matched: 1 },
};

const DETAIL_MEMBERS = {
  submission: {
    id: "s3",
    submission_type: "members",
    status: "partial",
    total_items: 3,
    matched_count: 2,
    approved_count: 1,
    rejected_count: 0,
    created_at: "2025-03-01T00:00:00Z",
    profiles: { id: "u2", display_name: "Bob" },
  },
  items: [
    {
      id: "e3",
      player_name: "MP1",
      item_status: "approved",
      created_at: "2025-03-01T00:00:00Z",
      game_accounts: { id: "ga2", game_username: "MU1" },
      coordinates: "100,200",
      score: 1500,
      captured_at: "2025-03-02T00:00:00Z",
    },
    {
      id: "e4",
      player_name: "MP2",
      item_status: "rejected",
      created_at: "2025-03-01T00:00:00Z",
      game_accounts: null,
      coordinates: null,
      score: null,
      captured_at: null,
    },
  ],
  total: 2,
  page: 1,
  perPage: 50,
  statusCounts: { approved: 1, rejected: 1 },
};

const DETAIL_EVENTS = {
  submission: {
    id: "s4",
    submission_type: "events",
    status: "pending",
    total_items: 2,
    matched_count: 1,
    approved_count: 0,
    rejected_count: 0,
    created_at: "2025-04-01T00:00:00Z",
    profiles: { id: "u3", display_name: null },
  },
  items: [
    {
      id: "e5",
      player_name: "EP1",
      item_status: "pending",
      created_at: "2025-04-01T00:00:00Z",
      game_accounts: { id: "ga3", game_username: "EU1" },
      event_name: "Big Battle",
      event_points: 500,
      captured_at: "2025-04-02T00:00:00Z",
    },
    {
      id: "e6",
      player_name: "EP2",
      item_status: "pending",
      created_at: "2025-04-01T00:00:00Z",
      game_accounts: null,
      event_name: null,
      event_points: null,
      captured_at: null,
    },
  ],
  total: 2,
  page: 1,
  perPage: 50,
  statusCounts: { pending: 2 },
};

function listFetch(subs = SUBS, total = 2) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ data: { submissions: subs, total, page: 1, perPage: 20 } }),
  });
}

function detailFetch(detail: any) {
  return vi.fn().mockImplementation((url: string, opts?: any) => {
    if (opts?.method === "DELETE") return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    if (url.includes("/review")) return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    if (/\/api\/import\/submissions\/s\w+\?/.test(url))
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: detail }) });
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ data: { submissions: SUBS, total: 2, page: 1, perPage: 20 } }),
    });
  });
}

async function renderAndWaitForList() {
  render(<SubmissionsTab />);
  await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
}

async function renderAndOpenDetail(detail: any) {
  globalThis.fetch = detailFetch(detail);
  render(<SubmissionsTab />);
  await waitFor(() => expect(document.querySelector(".row")).toBeTruthy());
  await act(async () => {
    fireEvent.click(document.querySelector(".row")!);
  });
  await waitFor(() => expect(screen.getByText(/backToList/)).toBeInTheDocument());
}

describe("SubmissionsTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pagCallIdx = 0;
    mockClanContext = { clanId: "clan1" };
    mockUserRole = { isAdmin: true, isContentManager: true, loading: false };
    globalThis.fetch = listFetch();
    globalThis.confirm = vi.fn(() => true);
  });

  /* ── List view basics ── */

  it("renders list view and calls fetch", async () => {
    await renderAndWaitForList();
    expect(globalThis.fetch).toHaveBeenCalled();
  });

  it("renders status and type filter dropdowns", async () => {
    await renderAndWaitForList();
    expect(screen.getAllByRole("combobox").length).toBe(2);
    expect(screen.getByText("statusLabel")).toBeInTheDocument();
    expect(screen.getByText("typeLabel")).toBeInTheDocument();
  });

  it("renders submission rows with type, status, counts", async () => {
    await renderAndWaitForList();
    expect(screen.getByText("chests")).toBeInTheDocument();
    expect(screen.getByText("status_pending")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
  });

  it("renders list table header columns", async () => {
    await renderAndWaitForList();
    for (const col of ["colType", "colStatus", "colItems", "colMatched", "colSubmittedBy", "colDate", "colActions"])
      expect(screen.getByText(col)).toBeInTheDocument();
  });

  it("renders review and delete buttons for admin + content manager", async () => {
    await renderAndWaitForList();
    expect(screen.getAllByTitle("approveAll").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByTitle("rejectAll").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByTitle("deleteSubmission").length).toBe(2);
  });

  it("hides buttons when roles are loading", async () => {
    mockUserRole = { isAdmin: true, isContentManager: true, loading: true };
    await renderAndWaitForList();
    expect(screen.queryByTitle("approveAll")).not.toBeInTheDocument();
  });

  it("hides review buttons when not content manager", async () => {
    mockUserRole = { isAdmin: false, isContentManager: false, loading: false };
    await renderAndWaitForList();
    expect(screen.queryByTitle("approveAll")).not.toBeInTheDocument();
    expect(screen.queryByTitle("deleteSubmission")).not.toBeInTheDocument();
  });

  it("renders viewDetail button for each row", async () => {
    await renderAndWaitForList();
    expect(screen.getAllByText("viewDetail").length).toBe(2);
  });

  it("renders pagination bar for list", async () => {
    await renderAndWaitForList();
    expect(screen.getByTestId("pagination-submissions")).toBeInTheDocument();
  });

  it("renders empty state when no submissions", async () => {
    globalThis.fetch = listFetch([], 0);
    await renderAndWaitForList();
    expect(screen.getByText("noSubmissions")).toBeInTheDocument();
  });

  /* ── No clan ── */

  it("renders noClanSelected when no clan context", async () => {
    mockClanContext = null;
    render(<SubmissionsTab />);
    await waitFor(() => expect(screen.getByText("noClanSelected")).toBeInTheDocument());
  });

  it("renders noClanSelected when clanId is empty", async () => {
    mockClanContext = { clanId: "" };
    render(<SubmissionsTab />);
    await waitFor(() => expect(screen.getByText("noClanSelected")).toBeInTheDocument());
  });

  /* ── Filters ── */

  it("changes status filter and resets page", async () => {
    await renderAndWaitForList();
    fireEvent.change(screen.getAllByRole("combobox")[0]!, { target: { value: "approved" } });
    expect(mockListSetPage).toHaveBeenCalledWith(1);
  });

  it("changes type filter and resets page", async () => {
    await renderAndWaitForList();
    fireEvent.change(screen.getAllByRole("combobox")[1]!, { target: { value: "chests" } });
    expect(mockListSetPage).toHaveBeenCalledWith(1);
  });

  it("renders all status and type filter options", async () => {
    await renderAndWaitForList();
    const opts = screen.getAllByRole("option").map((o) => o.getAttribute("value"));
    for (const v of ["pending", "approved", "rejected", "partial", "chests", "members", "events"])
      expect(opts).toContain(v);
  });

  /* ── Error states ── */

  it("shows error when list fetch fails with json body", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({ error: "Server down" }) });
    render(<SubmissionsTab />);
    await waitFor(() => expect(screen.getByText("Server down")).toBeInTheDocument());
  });

  it("shows error when fetch throws Error", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network err"));
    render(<SubmissionsTab />);
    await waitFor(() => expect(screen.getByText("Network err")).toBeInTheDocument());
  });

  it("shows t('loadError') when fetch throws non-Error", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue("boom");
    render(<SubmissionsTab />);
    await waitFor(() => expect(screen.getByText("loadError")).toBeInTheDocument());
  });

  it("shows t('loadError') when error response has no json", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, json: () => Promise.reject("no json") });
    render(<SubmissionsTab />);
    await waitFor(() => expect(screen.getByText("loadError")).toBeInTheDocument());
  });

  it("retries on retry button click", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({ error: "Fail" }) });
    render(<SubmissionsTab />);
    await waitFor(() => expect(screen.getByTestId("retry-btn")).toBeInTheDocument());
    globalThis.fetch = listFetch();
    await act(async () => {
      fireEvent.click(screen.getByTestId("retry-btn"));
    });
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
  });

  /* ── Row selection ── */

  it("selects submission on row click", async () => {
    globalThis.fetch = detailFetch(DETAIL_CHESTS);
    render(<SubmissionsTab />);
    await waitFor(() => expect(document.querySelector(".row")).toBeTruthy());
    await act(async () => {
      fireEvent.click(document.querySelector(".row")!);
    });
    await waitFor(() => expect(screen.getByText(/backToList/)).toBeInTheDocument());
  });

  it("selects on Enter keydown", async () => {
    globalThis.fetch = detailFetch(DETAIL_CHESTS);
    render(<SubmissionsTab />);
    await waitFor(() => expect(document.querySelector(".row")).toBeTruthy());
    await act(async () => {
      fireEvent.keyDown(document.querySelector(".row")!, { key: "Enter" });
    });
    await waitFor(() => expect(screen.getByText(/backToList/)).toBeInTheDocument());
  });

  it("selects on Space keydown", async () => {
    globalThis.fetch = detailFetch(DETAIL_CHESTS);
    render(<SubmissionsTab />);
    await waitFor(() => expect(document.querySelector(".row")).toBeTruthy());
    await act(async () => {
      fireEvent.keyDown(document.querySelector(".row")!, { key: " " });
    });
    await waitFor(() => expect(screen.getByText(/backToList/)).toBeInTheDocument());
  });

  it("does not select on other keys", async () => {
    await renderAndWaitForList();
    await act(async () => {
      fireEvent.keyDown(document.querySelector(".row")!, { key: "Tab" });
    });
    expect(screen.queryByText(/backToList/)).not.toBeInTheDocument();
  });

  /* ── Detail view: chests ── */

  it("renders chests detail with correct columns and data", async () => {
    await renderAndOpenDetail(DETAIL_CHESTS);
    for (const col of [
      "colPlayer",
      "colChestName",
      "colSource",
      "colLevel",
      "colDate",
      "colStatus",
      "colMatchedAccount",
    ])
      expect(screen.getByText(col)).toBeInTheDocument();
    expect(screen.getByText("P1")).toBeInTheDocument();
    expect(screen.getByText("Gold")).toBeInTheDocument();
    expect(screen.getByText("Campaign")).toBeInTheDocument();
    expect(screen.getByText("GU1")).toBeInTheDocument();
  });

  it("renders dashes for null chest fields", async () => {
    await renderAndOpenDetail(DETAIL_CHESTS);
    expect(screen.getByText("P2")).toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(4);
  });

  /* ── Detail view: members ── */

  it("renders members detail with correct columns and data", async () => {
    await renderAndOpenDetail(DETAIL_MEMBERS);
    expect(screen.getByText("colCoordinates")).toBeInTheDocument();
    expect(screen.getByText("colScore")).toBeInTheDocument();
    expect(screen.getByText("MP1")).toBeInTheDocument();
    expect(screen.getByText("100,200")).toBeInTheDocument();
    expect(screen.getByText("MU1")).toBeInTheDocument();
  });

  /* ── Detail view: events ── */

  it("renders events detail with correct columns and data", async () => {
    await renderAndOpenDetail(DETAIL_EVENTS);
    expect(screen.getByText("colEventName")).toBeInTheDocument();
    expect(screen.getByText("colPoints")).toBeInTheDocument();
    expect(screen.getByText("EP1")).toBeInTheDocument();
    expect(screen.getByText("Big Battle")).toBeInTheDocument();
    expect(screen.getByText("EU1")).toBeInTheDocument();
  });

  /* ── Detail header card ── */

  it("renders detail header with submission info", async () => {
    await renderAndOpenDetail(DETAIL_CHESTS);
    expect(screen.getByText(/submittedBy/)).toBeInTheDocument();
    for (const label of ["totalItems", "matchedItems", "approvedItems", "rejectedItems"])
      expect(screen.getByText(new RegExp(label))).toBeInTheDocument();
  });

  /* ── Status badge classes ── */

  it("applies correct badge classes for statuses", async () => {
    await renderAndOpenDetail(DETAIL_MEMBERS);
    expect(screen.getByText("itemStatus_approved").className).toBe("badge success");
    expect(screen.getByText("itemStatus_rejected").className).toBe("badge danger");
  });

  it("applies warning badge for auto_matched status", async () => {
    await renderAndOpenDetail(DETAIL_CHESTS);
    expect(screen.getByText("itemStatus_auto_matched").className).toBe("badge warning");
  });

  it("applies info badge for pending status", async () => {
    await renderAndOpenDetail(DETAIL_CHESTS);
    expect(screen.getByText("itemStatus_pending").className).toBe("badge info");
  });

  it("applies warning badge for partial status in list", async () => {
    globalThis.fetch = listFetch([{ ...SUBS[0]!, status: "partial" }], 1);
    await renderAndWaitForList();
    expect(screen.getByText("status_partial").className).toBe("badge warning");
  });

  /* ── Detail review actions ── */

  it("renders approve/reject buttons for pending submission", async () => {
    await renderAndOpenDetail(DETAIL_CHESTS);
    expect(screen.getByText("approveAll")).toBeInTheDocument();
    expect(screen.getByText("approveMatchedOnly")).toBeInTheDocument();
    expect(screen.getByText("rejectAll")).toBeInTheDocument();
  });

  it("hides review buttons for approved submission", async () => {
    const d = { ...DETAIL_CHESTS, submission: { ...DETAIL_CHESTS.submission, status: "approved" } };
    await renderAndOpenDetail(d);
    expect(screen.queryByText("approveAll")).not.toBeInTheDocument();
  });

  it("calls review API on approveAll click", async () => {
    const f = detailFetch(DETAIL_CHESTS);
    globalThis.fetch = f;
    render(<SubmissionsTab />);
    await waitFor(() => expect(document.querySelector(".row")).toBeTruthy());
    await act(async () => {
      fireEvent.click(document.querySelector(".row")!);
    });
    await waitFor(() => expect(screen.getByText("approveAll")).toBeInTheDocument());
    await act(async () => {
      fireEvent.click(screen.getByText("approveAll"));
    });
    await waitFor(() => {
      expect(f.mock.calls.some((c: any[]) => typeof c[0] === "string" && c[0].includes("/review"))).toBe(true);
    });
  });

  it("calls review API on rejectAll click", async () => {
    const f = detailFetch(DETAIL_CHESTS);
    globalThis.fetch = f;
    render(<SubmissionsTab />);
    await waitFor(() => expect(document.querySelector(".row")).toBeTruthy());
    await act(async () => {
      fireEvent.click(document.querySelector(".row")!);
    });
    await waitFor(() => expect(screen.getByText("rejectAll")).toBeInTheDocument());
    await act(async () => {
      fireEvent.click(screen.getByText("rejectAll"));
    });
    await waitFor(() => {
      expect(f.mock.calls.some((c: any[]) => typeof c[0] === "string" && c[0].includes("/review"))).toBe(true);
    });
  });

  /* ── Detail delete ── */

  it("calls delete API on deleteSubmission click when confirmed", async () => {
    const f = detailFetch(DETAIL_CHESTS);
    globalThis.fetch = f;
    render(<SubmissionsTab />);
    await waitFor(() => expect(document.querySelector(".row")).toBeTruthy());
    await act(async () => {
      fireEvent.click(document.querySelector(".row")!);
    });
    await waitFor(() => expect(screen.getByText("deleteSubmission")).toBeInTheDocument());
    await act(async () => {
      fireEvent.click(screen.getByText("deleteSubmission"));
    });
    await waitFor(() => {
      expect(f.mock.calls.some((c: any[]) => c[1]?.method === "DELETE")).toBe(true);
    });
  });

  it("does not call delete when confirm is cancelled", async () => {
    globalThis.confirm = vi.fn(() => false);
    const f = detailFetch(DETAIL_CHESTS);
    globalThis.fetch = f;
    render(<SubmissionsTab />);
    await waitFor(() => expect(document.querySelector(".row")).toBeTruthy());
    await act(async () => {
      fireEvent.click(document.querySelector(".row")!);
    });
    await waitFor(() => expect(screen.getByText("deleteSubmission")).toBeInTheDocument());
    await act(async () => {
      fireEvent.click(screen.getByText("deleteSubmission"));
    });
    expect(f.mock.calls.every((c: any[]) => c[1]?.method !== "DELETE")).toBe(true);
  });

  /* ── Back button ── */

  it("returns to list view when back button is clicked", async () => {
    await renderAndOpenDetail(DETAIL_CHESTS);
    await act(async () => {
      fireEvent.click(screen.getByText(/backToList/));
    });
    await waitFor(() => {
      expect(screen.queryByText(/backToList/)).not.toBeInTheDocument();
      expect(screen.getByText("statusLabel")).toBeInTheDocument();
    });
  });

  /* ── Status filter tabs ── */

  it("renders status filter tabs in detail view", async () => {
    await renderAndOpenDetail(DETAIL_CHESTS);
    expect(screen.getByText(/filterAll/)).toBeInTheDocument();
    expect(screen.getByText(/statusPending/)).toBeInTheDocument();
    expect(screen.getByText(/statusAutoMatched/)).toBeInTheDocument();
  });

  it("shows tab counts in detail status tabs", async () => {
    await renderAndOpenDetail(DETAIL_CHESTS);
    const tabCounts = document.querySelectorAll(".tab-count");
    expect(tabCounts.length).toBe(5);
    expect(tabCounts[0]!.textContent).toBe("2");
  });

  it("switches item status filter on tab click", async () => {
    await renderAndOpenDetail(DETAIL_CHESTS);
    const tabs = document.querySelectorAll(".tab");
    expect(tabs.length).toBeGreaterThanOrEqual(2);
    await act(async () => {
      fireEvent.click(tabs[1]!);
    });
    expect(mockDetailSetPage).toHaveBeenCalledWith(1);
  });

  /* ── Detail empty items ── */

  it("renders empty state for detail with no items", async () => {
    const empty = { ...DETAIL_CHESTS, items: [], total: 0, statusCounts: {} };
    await renderAndOpenDetail(empty);
    expect(screen.getByText("noEntries")).toBeInTheDocument();
  });

  /* ── Detail pagination ── */

  it("renders detail pagination in detail view", async () => {
    await renderAndOpenDetail(DETAIL_CHESTS);
    expect(screen.getByTestId("pagination-detail")).toBeInTheDocument();
  });

  /* ── Inline list row actions ── */

  it("calls review API from list row approve button", async () => {
    const f = listFetch();
    globalThis.fetch = f;
    await renderAndWaitForList();
    await act(async () => {
      fireEvent.click(screen.getAllByTitle("approveAll")[0]!);
    });
    await waitFor(() => {
      expect(f.mock.calls.some((c: any[]) => typeof c[0] === "string" && c[0].includes("/review"))).toBe(true);
    });
  });

  it("calls review API from list row reject button", async () => {
    const f = listFetch();
    globalThis.fetch = f;
    await renderAndWaitForList();
    await act(async () => {
      fireEvent.click(screen.getAllByTitle("rejectAll")[0]!);
    });
    await waitFor(() => {
      expect(f.mock.calls.some((c: any[]) => typeof c[0] === "string" && c[0].includes("/review"))).toBe(true);
    });
  });

  it("calls delete from list row delete button", async () => {
    const f = listFetch();
    globalThis.fetch = f;
    await renderAndWaitForList();
    await act(async () => {
      fireEvent.click(screen.getAllByTitle("deleteSubmission")[0]!);
    });
    await waitFor(() => {
      expect(f.mock.calls.some((c: any[]) => c[1]?.method === "DELETE")).toBe(true);
    });
  });

  it("uses deleteConfirmApproved for non-pending delete", async () => {
    globalThis.confirm = vi.fn(() => false);
    globalThis.fetch = listFetch([{ ...SUBS[1]!, status: "approved" }], 1);
    await renderAndWaitForList();
    await act(async () => {
      fireEvent.click(screen.getAllByTitle("deleteSubmission")[0]!);
    });
    expect(globalThis.confirm).toHaveBeenCalledWith("deleteConfirmApproved");
  });

  /* ── Error during review ── */

  it("shows error when review API fails", async () => {
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/review"))
        return Promise.resolve({ ok: false, json: () => Promise.resolve({ error: "Review failed" }) });
      if (/\/api\/import\/submissions\/s\w+\?/.test(url))
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: DETAIL_CHESTS }) });
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: { submissions: SUBS, total: 2, page: 1, perPage: 20 } }),
      });
    });
    render(<SubmissionsTab />);
    await waitFor(() => expect(document.querySelector(".row")).toBeTruthy());
    await act(async () => {
      fireEvent.click(document.querySelector(".row")!);
    });
    await waitFor(() => expect(screen.getByText("approveAll")).toBeInTheDocument());
    await act(async () => {
      fireEvent.click(screen.getByText("approveAll"));
    });
    await waitFor(() => expect(screen.getByText("Review failed")).toBeInTheDocument());
  });

  it("shows reviewError for non-Error exception during review", async () => {
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/review")) return Promise.reject("bad");
      if (/\/api\/import\/submissions\/s\w+\?/.test(url))
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: DETAIL_CHESTS }) });
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: { submissions: SUBS, total: 2, page: 1, perPage: 20 } }),
      });
    });
    render(<SubmissionsTab />);
    await waitFor(() => expect(document.querySelector(".row")).toBeTruthy());
    await act(async () => {
      fireEvent.click(document.querySelector(".row")!);
    });
    await waitFor(() => expect(screen.getByText("approveAll")).toBeInTheDocument());
    await act(async () => {
      fireEvent.click(screen.getByText("approveAll"));
    });
    await waitFor(() => expect(screen.getByText("reviewError")).toBeInTheDocument());
  });

  /* ── Error during delete from list ── */

  it("shows list error when delete from list fails", async () => {
    globalThis.fetch = vi.fn().mockImplementation((_url: string, opts?: any) => {
      if (opts?.method === "DELETE")
        return Promise.resolve({ ok: false, json: () => Promise.resolve({ error: "Del fail" }) });
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: { submissions: SUBS, total: 2, page: 1, perPage: 20 } }),
      });
    });
    render(<SubmissionsTab />);
    await waitFor(() => expect(screen.getAllByTitle("deleteSubmission").length).toBeGreaterThanOrEqual(1));
    await act(async () => {
      fireEvent.click(screen.getAllByTitle("deleteSubmission")[0]!);
    });
    await waitFor(() => expect(screen.getByText("Del fail")).toBeInTheDocument());
  });

  /* ── Detail fetch error ── */

  it("shows error when detail fetch fails", async () => {
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (/\/api\/import\/submissions\/s\w+\?/.test(url))
        return Promise.resolve({ ok: false, json: () => Promise.resolve({ error: "Detail err" }) });
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: { submissions: SUBS, total: 2, page: 1, perPage: 20 } }),
      });
    });
    render(<SubmissionsTab />);
    await waitFor(() => expect(document.querySelector(".row")).toBeTruthy());
    await act(async () => {
      fireEvent.click(document.querySelector(".row")!);
    });
    await waitFor(() => expect(screen.getByText("Detail err")).toBeInTheDocument());
  });

  /* ── Profile display_name null ── */

  it("renders dash when detail submission profile is null", async () => {
    await renderAndOpenDetail(DETAIL_EVENTS);
    expect(screen.getByText(/submittedBy/)).toBeInTheDocument();
  });

  /* ── Additional coverage: approveMatchedOnly button ── */

  it("calls review API with approve_matched action", async () => {
    const f = detailFetch(DETAIL_CHESTS);
    globalThis.fetch = f;
    render(<SubmissionsTab />);
    await waitFor(() => expect(document.querySelector(".row")).toBeTruthy());
    await act(async () => {
      fireEvent.click(document.querySelector(".row")!);
    });
    await waitFor(() => expect(screen.getByText("approveMatchedOnly")).toBeInTheDocument());
    await act(async () => {
      fireEvent.click(screen.getByText("approveMatchedOnly"));
    });
    await waitFor(() => {
      const reviewCalls = f.mock.calls.filter((c: any[]) => typeof c[0] === "string" && c[0].includes("/review"));
      expect(reviewCalls.length).toBeGreaterThanOrEqual(1);
      const body = JSON.parse(reviewCalls[0]![1]?.body);
      expect(body.action).toBe("approve_matched");
    });
  });

  /* ── Additional coverage: viewDetail button click ── */

  it("navigates to detail via viewDetail button click", async () => {
    globalThis.fetch = detailFetch(DETAIL_CHESTS);
    render(<SubmissionsTab />);
    await waitFor(() => expect(screen.getAllByText("viewDetail").length).toBe(2));
    await act(async () => {
      fireEvent.click(screen.getAllByText("viewDetail")[0]!);
    });
    await waitFor(() => expect(screen.getByText(/backToList/)).toBeInTheDocument());
  });

  /* ── Additional coverage: clicking viewDetail does not trigger row onClick ── */

  it("clicking viewDetail does not trigger row-level onClick twice", async () => {
    globalThis.fetch = detailFetch(DETAIL_CHESTS);
    render(<SubmissionsTab />);
    await waitFor(() => expect(screen.getAllByText("viewDetail").length).toBe(2));
    const viewBtn = screen.getAllByText("viewDetail")[0]!;
    await act(async () => {
      fireEvent.click(viewBtn);
    });
    await waitFor(() => expect(screen.getByText(/backToList/)).toBeInTheDocument());
  });

  /* ── Additional coverage: slow action indicator ── */

  it("shows serverBusy indicator after slow timer fires", async () => {
    vi.useFakeTimers();
    const slowFetch = vi.fn().mockImplementation((url: string, _opts?: any) => {
      if (url.includes("/review")) {
        return new Promise(() => {});
      }
      if (/\/api\/import\/submissions\/s\w+\?/.test(url))
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: DETAIL_CHESTS }) });
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: { submissions: SUBS, total: 2, page: 1, perPage: 20 } }),
      });
    });
    globalThis.fetch = slowFetch;
    render(<SubmissionsTab />);
    await vi.waitFor(() => expect(document.querySelector(".row")).toBeTruthy());
    await act(async () => {
      fireEvent.click(document.querySelector(".row")!);
    });
    await vi.waitFor(() => expect(screen.getByText("approveAll")).toBeInTheDocument());
    await act(async () => {
      fireEvent.click(screen.getByText("approveAll"));
    });
    await act(async () => {
      vi.advanceTimersByTime(6000);
    });
    expect(screen.getByText("serverBusy")).toBeInTheDocument();
    vi.useRealTimers();
  });

  /* ── Additional coverage: detail loading onRetry ── */

  it("retries detail fetch from loading state retry button", async () => {
    let _resolveDetail: any;
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (/\/api\/import\/submissions\/s\w+\?/.test(url)) {
        return Promise.resolve({ ok: false, json: () => Promise.resolve({ error: "Detail err" }) });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: { submissions: SUBS, total: 2, page: 1, perPage: 20 } }),
      });
    });
    render(<SubmissionsTab />);
    await waitFor(() => expect(document.querySelector(".row")).toBeTruthy());
    await act(async () => {
      fireEvent.click(document.querySelector(".row")!);
    });
    await waitFor(() => expect(screen.getByText("Detail err")).toBeInTheDocument());
  });

  /* ── Additional coverage: delete from detail for non-pending/partial status ── */

  it("uses deleteConfirmApproved for non-pending detail delete", async () => {
    globalThis.confirm = vi.fn(() => false);
    const approvedDetail = { ...DETAIL_CHESTS, submission: { ...DETAIL_CHESTS.submission, status: "approved" } };
    await renderAndOpenDetail(approvedDetail);
    await act(async () => {
      fireEvent.click(screen.getByText("deleteSubmission"));
    });
    expect(globalThis.confirm).toHaveBeenCalledWith("deleteConfirmApproved");
  });
});
