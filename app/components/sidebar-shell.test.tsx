// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import SidebarShell from "./sidebar-shell";

let mockIsOpen = true;
const mockToggle = vi.fn();
let mockWidth = 240;

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
vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, ...props }: any) => {
    const React = require("react");
    return React.createElement("a", props, children);
  },
}));

let mockPathname = "/dashboard";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => mockPathname,
}));

vi.mock("./sidebar-context", () => ({
  useSidebar: () => ({ isOpen: mockIsOpen, toggle: mockToggle, width: mockWidth }),
}));
vi.mock("./sidebar-nav", () => ({
  __esModule: true,
  default: () => {
    const React = require("react");
    return React.createElement("nav", { "data-testid": "sidebar-nav" }, "Nav");
  },
}));
vi.mock("./language-selector", () => ({
  __esModule: true,
  default: (props: any) => {
    const React = require("react");
    return React.createElement("div", { "data-testid": "language-selector" }, "LangSelector");
  },
}));
vi.mock("./ui/radix-select", () => ({
  __esModule: true,
  default: ({ onValueChange, value }: any) => {
    const React = require("react");
    return React.createElement(
      "div",
      { "data-testid": "clan-select" },
      React.createElement(
        "button",
        { onClick: () => onValueChange("clan-2:ga-2"), "data-testid": "clan-change-btn" },
        `ClanSelect(${value})`,
      ),
    );
  },
}));

const mockSignOut = vi.fn().mockResolvedValue({});
const mockGetUser = vi.fn();
const mockOnAuthStateChange = vi.fn(() => ({
  data: { subscription: { unsubscribe: vi.fn() } },
}));
const mockFromSelect = vi.fn();

const mockSupabase = {
  auth: {
    getUser: mockGetUser,
    onAuthStateChange: mockOnAuthStateChange,
    signOut: mockSignOut,
  },
  from: mockFromSelect,
};
vi.mock("../hooks/use-supabase", () => ({
  useSupabase: () => mockSupabase,
}));

let mockIsAdmin = false;
vi.mock("@/lib/hooks/use-user-role", () => ({
  useUserRole: () => ({ role: "member", isAdmin: mockIsAdmin }),
}));
vi.mock("@/app/admin/admin-types", () => ({
  formatRank: (r: string) => r,
  formatRole: (r: string) => r,
  rankOptions: ["leader", "officer", "member"],
}));

function setupMockUser(opts: { hasProfile?: boolean; hasClanOptions?: boolean; isAdmin?: boolean } = {}) {
  const { hasProfile = false, hasClanOptions = false, isAdmin = false } = opts;
  mockIsAdmin = isAdmin;
  if (!hasProfile) {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    mockFromSelect.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [] }),
          }),
        }),
      }),
    });
  } else {
    mockGetUser.mockResolvedValue({
      data: { user: { email: "test@test.com", id: "user-1" } },
    });
    const memberships = hasClanOptions
      ? [
          {
            clan_id: "clan-1",
            game_account_id: "ga-1",
            rank: "officer",
            clans: { name: "TestClan", is_unassigned: false },
            game_accounts: { game_username: "Player1", approval_status: "approved" },
          },
        ]
      : [];
    mockFromSelect.mockImplementation((table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  user_db: "TestDB",
                  username: "testuser",
                  display_name: "Test User",
                  default_game_account_id: null,
                },
              }),
            }),
          }),
        };
      }
      if (table === "game_account_clan_memberships") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: memberships }),
              }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null }),
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [] }),
            }),
          }),
        }),
      };
    });
  }
}

