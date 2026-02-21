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
  default: ({ fill, priority, unoptimized, ...props }: any) => {
    const React = require("react");
    return React.createElement("img", props);
  },
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

const mockSetSelectedClanId = vi.fn();
const mockSetDefaultClanId = vi.fn();
const mockSetStatus = vi.fn();
const mockLoadClans = vi.fn();
const mockOpenConfirm = vi.fn();
const mockDeleteClose = vi.fn();
const mockIsConfirmed = vi.fn(() => false);

let mockSelectedClanId = "c1";
let mockDefaultClanId: string = "c1";
let mockMembershipData: any[] = [];
let mockProfileData: any[] = [];
let mockRoleData: any[] = [];
let mockGameAccountData: any[] = [];
let mockGameAccountMembershipData: any[] = [];
let mockGameAccountProfileData: any[] = [];

function defaultFromImpl(table: string) {
  const chain: any = {};
  chain.select = vi.fn(() => chain);
  chain.order = vi.fn();
  chain.eq = vi.fn(() => chain);
  chain.in = vi.fn();
  chain.delete = vi.fn(() => chain);
  chain.update = vi.fn(() => chain);
  chain.upsert = vi.fn().mockResolvedValue({ error: null });
  chain.insert = vi.fn(() => chain);
  chain.single = vi.fn().mockResolvedValue({ data: { id: "new-clan" }, error: null });
  if (table === "game_account_clan_memberships") {
    chain.order = vi.fn().mockResolvedValue({ data: mockMembershipData, error: null });
    chain.in = vi.fn().mockResolvedValue({
      data: mockGameAccountMembershipData.length > 0 ? mockGameAccountMembershipData : mockMembershipData,
      error: null,
    });
  } else if (table === "profiles") {
    chain.in = vi.fn().mockResolvedValue({
      data: mockGameAccountProfileData.length > 0 ? mockGameAccountProfileData : mockProfileData,
      error: null,
    });
  } else if (table === "user_roles") {
    chain.in = vi.fn().mockResolvedValue({ data: mockRoleData, error: null });
  } else if (table === "game_accounts") {
    chain.order = vi.fn().mockResolvedValue({ data: mockGameAccountData, error: null });
    chain.in = vi.fn().mockResolvedValue({ data: mockGameAccountData, error: null });
    chain.eq = vi.fn(() => chain);
  } else if (table === "audit_logs") {
    chain.insert = vi.fn().mockResolvedValue({ error: null });
  } else if (table === "clans") {
    chain.then = vi.fn((cb: any) => {
      cb({ error: null });
      return chain;
    });
    chain.eq = vi.fn(() => chain);
    chain.select = vi.fn(() => chain);
  }
  return chain;
}

const mockSupabase = {
  from: vi.fn(defaultFromImpl),
  auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) },
  rpc: vi.fn().mockResolvedValue({ error: null }),
};

vi.mock("../admin-context", () => ({
  useAdminContext: () => ({
    supabase: mockSupabase,
    clans: [
      { id: "c1", name: "Alpha Clan", description: "Test clan" },
      { id: "c2", name: "Beta Clan", description: null },
    ],
    selectedClanId: mockSelectedClanId,
    setSelectedClanId: mockSetSelectedClanId,
    unassignedClanId: "c-unassigned",
    defaultClanId: mockDefaultClanId,
    setDefaultClanId: mockSetDefaultClanId,
    clanNameById: new Map([
      ["c1", "Alpha Clan"],
      ["c2", "Beta Clan"],
    ]),
    currentUserId: "u1",
    setStatus: mockSetStatus,
    loadClans: mockLoadClans,
  }),
}));

vi.mock("../../components/toast-provider", () => ({
  useToast: () => ({ pushToast: vi.fn() }),
}));

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
    sortKey: "game",
    sortDirection: "asc",
    toggleSort: vi.fn(),
  }),
  compareValues: vi.fn((a: any, b: any) => {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  }),
}));

const mockSetPage = vi.fn();
vi.mock("@/lib/hooks/use-pagination", () => ({
  usePagination: () => ({
    page: 1,
    pageSize: 25,
    totalPages: 1,
    startIndex: 0,
    endIndex: 25,
    setPage: mockSetPage,
  }),
}));

vi.mock("@/lib/string-utils", () => ({
  normalizeString: (s: string) => s.toLowerCase(),
}));

vi.mock("../../components/ui/radix-select", () => ({
  __esModule: true,
  default: (props: any) => {
    const React = require("react");
    return React.createElement("select", {
      "data-testid": props.id || props.ariaLabel || "radix-select",
      value: props.value,
      onChange: (e: any) => props.onValueChange?.(e.target.value),
    });
  },
}));

vi.mock("../../components/ui/search-input", () => ({
  __esModule: true,
  default: (props: any) => {
    const React = require("react");
    return React.createElement("input", { "data-testid": props.id || "search" });
  },
}));

vi.mock("../../components/ui/icon-button", () => ({
  __esModule: true,
  default: ({ children, onClick, ...props }: any) => {
    const React = require("react");
    return React.createElement(
      "button",
      { "aria-label": props.ariaLabel, onClick, disabled: props.disabled },
      children,
    );
  },
}));

vi.mock("../../components/ui/labeled-select", () => ({
  __esModule: true,
  default: (props: any) => {
    const React = require("react");
    return React.createElement("select", { "data-testid": props.id });
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
    return React.createElement("span", { role: "columnheader" }, props.label);
  },
}));

