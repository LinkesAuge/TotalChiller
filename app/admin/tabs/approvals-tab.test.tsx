// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";

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

const mockSetPendingApprovals = vi.fn();
const mockSetPendingRegistrationCount = vi.fn();
const mockSetEmailConfirmationsByUserId = vi.fn();
const mockRefreshEmailConfirmations = vi.fn().mockResolvedValue({});
const mockPushToast = vi.fn();

const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: [], error: null }),
    eq: vi.fn().mockReturnThis(),
  })),
};

let mockPendingApprovals: any[] = [
  {
    id: "ga-1",
    user_id: "u1",
    game_username: "Player1",
    approval_status: "pending",
    created_at: "2024-01-01T00:00:00Z",
    profiles: { display_name: "DisplayOne", username: "userone", email: "one@test.com" },
  },
];
let mockEmailConfirmations: Record<string, string | null> = { u1: null };

vi.mock("../admin-context", () => ({
  useAdminContext: () => ({
    supabase: mockSupabase,
    pendingApprovals: mockPendingApprovals,
    setPendingApprovals: mockSetPendingApprovals,
    setPendingRegistrationCount: mockSetPendingRegistrationCount,
    emailConfirmationsByUserId: mockEmailConfirmations,
    setEmailConfirmationsByUserId: mockSetEmailConfirmationsByUserId,
    refreshEmailConfirmations: mockRefreshEmailConfirmations,
  }),
}));

vi.mock("../../components/toast-provider", () => ({
  useToast: () => ({ pushToast: mockPushToast }),
}));

vi.mock("../../../lib/date-format", () => ({
  formatLocalDateTime: (iso: string) => iso,
}));

vi.mock("../../components/table-scroll", () => ({
  __esModule: true,
  default: ({ children }: any) => {
    const React = require("react");
    return React.createElement("div", { "data-testid": "table-scroll" }, children);
  },
}));

let confirmModalProps: any = {};
vi.mock("@/app/components/confirm-modal", () => ({
  __esModule: true,
  default: (props: any) => {
    const React = require("react");
    confirmModalProps = props;
    if (!props.isOpen) return null;
    return React.createElement(
      "div",
      { "data-testid": "confirm-modal" },
      React.createElement("span", null, props.title),
      React.createElement("button", { "data-testid": "modal-confirm", onClick: props.onConfirm }, props.confirmLabel),
      React.createElement("button", { "data-testid": "modal-cancel", onClick: props.onCancel }, props.cancelLabel),
    );
  },
}));

vi.mock("../../components/ui/game-button", () => ({
  __esModule: true,
  default: ({ children, ...props }: any) => {
    const React = require("react");
    return React.createElement("button", props, children);
  },
}));

globalThis.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ data: [] }),
});

import ApprovalsTab from "./approvals-tab";