describe("SidebarShell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsOpen = true;
    mockWidth = 240;
    mockPathname = "/dashboard";
    mockIsAdmin = false;
    setupMockUser();
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
    Object.defineProperty(window, "localStorage", {
      writable: true,
      value: { getItem: vi.fn(() => null), setItem: vi.fn() },
    });
  });

  it("renders aside and main elements", () => {
    const { container } = render(
      <SidebarShell>
        <div>Page content</div>
      </SidebarShell>,
    );
    expect(container.querySelector("aside.sidebar")).toBeTruthy();
    expect(container.querySelector("main.content")).toBeTruthy();
  });

  it("renders children in main area", () => {
    render(
      <SidebarShell>
        <div>Page content</div>
      </SidebarShell>,
    );
    expect(screen.getByText("Page content")).toBeTruthy();
  });

  it("renders sidebar nav", () => {
    render(
      <SidebarShell>
        <div />
      </SidebarShell>,
    );
    expect(screen.getByTestId("sidebar-nav")).toBeTruthy();
  });

  it("renders the collapse toggle button", () => {
    render(
      <SidebarShell>
        <div />
      </SidebarShell>,
    );
    expect(screen.getByLabelText("collapse")).toBeTruthy();
  });

  it("calls toggle when collapse button is clicked", () => {
    render(
      <SidebarShell>
        <div />
      </SidebarShell>,
    );
    fireEvent.click(screen.getByLabelText("collapse"));
    expect(mockToggle).toHaveBeenCalledOnce();
  });

  it("renders the logo", () => {
    render(
      <SidebarShell>
        <div />
      </SidebarShell>,
    );
    expect(screen.getByAltText("Chillers & Killers logo")).toBeTruthy();
  });

  it("renders sidebar title", () => {
    render(
      <SidebarShell>
        <div />
      </SidebarShell>,
    );
    expect(screen.getByText("title")).toBeTruthy();
  });

  it("renders language selector when not compact viewport", () => {
    render(
      <SidebarShell>
        <div />
      </SidebarShell>,
    );
    expect(screen.getByTestId("language-selector")).toBeTruthy();
  });

  it("sets sidebar width via style", () => {
    const { container } = render(
      <SidebarShell>
        <div />
      </SidebarShell>,
    );
    const aside = container.querySelector("aside.sidebar") as HTMLElement;
    expect(aside.style.width).toBe("240px");
  });

  it("sets main margin-left to match sidebar width", () => {
    const { container } = render(
      <SidebarShell>
        <div />
      </SidebarShell>,
    );
    const main = container.querySelector("main.content") as HTMLElement;
    expect(main.style.marginLeft).toBe("240px");
  });

  it("renders collapse aria-label as 'collapse' when open", () => {
    render(
      <SidebarShell>
        <div />
      </SidebarShell>,
    );
    expect(screen.getByLabelText("collapse")).toBeTruthy();
  });

  it("renders collapse aria-label as 'expand' when closed", () => {
    mockIsOpen = false;
    render(
      <SidebarShell>
        <div />
      </SidebarShell>,
    );
    expect(screen.getByLabelText("expand")).toBeTruthy();
  });

  it("hides language selector in compact viewport", () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: true,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
    render(
      <SidebarShell>
        <div />
      </SidebarShell>,
    );
    expect(screen.queryByTestId("language-selector")).toBeNull();
  });

  it("renders user card when profile is loaded", async () => {
    setupMockUser({ hasProfile: true });
    render(
      <SidebarShell>
        <div />
      </SidebarShell>,
    );
    await waitFor(() => {
      expect(screen.getByText("Test User")).toBeTruthy();
    });
  });

  it("renders user initials", async () => {
    setupMockUser({ hasProfile: true });
    render(
      <SidebarShell>
        <div />
      </SidebarShell>,
    );
    await waitFor(() => {
      expect(screen.getByText("TE")).toBeTruthy();
    });
  });

  it("renders clan selector when clan options exist", async () => {
    setupMockUser({ hasProfile: true, hasClanOptions: true });
    render(
      <SidebarShell>
        <div />
      </SidebarShell>,
    );
    await waitFor(() => {
      expect(screen.getByTestId("clan-select")).toBeTruthy();
    });
  });

  it("does not render clan selector when no clan options", async () => {
    setupMockUser({ hasProfile: true, hasClanOptions: false });
    render(
      <SidebarShell>
        <div />
      </SidebarShell>,
    );
    await waitFor(() => {
      expect(screen.getByText("Test User")).toBeTruthy();
    });
    expect(screen.queryByTestId("clan-select")).toBeNull();
  });

  it("handles clan change", async () => {
    const mockDispatchEvent = vi.spyOn(window, "dispatchEvent");
    setupMockUser({ hasProfile: true, hasClanOptions: true });
    render(
      <SidebarShell>
        <div />
      </SidebarShell>,
    );
    await waitFor(() => {
      expect(screen.getByTestId("clan-change-btn")).toBeTruthy();
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId("clan-change-btn"));
    });
    expect(window.localStorage.setItem).toHaveBeenCalledWith("tc.currentClanId", "clan-2");
    expect(window.localStorage.setItem).toHaveBeenCalledWith("tc.currentGameAccountId", "ga-2");
    expect(mockDispatchEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "clan-context-change" }));
    mockDispatchEvent.mockRestore();
  });

  it("opens user menu when user card clicked", async () => {
    setupMockUser({ hasProfile: true });
    render(
      <SidebarShell>
        <div />
      </SidebarShell>,
    );
    await waitFor(() => {
      expect(screen.getByText("Test User")).toBeTruthy();
    });
    await act(async () => {
      fireEvent.click(screen.getByText("Test User"));
    });
    await waitFor(() => {
      expect(screen.getByText("signOut")).toBeTruthy();
    });
    expect(screen.getByText("profile")).toBeTruthy();
    expect(screen.getByText("messages")).toBeTruthy();
    expect(screen.getByText("settings")).toBeTruthy();
  });

  it("closes user menu when clicked outside", async () => {
    setupMockUser({ hasProfile: true });
    render(
      <SidebarShell>
        <div />
      </SidebarShell>,
    );
    await waitFor(() => {
      expect(screen.getByText("Test User")).toBeTruthy();
    });
    await act(async () => {
      fireEvent.click(screen.getByText("Test User"));
    });
    await waitFor(() => {
      expect(screen.getByText("signOut")).toBeTruthy();
    });
    await act(async () => {
      fireEvent.mouseDown(document.body);
    });
    await waitFor(() => {
      expect(screen.queryByText("signOut")).toBeNull();
    });
  });

  it("signs out and redirects", async () => {
    setupMockUser({ hasProfile: true });
    delete (window as any).location;
    (window as any).location = { href: "" };
    render(
      <SidebarShell>
        <div />
      </SidebarShell>,
    );
    await waitFor(() => {
      expect(screen.getByText("Test User")).toBeTruthy();
    });
    await act(async () => {
      fireEvent.click(screen.getByText("Test User"));
    });
    await waitFor(() => {
      expect(screen.getByText("signOut")).toBeTruthy();
    });
    await act(async () => {
      fireEvent.click(screen.getByText("signOut"));
    });
    expect(mockSignOut).toHaveBeenCalledOnce();
    await waitFor(() => {
      expect(window.location.href).toBe("/home");
    });
  });

  it("renders admin crown icon when isAdmin", async () => {
    setupMockUser({ hasProfile: true, isAdmin: true });
    render(
      <SidebarShell>
        <div />
      </SidebarShell>,
    );
    await waitFor(() => {
      expect(screen.getByText("Test User")).toBeTruthy();
    });
    expect(screen.getByAltText("Admin")).toBeTruthy();
  });

  it("does not render admin crown when not admin", async () => {
    setupMockUser({ hasProfile: true, isAdmin: false });
    render(
      <SidebarShell>
        <div />
      </SidebarShell>,
    );
    await waitFor(() => {
      expect(screen.getByText("Test User")).toBeTruthy();
    });
    expect(screen.queryByAltText("Admin")).toBeNull();
  });

  it("renders profile and settings action buttons for desktop", async () => {
    setupMockUser({ hasProfile: true });
    render(
      <SidebarShell>
        <div />
      </SidebarShell>,
    );
    await waitFor(() => {
      expect(screen.getByText("Test User")).toBeTruthy();
    });
    expect(screen.getByLabelText("profile")).toBeTruthy();
    expect(screen.getByLabelText("settings")).toBeTruthy();
  });

  it("shows language selector in compact viewport user menu", async () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: true,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
    setupMockUser({ hasProfile: true });
    render(
      <SidebarShell>
        <div />
      </SidebarShell>,
    );
    await waitFor(() => {
      expect(screen.getByText("Test User")).toBeTruthy();
    });
    await act(async () => {
      fireEvent.click(screen.getByText("Test User"));
    });
    await waitFor(() => {
      expect(screen.getByText("LangSelector")).toBeTruthy();
    });
  });

  it("registers auth state change listener", () => {
    render(
      <SidebarShell>
        <div />
      </SidebarShell>,
    );
    expect(mockOnAuthStateChange).toHaveBeenCalled();
  });

  it("applies collapsed styles when sidebar is closed", () => {
    mockIsOpen = false;
    mockWidth = 56;
    const { container } = render(
      <SidebarShell>
        <div />
      </SidebarShell>,
    );
    const aside = container.querySelector("aside.sidebar") as HTMLElement;
    expect(aside.style.width).toBe("56px");
    const main = container.querySelector("main.content") as HTMLElement;
    expect(main.style.marginLeft).toBe("56px");
  });

  it("toggles user menu open and closed", async () => {
    setupMockUser({ hasProfile: true });
    render(
      <SidebarShell>
        <div />
      </SidebarShell>,
    );
    await waitFor(() => {
      expect(screen.getByText("Test User")).toBeTruthy();
    });
    const userButton = screen.getByRole("button", { expanded: false });
    await act(async () => {
      fireEvent.click(userButton);
    });
    await waitFor(() => {
      expect(screen.getByText("signOut")).toBeTruthy();
    });

    const expandedButton = screen.getByRole("button", { expanded: true });
    await act(async () => {
      fireEvent.click(expandedButton);
    });
    await waitFor(() => {
      expect(screen.queryByText("signOut")).toBeNull();
    });
  });

  it("hides profile/settings action buttons in compact viewport", async () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: true,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
    setupMockUser({ hasProfile: true });
    render(
      <SidebarShell>
        <div />
      </SidebarShell>,
    );
    await waitFor(() => {
      expect(screen.getByText("Test User")).toBeTruthy();
    });
    expect(screen.queryByLabelText("profile")).toBeNull();
    expect(screen.queryByLabelText("settings")).toBeNull();
  });

  it("closes user menu when a link is clicked", async () => {
    setupMockUser({ hasProfile: true });
    render(
      <SidebarShell>
        <div />
      </SidebarShell>,
    );
    await waitFor(() => {
      expect(screen.getByText("Test User")).toBeTruthy();
    });
    await act(async () => {
      fireEvent.click(screen.getByText("Test User"));
    });
    await waitFor(() => {
      expect(screen.getByText("profile")).toBeTruthy();
    });
    await act(async () => {
      fireEvent.click(screen.getByText("profile"));
    });
    await waitFor(() => {
      expect(screen.queryByText("signOut")).toBeNull();
    });
  });

  it("shows email and status line in user menu", async () => {
    setupMockUser({ hasProfile: true, hasClanOptions: true });
    render(
      <SidebarShell>
        <div />
      </SidebarShell>,
    );
    await waitFor(() => {
      expect(screen.getByText("Test User")).toBeTruthy();
    });
    await act(async () => {
      fireEvent.click(screen.getByText("Test User"));
    });
    await waitFor(() => {
      expect(screen.getByText("test@test.com")).toBeTruthy();
    });
  });

  it("stores first clan option in localStorage when no default or stored key", async () => {
    setupMockUser({ hasProfile: true, hasClanOptions: true });
    render(
      <SidebarShell>
        <div />
      </SidebarShell>,
    );
    await waitFor(() => {
      expect(screen.getByTestId("clan-select")).toBeTruthy();
    });
    expect(window.localStorage.setItem).toHaveBeenCalledWith("tc.currentClanId", "clan-1");
    expect(window.localStorage.setItem).toHaveBeenCalledWith("tc.currentGameAccountId", "ga-1");
  });

  it("restores stored key from localStorage when available", async () => {
    (window.localStorage.getItem as any).mockImplementation((key: string) => {
      if (key === "tc.currentClanId") return "clan-1";
      if (key === "tc.currentGameAccountId") return "ga-1";
      return null;
    });
    setupMockUser({ hasProfile: true, hasClanOptions: true });
    render(
      <SidebarShell>
        <div />
      </SidebarShell>,
    );
    await waitFor(() => {
      expect(screen.getByTestId("clan-select")).toBeTruthy();
    });
  });

  it("restores default_game_account_id from DB profile", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { email: "test@test.com", id: "user-1" } },
    });
    mockFromSelect.mockImplementation((table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  user_db: "TestDB",
                  username: "testuser",
                  display_name: "Test User",
                  default_game_account_id: "ga-1",
                },
              }),
            }),
          }),
        };
      }
      if (table === "game_account_clan_memberships") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  data: [
                    {
                      clan_id: "clan-1",
                      game_account_id: "ga-1",
                      rank: "leader",
                      clans: { name: "TestClan", is_unassigned: false },
                      game_accounts: { game_username: "Player1", approval_status: "approved" },
                    },
                  ],
                }),
              }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null }),
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [] }),
            }),
          }),
        }),
      };
    });

    render(
      <SidebarShell>
        <div />
      </SidebarShell>,
    );
    await waitFor(() => {
      expect(screen.getByTestId("clan-select")).toBeTruthy();
    });
    expect(window.localStorage.setItem).toHaveBeenCalledWith("tc.currentClanId", "clan-1");
    expect(window.localStorage.setItem).toHaveBeenCalledWith("tc.currentGameAccountId", "ga-1");
  });

  it("responds to matchMedia change event", async () => {
    let changeHandler: (() => void) | null = null;
    const mediaQueryObj = {
      matches: false,
      media: "(max-width: 900px)",
      addEventListener: vi.fn((event: string, handler: () => void) => {
        if (event === "change") changeHandler = handler;
      }),
      removeEventListener: vi.fn(),
    };
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockReturnValue(mediaQueryObj),
    });

    setupMockUser({ hasProfile: true });
    render(
      <SidebarShell>
        <div />
      </SidebarShell>,
    );

    expect(screen.getByTestId("language-selector")).toBeTruthy();

    mediaQueryObj.matches = true;
    if (changeHandler) {
      act(() => {
        changeHandler!();
      });
    }

    await waitFor(() => {
      expect(screen.queryByTestId("language-selector")).toBeNull();
    });
  });

  it("does not render user card when no user is logged in", () => {
    setupMockUser({ hasProfile: false });
    render(
      <SidebarShell>
        <div />
      </SidebarShell>,
    );
    expect(screen.queryByText("signOut")).toBeNull();
  });

  it("filters out non-approved game accounts", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { email: "test@test.com", id: "user-1" } },
    });
    mockFromSelect.mockImplementation((table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { user_db: null, username: "test", display_name: "Test", default_game_account_id: null },
              }),
            }),
          }),
        };
      }
      if (table === "game_account_clan_memberships") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  data: [
                    {
                      clan_id: "clan-1",
                      game_account_id: "ga-pending",
                      rank: "member",
                      clans: { name: "Clan1", is_unassigned: false },
                      game_accounts: { game_username: "PendingPlayer", approval_status: "pending" },
                    },
                  ],
                }),
              }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null }),
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [] }),
            }),
          }),
        }),
      };
    });

    render(
      <SidebarShell>
        <div />
      </SidebarShell>,
    );
    await waitFor(() => {
      expect(screen.getByText("Test")).toBeTruthy();
    });
    expect(screen.queryByTestId("clan-select")).toBeNull();
  });

  it("highlights settings link when on settings page", async () => {
    mockPathname = "/settings";
    setupMockUser({ hasProfile: true });
    render(
      <SidebarShell>
        <div />
      </SidebarShell>,
    );
    await waitFor(() => {
      expect(screen.getByText("Test User")).toBeTruthy();
    });
    const settingsLink = screen.getByLabelText("settings");
    expect(settingsLink.className).toContain("active");
  });

  it("handles user with no display_name falling back to username", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { email: "fallback@test.com", id: "user-1" } },
    });
    mockFromSelect.mockImplementation((table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { user_db: null, username: "fallbackuser", display_name: null, default_game_account_id: null },
              }),
            }),
          }),
        };
      }
      if (table === "game_account_clan_memberships") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: [] }),
              }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null }),
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [] }),
            }),
          }),
        }),
      };
    });

    render(
      <SidebarShell>
        <div />
      </SidebarShell>,
    );
    await waitFor(() => {
      expect(screen.getByText("fallbackuser")).toBeTruthy();
    });
    expect(screen.getByText("FA")).toBeTruthy();
  });
});