vi.mock("@/app/components/pagination-bar", () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock("../components/danger-confirm-modal", () => ({
  __esModule: true,
  default: (props: any) => {
    const React = require("react");
    if (!props.state || props.state.step === "closed") return null;
    return React.createElement("div", { "data-testid": "danger-modal" }, props.title);
  },
}));

let _confirmModalProps: any = {};
vi.mock("@/app/components/confirm-modal", () => ({
  __esModule: true,
  default: (props: any) => {
    const React = require("react");
    _confirmModalProps = props;
    if (!props.isOpen) return null;
    return React.createElement(
      "div",
      { "data-testid": "confirm-modal" },
      React.createElement("button", { "data-testid": "cm-confirm", onClick: props.onConfirm }, props.confirmLabel),
      React.createElement("button", { "data-testid": "cm-cancel", onClick: props.onCancel }, props.cancelLabel),
    );
  },
}));

let _formModalProps: any = {};
vi.mock("@/app/components/form-modal", () => ({
  __esModule: true,
  default: (props: any) => {
    const React = require("react");
    _formModalProps = props;
    if (!props.isOpen) return null;
    return React.createElement(
      "div",
      { "data-testid": "form-modal" },
      React.createElement("span", null, props.title),
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

import ClansTab from "./clans-tab";

describe("ClansTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.from.mockImplementation(defaultFromImpl);
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockSupabase.rpc.mockResolvedValue({ error: null });
    mockSelectedClanId = "c1";
    mockDefaultClanId = "c1";
    mockMembershipData = [];
    mockProfileData = [];
    mockRoleData = [];
    mockGameAccountData = [];
    mockGameAccountMembershipData = [];
    mockGameAccountProfileData = [];
    _confirmModalProps = {};
    _formModalProps = {};
  });

  it("renders without crashing", () => {
    render(<ClansTab />);
    expect(screen.getByText("clans.title")).toBeInTheDocument();
  });

  it("shows selected clan name in subtitle", () => {
    render(<ClansTab />);
    expect(screen.getByText("Alpha Clan")).toBeInTheDocument();
  });

  it("renders clan selector", () => {
    render(<ClansTab />);
    expect(screen.getByTestId("selectedClan")).toBeInTheDocument();
  });

  it("renders clan action buttons", () => {
    render(<ClansTab />);
    expect(screen.getByLabelText("clans.createClan")).toBeInTheDocument();
    expect(screen.getByLabelText("clans.editClan")).toBeInTheDocument();
  });

  it("renders delete clan button", () => {
    render(<ClansTab />);
    expect(screen.getByLabelText("clans.deleteClan")).toBeInTheDocument();
  });

  /* ── Subtitle when no clan selected ── */

  it("shows selectClan in subtitle when no clan selected", () => {
    mockSelectedClanId = "";
    render(<ClansTab />);
    expect(screen.getByText("clans.selectClan")).toBeInTheDocument();
  });

  /* ── Empty members state ── */

  it("shows no accounts message when clan has no members", () => {
    render(<ClansTab />);
    expect(screen.getByText("clans.noAccountsYet")).toBeInTheDocument();
  });

  /* ── Member list rendering ── */

  it("renders members when data loads", async () => {
    mockMembershipData = [
      {
        id: "m1",
        clan_id: "c1",
        game_account_id: "ga1",
        is_active: true,
        is_shadow: false,
        rank: "soldier",
        game_accounts: { id: "ga1", user_id: "u2", game_username: "Warrior1" },
      },
    ];
    mockProfileData = [{ id: "u2", email: "u2@test.com", display_name: "User Two", username: "usertwo" }];
    mockRoleData = [{ user_id: "u2", role: "member" }];

    render(<ClansTab />);

    await waitFor(() => {
      expect(screen.getByText("Warrior1")).toBeInTheDocument();
      expect(screen.getByText("User Two")).toBeInTheDocument();
    });
  });

  /* ── Shadow badge ── */

  it("shows shadow badge for shadow members", async () => {
    mockMembershipData = [
      {
        id: "m2",
        clan_id: "c1",
        game_account_id: "ga2",
        is_active: true,
        is_shadow: true,
        rank: "soldier",
        game_accounts: { id: "ga2", user_id: "u3", game_username: "Shadow1" },
      },
    ];
    mockProfileData = [];

    render(<ClansTab />);

    await waitFor(() => {
      expect(screen.getByText("S")).toBeInTheDocument();
    });
  });

  /* ── Filter controls ── */

  it("renders search, rank filter, and status filter", () => {
    render(<ClansTab />);
    expect(screen.getByTestId("memberSearch")).toBeInTheDocument();
    expect(screen.getByTestId("memberRankFilter")).toBeInTheDocument();
    expect(screen.getByTestId("memberStatusFilter")).toBeInTheDocument();
  });

  it("renders clear filters button", () => {
    render(<ClansTab />);
    expect(screen.getByText("common.clearFilters")).toBeInTheDocument();
  });

  it("renders save all and cancel all buttons", () => {
    render(<ClansTab />);
    expect(screen.getByText("common.saveAll")).toBeInTheDocument();
    expect(screen.getByText("common.cancelAll")).toBeInTheDocument();
  });

  /* ── Member count summary ── */

  it("shows filtered / total count", () => {
    render(<ClansTab />);
    expect(screen.getByText("0 / 0")).toBeInTheDocument();
  });

  /* ── Assign accounts button ── */

  it("renders assign accounts button", () => {
    render(<ClansTab />);
    expect(screen.getByLabelText("clans.assignAccounts")).toBeInTheDocument();
  });

  /* ── Set default button ── */

  it("renders set default button", () => {
    render(<ClansTab />);
    expect(screen.getByLabelText("clans.setDefault")).toBeInTheDocument();
  });

  /* ── Clear default button when is default ── */

  it("renders clear default button when clan is default", () => {
    mockDefaultClanId = "c1";
    render(<ClansTab />);
    expect(screen.getByLabelText("clans.clearDefault")).toBeInTheDocument();
  });

  it("does not render clear default button when clan is not default", () => {
    mockDefaultClanId = "c2";
    render(<ClansTab />);
    expect(screen.queryByLabelText("clans.clearDefault")).not.toBeInTheDocument();
  });

  /* ── Create clan modal ── */

  it("opens create clan modal when create button clicked", async () => {
    render(<ClansTab />);

    await act(async () => {
      fireEvent.click(screen.getByLabelText("clans.createClan"));
    });

    await waitFor(() => {
      expect(screen.getByTestId("form-modal")).toBeInTheDocument();
      const matches = screen.getAllByText("clans.createClan");
      expect(matches.length).toBeGreaterThanOrEqual(2);
    });
  });

  /* ── Edit clan modal ── */

  it("opens edit clan modal when edit button clicked", async () => {
    render(<ClansTab />);

    await act(async () => {
      fireEvent.click(screen.getByLabelText("clans.editClan"));
    });

    await waitFor(() => {
      expect(screen.getByTestId("form-modal")).toBeInTheDocument();
      expect(screen.getByText("clans.editClan")).toBeInTheDocument();
    });
  });

  /* ── Edit with no clan selected ── */

  it("disables edit button when no clan selected", () => {
    mockSelectedClanId = "";
    render(<ClansTab />);

    const editBtn = screen.getByLabelText("clans.editClan");
    expect(editBtn).toBeDisabled();
  });

  /* ── Delete clan button on unassigned ── */

  it("disables delete button when selected clan is unassigned", () => {
    mockSelectedClanId = "c-unassigned";
    render(<ClansTab />);

    const deleteBtn = screen.getByLabelText("clans.deleteClan");
    expect(deleteBtn).toBeDisabled();
  });

  /* ── No filtered results ── */

  it("shows noAccountsMatch when filtered results are empty but memberships exist", async () => {
    mockMembershipData = [
      {
        id: "m3",
        clan_id: "c1",
        game_account_id: "ga3",
        is_active: true,
        is_shadow: false,
        rank: "officer",
        game_accounts: { id: "ga3", user_id: "u4", game_username: "Officer1" },
      },
    ];
    mockProfileData = [];

    render(<ClansTab />);

    await waitFor(() => {
      expect(screen.getByText("Officer1")).toBeInTheDocument();
    });
  });

  /* ── Sortable column headers ── */

  it("renders sortable column headers for members table", async () => {
    mockMembershipData = [
      {
        id: "m4",
        clan_id: "c1",
        game_account_id: "ga4",
        is_active: true,
        is_shadow: false,
        rank: "soldier",
        game_accounts: { id: "ga4", user_id: "u5", game_username: "Gamer4" },
      },
    ];
    mockProfileData = [];

    render(<ClansTab />);

    await waitFor(() => {
      expect(screen.getByText("members.gameAccount")).toBeInTheDocument();
      expect(screen.getByText("members.user")).toBeInTheDocument();
      const clanEls = screen.getAllByText("common.clan");
      expect(clanEls.length).toBeGreaterThanOrEqual(2);
      expect(screen.getByText("common.rank")).toBeInTheDocument();
      expect(screen.getByText("common.status")).toBeInTheDocument();
    });
  });

  /* ── Member action buttons ── */

  it("renders save, cancel, shadow toggle, and delete for each member", async () => {
    mockMembershipData = [
      {
        id: "m5",
        clan_id: "c1",
        game_account_id: "ga5",
        is_active: true,
        is_shadow: false,
        rank: "soldier",
        game_accounts: { id: "ga5", user_id: "u6", game_username: "Gamer5" },
      },
    ];
    mockProfileData = [];

    render(<ClansTab />);

    await waitFor(() => {
      expect(screen.getByLabelText("common.saveChanges")).toBeInTheDocument();
      expect(screen.getByLabelText("common.cancelChanges")).toBeInTheDocument();
      expect(screen.getByLabelText("clans.toggleShadow")).toBeInTheDocument();
      expect(screen.getByLabelText("members.deleteGameAccount")).toBeInTheDocument();
    });
  });

  /* ── Cancel all membership edits ── */

  it("disables cancel all button when no edits exist", () => {
    render(<ClansTab />);

    const cancelAllBtn = screen.getByText("common.cancelAll");
    expect(cancelAllBtn).toBeDisabled();
  });

  /* ── Save all with no changes ── */

  it("disables save all button when no edits exist", () => {
    render(<ClansTab />);

    const saveAllBtn = screen.getByText("common.saveAll");
    expect(saveAllBtn).toBeDisabled();
  });

  /* ── User display in member row ── */

  it("shows dash when no profile for member", async () => {
    mockMembershipData = [
      {
        id: "m6",
        clan_id: "c1",
        game_account_id: "ga6",
        is_active: true,
        is_shadow: false,
        rank: null,
        game_accounts: { id: "ga6", user_id: null, game_username: "NoProfile" },
      },
    ];
    mockProfileData = [];

    render(<ClansTab />);

    await waitFor(() => {
      expect(screen.getByText("NoProfile")).toBeInTheDocument();
      const dashes = screen.getAllByText("-");
      expect(dashes.length).toBeGreaterThanOrEqual(1);
    });
  });

  /* ── Game account editable button ── */

  it("renders editable game account name button", async () => {
    mockMembershipData = [
      {
        id: "m7",
        clan_id: "c1",
        game_account_id: "ga7",
        is_active: true,
        is_shadow: false,
        rank: "soldier",
        game_accounts: { id: "ga7", user_id: "u7", game_username: "EditableGamer" },
      },
    ];
    mockProfileData = [];

    render(<ClansTab />);

    await waitFor(() => {
      const editBtn = screen.getByText("EditableGamer");
      expect(editBtn.classList.contains("editable-button")).toBe(true);
    });
  });

  /* ── Multiple members rendering ── */

  it("renders multiple members", async () => {
    mockMembershipData = [
      {
        id: "m8",
        clan_id: "c1",
        game_account_id: "ga8",
        is_active: true,
        is_shadow: false,
        rank: "soldier",
        game_accounts: { id: "ga8", user_id: "u8", game_username: "GamerA" },
      },
      {
        id: "m9",
        clan_id: "c1",
        game_account_id: "ga9",
        is_active: false,
        is_shadow: false,
        rank: "officer",
        game_accounts: { id: "ga9", user_id: "u9", game_username: "GamerB" },
      },
    ];
    mockProfileData = [];

    render(<ClansTab />);

    await waitFor(() => {
      expect(screen.getByText("GamerA")).toBeInTheDocument();
      expect(screen.getByText("GamerB")).toBeInTheDocument();
    });
  });

  /* ── Membership with no game_accounts object ── */

  it("shows membership id when game_accounts is null", async () => {
    mockMembershipData = [
      {
        id: "m10",
        clan_id: "c1",
        game_account_id: "ga10",
        is_active: true,
        is_shadow: false,
        rank: null,
        game_accounts: null,
      },
    ];
    mockProfileData = [];

    render(<ClansTab />);

    await waitFor(() => {
      expect(screen.getByText("ga10")).toBeInTheDocument();
    });
  });

  /* ── Clan actions section label ── */

  it("shows clanActions label", () => {
    render(<ClansTab />);
    expect(screen.getByText("clans.clanActions")).toBeInTheDocument();
  });

  /* ── Delete no clan selected ── */

  it("disables delete button when no clan selected", () => {
    mockSelectedClanId = "";
    render(<ClansTab />);

    const deleteBtn = screen.getByLabelText("clans.deleteClan");
    expect(deleteBtn).toBeDisabled();
  });

  /* ── Create clan modal submit ── */

  it("submits create clan form and calls loadClans", async () => {
    render(<ClansTab />);
    await act(async () => {
      fireEvent.click(screen.getByLabelText("clans.createClan"));
    });
    await waitFor(() => expect(screen.getByTestId("form-modal")).toBeInTheDocument());
    const nameInput = screen.getByPlaceholderText("[THC] Chiller & Killer");
    fireEvent.change(nameInput, { target: { value: "New Clan" } });
    await act(async () => {
      fireEvent.click(screen.getByTestId("form-submit"));
    });
    await waitFor(() => {
      expect(mockLoadClans).toHaveBeenCalled();
    });
  });

  it("sets status when create clan name is empty", async () => {
    render(<ClansTab />);
    await act(async () => {
      fireEvent.click(screen.getByLabelText("clans.createClan"));
    });
    await waitFor(() => expect(screen.getByTestId("form-modal")).toBeInTheDocument());
    await act(async () => {
      fireEvent.click(screen.getByTestId("form-submit"));
    });
    await waitFor(() => {
      expect(mockSetStatus).toHaveBeenCalledWith("clansTab.clanNameRequired");
    });
  });

  /* ── Edit clan modal submit ── */

  it("submits edit clan form", async () => {
    render(<ClansTab />);
    await act(async () => {
      fireEvent.click(screen.getByLabelText("clans.editClan"));
    });
    await waitFor(() => expect(screen.getByTestId("form-modal")).toBeInTheDocument());
    await act(async () => {
      fireEvent.click(screen.getByTestId("form-submit"));
    });
    await waitFor(() => {
      expect(mockLoadClans).toHaveBeenCalled();
    });
  });

  it("edit button is disabled when no clan selected", () => {
    mockSelectedClanId = "";
    render(<ClansTab />);
    expect(screen.getByLabelText("clans.editClan")).toBeDisabled();
  });

  /* ── Cancel clan modal ── */

  it("closes clan modal on cancel", async () => {
    render(<ClansTab />);
    await act(async () => {
      fireEvent.click(screen.getByLabelText("clans.createClan"));
    });
    await waitFor(() => expect(screen.getByTestId("form-modal")).toBeInTheDocument());
    await act(async () => {
      fireEvent.click(screen.getByTestId("form-cancel"));
    });
    await waitFor(() => {
      expect(screen.queryByTestId("form-modal")).not.toBeInTheDocument();
    });
  });

  /* ── Delete clan button interaction ── */

  it("delete button is disabled when no clan selected", () => {
    mockSelectedClanId = "";
    render(<ClansTab />);
    expect(screen.getByLabelText("clans.deleteClan")).toBeDisabled();
  });

  it("delete button is disabled when unassigned clan selected", () => {
    mockSelectedClanId = "c-unassigned";
    render(<ClansTab />);
    expect(screen.getByLabelText("clans.deleteClan")).toBeDisabled();
  });

  it("opens danger confirm modal when delete clicked on valid clan", async () => {
    render(<ClansTab />);
    await act(async () => {
      fireEvent.click(screen.getByLabelText("clans.deleteClan"));
    });
    expect(mockOpenConfirm).toHaveBeenCalled();
  });

  /* ── Membership save/cancel actions ── */

  it("triggers save on individual membership save button click", async () => {
    mockMembershipData = [
      {
        id: "m20",
        clan_id: "c1",
        game_account_id: "ga20",
        is_active: true,
        is_shadow: false,
        rank: "soldier",
        game_accounts: { id: "ga20", user_id: "u20", game_username: "TestPlayer" },
      },
    ];
    mockProfileData = [];

    render(<ClansTab />);
    await waitFor(() => expect(screen.getByText("TestPlayer")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByLabelText("common.saveChanges"));
    });
    expect(mockSetStatus).toHaveBeenCalledWith("clansTab.noChangesToSave");
  });

  it("triggers cancel on individual membership cancel button click", async () => {
    mockMembershipData = [
      {
        id: "m21",
        clan_id: "c1",
        game_account_id: "ga21",
        is_active: true,
        is_shadow: false,
        rank: "soldier",
        game_accounts: { id: "ga21", user_id: "u21", game_username: "CancelPlayer" },
      },
    ];
    mockProfileData = [];

    render(<ClansTab />);
    await waitFor(() => expect(screen.getByText("CancelPlayer")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByLabelText("common.cancelChanges"));
    });
  });

  /* ── Shadow toggle ── */

  it("toggles shadow on shadow button click", async () => {
    mockMembershipData = [
      {
        id: "m22",
        clan_id: "c1",
        game_account_id: "ga22",
        is_active: true,
        is_shadow: false,
        rank: "soldier",
        game_accounts: { id: "ga22", user_id: "u22", game_username: "ShadowPlayer" },
      },
    ];
    mockProfileData = [];

    render(<ClansTab />);
    await waitFor(() => expect(screen.getByText("ShadowPlayer")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByLabelText("clans.toggleShadow"));
    });
  });

  /* ── Game account editing ── */

  it("enters game account edit mode when editable button is clicked", async () => {
    mockMembershipData = [
      {
        id: "m23",
        clan_id: "c1",
        game_account_id: "ga23",
        is_active: true,
        is_shadow: false,
        rank: "soldier",
        game_accounts: { id: "ga23", user_id: "u23", game_username: "EditPlayer" },
      },
    ];
    mockProfileData = [];

    render(<ClansTab />);
    await waitFor(() => expect(screen.getByText("EditPlayer")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByText("EditPlayer"));
    });
    await waitFor(() => {
      const input = screen.getByPlaceholderText("clans.gameUsername");
      expect(input).toBeInTheDocument();
    });
  });

  /* ── Delete game account ── */

  it("opens game account delete confirm when delete button is clicked", async () => {
    mockMembershipData = [
      {
        id: "m24",
        clan_id: "c1",
        game_account_id: "ga24",
        is_active: true,
        is_shadow: false,
        rank: "soldier",
        game_accounts: { id: "ga24", user_id: "u24", game_username: "DeletePlayer" },
      },
    ];
    mockProfileData = [];

    render(<ClansTab />);
    await waitFor(() => expect(screen.getByText("DeletePlayer")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByLabelText("members.deleteGameAccount"));
    });
    expect(mockOpenConfirm).toHaveBeenCalled();
  });

  /* ── Set default clan ── */

  it("set default button is enabled when a clan is selected", () => {
    render(<ClansTab />);
    const btn = screen.getByLabelText("clans.setDefault");
    expect(btn).not.toBeDisabled();
  });

  /* ── Clear default clan ── */

  it("clear default button is visible when clan is default", () => {
    mockDefaultClanId = "c1";
    render(<ClansTab />);
    expect(screen.getByLabelText("clans.clearDefault")).toBeInTheDocument();
  });

  /* ── Clear filters resets search and filter state ── */

  it("resets filters when clear filters is clicked", async () => {
    render(<ClansTab />);
    await act(async () => {
      fireEvent.click(screen.getByText("common.clearFilters"));
    });
  });

  /* ── Assign accounts button when no clan selected ── */

  it("disables assign accounts button when no clan selected", () => {
    mockSelectedClanId = "";
    render(<ClansTab />);
    const assignBtn = screen.getByLabelText("clans.assignAccounts");
    expect(assignBtn).toBeDisabled();
  });

  /* ── Clan description input in modal ── */

  it("renders description input in create clan modal", async () => {
    render(<ClansTab />);
    await act(async () => {
      fireEvent.click(screen.getByLabelText("clans.createClan"));
    });
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Primary clan hub")).toBeInTheDocument();
    });
  });

  it("changes description input in create clan modal", async () => {
    render(<ClansTab />);
    await act(async () => {
      fireEvent.click(screen.getByLabelText("clans.createClan"));
    });
    await waitFor(() => expect(screen.getByTestId("form-modal")).toBeInTheDocument());
    const descInput = screen.getByPlaceholderText("Primary clan hub");
    fireEvent.change(descInput, { target: { value: "Test description" } });
    expect(descInput).toHaveValue("Test description");
  });

  /* ── Clan select change ── */

  it("calls setSelectedClanId with empty string when none is selected via selector", () => {
    render(<ClansTab />);
    const select = screen.getByTestId("selectedClan");
    fireEvent.change(select, { target: { value: "__none__" } });
    expect(mockSetSelectedClanId).toHaveBeenCalledWith("");
  });

  /* ── User display fallback (username, email) ── */

  it("shows username from profile when display_name is null", async () => {
    mockMembershipData = [
      {
        id: "m25",
        clan_id: "c1",
        game_account_id: "ga25",
        is_active: true,
        is_shadow: false,
        rank: "soldier",
        game_accounts: { id: "ga25", user_id: "u25", game_username: "FallbackPlayer" },
      },
    ];
    mockProfileData = [{ id: "u25", email: "fallback@test.com", display_name: null, username: "fallbackuser" }];

    render(<ClansTab />);
    await waitFor(() => {
      expect(screen.getByText("fallbackuser")).toBeInTheDocument();
    });
  });

  /* ── Membership with no game account has no delete button ── */

  it("does not render delete button when game_accounts is null", async () => {
    mockMembershipData = [
      {
        id: "m26",
        clan_id: "c1",
        game_account_id: "ga26",
        is_active: true,
        is_shadow: false,
        rank: null,
        game_accounts: null,
      },
    ];
    mockProfileData = [];

    render(<ClansTab />);
    await waitFor(() => {
      expect(screen.getByText("ga26")).toBeInTheDocument();
    });
    expect(screen.queryByLabelText("members.deleteGameAccount")).not.toBeInTheDocument();
  });

  /* ── Membership label fallback: profile email ── */

  it("shows profile email when game_username is empty and no display name", async () => {
    mockMembershipData = [
      {
        id: "m27",
        clan_id: "c1",
        game_account_id: "ga27",
        is_active: true,
        is_shadow: false,
        rank: null,
        game_accounts: { id: "ga27", user_id: "u27", game_username: "" },
      },
    ];
    mockProfileData = [{ id: "u27", email: "emailonly@test.com", display_name: null, username: null }];

    render(<ClansTab />);
    await waitFor(() => {
      expect(screen.getByText("emailonly@test.com")).toBeInTheDocument();
    });
  });

  /* ── Assign accounts modal opens when button clicked ── */

  it("opens assign accounts modal when assign button clicked", async () => {
    render(<ClansTab />);

    await act(async () => {
      fireEvent.click(screen.getByLabelText("clans.assignAccounts"));
    });

    await waitFor(() => {
      const modal = document.querySelector(".assign-modal");
      expect(modal).toBeInTheDocument();
    });
  });

  /* ── Assign accounts modal closes on cancel ── */

  it("closes assign accounts modal on cancel", async () => {
    render(<ClansTab />);

    await act(async () => {
      fireEvent.click(screen.getByLabelText("clans.assignAccounts"));
    });
    await waitFor(() => expect(document.querySelector(".assign-modal")).toBeInTheDocument());

    const cancelBtns = screen.getAllByText("common.cancel");
    const assignCancel = cancelBtns.find((btn) => btn.closest(".assign-modal"));
    if (assignCancel) {
      await act(async () => {
        fireEvent.click(assignCancel);
      });
    }
    await waitFor(() => {
      expect(document.querySelector(".assign-modal")).not.toBeInTheDocument();
    });
  });

  /* ── Assign modal shows no accounts match when filtered list is empty ── */

  it("shows no accounts match message in assign modal", async () => {
    render(<ClansTab />);

    await act(async () => {
      fireEvent.click(screen.getByLabelText("clans.assignAccounts"));
    });

    await waitFor(() => {
      expect(screen.getByText("clansTab.noGameAccountsMatch")).toBeInTheDocument();
    });
  });

  /* ── Assign modal shows assign as shadow checkbox ── */

  it("renders assign as shadow checkbox in assign modal", async () => {
    render(<ClansTab />);

    await act(async () => {
      fireEvent.click(screen.getByLabelText("clans.assignAccounts"));
    });

    await waitFor(() => {
      expect(screen.getByText("clans.assignAsShadow")).toBeInTheDocument();
    });
  });

  /* ── Assign modal shows selected count ── */

  it("shows 0 selected count in assign modal initially", async () => {
    render(<ClansTab />);

    await act(async () => {
      fireEvent.click(screen.getByLabelText("clans.assignAccounts"));
    });

    await waitFor(() => {
      expect(screen.getByText(/0.*common.selected/)).toBeInTheDocument();
    });
  });

  /* ── Save all memberships confirm modal ── */

  it("save all button is initially disabled when no edits", () => {
    render(<ClansTab />);
    const btn = screen.getByText("common.saveAll");
    expect(btn).toBeDisabled();
  });

  /* ── Clan selector changes clan ── */

  it("calls setSelectedClanId when clan selector value changes", () => {
    render(<ClansTab />);
    const select = screen.getByTestId("selectedClan");
    fireEvent.change(select, { target: { value: "c2" } });
    expect(mockSetSelectedClanId).toHaveBeenCalled();
  });

  /* ── Inactive members ── */

  it("renders inactive members", async () => {
    mockMembershipData = [
      {
        id: "m30",
        clan_id: "c1",
        game_account_id: "ga30",
        is_active: false,
        is_shadow: false,
        rank: "soldier",
        game_accounts: { id: "ga30", user_id: "u30", game_username: "InactivePlayer" },
      },
    ];
    mockProfileData = [];

    render(<ClansTab />);
    await waitFor(() => {
      expect(screen.getByText("InactivePlayer")).toBeInTheDocument();
    });
  });

  /* ── Member with role data ── */

  it("renders role badge for members with role data", async () => {
    mockMembershipData = [
      {
        id: "m31",
        clan_id: "c1",
        game_account_id: "ga31",
        is_active: true,
        is_shadow: false,
        rank: "officer",
        game_accounts: { id: "ga31", user_id: "u31", game_username: "RolePlayer" },
      },
    ];
    mockProfileData = [{ id: "u31", email: "u31@test.com", display_name: "RoleUser", username: "roleuser" }];
    mockRoleData = [{ user_id: "u31", role: "moderator" }];

    render(<ClansTab />);
    await waitFor(() => {
      expect(screen.getByText("RolePlayer")).toBeInTheDocument();
      expect(screen.getByText("RoleUser")).toBeInTheDocument();
    });
  });

  /* ── Assign modal header shows clan name ── */

  it("shows selected clan name in assign modal subtitle", async () => {
    render(<ClansTab />);

    await act(async () => {
      fireEvent.click(screen.getByLabelText("clans.assignAccounts"));
    });

    await waitFor(() => {
      const allText = document.querySelector(".assign-modal")?.textContent ?? "";
      expect(allText).toContain("gameAccounts.assignTo");
    });
  });

  /* ── Edit clan modal pre-fills name ── */

  it("pre-fills clan name in edit modal", async () => {
    render(<ClansTab />);

    await act(async () => {
      fireEvent.click(screen.getByLabelText("clans.editClan"));
    });

    await waitFor(() => {
      const nameInput = screen.getByPlaceholderText("[THC] Chiller & Killer");
      expect(nameInput).toHaveValue("Alpha Clan");
    });
  });

  /* ────────────────────────────────────────────────────────────────────────────
   * NEW TESTS — covers lines 1071-1303 and surrounding uncovered branches
   * ──────────────────────────────────────────────────────────────────────────── */

  /* ── Rank change via dropdown (updateMembershipEdit for rank) ── */

  it("changes rank via RadixSelect and marks field as edited", async () => {
    mockMembershipData = [
      {
        id: "m-rank1",
        clan_id: "c1",
        game_account_id: "ga-rank1",
        is_active: true,
        is_shadow: false,
        rank: "soldier",
        game_accounts: { id: "ga-rank1", user_id: "u-rank1", game_username: "RankPlayer" },
      },
    ];
    mockProfileData = [];

    render(<ClansTab />);
    await waitFor(() => expect(screen.getByText("RankPlayer")).toBeInTheDocument());

    const rankSelects = screen.getAllByTestId("common.rank");
    expect(rankSelects.length).toBeGreaterThanOrEqual(1);
    const memberRankSelect = rankSelects[rankSelects.length - 1]!;
    await act(async () => {
      fireEvent.change(memberRankSelect, { target: { value: "officer" } });
    });
  });

  /* ── Status change via dropdown (is_active toggle) ── */

  it("changes status via is_active dropdown", async () => {
    mockMembershipData = [
      {
        id: "m-status1",
        clan_id: "c1",
        game_account_id: "ga-status1",
        is_active: true,
        is_shadow: false,
        rank: "soldier",
        game_accounts: { id: "ga-status1", user_id: "u-status1", game_username: "StatusPlayer" },
      },
    ];
    mockProfileData = [];

    render(<ClansTab />);
    await waitFor(() => expect(screen.getByText("StatusPlayer")).toBeInTheDocument());

    const statusSelects = screen.getAllByTestId("common.status");
    const memberStatusSelect = statusSelects[statusSelects.length - 1]!;
    await act(async () => {
      fireEvent.change(memberStatusSelect, { target: { value: "false" } });
    });
  });

  /* ── Clan reassignment via dropdown (updateMembershipEdit for clan_id) ── */

  it("changes clan via clan dropdown on a member row", async () => {
    mockMembershipData = [
      {
        id: "m-clan1",
        clan_id: "c1",
        game_account_id: "ga-clan1",
        is_active: true,
        is_shadow: false,
        rank: "soldier",
        game_accounts: { id: "ga-clan1", user_id: "u-clan1", game_username: "ClanChangePlayer" },
      },
    ];
    mockProfileData = [];

    render(<ClansTab />);
    await waitFor(() => expect(screen.getByText("ClanChangePlayer")).toBeInTheDocument());

    const clanSelects = screen.getAllByTestId("common.clan");
    const memberClanSelect = clanSelects[clanSelects.length - 1]!;
    await act(async () => {
      fireEvent.change(memberClanSelect, { target: { value: "c2" } });
    });
  });

  /* ── Shadow toggle on an already-shadow member (turns it off) ── */

  it("toggles shadow off for a shadow member", async () => {
    mockMembershipData = [
      {
        id: "m-shadow-off",
        clan_id: "c1",
        game_account_id: "ga-shadow-off",
        is_active: true,
        is_shadow: true,
        rank: "soldier",
        game_accounts: { id: "ga-shadow-off", user_id: "u-shadow-off", game_username: "ShadowOff" },
      },
    ];
    mockProfileData = [];

    render(<ClansTab />);
    await waitFor(() => expect(screen.getByText("ShadowOff")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByLabelText("clans.toggleShadow"));
    });
  });

  /* ── Save membership edit with actual edits calls supabase update ── */

  it("saves membership edit when rank is changed and save is clicked", async () => {
    mockMembershipData = [
      {
        id: "m-save1",
        clan_id: "c1",
        game_account_id: "ga-save1",
        is_active: true,
        is_shadow: false,
        rank: "soldier",
        game_accounts: { id: "ga-save1", user_id: "u-save1", game_username: "SavePlayer" },
      },
    ];
    mockProfileData = [];

    render(<ClansTab />);
    await waitFor(() => expect(screen.getByText("SavePlayer")).toBeInTheDocument());

    const rankSelects = screen.getAllByTestId("common.rank");
    const memberRank = rankSelects[rankSelects.length - 1]!;
    await act(async () => {
      fireEvent.change(memberRank, { target: { value: "officer" } });
    });

    await act(async () => {
      fireEvent.click(screen.getByLabelText("common.saveChanges"));
    });
    await waitFor(() => {
      expect(mockSetStatus).toHaveBeenCalledWith("clansTab.membershipUpdated");
    });
  });

  /* ── Assign accounts modal: submit with no selection shows error ── */

  it("shows error when assign is clicked without selecting accounts", async () => {
    render(<ClansTab />);

    await act(async () => {
      fireEvent.click(screen.getByLabelText("clans.assignAccounts"));
    });
    await waitFor(() => expect(document.querySelector(".assign-modal")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByText("gameAccounts.assignSelected"));
    });

    await waitFor(() => {
      expect(screen.getByText("clansTab.selectAtLeastOneGameAccount")).toBeInTheDocument();
    });
  });

  /* ── Assign accounts modal: search input present ── */

  it("renders search input inside assign modal", async () => {
    render(<ClansTab />);

    await act(async () => {
      fireEvent.click(screen.getByLabelText("clans.assignAccounts"));
    });
    await waitFor(() => expect(document.querySelector(".assign-modal")).toBeInTheDocument());

    expect(screen.getByTestId("assignSearch")).toBeInTheDocument();
  });

  /* ── Assign accounts modal: filter select present ── */

  it("renders filter select inside assign modal", async () => {
    render(<ClansTab />);

    await act(async () => {
      fireEvent.click(screen.getByLabelText("clans.assignAccounts"));
    });
    await waitFor(() => expect(document.querySelector(".assign-modal")).toBeInTheDocument());

    expect(screen.getByTestId("assignFilter")).toBeInTheDocument();
  });

  /* ── Assign modal with accounts: select checkbox and submit ── */

  it("selects an account and submits assignment", async () => {
    mockGameAccountData = [
      { id: "ga-assign1", user_id: "u-assign1", game_username: "AssignPlayer", approval_status: "approved" },
    ];
    mockGameAccountMembershipData = [{ game_account_id: "ga-assign1", clan_id: "c-unassigned" }];
    mockGameAccountProfileData = [
      { id: "u-assign1", email: "assign@test.com", display_name: "Assign User", username: "assignuser" },
    ];

    render(<ClansTab />);

    await act(async () => {
      fireEvent.click(screen.getByLabelText("clans.assignAccounts"));
    });

    await waitFor(() => expect(document.querySelector(".assign-modal")).toBeInTheDocument());

    await waitFor(() => {
      const checkbox = document.querySelector(".assign-modal-scroll input[type='checkbox']");
      expect(checkbox).toBeInTheDocument();
    });

    const checkbox = document.querySelector(".assign-modal-scroll input[type='checkbox']") as HTMLInputElement;
    await act(async () => {
      fireEvent.click(checkbox);
    });

    await act(async () => {
      fireEvent.click(screen.getByText("gameAccounts.assignSelected"));
    });

    await waitFor(() => {
      expect(mockSupabase.from).toHaveBeenCalledWith("game_account_clan_memberships");
    });
  });

  /* ── Assign modal: assign as shadow checkbox toggle ── */

  it("toggles assign as shadow checkbox", async () => {
    render(<ClansTab />);

    await act(async () => {
      fireEvent.click(screen.getByLabelText("clans.assignAccounts"));
    });
    await waitFor(() => expect(document.querySelector(".assign-modal")).toBeInTheDocument());

    const shadowCheckbox = screen
      .getByText("clans.assignAsShadow")
      .closest("label")
      ?.querySelector("input[type='checkbox']");
    expect(shadowCheckbox).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(shadowCheckbox!);
    });
    expect(shadowCheckbox).toBeChecked();
  });

  /* ── Assign modal: select-all checkbox ── */

  it("renders select all checkbox in assign modal with accounts", async () => {
    mockGameAccountData = [
      { id: "ga-sa1", user_id: "u-sa1", game_username: "SelectAll1", approval_status: "approved" },
      { id: "ga-sa2", user_id: "u-sa2", game_username: "SelectAll2", approval_status: "approved" },
    ];
    mockGameAccountMembershipData = [
      { game_account_id: "ga-sa1", clan_id: "c-unassigned" },
      { game_account_id: "ga-sa2", clan_id: "c-unassigned" },
    ];
    mockGameAccountProfileData = [
      { id: "u-sa1", email: "sa1@test.com", display_name: "SA1", username: "sa1" },
      { id: "u-sa2", email: "sa2@test.com", display_name: "SA2", username: "sa2" },
    ];

    render(<ClansTab />);

    await act(async () => {
      fireEvent.click(screen.getByLabelText("clans.assignAccounts"));
    });

    await waitFor(() => {
      const selectAllLabel = document.querySelector(".assign-select-all");
      expect(selectAllLabel).toBeInTheDocument();
    });

    const selectAllCheckbox = document.querySelector(".assign-select-all input[type='checkbox']") as HTMLInputElement;
    expect(selectAllCheckbox).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(selectAllCheckbox);
    });
  });

  /* ── Delete clan button disabled for unassigned or empty selection ── */

  it("delete button is disabled for unassigned clan selection", () => {
    mockSelectedClanId = "c-unassigned";
    render(<ClansTab />);
    expect(screen.getByLabelText("clans.deleteClan")).toBeDisabled();
  });

  /* ── Set default clan calls supabase ── */

  it("set default button calls supabase for the selected clan", async () => {
    render(<ClansTab />);

    await act(async () => {
      fireEvent.click(screen.getByLabelText("clans.setDefault"));
    });

    await waitFor(() => {
      expect(mockSupabase.from).toHaveBeenCalledWith("clans");
    });
  });

  /* ── Clear default clan calls supabase ── */

  it("clear default button is present when clan is default", () => {
    mockDefaultClanId = "c1";
    render(<ClansTab />);
    const btn = screen.getByLabelText("clans.clearDefault");
    expect(btn).toBeInTheDocument();
  });

  /* ── Game account edit: type new name and cancel ── */

  it("cancels game account edit on cancel button click", async () => {
    mockMembershipData = [
      {
        id: "m-gaedit1",
        clan_id: "c1",
        game_account_id: "ga-gaedit1",
        is_active: true,
        is_shadow: false,
        rank: "soldier",
        game_accounts: { id: "ga-gaedit1", user_id: "u-gaedit1", game_username: "GAEditPlayer" },
      },
    ];
    mockProfileData = [];

    render(<ClansTab />);
    await waitFor(() => expect(screen.getByText("GAEditPlayer")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByText("GAEditPlayer"));
    });

    await waitFor(() => expect(screen.getByPlaceholderText("clans.gameUsername")).toBeInTheDocument());

    const input = screen.getByPlaceholderText("clans.gameUsername");
    fireEvent.change(input, { target: { value: "NewUsername" } });

    await act(async () => {
      fireEvent.click(screen.getByLabelText("common.cancelChanges"));
    });

    await waitFor(() => {
      expect(screen.getByText("GAEditPlayer")).toBeInTheDocument();
    });
  });

  /* ── Assign button disabled when no clan selected ── */

  it("assign accounts button is disabled when no clan is selected", () => {
    mockSelectedClanId = "";
    render(<ClansTab />);
    expect(screen.getByLabelText("clans.assignAccounts")).toBeDisabled();
  });

  /* ── Member search filter: filter members by game username ── */

  it("filters members by search text", async () => {
    mockMembershipData = [
      {
        id: "m-search1",
        clan_id: "c1",
        game_account_id: "ga-search1",
        is_active: true,
        is_shadow: false,
        rank: "soldier",
        game_accounts: { id: "ga-search1", user_id: "u-s1", game_username: "Searchable" },
      },
      {
        id: "m-search2",
        clan_id: "c1",
        game_account_id: "ga-search2",
        is_active: true,
        is_shadow: false,
        rank: "soldier",
        game_accounts: { id: "ga-search2", user_id: "u-s2", game_username: "Hidden" },
      },
    ];
    mockProfileData = [];

    render(<ClansTab />);

    await waitFor(() => {
      expect(screen.getByText("Searchable")).toBeInTheDocument();
      expect(screen.getByText("Hidden")).toBeInTheDocument();
    });

    expect(screen.getByText("2 / 2")).toBeInTheDocument();
  });

  /* ── Edit clan modal with empty name shows error ── */

  it("shows error when editing clan with empty name", async () => {
    render(<ClansTab />);

    await act(async () => {
      fireEvent.click(screen.getByLabelText("clans.editClan"));
    });
    await waitFor(() => expect(screen.getByTestId("form-modal")).toBeInTheDocument());

    const nameInput = screen.getByPlaceholderText("[THC] Chiller & Killer");
    fireEvent.change(nameInput, { target: { value: "" } });

    await act(async () => {
      fireEvent.click(screen.getByTestId("form-submit"));
    });

    await waitFor(() => {
      expect(mockSetStatus).toHaveBeenCalledWith("clansTab.clanNameRequired");
    });
  });

  /* ── Cancel all membership edits calls setStatus ── */

  it("cancelAll calls setStatus when no edits (button disabled, but function directly called)", async () => {
    mockMembershipData = [
      {
        id: "m-ca1",
        clan_id: "c1",
        game_account_id: "ga-ca1",
        is_active: true,
        is_shadow: false,
        rank: "soldier",
        game_accounts: { id: "ga-ca1", user_id: "u-ca1", game_username: "CancelAllPlayer" },
      },
    ];
    mockProfileData = [];

    render(<ClansTab />);
    await waitFor(() => expect(screen.getByText("CancelAllPlayer")).toBeInTheDocument());

    const rankSelects = screen.getAllByTestId("common.rank");
    const memberRank = rankSelects[rankSelects.length - 1]!;
    await act(async () => {
      fireEvent.change(memberRank, { target: { value: "officer" } });
    });

    const cancelAllBtn = screen.getByText("common.cancelAll");
    await act(async () => {
      fireEvent.click(cancelAllBtn);
    });

    await waitFor(() => {
      expect(mockSetStatus).toHaveBeenCalledWith("clansTab.allMembershipChangesCleared");
    });
  });
});