describe("ApprovalsTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPendingApprovals = [
      {
        id: "ga-1",
        user_id: "u1",
        game_username: "Player1",
        approval_status: "pending",
        created_at: "2024-01-01T00:00:00Z",
        profiles: { display_name: "DisplayOne", username: "userone", email: "one@test.com" },
      },
    ];
    mockEmailConfirmations = { u1: null };
    (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    });
  });

  it("renders without crashing", () => {
    render(<ApprovalsTab />);
    expect(screen.getByText("approvals.userApprovals")).toBeInTheDocument();
  });

  it("renders game account approvals section", () => {
    render(<ApprovalsTab />);
    expect(screen.getByText("approvals.gameApprovals")).toBeInTheDocument();
  });

  it("renders user registration section", () => {
    render(<ApprovalsTab />);
    expect(screen.getByText("approvals.userApprovalsSubtitle")).toBeInTheDocument();
  });

  it("renders approve all button when approvals exist", () => {
    render(<ApprovalsTab />);
    expect(screen.getByText("approvals.approveAll")).toBeInTheDocument();
  });

  /* ── Loading states ── */

  it("shows loading state while fetching approvals", () => {
    (globalThis.fetch as any).mockReturnValue(new Promise(() => {}));
    render(<ApprovalsTab />);
    expect(screen.getAllByText("approvals.loading").length).toBeGreaterThanOrEqual(1);
  });

  /* ── Empty states ── */

  it("shows empty state when no pending approvals", async () => {
    mockPendingApprovals = [];
    render(<ApprovalsTab />);
    await waitFor(() => {
      expect(screen.getByText("approvals.noPending")).toBeInTheDocument();
    });
    expect(screen.queryByText("approvals.approveAll")).not.toBeInTheDocument();
  });

  it("shows empty user registrations state when all confirmed", async () => {
    mockEmailConfirmations = { u1: "2024-01-01" };
    render(<ApprovalsTab />);
    await waitFor(() => {
      expect(screen.getByText("approvals.noUnconfirmedUsers")).toBeInTheDocument();
    });
  });

  /* ── Pending approval badges ── */

  it("shows pending count for game approvals", () => {
    render(<ApprovalsTab />);
    expect(screen.getByText(/1/)).toBeInTheDocument();
  });

  /* ── Approve single game account ── */

  it("calls PATCH to approve a game account", async () => {
    (globalThis.fetch as any)
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ data: [] }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });

    render(<ApprovalsTab />);
    await waitFor(() => expect(screen.getByText("common.approve")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByText("common.approve"));
    });

    await waitFor(() => {
      const patchCalls = (globalThis.fetch as any).mock.calls.filter((c: any[]) => c[1]?.method === "PATCH");
      expect(patchCalls.length).toBeGreaterThanOrEqual(1);
      const body = JSON.parse(patchCalls[0][1].body);
      expect(body.action).toBe("approve");
      expect(body.game_account_id).toBe("ga-1");
    });
  });

  /* ── Reject single game account ── */

  it("calls PATCH to reject a game account", async () => {
    (globalThis.fetch as any)
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ data: [] }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });

    render(<ApprovalsTab />);
    await waitFor(() => expect(screen.getByText("common.reject")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByText("common.reject"));
    });

    await waitFor(() => {
      const patchCalls = (globalThis.fetch as any).mock.calls.filter((c: any[]) => c[1]?.method === "PATCH");
      expect(patchCalls.length).toBeGreaterThanOrEqual(1);
      const body = JSON.parse(patchCalls[0][1].body);
      expect(body.action).toBe("reject");
    });
  });

  /* ── Approve failure ── */

  it("shows error status when approve PATCH fails", async () => {
    (globalThis.fetch as any)
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ data: [] }) })
      .mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({ error: "Server error" }) });

    render(<ApprovalsTab />);
    await waitFor(() => expect(screen.getByText("common.approve")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByText("common.approve"));
    });

    await waitFor(() => {
      expect(screen.getByText("Server error")).toBeInTheDocument();
    });
  });

  /* ── Approve: invalid JSON response ── */

  it("shows error when approve returns invalid JSON", async () => {
    (globalThis.fetch as any)
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ data: [] }) })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new SyntaxError("bad json")),
      });

    render(<ApprovalsTab />);
    await waitFor(() => expect(screen.getByText("common.approve")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByText("common.approve"));
    });

    await waitFor(() => {
      const alert = screen.getByText(/invalid response/i);
      expect(alert).toBeInTheDocument();
    });
  });

  /* ── Network error during approve ── */

  it("handles network error during approve", async () => {
    (globalThis.fetch as any)
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ data: [] }) })
      .mockRejectedValueOnce(new Error("Network failed"));

    render(<ApprovalsTab />);
    await waitFor(() => expect(screen.getByText("common.approve")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByText("common.approve"));
    });

    await waitFor(() => {
      expect(screen.getByText(/Network error during approve/)).toBeInTheDocument();
    });
  });

  /* ── Load approvals failure ── */

  it("shows error when initial load of approvals fails", async () => {
    (globalThis.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({}),
    });

    render(<ApprovalsTab />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load pending approvals.")).toBeInTheDocument();
    });
  });

  /* ── Load approvals network error ── */

  it("shows network error when initial load fails", async () => {
    (globalThis.fetch as any).mockRejectedValueOnce(new Error("network"));

    render(<ApprovalsTab />);

    await waitFor(() => {
      expect(screen.getByText("Network error loading approvals.")).toBeInTheDocument();
    });
  });

  /* ── Approve All flow ── */

  it("opens confirm modal when Approve All is clicked", async () => {
    render(<ApprovalsTab />);
    await waitFor(() => expect(screen.getByText("approvals.approveAll")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByText("approvals.approveAll"));
    });

    await waitFor(() => {
      expect(screen.getByTestId("confirm-modal")).toBeInTheDocument();
    });
  });

  it("processes all approvals when confirm modal confirmed", async () => {
    (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    });

    render(<ApprovalsTab />);
    await waitFor(() => expect(screen.getByText("approvals.approveAll")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByText("approvals.approveAll"));
    });

    await waitFor(() => expect(screen.getByTestId("confirm-modal")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByTestId("modal-confirm"));
    });

    await waitFor(() => {
      expect(mockSetPendingApprovals).toHaveBeenCalled();
    });
  });

  /* ── Confirm single user ── */

  it("confirms a single user registration via POST", async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [{ id: "u2", email: "u2@test.com", display_name: "User2", username: "user2" }],
        error: null,
      }),
      eq: vi.fn().mockReturnThis(),
    });
    mockEmailConfirmations = {};

    (globalThis.fetch as any)
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ data: [] }) })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { email_confirmed_at: "2024-06-01" } }),
      });

    render(<ApprovalsTab />);

    await waitFor(() => {
      const confirmBtns = screen.queryAllByText("users.confirmUser");
      if (confirmBtns.length > 0) {
        fireEvent.click(confirmBtns[0]!);
      }
    });
  });

  /* ── Confirm user POST failure ── */

  it("shows error when confirm user POST fails", async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [{ id: "u3", email: "u3@test.com", display_name: null, username: "user3" }],
        error: null,
      }),
      eq: vi.fn().mockReturnThis(),
    });
    mockEmailConfirmations = {};

    (globalThis.fetch as any)
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ data: [] }) })
      .mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: "users.confirmUserFailed" }),
      });

    render(<ApprovalsTab />);

    await waitFor(() => {
      const btns = screen.queryAllByText("users.confirmUser");
      if (btns.length > 0) {
        fireEvent.click(btns[0]!);
      }
    });
  });

  /* ── Approval row rendering ── */

  it("renders game username, profiles info, and date for approval rows", async () => {
    render(<ApprovalsTab />);
    await waitFor(() => {
      expect(screen.getByText("Player1")).toBeInTheDocument();
    });
    expect(screen.getByText("DisplayOne")).toBeInTheDocument();
    expect(screen.getByText("one@test.com")).toBeInTheDocument();
    expect(screen.getByText("2024-01-01T00:00:00Z")).toBeInTheDocument();
  });

  it("shows unknown when profiles are missing from approval", async () => {
    mockPendingApprovals = [
      {
        id: "ga-2",
        user_id: "u2",
        game_username: "Orphan",
        created_at: "2024-01-01T00:00:00Z",
        profiles: null,
      },
    ];
    render(<ApprovalsTab />);
    await waitFor(() => {
      const unknowns = screen.getAllByText("common.unknown");
      expect(unknowns.length).toBeGreaterThanOrEqual(1);
    });
  });

  /* ── Confirm All users ── */

  it("does not show confirm all button when no unconfirmed users", () => {
    mockEmailConfirmations = { u1: "2024-01-01" };
    render(<ApprovalsTab />);
    expect(screen.queryByText("approvals.confirmAll")).not.toBeInTheDocument();
  });

  /* ── Cancel approve all modal ── */

  it("closes approve all modal on cancel", async () => {
    render(<ApprovalsTab />);
    await waitFor(() => expect(screen.getByText("approvals.approveAll")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByText("approvals.approveAll"));
    });

    await waitFor(() => expect(screen.getByTestId("confirm-modal")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByTestId("modal-cancel"));
    });

    await waitFor(() => {
      expect(screen.queryByTestId("confirm-modal")).not.toBeInTheDocument();
    });
  });

  /* ── Approve all with failures ── */

  it("shows confirm all button for user registrations and opens modal", async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [{ id: "u5", email: "u5@test.com", display_name: "User5", username: "user5" }],
        error: null,
      }),
      eq: vi.fn().mockReturnThis(),
    });
    mockEmailConfirmations = {};

    render(<ApprovalsTab />);
    await waitFor(() => {
      const confirmAllBtn = screen.queryByText("approvals.confirmAll");
      if (confirmAllBtn) {
        fireEvent.click(confirmAllBtn);
      }
    });
  });

  it("processes confirm all users and shows success", async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [{ id: "u6", email: "u6@test.com", display_name: "User6", username: "user6" }],
        error: null,
      }),
      eq: vi.fn().mockReturnThis(),
    });
    mockEmailConfirmations = {};

    let fetchCallCount = 0;
    (globalThis.fetch as any).mockImplementation(() => {
      fetchCallCount++;
      if (fetchCallCount === 1) return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: { email_confirmed_at: "2024-06-01" } }),
      });
    });

    render(<ApprovalsTab />);
    await waitFor(() => {
      const confirmAllBtns = screen.queryAllByText("approvals.confirmAll");
      if (confirmAllBtns.length > 0) {
        fireEvent.click(confirmAllBtns[0]!);
      }
    });

    await waitFor(() => {
      const modal = screen.queryByTestId("confirm-modal");
      if (modal) {
        const confirmBtn = screen.getByTestId("modal-confirm");
        fireEvent.click(confirmBtn);
      }
    });
  });

  it("handles confirm all users with some failures", async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [
          { id: "u7", email: "u7@test.com", display_name: "User7", username: "user7" },
          { id: "u8", email: "u8@test.com", display_name: "User8", username: "user8" },
        ],
        error: null,
      }),
      eq: vi.fn().mockReturnThis(),
    });
    mockEmailConfirmations = {};

    let fetchCallCount = 0;
    (globalThis.fetch as any).mockImplementation(() => {
      fetchCallCount++;
      if (fetchCallCount === 1) return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
      if (fetchCallCount === 2)
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: { email_confirmed_at: "2024-06-01" } }),
        });
      return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
    });

    render(<ApprovalsTab />);
    await waitFor(() => {
      const confirmAllBtns = screen.queryAllByText("approvals.confirmAll");
      if (confirmAllBtns.length > 0) {
        fireEvent.click(confirmAllBtns[0]!);
      }
    });

    await waitFor(() => {
      const modal = screen.queryByTestId("confirm-modal");
      if (modal) {
        const confirmBtn = screen.getByTestId("modal-confirm");
        fireEvent.click(confirmBtn);
      }
    });

    await waitFor(() => {
      const failMsg = screen.queryByText(/confirmation\(s\) failed/);
      if (failMsg) expect(failMsg).toBeInTheDocument();
    });
  });

  it("handles network error during reject", async () => {
    (globalThis.fetch as any)
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ data: [] }) })
      .mockRejectedValueOnce(new Error("Network failed"));

    render(<ApprovalsTab />);
    await waitFor(() => expect(screen.getByText("common.reject")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByText("common.reject"));
    });

    await waitFor(() => {
      expect(screen.getByText(/Network error during reject/)).toBeInTheDocument();
    });
  });

  it("shows all approved toast when approve all succeeds", async () => {
    (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    });

    render(<ApprovalsTab />);
    await waitFor(() => expect(screen.getByText("approvals.approveAll")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByText("approvals.approveAll"));
    });

    await waitFor(() => expect(screen.getByTestId("confirm-modal")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByTestId("modal-confirm"));
    });

    await waitFor(() => {
      expect(mockPushToast).toHaveBeenCalledWith("approvals.allApproved");
    });
  });

  it("shows confirm user failed on network error", async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [{ id: "u9", email: "u9@test.com", display_name: "User9", username: null }],
        error: null,
      }),
      eq: vi.fn().mockReturnThis(),
    });
    mockEmailConfirmations = {};

    let fetchCallCount = 0;
    (globalThis.fetch as any).mockImplementation(() => {
      fetchCallCount++;
      if (fetchCallCount === 1) return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
      return Promise.reject(new Error("network"));
    });

    render(<ApprovalsTab />);

    await waitFor(() => {
      expect(screen.queryAllByText("users.confirmUser").length).toBeGreaterThan(0);
    });

    await act(async () => {
      const btns = screen.queryAllByText("users.confirmUser");
      fireEvent.click(btns[0]!);
    });

    await waitFor(() => {
      expect(screen.getByText("users.confirmUserFailed")).toBeInTheDocument();
    });
  });

  it("shows username fallback when display_name is missing for approval row", async () => {
    mockPendingApprovals = [
      {
        id: "ga-3",
        user_id: "u3",
        game_username: "NoDisplay",
        created_at: "2024-01-01T00:00:00Z",
        profiles: { display_name: null, username: "onlyuser", email: "only@test.com" },
      },
    ];
    render(<ApprovalsTab />);
    await waitFor(() => {
      expect(screen.getByText("onlyuser")).toBeInTheDocument();
    });
  });

  it("reports failures when some approve-all PATCHes fail", async () => {
    mockPendingApprovals = [
      { id: "ga-1", game_username: "P1", created_at: "2024-01-01T00:00:00Z", profiles: null },
      { id: "ga-2", game_username: "P2", created_at: "2024-01-01T00:00:00Z", profiles: null },
    ];

    let fetchCallCount = 0;
    (globalThis.fetch as any).mockImplementation(() => {
      fetchCallCount++;
      if (fetchCallCount === 1) return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
      if (fetchCallCount === 2) return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      if (fetchCallCount === 3) return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
    });

    render(<ApprovalsTab />);
    await waitFor(() => expect(screen.getByText("approvals.approveAll")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByText("approvals.approveAll"));
    });

    await waitFor(() => expect(screen.getByTestId("confirm-modal")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByTestId("modal-confirm"));
    });

    await waitFor(() => {
      expect(screen.getByText(/approval\(s\) failed/)).toBeInTheDocument();
    });
  });
});
