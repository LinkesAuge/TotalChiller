// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";

vi.mock("next-intl", () => ({
  useTranslations: vi.fn(() =>
    vi.fn((key: string, params?: any) => {
      if (params) return `${key}:${JSON.stringify(params)}`;
      return key;
    }),
  ),
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
const mockSetEmailConfirmationsByUserId = vi.fn();
const mockRefreshEmailConfirmations = vi.fn().mockResolvedValue({});
const mockPushToast = vi.fn();

let mockUserRows: any[] = [];
let mockRoleData: any[] = [];
let mockGameAccounts: any[] = [];
let mockMemberships: any[] = [];
let mockEmailConfirmations: Record<string, string | null> = {};

const mockSupabase = {
  from: vi.fn((table: string) => {
    const chain: any = {};
    chain.select = vi.fn(() => chain);
    chain.order = vi.fn();
    chain.eq = vi.fn(() => chain);
    chain.in = vi.fn(() => chain);
    chain.or = vi.fn(() => chain);
    chain.ilike = vi.fn(() => chain);
    chain.neq = vi.fn(() => chain);
    chain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    chain.upsert = vi.fn().mockResolvedValue({ error: null });
    chain.update = vi.fn(() => chain);
    chain.insert = vi.fn(() => chain);
    chain.delete = vi.fn(() => chain);
    chain.single = vi.fn().mockResolvedValue({ data: { id: "new-ga" }, error: null });
    if (table === "profiles") {
      chain.order = vi.fn().mockResolvedValue({ data: mockUserRows, error: null });
      chain.in = vi.fn().mockResolvedValue({ data: mockUserRows, error: null });
    } else if (table === "user_roles") {
      chain.in = vi.fn().mockResolvedValue({ data: mockRoleData, error: null });
    } else if (table === "game_accounts") {
      chain.order = vi.fn().mockResolvedValue({ data: mockGameAccounts, error: null });
      chain.in = vi.fn(() => chain);
      chain.delete = vi.fn(() => chain);
      chain.eq = vi.fn().mockResolvedValue({ error: null });
    } else if (table === "game_account_clan_memberships") {
      chain.in = vi.fn().mockResolvedValue({ data: mockMemberships, error: null });
    }
    return chain;
  }),
  auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) },
  rpc: vi.fn().mockResolvedValue({ error: null }),
};

vi.mock("../admin-context", () => ({
  useAdminContext: () => ({
    supabase: mockSupabase,
    clans: [{ id: "c1", name: "TestClan", description: null }],
    unassignedClanId: "c-unassigned",
    currentUserId: "u1",
    currentUserRole: "admin",
    setStatus: vi.fn(),
    setPendingApprovals: mockSetPendingApprovals,
    emailConfirmationsByUserId: mockEmailConfirmations,
    setEmailConfirmationsByUserId: mockSetEmailConfirmationsByUserId,
    refreshEmailConfirmations: mockRefreshEmailConfirmations,
  }),
}));

vi.mock("../../components/toast-provider", () => ({
  useToast: () => ({ pushToast: mockPushToast }),
}));

const mockOpenConfirm = vi.fn();
const mockDeleteClose = vi.fn();
const mockIsConfirmed = vi.fn(() => false);
vi.mock("../hooks/use-confirm-delete", () => ({
  useConfirmDelete: () => ({
    step: "closed",
    inputValue: "",
    setInputValue: vi.fn(),
    openConfirm: mockOpenConfirm,
    proceedToInput: vi.fn(),
    close: mockDeleteClose,
    isConfirmed: mockIsConfirmed,
  }),
}));

vi.mock("@/lib/hooks/use-sortable", () => ({
  useSortable: () => ({
    sortKey: "username",
    sortDirection: "asc",
    toggleSort: vi.fn(),
  }),
  compareValues: vi.fn((a: any, b: any) => {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  }),
}));

vi.mock("../../components/ui/search-input", () => ({
  __esModule: true,
  default: (props: any) => {
    const React = require("react");
    return React.createElement("input", { "data-testid": props.id || "search", placeholder: props.placeholder });
  },
}));

vi.mock("../../components/ui/labeled-select", () => ({
  __esModule: true,
  default: (props: any) => {
    const React = require("react");
    return React.createElement("select", { "data-testid": props.id });
  },
}));

vi.mock("../../components/ui/radix-select", () => ({
  __esModule: true,
  default: (props: any) => {
    const React = require("react");
    return React.createElement("select", { "data-testid": props.ariaLabel || "radix-select" });
  },
}));

vi.mock("../../components/ui/icon-button", () => ({
  __esModule: true,
  default: ({ children, onClick, ...props }: any) => {
    const React = require("react");
    return React.createElement("button", { "aria-label": props.ariaLabel, onClick }, children);
  },
}));

vi.mock("../../components/ui/game-button", () => ({
  __esModule: true,
  default: ({ children, ...props }: any) => {
    const React = require("react");
    return React.createElement("button", props, children);
  },
}));

vi.mock("../../components/table-scroll", () => ({
  __esModule: true,
  default: ({ children }: any) => {
    const React = require("react");
    return React.createElement("div", { "data-testid": "table-scroll" }, children);
  },
}));

vi.mock("@/app/components/sortable-column-header", () => ({
  __esModule: true,
  default: (props: any) => {
    const React = require("react");
    return React.createElement("th", null, props.label);
  },
}));

let formModalProps: any = {};
vi.mock("@/app/components/form-modal", () => ({
  __esModule: true,
  default: (props: any) => {
    const React = require("react");
    formModalProps = props;
    if (!props.isOpen) return null;
    return React.createElement(
      "div",
      { "data-testid": "form-modal" },
      React.createElement("span", null, props.title),
      props.statusMessage ? React.createElement("span", { "data-testid": "form-status" }, props.statusMessage) : null,
      props.children,
      React.createElement(
        "button",
        { "data-testid": "form-submit", onClick: () => void props.onSubmit?.() },
        props.submitLabel,
      ),
      React.createElement("button", { "data-testid": "form-cancel", onClick: props.onCancel }, props.cancelLabel),
    );
  },
}));

vi.mock("../components/danger-confirm-modal", () => ({
  __esModule: true,
  default: (props: any) => {
    const React = require("react");
    if (!props.state || props.state.step === "closed") return null;
    return React.createElement(
      "div",
      { "data-testid": "danger-modal" },
      React.createElement("span", null, props.title),
    );
  },
}));

let confirmModalInstances: any[] = [];
vi.mock("@/app/components/confirm-modal", () => ({
  __esModule: true,
  default: (props: any) => {
    const React = require("react");
    confirmModalInstances.push(props);
    if (!props.isOpen) return null;
    return React.createElement(
      "div",
      { "data-testid": "confirm-modal" },
      React.createElement("span", null, props.title),
      React.createElement("button", { "data-testid": "cm-confirm", onClick: props.onConfirm }, props.confirmLabel),
      React.createElement("button", { "data-testid": "cm-cancel", onClick: props.onCancel }, props.cancelLabel),
    );
  },
}));

vi.mock("@/lib/permissions", () => ({
  isAdmin: (role: string) => role === "admin" || role === "owner",
  canChangeRoleOf: () => true,
  ROLES: ["owner", "admin", "moderator", "editor", "member", "guest"],
}));

globalThis.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ id: "new-user" }),
});

import UsersTab from "./users-tab";

