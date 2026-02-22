// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next-intl", () => ({
  useTranslations: vi.fn(() => vi.fn((key: string) => key)),
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

const mockUpdateActiveSection = vi.fn();
const mockNavigateAdmin = vi.fn();

let mockContextOverride: Record<string, unknown> = {};

vi.mock("./admin-context", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => {
    const React = require("react");
    return React.createElement(React.Fragment, null, children);
  },
  useAdminContext: () => ({
    activeSection: "clans",
    updateActiveSection: mockUpdateActiveSection,
    navigateAdmin: mockNavigateAdmin,
    pendingApprovals: [],
    pendingRegistrationCount: 0,
    ...mockContextOverride,
  }),
}));

vi.mock("next/dynamic", () => ({
  __esModule: true,
  default: () => {
    const React = require("react");
    return () => React.createElement("div", { "data-testid": "mock-tab" }, "Tab Content");
  },
}));

import AdminClient from "./admin-client";

describe("AdminClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockContextOverride = {};
  });

  it("renders without crashing", () => {
    render(<AdminClient />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("renders tab buttons for all admin sections", () => {
    render(<AdminClient />);
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThanOrEqual(6);
  });

  it("marks the active tab as current", () => {
    render(<AdminClient />);
    const activeButton = screen.getAllByRole("button").find((b) => b.getAttribute("aria-current") === "page");
    expect(activeButton).toBeDefined();
  });

  it("renders the active section status area", () => {
    render(<AdminClient />);
    const statusArea = screen.getByRole("status");
    expect(statusArea).toHaveTextContent("common.active");
  });

  it("renders tab content area", () => {
    render(<AdminClient />);
    expect(screen.getByTestId("mock-tab")).toBeInTheDocument();
    expect(screen.getByTestId("mock-tab")).toHaveTextContent("Tab Content");
  });

  it("calls updateActiveSection when a tab button is clicked", () => {
    render(<AdminClient />);
    const buttons = screen.getAllByRole("button");
    const usersTab = buttons.find((b) => b.textContent?.includes("tabs.users"));
    if (usersTab) {
      usersTab.click();
      expect(mockUpdateActiveSection).toHaveBeenCalledWith("users");
    }
  });

  it("calls navigateAdmin for tabs without tab property (designSystem)", () => {
    render(<AdminClient />);
    const buttons = screen.getAllByRole("button");
    const dsTab = buttons.find((b) => b.textContent?.includes("tabs.designSystem"));
    if (dsTab) {
      dsTab.click();
      expect(mockNavigateAdmin).toHaveBeenCalledWith("/design-system");
    }
  });

  it("shows approval badge when there are pending approvals", () => {
    mockContextOverride = {
      pendingApprovals: [{ id: "a1" }, { id: "a2" }],
      pendingRegistrationCount: 1,
    };

    render(<AdminClient />);
    const badge = screen.getByLabelText(/3.*approvals.pending/);
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent("3");
  });

  it("does not show approval badge when count is 0", () => {
    render(<AdminClient />);
    const tabCounts = screen.queryAllByText(/^\d+$/);
    const approvalBadge = tabCounts.find((el) => el.classList.contains("tab-count"));
    expect(approvalBadge).toBeUndefined();
  });

  it("displays the active tab label in the status area", () => {
    render(<AdminClient />);
    const activeTitle = document.querySelector(".admin-active-title");
    expect(activeTitle?.textContent).toBe("tabs.clans");
  });

  it("displays the active tab subtitle for clans", () => {
    render(<AdminClient />);
    expect(screen.getByText("common.selectAClan")).toBeInTheDocument();
  });

  it("renders tab icons as images", () => {
    render(<AdminClient />);
    const images = document.querySelectorAll("img.admin-tab-icon");
    expect(images.length).toBeGreaterThan(0);
  });

  it("renders users subtitle when users section is active", () => {
    mockContextOverride = { activeSection: "users" };
    render(<AdminClient />);
    expect(screen.getByText("users.subtitle")).toBeInTheDocument();
  });

  it("renders approvals subtitle when approvals section is active", () => {
    mockContextOverride = { activeSection: "approvals" };
    render(<AdminClient />);
    expect(screen.getByText("approvals.subtitle")).toBeInTheDocument();
  });

  it("renders logs subtitle when logs section is active", () => {
    mockContextOverride = { activeSection: "logs" };
    render(<AdminClient />);
    expect(screen.getByText("logs.subtitle")).toBeInTheDocument();
  });

  it("renders forum subtitle when forum section is active", () => {
    mockContextOverride = { activeSection: "forum" };
    render(<AdminClient />);
    expect(screen.getByText("forum.subtitle")).toBeInTheDocument();
  });

  it("renders rulesDefinitions subtitle when rulesDefinitions section is active", () => {
    mockContextOverride = { activeSection: "rulesDefinitions" };
    render(<AdminClient />);
    expect(screen.getByText("rulesDefinitions.subtitle")).toBeInTheDocument();
  });

  it("marks approvals tab as active when activeSection is approvals", () => {
    mockContextOverride = { activeSection: "approvals" };
    render(<AdminClient />);
    const activeButton = screen.getAllByRole("button").find((b) => b.getAttribute("aria-current") === "page");
    expect(activeButton?.textContent).toContain("tabs.approvals");
  });

  it("shows approval badge count combining approvals and registrations", () => {
    mockContextOverride = {
      pendingApprovals: [{ id: "a1" }],
      pendingRegistrationCount: 4,
    };
    render(<AdminClient />);
    const badge = screen.getByLabelText(/5.*approvals.pending/);
    expect(badge).toHaveTextContent("5");
  });

  it("renders section title and subtitle in header", () => {
    render(<AdminClient />);
    expect(screen.getByText("sections.title")).toBeInTheDocument();
    expect(screen.getByText("sections.subtitle")).toBeInTheDocument();
  });

  /* ── Fallback to ClansTab for unknown section ── */

  it("renders tab content for unknown activeSection (falls back)", () => {
    mockContextOverride = { activeSection: "unknown_section" };
    render(<AdminClient />);
    expect(screen.getByTestId("mock-tab")).toBeInTheDocument();
  });

  /* ── Admin grid structure ── */

  it("renders admin-grid wrapper", () => {
    render(<AdminClient />);
    const grid = document.querySelector(".admin-grid");
    expect(grid).toBeInTheDocument();
  });

  /* ── Tabs container ── */

  it("renders tabs container with admin-tabs class", () => {
    render(<AdminClient />);
    const tabs = document.querySelector(".tabs.admin-tabs");
    expect(tabs).toBeInTheDocument();
  });

  /* ── Active context area ── */

  it("renders admin-active-context area with aria-live polite", () => {
    render(<AdminClient />);
    const context = document.querySelector(".admin-active-context");
    expect(context).toBeInTheDocument();
    expect(context?.getAttribute("aria-live")).toBe("polite");
  });

  /* ── Active label text ── */

  it("renders common.active label text", () => {
    render(<AdminClient />);
    const label = document.querySelector(".admin-active-label");
    expect(label).toBeInTheDocument();
    expect(label?.textContent).toBe("common.active");
  });

  /* ── All section buttons render ── */

  it("renders exactly 7 tab buttons for all admin sections", () => {
    render(<AdminClient />);
    const buttons = document.querySelectorAll(".tabs.admin-tabs button.tab");
    expect(buttons.length).toBe(7);
  });

  /* ── Non-active tabs have no aria-current ── */

  it("non-active tabs do not have aria-current", () => {
    render(<AdminClient />);
    const buttons = screen.getAllByRole("button");
    const nonActive = buttons.filter((b) => !b.getAttribute("aria-current"));
    expect(nonActive.length).toBeGreaterThanOrEqual(5);
  });

  /* ── Tab icon images present ── */

  it("renders tab icons for all sections with icons", () => {
    render(<AdminClient />);
    const images = document.querySelectorAll("img.admin-tab-icon");
    expect(images.length).toBe(7);
  });

  /* ── designSystem tab calls navigateAdmin (no tab property) ── */

  it("designSystem tab navigates via navigateAdmin not updateActiveSection", () => {
    render(<AdminClient />);
    const buttons = screen.getAllByRole("button");
    const dsTab = buttons.find((b) => b.textContent?.includes("tabs.designSystem"));
    dsTab?.click();
    expect(mockNavigateAdmin).toHaveBeenCalledWith("/design-system");
    expect(mockUpdateActiveSection).not.toHaveBeenCalled();
  });
});