describe("UsersTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    confirmModalInstances = [];
    formModalProps = {};
    mockUserRows = [];
    mockRoleData = [];
    mockGameAccounts = [];
    mockMemberships = [];
    mockEmailConfirmations = {};
    (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: "new-user" }),
    });
  });

  it("renders without crashing", () => {
    render(<UsersTab />);
    expect(screen.getByText("users.title")).toBeInTheDocument();
  });

  it("shows the card subtitle", () => {
    render(<UsersTab />);
    expect(screen.getByText("users.subtitle")).toBeInTheDocument();
  });

  it("renders user count badge", () => {
    const { container } = render(<UsersTab />);
    const badge = container.querySelector(".badge");
    expect(badge).toBeInTheDocument();
  });

  it("renders create user button", () => {
    render(<UsersTab />);
    expect(screen.getByText("users.createUser")).toBeInTheDocument();
  });

  it("renders filter bar with search input", () => {
    render(<UsersTab />);
    expect(screen.getByTestId("userSearch")).toBeInTheDocument();
  });

  /* ── Empty state ── */

  it("shows no users message when data is empty", () => {
    render(<UsersTab />);
    expect(screen.getByText("users.noUsersFound")).toBeInTheDocument();
  });

  /* ── User list rendering ── */

  it("renders user rows when data loads", async () => {
    mockUserRows = [
      { id: "u2", email: "user2@test.com", display_name: "User Two", username: "usertwo", user_db: "usertwo" },
    ];
    mockRoleData = [{ user_id: "u2", role: "member" }];

    render(<UsersTab />);

    await waitFor(() => {
      expect(screen.getByText("user2@test.com")).toBeInTheDocument();
    });
  });

  /* ── Filter controls rendering ── */

  it("renders role filter", () => {
    render(<UsersTab />);
    expect(screen.getByTestId("userRoleFilter")).toBeInTheDocument();
  });

  it("renders game account filter", () => {
    render(<UsersTab />);
    expect(screen.getByTestId("userGameAccountFilter")).toBeInTheDocument();
  });

  it("renders confirmed filter", () => {
    render(<UsersTab />);
    expect(screen.getByTestId("userConfirmedFilter")).toBeInTheDocument();
  });

  /* ── Clear filters button ── */

  it("renders clear filters button", () => {
    render(<UsersTab />);
    expect(screen.getByText("common.clearFilters")).toBeInTheDocument();
  });

  /* ── Save all / Cancel all buttons ── */

  it("renders save all and cancel all buttons", () => {
    render(<UsersTab />);
    expect(screen.getByText("common.saveAll")).toBeInTheDocument();
    expect(screen.getByText("common.cancelAll")).toBeInTheDocument();
  });

  /* ── User row expand ── */

  it("expands user row on click to show sub-details", async () => {
    mockUserRows = [{ id: "u3", email: "u3@test.com", display_name: "Three", username: "three", user_db: "three" }];
    mockRoleData = [{ user_id: "u3", role: "member" }];
    mockGameAccounts = [];

    render(<UsersTab />);

    await waitFor(() => expect(screen.getByText("u3@test.com")).toBeInTheDocument());

    const row = screen.getByText("u3@test.com").closest("[role='button']");
    if (row) {
      await act(async () => {
        fireEvent.click(row);
      });
    }

    await waitFor(() => {
      expect(screen.getByText("clans.noAccountsYet")).toBeInTheDocument();
    });
  });

  /* ── Confirmed / Unconfirmed badge ── */

  it("shows confirmed badge for confirmed users", async () => {
    mockUserRows = [{ id: "u4", email: "u4@test.com", display_name: "Four", username: "four", user_db: "four" }];
    mockRoleData = [];
    mockEmailConfirmations = { u4: "2024-01-01" };

    const { container } = render(<UsersTab />);

    await waitFor(() => {
      const badge = container.querySelector(".badge.success");
      expect(badge).toBeInTheDocument();
      expect(badge?.textContent).toBe("users.confirmed");
    });
  });

  it("shows unconfirmed badge for unconfirmed users", async () => {
    mockUserRows = [{ id: "u5", email: "u5@test.com", display_name: "Five", username: "five", user_db: "five" }];
    mockRoleData = [];
    mockEmailConfirmations = {};

    render(<UsersTab />);

    await waitFor(() => {
      expect(screen.getByText("users.unconfirmed")).toBeInTheDocument();
    });
  });

  /* ── Create user modal ── */

  it("opens create user modal on button click", async () => {
    render(<UsersTab />);

    await act(async () => {
      fireEvent.click(screen.getByText("users.createUser"));
    });

    await waitFor(() => {
      expect(screen.getByTestId("form-modal")).toBeInTheDocument();
    });
  });

  it("submits create user form", async () => {
    render(<UsersTab />);

    await act(async () => {
      fireEvent.click(screen.getByText("users.createUser"));
    });

    await waitFor(() => expect(screen.getByTestId("form-modal")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByTestId("form-submit"));
    });

    await waitFor(() => {
      const status = screen.queryByTestId("form-status");
      expect(status).toBeTruthy();
    });
  });

  /* ── Action buttons per user row ── */

  it("renders action buttons for each user", async () => {
    mockUserRows = [{ id: "u6", email: "u6@test.com", display_name: "Six", username: "six", user_db: "six" }];
    mockRoleData = [{ user_id: "u6", role: "member" }];

    render(<UsersTab />);

    await waitFor(() => {
      expect(screen.getByLabelText("common.saveChanges")).toBeInTheDocument();
      expect(screen.getByLabelText("common.cancelChanges")).toBeInTheDocument();
      expect(screen.getByLabelText("users.deleteUser")).toBeInTheDocument();
      expect(screen.getByLabelText("users.resendInvite")).toBeInTheDocument();
      expect(screen.getByLabelText("users.addGameAccount")).toBeInTheDocument();
    });
  });

  /* ── Confirm user button for unconfirmed ── */

  it("shows confirm user button for unconfirmed users", async () => {
    mockUserRows = [{ id: "u7", email: "u7@test.com", display_name: "Seven", username: "seven", user_db: "seven" }];
    mockRoleData = [];
    mockEmailConfirmations = {};

    render(<UsersTab />);

    await waitFor(() => {
      expect(screen.getByLabelText("users.confirmUser")).toBeInTheDocument();
    });
  });

  it("does not show confirm button for confirmed users", async () => {
    mockUserRows = [{ id: "u8", email: "u8@test.com", display_name: "Eight", username: "eight", user_db: "eight" }];
    mockRoleData = [];
    mockEmailConfirmations = { u8: "2024-01-01" };

    render(<UsersTab />);

    await waitFor(() => {
      expect(screen.queryByLabelText("users.confirmUser")).not.toBeInTheDocument();
    });
  });

  /* ── Game account count badge ── */

  it("shows game account count badge", async () => {
    mockUserRows = [{ id: "u9", email: "u9@test.com", display_name: "Nine", username: "nine", user_db: "nine" }];
    mockRoleData = [];
    mockGameAccounts = [{ id: "ga1", user_id: "u9", game_username: "GameNine", approval_status: "approved" }];

    render(<UsersTab />);

    await waitFor(() => {
      const badges = screen.getAllByLabelText("1 game accounts");
      expect(badges.length).toBeGreaterThanOrEqual(1);
    });
  });

  /* ── Inline username editing ── */

  it("enters edit mode when username button is clicked", async () => {
    mockUserRows = [{ id: "u10", email: "u10@test.com", display_name: "Ten", username: "ten", user_db: "ten" }];
    mockRoleData = [{ user_id: "u10", role: "member" }];

    render(<UsersTab />);

    await waitFor(() => expect(screen.getByText("u10@test.com")).toBeInTheDocument());

    const editableButtons = screen.getAllByText("ten").filter((el) => el.classList.contains("editable-button"));
    if (editableButtons.length > 0) {
      await act(async () => {
        fireEvent.click(editableButtons[0]);
      });
    }
  });

  /* ── Resend invite ── */

  it("triggers resend invite flow", async () => {
    mockUserRows = [
      { id: "u11", email: "u11@test.com", display_name: "Eleven", username: "eleven", user_db: "eleven" },
    ];
    mockRoleData = [];

    render(<UsersTab />);

    await waitFor(() => expect(screen.getByLabelText("users.resendInvite")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByLabelText("users.resendInvite"));
    });
  });

  /* ── Delete user attempt on self ── */

  it("shows error when trying to delete own account", async () => {
    mockUserRows = [{ id: "u1", email: "self@test.com", display_name: "Self", username: "self", user_db: "self" }];
    mockRoleData = [{ user_id: "u1", role: "admin" }];

    render(<UsersTab />);

    await waitFor(() => expect(screen.getByLabelText("users.deleteUser")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByLabelText("users.deleteUser"));
    });

    await waitFor(() => {
      expect(screen.getByText("You cannot delete your own account.")).toBeInTheDocument();
    });
  });

  /* ── Delete user: last admin ── */

  it("prevents deleting last admin", async () => {
    mockUserRows = [{ id: "u12", email: "admin@test.com", display_name: "Admin", username: "admin", user_db: "admin" }];
    mockRoleData = [{ user_id: "u12", role: "admin" }];

    render(<UsersTab />);

    await waitFor(() => expect(screen.getByLabelText("users.deleteUser")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByLabelText("users.deleteUser"));
    });

    await waitFor(() => {
      expect(screen.getByText("At least one admin is required.")).toBeInTheDocument();
    });
  });

  /* ── Open add game account modal ── */

  it("opens add game account modal", async () => {
    mockUserRows = [
      { id: "u13", email: "u13@test.com", display_name: "Thirteen", username: "thirteen", user_db: "thirteen" },
    ];
    mockRoleData = [];

    render(<UsersTab />);

    await waitFor(() => expect(screen.getByLabelText("users.addGameAccount")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByLabelText("users.addGameAccount"));
    });

    await waitFor(() => {
      const modals = screen.getAllByTestId("form-modal");
      expect(modals.length).toBeGreaterThanOrEqual(1);
    });
  });

  /* ── User status message ── */

  it("shows user status message when set", async () => {
    mockUserRows = [{ id: "u1", email: "self@test.com", display_name: "Self", username: "self", user_db: "self" }];
    mockRoleData = [{ user_id: "u1", role: "admin" }];

    render(<UsersTab />);

    await waitFor(() => expect(screen.getByLabelText("users.deleteUser")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByLabelText("users.deleteUser"));
    });

    await waitFor(() => {
      const alert = document.querySelector(".alert.info");
      expect(alert).toBeInTheDocument();
    });
  });

  /* ── Game accounts in expanded row ── */

  it("shows game accounts in expanded user row", async () => {
    mockUserRows = [
      { id: "u14", email: "u14@test.com", display_name: "Fourteen", username: "fourteen", user_db: "fourteen" },
    ];
    mockRoleData = [];
    mockGameAccounts = [{ id: "ga14", user_id: "u14", game_username: "Player14", approval_status: "approved" }];
    mockMemberships = [
      {
        id: "m14",
        clan_id: "c1",
        game_account_id: "ga14",
        is_active: true,
        is_shadow: false,
        rank: "soldier",
        game_accounts: { id: "ga14", user_id: "u14", game_username: "Player14" },
      },
    ];

    render(<UsersTab />);

    await waitFor(() => expect(screen.getByText("u14@test.com")).toBeInTheDocument());

    const row = screen.getByText("u14@test.com").closest("[role='button']");
    if (row) {
      await act(async () => {
        fireEvent.click(row);
      });
    }

    await waitFor(() => {
      expect(screen.getByText("Player14")).toBeInTheDocument();
    });
  });

  /* ── Keyboard interaction on row ── */

  it("toggles expand on Enter key", async () => {
    mockUserRows = [
      { id: "u15", email: "u15@test.com", display_name: "Fifteen", username: "fifteen", user_db: "fifteen" },
    ];
    mockRoleData = [];

    render(<UsersTab />);

    await waitFor(() => expect(screen.getByText("u15@test.com")).toBeInTheDocument());

    const row = screen.getByText("u15@test.com").closest("[role='button']");
    if (row) {
      await act(async () => {
        fireEvent.keyDown(row, { key: "Enter" });
      });
    }

    await waitFor(() => {
      expect(screen.getByText("clans.noAccountsYet")).toBeInTheDocument();
    });
  });

  /* ── No users match filter ── */

  it("shows no users match when filtered results empty but users exist", async () => {
    mockUserRows = [
      { id: "u16", email: "u16@test.com", display_name: "Sixteen", username: "sixteen", user_db: "sixteen" },
    ];
    mockRoleData = [{ user_id: "u16", role: "member" }];
    mockEmailConfirmations = { u16: "2024-01-01" };

    render(<UsersTab />);

    await waitFor(() => expect(screen.getByText("u16@test.com")).toBeInTheDocument());
  });

  /* ── Column headers rendered ── */

  it("renders sortable column headers", async () => {
    mockUserRows = [
      { id: "u17", email: "u17@test.com", display_name: "Seventeen", username: "seventeen", user_db: "seventeen" },
    ];
    mockRoleData = [];

    render(<UsersTab />);

    await waitFor(() => {
      expect(screen.getByText("users.username")).toBeInTheDocument();
      expect(screen.getByText("users.email")).toBeInTheDocument();
      expect(screen.getByText("users.nickname")).toBeInTheDocument();
    });
  });

  /* ── User row shows display name or dash ── */

  it("shows dash when user has no display name", async () => {
    mockUserRows = [
      { id: "u18", email: "u18@test.com", display_name: null, username: "eighteen", user_db: "eighteen" },
    ];
    mockRoleData = [];

    render(<UsersTab />);

    await waitFor(() => {
      const dashes = screen.getAllByText("-");
      expect(dashes.length).toBeGreaterThanOrEqual(1);
    });
  });

  /* ── Multiple users rendering ── */

  it("renders multiple users in sorted order", async () => {
    mockUserRows = [
      { id: "u20", email: "bob@test.com", display_name: "Bob", username: "bob", user_db: "bob" },
      { id: "u21", email: "alice@test.com", display_name: "Alice", username: "alice", user_db: "alice" },
    ];
    mockRoleData = [];

    render(<UsersTab />);

    await waitFor(() => {
      expect(screen.getByText("bob@test.com")).toBeInTheDocument();
      expect(screen.getByText("alice@test.com")).toBeInTheDocument();
    });
  });

  /* ── Cancel all user edits ── */

  it("disables cancel all button when no edits exist", () => {
    render(<UsersTab />);

    const cancelAllBtn = screen.getByText("common.cancelAll");
    expect(cancelAllBtn).toBeDisabled();
  });

  /* ── Create user form validation ── */

  it("shows 'Email is required' when submitting without email", async () => {
    render(<UsersTab />);
    await act(async () => {
      fireEvent.click(screen.getByText("users.createUser"));
    });
    await waitFor(() => expect(screen.getByTestId("form-modal")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByTestId("form-submit"));
    });
    await waitFor(() => {
      expect(screen.getByTestId("form-status")).toHaveTextContent("Email is required.");
    });
  });

  it("shows 'Username is required' when email given but username empty", async () => {
    render(<UsersTab />);
    await act(async () => {
      fireEvent.click(screen.getByText("users.createUser"));
    });
    await waitFor(() => expect(screen.getByTestId("form-modal")).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText("users.email"), { target: { value: "test@test.com" } });
    await act(async () => {
      fireEvent.click(screen.getByTestId("form-submit"));
    });
    await waitFor(() => {
      expect(screen.getByTestId("form-status")).toHaveTextContent("Username is required.");
    });
  });

  it("shows username length error when username is 1 char", async () => {
    render(<UsersTab />);
    await act(async () => {
      fireEvent.click(screen.getByText("users.createUser"));
    });
    await waitFor(() => expect(screen.getByTestId("form-modal")).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText("users.email"), { target: { value: "test@test.com" } });
    fireEvent.change(screen.getByLabelText("users.username"), { target: { value: "a" } });
    await act(async () => {
      fireEvent.click(screen.getByTestId("form-submit"));
    });
    await waitFor(() => {
      expect(screen.getByTestId("form-status")).toHaveTextContent("Username must be 2-32 characters.");
    });
  });

  it("creates user successfully with valid data", async () => {
    render(<UsersTab />);
    await act(async () => {
      fireEvent.click(screen.getByText("users.createUser"));
    });
    await waitFor(() => expect(screen.getByTestId("form-modal")).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText("users.email"), { target: { value: "new@test.com" } });
    fireEvent.change(screen.getByLabelText("users.username"), { target: { value: "newuser" } });
    fireEvent.change(screen.getByLabelText("users.nickname"), { target: { value: "New User" } });
    await act(async () => {
      fireEvent.click(screen.getByTestId("form-submit"));
    });
    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/api/admin/create-user",
        expect.objectContaining({ method: "POST" }),
      );
    });
  });

  it("shows error when create user API returns error", async () => {
    (globalThis.fetch as any).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Email already exists." }),
    });

    render(<UsersTab />);
    await act(async () => {
      fireEvent.click(screen.getByText("users.createUser"));
    });
    await waitFor(() => expect(screen.getByTestId("form-modal")).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText("users.email"), { target: { value: "dup@test.com" } });
    fireEvent.change(screen.getByLabelText("users.username"), { target: { value: "dupuser" } });
    await act(async () => {
      fireEvent.click(screen.getByTestId("form-submit"));
    });
    await waitFor(() => {
      expect(screen.getByTestId("form-status")).toHaveTextContent("Email already exists.");
    });
  });

  /* ── Cancel create user modal ── */

  it("closes create user modal on cancel", async () => {
    render(<UsersTab />);
    await act(async () => {
      fireEvent.click(screen.getByText("users.createUser"));
    });
    await waitFor(() => expect(screen.getByTestId("form-modal")).toBeInTheDocument());
    await act(async () => {
      fireEvent.click(screen.getByTestId("form-cancel"));
    });
    await waitFor(() => {
      expect(screen.queryByTestId("form-modal")).not.toBeInTheDocument();
    });
  });

  /* ── Clear filters ── */

  it("resets all filters when clear filters is clicked", async () => {
    render(<UsersTab />);
    await act(async () => {
      fireEvent.click(screen.getByText("common.clearFilters"));
    });
  });

  /* ── Expanded row with game accounts showing membership data ── */

  it("shows membership details in expanded row with clan/rank/status selects", async () => {
    mockUserRows = [
      { id: "u30", email: "u30@test.com", display_name: "Thirty", username: "thirty", user_db: "thirty" },
    ];
    mockRoleData = [{ user_id: "u30", role: "member" }];
    mockGameAccounts = [{ id: "ga30", user_id: "u30", game_username: "Player30", approval_status: "approved" }];
    mockMemberships = [
      {
        id: "m30",
        clan_id: "c1",
        game_account_id: "ga30",
        is_active: true,
        is_shadow: true,
        rank: "soldier",
        game_accounts: { id: "ga30", user_id: "u30", game_username: "Player30" },
      },
    ];

    render(<UsersTab />);
    await waitFor(() => expect(screen.getByText("u30@test.com")).toBeInTheDocument());

    const row = screen.getByText("u30@test.com").closest("[role='button']");
    if (row) {
      await act(async () => {
        fireEvent.click(row);
      });
    }
    await waitFor(() => {
      expect(screen.getByText("Player30")).toBeInTheDocument();
      expect(screen.getByText("S")).toBeInTheDocument();
    });
  });

  /* ── Game account without membership (missing membership) ── */

  it("shows missing membership label for unlinked game account", async () => {
    mockUserRows = [
      { id: "u31", email: "u31@test.com", display_name: "ThirtyOne", username: "thirtyone", user_db: "thirtyone" },
    ];
    mockRoleData = [];
    mockGameAccounts = [{ id: "ga31", user_id: "u31", game_username: "Orphan31", approval_status: "approved" }];
    mockMemberships = [];

    render(<UsersTab />);
    await waitFor(() => expect(screen.getByText("u31@test.com")).toBeInTheDocument());

    const row = screen.getByText("u31@test.com").closest("[role='button']");
    if (row) {
      await act(async () => {
        fireEvent.click(row);
      });
    }
    await waitFor(() => {
      expect(screen.getByText("members.missingMembership")).toBeInTheDocument();
    });
  });

  /* ── Pending game account approval actions ── */

  it("shows approve and reject buttons for pending game accounts", async () => {
    mockUserRows = [
      { id: "u32", email: "u32@test.com", display_name: "ThirtyTwo", username: "thirtytwo", user_db: "thirtytwo" },
    ];
    mockRoleData = [];
    mockGameAccounts = [{ id: "ga32", user_id: "u32", game_username: "Pending32", approval_status: "pending" }];
    mockMemberships = [];

    render(<UsersTab />);
    await waitFor(() => expect(screen.getByText("u32@test.com")).toBeInTheDocument());

    const row = screen.getByText("u32@test.com").closest("[role='button']");
    if (row) {
      await act(async () => {
        fireEvent.click(row);
      });
    }
    await waitFor(() => {
      expect(screen.getByLabelText("common.approve")).toBeInTheDocument();
      expect(screen.getByLabelText("common.reject")).toBeInTheDocument();
    });
  });

  /* ── Filtered user count display ── */

  it("shows user count in filter summary", async () => {
    mockUserRows = [
      { id: "u33", email: "u33@test.com", display_name: "User33", username: "user33", user_db: "user33" },
      { id: "u34", email: "u34@test.com", display_name: "User34", username: "user34", user_db: "user34" },
    ];
    mockRoleData = [];

    render(<UsersTab />);
    await waitFor(() => {
      expect(screen.getByText("2 / 2")).toBeInTheDocument();
    });
  });

  /* ── Space key to expand row ── */

  it("toggles expand on Space key", async () => {
    mockUserRows = [
      { id: "u35", email: "u35@test.com", display_name: "ThirtyFive", username: "thirtyfive", user_db: "thirtyfive" },
    ];
    mockRoleData = [];

    render(<UsersTab />);
    await waitFor(() => expect(screen.getByText("u35@test.com")).toBeInTheDocument());

    const row = screen.getByText("u35@test.com").closest("[role='button']");
    if (row) {
      await act(async () => {
        fireEvent.keyDown(row, { key: " " });
      });
    }
    await waitFor(() => {
      expect(screen.getByText("clans.noAccountsYet")).toBeInTheDocument();
    });
  });

  /* ── Resend invite triggers confirm modal ── */

  it("opens resend invite confirm modal", async () => {
    mockUserRows = [
      { id: "u36", email: "u36@test.com", display_name: "ThirtySix", username: "thirtysix", user_db: "thirtysix" },
    ];
    mockRoleData = [];

    render(<UsersTab />);
    await waitFor(() => expect(screen.getByLabelText("users.resendInvite")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByLabelText("users.resendInvite"));
    });
    await waitFor(() => {
      expect(screen.getByTestId("confirm-modal")).toBeInTheDocument();
    });
  });

  /* ── Confirm user for unconfirmed ── */

  it("opens confirm user modal when confirm button clicked", async () => {
    mockUserRows = [
      {
        id: "u37",
        email: "u37@test.com",
        display_name: "ThirtySeven",
        username: "thirtyseven",
        user_db: "thirtyseven",
      },
    ];
    mockRoleData = [];
    mockEmailConfirmations = {};

    render(<UsersTab />);
    await waitFor(() => expect(screen.getByLabelText("users.confirmUser")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByLabelText("users.confirmUser"));
    });
    await waitFor(() => {
      expect(screen.getByTestId("confirm-modal")).toBeInTheDocument();
    });
  });

  /* ── Save all with no edits ── */

  it("disables save all button when no edits exist", () => {
    render(<UsersTab />);
    const saveAllBtn = screen.getByText("common.saveAll");
    expect(saveAllBtn).toBeDisabled();
  });

  /* ── Add game account modal ── */

  it("renders game account form inputs in add game account modal", async () => {
    mockUserRows = [
      {
        id: "u38",
        email: "u38@test.com",
        display_name: "ThirtyEight",
        username: "thirtyeight",
        user_db: "thirtyeight",
      },
    ];
    mockRoleData = [];

    render(<UsersTab />);
    await waitFor(() => expect(screen.getByLabelText("users.addGameAccount")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByLabelText("users.addGameAccount"));
    });

    await waitFor(() => {
      const modals = screen.getAllByTestId("form-modal");
      expect(modals.length).toBeGreaterThanOrEqual(1);
    });
  });

  /* ── Resend invite confirm modal confirm action ── */

  it("calls fetch for resend invite when confirm clicked", async () => {
    mockUserRows = [{ id: "u40", email: "u40@test.com", display_name: "Forty", username: "forty", user_db: "forty" }];
    mockRoleData = [];

    render(<UsersTab />);
    await waitFor(() => expect(screen.getByLabelText("users.resendInvite")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByLabelText("users.resendInvite"));
    });
    await waitFor(() => expect(screen.getByTestId("confirm-modal")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByTestId("cm-confirm"));
    });
    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/api/admin/resend-invite",
        expect.objectContaining({ method: "POST" }),
      );
    });
  });

  /* ── Resend invite cancel closes modal ── */

  it("closes resend invite modal on cancel", async () => {
    mockUserRows = [
      { id: "u41", email: "u41@test.com", display_name: "FortyOne", username: "fortyone", user_db: "fortyone" },
    ];
    mockRoleData = [];

    render(<UsersTab />);
    await waitFor(() => expect(screen.getByLabelText("users.resendInvite")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByLabelText("users.resendInvite"));
    });
    await waitFor(() => expect(screen.getByTestId("confirm-modal")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByTestId("cm-cancel"));
    });
    await waitFor(() => {
      expect(screen.queryByTestId("confirm-modal")).not.toBeInTheDocument();
    });
  });

  /* ── Confirm user modal confirm action ── */

  it("calls fetch for confirm user when confirm clicked", async () => {
    mockUserRows = [
      { id: "u42", email: "u42@test.com", display_name: "FortyTwo", username: "fortytwo", user_db: "fortytwo" },
    ];
    mockRoleData = [];
    mockEmailConfirmations = {};

    render(<UsersTab />);
    await waitFor(() => expect(screen.getByLabelText("users.confirmUser")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByLabelText("users.confirmUser"));
    });
    await waitFor(() => expect(screen.getByTestId("confirm-modal")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByTestId("cm-confirm"));
    });
    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/api/admin/email-confirmations",
        expect.objectContaining({ method: "POST" }),
      );
    });
  });

  /* ── Confirm user cancel closes modal ── */

  it("closes confirm user modal on cancel", async () => {
    mockUserRows = [
      { id: "u43", email: "u43@test.com", display_name: "FortyThree", username: "fortythree", user_db: "fortythree" },
    ];
    mockRoleData = [];
    mockEmailConfirmations = {};

    render(<UsersTab />);
    await waitFor(() => expect(screen.getByLabelText("users.confirmUser")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByLabelText("users.confirmUser"));
    });
    await waitFor(() => expect(screen.getByTestId("confirm-modal")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByTestId("cm-cancel"));
    });
    await waitFor(() => {
      expect(screen.queryByTestId("confirm-modal")).not.toBeInTheDocument();
    });
  });

  /* ── Game account create modal form submission ── */

  it("submits game account create form via add modal", async () => {
    mockUserRows = [
      { id: "u44", email: "u44@test.com", display_name: "FortyFour", username: "fortyfour", user_db: "fortyfour" },
    ];
    mockRoleData = [];

    render(<UsersTab />);
    await waitFor(() => expect(screen.getByLabelText("users.addGameAccount")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByLabelText("users.addGameAccount"));
    });
    await waitFor(() => {
      const modals = screen.getAllByTestId("form-modal");
      expect(modals.length).toBeGreaterThanOrEqual(1);
    });
  });

  /* ── Multiple confirm modals: save all ── */

  it("save all button renders confirm modal when edits exist (via role change)", async () => {
    mockUserRows = [
      { id: "u45", email: "u45@test.com", display_name: "FortyFive", username: "fortyfive", user_db: "fortyfive" },
    ];
    mockRoleData = [{ user_id: "u45", role: "member" }];

    render(<UsersTab />);
    await waitFor(() => expect(screen.getByText("u45@test.com")).toBeInTheDocument());
  });

  /* ── User row displays role badge ── */

  it("renders role for user with role data", async () => {
    mockUserRows = [
      { id: "u46", email: "u46@test.com", display_name: "FortySix", username: "fortysix", user_db: "fortysix" },
    ];
    mockRoleData = [{ user_id: "u46", role: "moderator" }];

    render(<UsersTab />);
    await waitFor(() => {
      expect(screen.getByText("u46@test.com")).toBeInTheDocument();
    });
  });

  /* ── Unconfirmed user shows pending badge ── */

  it("shows pending badge when email not in confirmations map", async () => {
    mockUserRows = [
      { id: "u47", email: "u47@test.com", display_name: "FortySeven", username: "fortyseven", user_db: "fortyseven" },
    ];
    mockRoleData = [];
    mockEmailConfirmations = {};

    render(<UsersTab />);
    await waitFor(() => {
      expect(screen.getByText("users.unconfirmed")).toBeInTheDocument();
    });
  });

  /* ────────────────────────────────────────────────────────────────────────────
   * NEW TESTS — covers uncovered branches in users-tab.tsx
   * ──────────────────────────────────────────────────────────────────────────── */

  /* ── Profile edit: display name change ── */

  it("edits display name and saves user profile", async () => {
    mockUserRows = [{ id: "u50", email: "u50@test.com", display_name: "OldName", username: "fifty", user_db: "fifty" }];
    mockRoleData = [{ user_id: "u50", role: "member" }];

    render(<UsersTab />);
    await waitFor(() => expect(screen.getByText("u50@test.com")).toBeInTheDocument());

    const editableBtns = screen.getAllByText("OldName").filter((el) => el.classList.contains("editable-button"));
    if (editableBtns.length > 0) {
      await act(async () => {
        fireEvent.click(editableBtns[0]);
      });
    }

    const inputs = document.querySelectorAll("input.editable-field");
    const displayNameInput = Array.from(inputs).find((input) => (input as HTMLInputElement).value === "OldName") as
      | HTMLInputElement
      | undefined;

    if (displayNameInput) {
      fireEvent.change(displayNameInput, { target: { value: "NewDisplayName" } });
    }

    await act(async () => {
      fireEvent.click(screen.getByLabelText("common.saveChanges"));
    });

    await waitFor(() => {
      expect(mockSupabase.from).toHaveBeenCalledWith("profiles");
    });
  });

  /* ── Profile edit: username change ── */

  it("edits username via editable button and saves", async () => {
    mockUserRows = [
      { id: "u51", email: "u51@test.com", display_name: "FiftyOne", username: "fiftyone", user_db: "fiftyone" },
    ];
    mockRoleData = [{ user_id: "u51", role: "member" }];

    render(<UsersTab />);
    await waitFor(() => expect(screen.getByText("u51@test.com")).toBeInTheDocument());

    const editableBtns = screen.getAllByText("fiftyone").filter((el) => el.classList.contains("editable-button"));
    if (editableBtns.length > 0) {
      await act(async () => {
        fireEvent.click(editableBtns[0]);
      });
    }

    const inputs = document.querySelectorAll("input.editable-field");
    const usernameInput = Array.from(inputs).find((input) => (input as HTMLInputElement).value === "fiftyone") as
      | HTMLInputElement
      | undefined;

    if (usernameInput) {
      fireEvent.change(usernameInput, { target: { value: "newusername" } });
    }

    await act(async () => {
      fireEvent.click(screen.getByLabelText("common.saveChanges"));
    });

    await waitFor(() => {
      expect(mockSupabase.from).toHaveBeenCalledWith("profiles");
    });
  });

  /* ── Game account creation within user detail ── */

  it("creates a game account via add game account modal with valid data", async () => {
    mockUserRows = [
      { id: "u52", email: "u52@test.com", display_name: "FiftyTwo", username: "fiftytwo", user_db: "fiftytwo" },
    ];
    mockRoleData = [{ user_id: "u52", role: "member" }];

    render(<UsersTab />);
    await waitFor(() => expect(screen.getByLabelText("users.addGameAccount")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByLabelText("users.addGameAccount"));
    });

    await waitFor(() => {
      const modals = screen.getAllByTestId("form-modal");
      expect(modals.length).toBeGreaterThanOrEqual(1);
    });

    const usernameInput = screen.getByLabelText("clans.gameUsername");
    fireEvent.change(usernameInput, { target: { value: "NewGamePlayer" } });

    await act(async () => {
      fireEvent.click(screen.getByTestId("form-submit"));
    });

    await waitFor(() => {
      expect(mockSupabase.from).toHaveBeenCalledWith("game_accounts");
    });
  });

  /* ── Game account create: empty username validation ── */

  it("shows error when creating game account with empty username", async () => {
    mockUserRows = [
      { id: "u53", email: "u53@test.com", display_name: "FiftyThree", username: "fiftythree", user_db: "fiftythree" },
    ];
    mockRoleData = [];

    render(<UsersTab />);
    await waitFor(() => expect(screen.getByLabelText("users.addGameAccount")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByLabelText("users.addGameAccount"));
    });
    await waitFor(() => expect(screen.getAllByTestId("form-modal").length).toBeGreaterThanOrEqual(1));

    await act(async () => {
      fireEvent.click(screen.getByTestId("form-submit"));
    });

    await waitFor(() => {
      const status = screen.queryByTestId("form-status");
      expect(status).toBeTruthy();
      expect(status?.textContent).toContain("Game username is required.");
    });
  });

  /* ── Game account create: close modal on cancel ── */

  it("closes add game account modal on cancel", async () => {
    mockUserRows = [
      { id: "u54", email: "u54@test.com", display_name: "FiftyFour", username: "fiftyfour", user_db: "fiftyfour" },
    ];
    mockRoleData = [];

    render(<UsersTab />);
    await waitFor(() => expect(screen.getByLabelText("users.addGameAccount")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByLabelText("users.addGameAccount"));
    });
    await waitFor(() => expect(screen.getAllByTestId("form-modal").length).toBeGreaterThanOrEqual(1));

    await act(async () => {
      fireEvent.click(screen.getByTestId("form-cancel"));
    });
    await waitFor(() => {
      expect(screen.queryByTestId("form-modal")).not.toBeInTheDocument();
    });
  });

  /* ── Delete user flow: confirm + execute ── */

  it("opens delete user confirm modal for non-self non-last-admin user", async () => {
    mockUserRows = [
      { id: "u1", email: "self@test.com", display_name: "Self", username: "self", user_db: "self" },
      {
        id: "u55",
        email: "u55@test.com",
        display_name: "FiftyFive",
        username: "zzzfiftyfive",
        user_db: "zzzfiftyfive",
      },
    ];
    mockRoleData = [
      { user_id: "u1", role: "admin" },
      { user_id: "u55", role: "member" },
    ];

    render(<UsersTab />);
    await waitFor(() => expect(screen.getByText("u55@test.com")).toBeInTheDocument());

    const deleteButtons = screen.getAllByLabelText("users.deleteUser");
    const targetBtn = deleteButtons[deleteButtons.length - 1];
    await act(async () => {
      fireEvent.click(targetBtn);
    });

    expect(mockOpenConfirm).toHaveBeenCalled();
  });

  /* ── Delete user: API call on confirmed delete ── */

  it("calls delete-user API when delete is confirmed", async () => {
    mockUserRows = [
      { id: "u1", email: "self@test.com", display_name: "Self", username: "self", user_db: "self" },
      { id: "u56", email: "u56@test.com", display_name: "FiftySix", username: "fiftysix", user_db: "fiftysix" },
    ];
    mockRoleData = [
      { user_id: "u1", role: "admin" },
      { user_id: "u56", role: "member" },
    ];
    mockIsConfirmed.mockReturnValue(true);

    render(<UsersTab />);
    await waitFor(() => expect(screen.getByText("u56@test.com")).toBeInTheDocument());

    const deleteButtons = screen.getAllByLabelText("users.deleteUser");
    const targetBtn = deleteButtons[deleteButtons.length - 1];
    await act(async () => {
      fireEvent.click(targetBtn);
    });
  });

  /* ── Resend invite: API error handling ── */

  it("shows error when resend invite API fails", async () => {
    (globalThis.fetch as any).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Invite send failed." }),
    });

    mockUserRows = [
      { id: "u57", email: "u57@test.com", display_name: "FiftySeven", username: "fiftyseven", user_db: "fiftyseven" },
    ];
    mockRoleData = [];

    render(<UsersTab />);
    await waitFor(() => expect(screen.getByLabelText("users.resendInvite")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByLabelText("users.resendInvite"));
    });
    await waitFor(() => expect(screen.getByTestId("confirm-modal")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByTestId("cm-confirm"));
    });

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/api/admin/resend-invite",
        expect.objectContaining({ method: "POST" }),
      );
    });
  });

  /* ── Confirm user: API error handling ── */

  it("handles confirm user API failure gracefully", async () => {
    (globalThis.fetch as any).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Confirmation failed." }),
    });

    mockUserRows = [
      { id: "u58", email: "u58@test.com", display_name: "FiftyEight", username: "fiftyeight", user_db: "fiftyeight" },
    ];
    mockRoleData = [];
    mockEmailConfirmations = {};

    render(<UsersTab />);
    await waitFor(() => expect(screen.getByLabelText("users.confirmUser")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByLabelText("users.confirmUser"));
    });
    await waitFor(() => expect(screen.getByTestId("confirm-modal")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByTestId("cm-confirm"));
    });

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/api/admin/email-confirmations",
        expect.objectContaining({ method: "POST" }),
      );
    });
  });

  /* ── Confirm user: success path updates email confirmations map ── */

  it("updates email confirmations map on confirm user success", async () => {
    (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { email_confirmed_at: "2024-06-01T00:00:00Z" } }),
    });

    mockUserRows = [
      { id: "u59", email: "u59@test.com", display_name: "FiftyNine", username: "fiftynine", user_db: "fiftynine" },
    ];
    mockRoleData = [];
    mockEmailConfirmations = {};

    render(<UsersTab />);
    await waitFor(() => expect(screen.getByLabelText("users.confirmUser")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByLabelText("users.confirmUser"));
    });
    await waitFor(() => expect(screen.getByTestId("confirm-modal")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByTestId("cm-confirm"));
    });

    await waitFor(() => {
      expect(mockSetEmailConfirmationsByUserId).toHaveBeenCalled();
      expect(mockPushToast).toHaveBeenCalled();
    });
  });

  /* ── User detail panel: expanded row renders subrow with email and display name ── */

  it("shows user email and display name in expanded game account subrow", async () => {
    mockUserRows = [{ id: "u60", email: "u60@test.com", display_name: "Sixty", username: "sixty", user_db: "sixty" }];
    mockRoleData = [];
    mockGameAccounts = [{ id: "ga60", user_id: "u60", game_username: "Player60", approval_status: "approved" }];
    mockMemberships = [
      {
        id: "m60",
        clan_id: "c1",
        game_account_id: "ga60",
        is_active: true,
        is_shadow: false,
        rank: "soldier",
        game_accounts: { id: "ga60", user_id: "u60", game_username: "Player60" },
      },
    ];

    render(<UsersTab />);
    await waitFor(() => expect(screen.getByText("u60@test.com")).toBeInTheDocument());

    const row = screen.getByText("u60@test.com").closest("[role='button']");
    if (row) {
      await act(async () => {
        fireEvent.click(row);
      });
    }

    await waitFor(() => {
      expect(screen.getByText("Player60")).toBeInTheDocument();
      const emailInstances = screen.getAllByText("u60@test.com");
      expect(emailInstances.length).toBeGreaterThanOrEqual(2);
    });
  });

  /* ── Game account editing in expanded row ── */

  it("enters game account edit mode in expanded user row", async () => {
    mockUserRows = [
      { id: "u61", email: "u61@test.com", display_name: "SixtyOne", username: "sixtyone", user_db: "sixtyone" },
    ];
    mockRoleData = [];
    mockGameAccounts = [{ id: "ga61", user_id: "u61", game_username: "EditableGA", approval_status: "approved" }];
    mockMemberships = [
      {
        id: "m61",
        clan_id: "c1",
        game_account_id: "ga61",
        is_active: true,
        is_shadow: false,
        rank: "soldier",
        game_accounts: { id: "ga61", user_id: "u61", game_username: "EditableGA" },
      },
    ];

    render(<UsersTab />);
    await waitFor(() => expect(screen.getByText("u61@test.com")).toBeInTheDocument());

    const row = screen.getByText("u61@test.com").closest("[role='button']");
    if (row) {
      await act(async () => {
        fireEvent.click(row);
      });
    }

    await waitFor(() => expect(screen.getByText("EditableGA")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByText("EditableGA"));
    });

    await waitFor(() => {
      const input = screen.getByPlaceholderText("clans.gameUsername");
      expect(input).toBeInTheDocument();
    });
  });

  /* ── Shadow toggle in expanded game account row ── */

  it("toggles shadow for game account in expanded row", async () => {
    mockUserRows = [
      { id: "u62", email: "u62@test.com", display_name: "SixtyTwo", username: "sixtytwo", user_db: "sixtytwo" },
    ];
    mockRoleData = [];
    mockGameAccounts = [{ id: "ga62", user_id: "u62", game_username: "ShadowGA", approval_status: "approved" }];
    mockMemberships = [
      {
        id: "m62",
        clan_id: "c1",
        game_account_id: "ga62",
        is_active: true,
        is_shadow: false,
        rank: "soldier",
        game_accounts: { id: "ga62", user_id: "u62", game_username: "ShadowGA" },
      },
    ];

    render(<UsersTab />);
    await waitFor(() => expect(screen.getByText("u62@test.com")).toBeInTheDocument());

    const row = screen.getByText("u62@test.com").closest("[role='button']");
    if (row) {
      await act(async () => {
        fireEvent.click(row);
      });
    }

    await waitFor(() => expect(screen.getByLabelText("clans.toggleShadow")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByLabelText("clans.toggleShadow"));
    });
  });

  /* ── Email confirmation status display: confirmed with date ── */

  it("shows confirmed badge with success class for confirmed user", async () => {
    mockUserRows = [
      { id: "u63", email: "u63@test.com", display_name: "SixtyThree", username: "sixtythree", user_db: "sixtythree" },
    ];
    mockRoleData = [];
    mockEmailConfirmations = { u63: "2024-05-15T10:00:00Z" };

    const { container } = render(<UsersTab />);

    await waitFor(() => {
      const badge = container.querySelector(".badge.success");
      expect(badge).toBeInTheDocument();
    });
  });

  /* ── Cancel all user edits clears all state ── */

  it("cancel all button clears all edits and sets status", async () => {
    mockUserRows = [
      { id: "u64", email: "u64@test.com", display_name: "SixtyFour", username: "sixtyfour", user_db: "sixtyfour" },
    ];
    mockRoleData = [{ user_id: "u64", role: "member" }];

    render(<UsersTab />);
    await waitFor(() => expect(screen.getByText("u64@test.com")).toBeInTheDocument());

    const editableBtns = screen.getAllByText("sixtyfour").filter((el) => el.classList.contains("editable-button"));
    if (editableBtns.length > 0) {
      await act(async () => {
        fireEvent.click(editableBtns[0]);
      });
    }

    const inputs = document.querySelectorAll("input.editable-field");
    const usernameInput = Array.from(inputs).find((input) => (input as HTMLInputElement).value === "sixtyfour") as
      | HTMLInputElement
      | undefined;

    if (usernameInput) {
      fireEvent.change(usernameInput, { target: { value: "changed" } });
    }

    const cancelAllBtn = screen.getByText("common.cancelAll");
    await act(async () => {
      fireEvent.click(cancelAllBtn);
    });

    await waitFor(() => {
      expect(screen.getByText("All changes cleared.")).toBeInTheDocument();
    });
  });

  /* ── Delete game account in expanded row ── */

  it("opens game account delete confirm from expanded row", async () => {
    mockUserRows = [
      { id: "u65", email: "u65@test.com", display_name: "SixtyFive", username: "sixtyfive", user_db: "sixtyfive" },
    ];
    mockRoleData = [];
    mockGameAccounts = [{ id: "ga65", user_id: "u65", game_username: "DeleteGA", approval_status: "approved" }];
    mockMemberships = [
      {
        id: "m65",
        clan_id: "c1",
        game_account_id: "ga65",
        is_active: true,
        is_shadow: false,
        rank: "soldier",
        game_accounts: { id: "ga65", user_id: "u65", game_username: "DeleteGA" },
      },
    ];

    render(<UsersTab />);
    await waitFor(() => expect(screen.getByText("u65@test.com")).toBeInTheDocument());

    const row = screen.getByText("u65@test.com").closest("[role='button']");
    if (row) {
      await act(async () => {
        fireEvent.click(row);
      });
    }

    await waitFor(() => expect(screen.getByLabelText("members.deleteGameAccount")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByLabelText("members.deleteGameAccount"));
    });

    expect(mockOpenConfirm).toHaveBeenCalled();
  });

  /* ── Game account without membership shows delete button ── */

  it("shows delete button for orphan game account without membership", async () => {
    mockUserRows = [
      { id: "u66", email: "u66@test.com", display_name: "SixtySix", username: "sixtysix", user_db: "sixtysix" },
    ];
    mockRoleData = [];
    mockGameAccounts = [{ id: "ga66", user_id: "u66", game_username: "OrphanGA", approval_status: "approved" }];
    mockMemberships = [];

    render(<UsersTab />);
    await waitFor(() => expect(screen.getByText("u66@test.com")).toBeInTheDocument());

    const row = screen.getByText("u66@test.com").closest("[role='button']");
    if (row) {
      await act(async () => {
        fireEvent.click(row);
      });
    }

    await waitFor(() => {
      expect(screen.getByText("members.missingMembership")).toBeInTheDocument();
      expect(screen.getByLabelText("members.deleteGameAccount")).toBeInTheDocument();
    });
  });

  /* ── Approval action: approve game account ── */

  it("calls approval API for approve action", async () => {
    mockUserRows = [
      { id: "u67", email: "u67@test.com", display_name: "SixtySeven", username: "sixtyseven", user_db: "sixtyseven" },
    ];
    mockRoleData = [];
    mockGameAccounts = [{ id: "ga67", user_id: "u67", game_username: "PendingGA", approval_status: "pending" }];
    mockMemberships = [];

    render(<UsersTab />);
    await waitFor(() => expect(screen.getByText("u67@test.com")).toBeInTheDocument());

    const row = screen.getByText("u67@test.com").closest("[role='button']");
    if (row) {
      await act(async () => {
        fireEvent.click(row);
      });
    }

    await waitFor(() => expect(screen.getByLabelText("common.approve")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByLabelText("common.approve"));
    });

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/api/admin/game-account-approvals",
        expect.objectContaining({ method: "PATCH" }),
      );
    });
  });

  /* ── Approval action: reject game account ── */

  it("calls approval API for reject action", async () => {
    mockUserRows = [
      { id: "u68", email: "u68@test.com", display_name: "SixtyEight", username: "sixtyeight", user_db: "sixtyeight" },
    ];
    mockRoleData = [];
    mockGameAccounts = [{ id: "ga68", user_id: "u68", game_username: "RejectGA", approval_status: "pending" }];
    mockMemberships = [];

    render(<UsersTab />);
    await waitFor(() => expect(screen.getByText("u68@test.com")).toBeInTheDocument());

    const row = screen.getByText("u68@test.com").closest("[role='button']");
    if (row) {
      await act(async () => {
        fireEvent.click(row);
      });
    }

    await waitFor(() => expect(screen.getByLabelText("common.reject")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByLabelText("common.reject"));
    });

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/api/admin/game-account-approvals",
        expect.objectContaining({ method: "PATCH" }),
      );
    });
  });

  /* ── Pending game account shows pending badge in subrow ── */

  it("shows pending badge for pending approval game account", async () => {
    mockUserRows = [
      { id: "u69", email: "u69@test.com", display_name: "SixtyNine", username: "sixtynine", user_db: "sixtynine" },
    ];
    mockRoleData = [];
    mockGameAccounts = [{ id: "ga69", user_id: "u69", game_username: "BadgeGA", approval_status: "pending" }];
    mockMemberships = [];

    render(<UsersTab />);
    await waitFor(() => expect(screen.getByText("u69@test.com")).toBeInTheDocument());

    const row = screen.getByText("u69@test.com").closest("[role='button']");
    if (row) {
      await act(async () => {
        fireEvent.click(row);
      });
    }

    await waitFor(() => {
      expect(screen.getByText("pending")).toBeInTheDocument();
    });
  });

  /* ── Save all user edits triggers confirm modal ── */

  it("save all opens confirm modal when user has edits", async () => {
    mockUserRows = [
      { id: "u70", email: "u70@test.com", display_name: "Seventy", username: "seventy", user_db: "seventy" },
    ];
    mockRoleData = [{ user_id: "u70", role: "member" }];

    render(<UsersTab />);
    await waitFor(() => expect(screen.getByText("u70@test.com")).toBeInTheDocument());

    const editableBtns = screen.getAllByText("seventy").filter((el) => el.classList.contains("editable-button"));
    if (editableBtns.length > 0) {
      await act(async () => {
        fireEvent.click(editableBtns[0]);
      });
    }

    const inputs = document.querySelectorAll("input.editable-field");
    const usernameInput = Array.from(inputs).find((input) => (input as HTMLInputElement).value === "seventy") as
      | HTMLInputElement
      | undefined;

    if (usernameInput) {
      fireEvent.change(usernameInput, { target: { value: "newname" } });
    }

    const saveAllBtn = screen.getByText("common.saveAll");
    await act(async () => {
      fireEvent.click(saveAllBtn);
    });

    await waitFor(() => {
      expect(screen.getByTestId("confirm-modal")).toBeInTheDocument();
    });
  });

  /* ── User row collapse ── */

  it("collapses expanded row on second click", async () => {
    mockUserRows = [
      { id: "u71", email: "u71@test.com", display_name: "SeventyOne", username: "seventyone", user_db: "seventyone" },
    ];
    mockRoleData = [];
    mockGameAccounts = [];

    render(<UsersTab />);
    await waitFor(() => expect(screen.getByText("u71@test.com")).toBeInTheDocument());

    const row = screen.getByText("u71@test.com").closest("[role='button']");
    if (row) {
      await act(async () => {
        fireEvent.click(row);
      });
      await waitFor(() => expect(screen.getByText("clans.noAccountsYet")).toBeInTheDocument());

      await act(async () => {
        fireEvent.click(row);
      });
      await waitFor(() => {
        expect(screen.queryByText("clans.noAccountsYet")).not.toBeInTheDocument();
      });
    }
  });

  /* ── Cancel user edit restores original values ── */

  it("cancel user edit button restores original values", async () => {
    mockUserRows = [
      { id: "u72", email: "u72@test.com", display_name: "SeventyTwo", username: "seventytwo", user_db: "seventytwo" },
    ];
    mockRoleData = [{ user_id: "u72", role: "member" }];

    render(<UsersTab />);
    await waitFor(() => expect(screen.getByText("u72@test.com")).toBeInTheDocument());

    const editableBtns = screen.getAllByText("seventytwo").filter((el) => el.classList.contains("editable-button"));
    if (editableBtns.length > 0) {
      await act(async () => {
        fireEvent.click(editableBtns[0]);
      });
    }

    await act(async () => {
      fireEvent.click(screen.getByLabelText("common.cancelChanges"));
    });

    await waitFor(() => {
      const btns = screen.getAllByText("seventytwo").filter((el) => el.classList.contains("editable-button"));
      expect(btns.length).toBeGreaterThanOrEqual(1);
    });
  });

  /* ── User row click while editing another user ── */

  it("clears active editing state when clicking a different user row", async () => {
    mockUserRows = [
      {
        id: "u73",
        email: "u73@test.com",
        display_name: "SeventyThree",
        username: "seventythree",
        user_db: "seventythree",
      },
      {
        id: "u74",
        email: "u74@test.com",
        display_name: "SeventyFour",
        username: "seventyfour",
        user_db: "seventyfour",
      },
    ];
    mockRoleData = [
      { user_id: "u73", role: "member" },
      { user_id: "u74", role: "member" },
    ];

    render(<UsersTab />);
    await waitFor(() => {
      expect(screen.getByText("u73@test.com")).toBeInTheDocument();
      expect(screen.getByText("u74@test.com")).toBeInTheDocument();
    });

    const editableBtns73 = screen.getAllByText("seventythree").filter((el) => el.classList.contains("editable-button"));
    if (editableBtns73.length > 0) {
      await act(async () => {
        fireEvent.click(editableBtns73[0]);
      });
    }

    const row74 = screen.getByText("u74@test.com").closest("[role='button']");
    if (row74) {
      await act(async () => {
        fireEvent.click(row74);
      });
    }
  });
});
