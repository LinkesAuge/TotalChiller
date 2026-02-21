// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, renderHook } from "@testing-library/react";

vi.mock("next-intl", () => ({
  useTranslations: vi.fn(() => vi.fn((key: string) => key)),
  useLocale: vi.fn(() => "de"),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

const mockFrom = vi.fn(() => ({
  select: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  in: vi.fn().mockReturnThis(),
}));

vi.mock("../hooks/use-supabase", () => ({
  useSupabase: () => ({
    from: mockFrom,
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }),
    },
  }),
}));

vi.mock("../components/toast-provider", () => ({
  useToast: () => ({ pushToast: vi.fn() }),
}));

vi.mock("@/lib/permissions", () => ({
  toRole: (r: string) => r || "guest",
  ROLES: ["owner", "admin", "moderator", "editor", "member", "guest"],
}));

const fetchSpy = vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ data: [] }),
});
globalThis.fetch = fetchSpy;

import AdminProvider, { useAdminContext } from "./admin-context";

describe("useAdminContext", () => {
  it("throws when used outside AdminProvider", () => {
    expect(() => {
      renderHook(() => useAdminContext());
    }).toThrow("useAdminContext must be used within <AdminProvider>");
  });
});

describe("AdminProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "localStorage", {
      value: { getItem: vi.fn(() => null), setItem: vi.fn() },
      writable: true,
    });
  });

  it("renders children", () => {
    render(
      <AdminProvider>
        <div data-testid="child">Hello</div>
      </AdminProvider>,
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("provides context to children", () => {
    function Consumer() {
      const ctx = useAdminContext();
      return <div data-testid="section">{ctx.activeSection}</div>;
    }
    render(
      <AdminProvider>
        <Consumer />
      </AdminProvider>,
    );
    expect(screen.getByTestId("section")).toHaveTextContent("clans");
  });

  it("provides default user role as guest", () => {
    function Consumer() {
      const ctx = useAdminContext();
      return <div data-testid="role">{ctx.currentUserRole}</div>;
    }
    render(
      <AdminProvider>
        <Consumer />
      </AdminProvider>,
    );
    expect(screen.getByTestId("role")).toHaveTextContent("guest");
  });

  it("provides empty clans initially", () => {
    function Consumer() {
      const ctx = useAdminContext();
      return <div data-testid="clans-count">{ctx.clans.length}</div>;
    }
    render(
      <AdminProvider>
        <Consumer />
      </AdminProvider>,
    );
    expect(screen.getByTestId("clans-count")).toHaveTextContent("0");
  });

  it("provides initial pending approvals as empty", () => {
    function Consumer() {
      const ctx = useAdminContext();
      return <div data-testid="approvals-count">{ctx.pendingApprovals.length}</div>;
    }
    render(
      <AdminProvider>
        <Consumer />
      </AdminProvider>,
    );
    expect(screen.getByTestId("approvals-count")).toHaveTextContent("0");
  });

  it("provides initial pending registration count as 0", () => {
    function Consumer() {
      const ctx = useAdminContext();
      return <div data-testid="reg-count">{ctx.pendingRegistrationCount}</div>;
    }
    render(
      <AdminProvider>
        <Consumer />
      </AdminProvider>,
    );
    expect(screen.getByTestId("reg-count")).toHaveTextContent("0");
  });

  it("exposes updateActiveSection function", () => {
    function Consumer() {
      const ctx = useAdminContext();
      return (
        <>
          <div data-testid="section">{ctx.activeSection}</div>
          <button onClick={() => ctx.updateActiveSection("users")}>Switch</button>
        </>
      );
    }
    render(
      <AdminProvider>
        <Consumer />
      </AdminProvider>,
    );
    expect(screen.getByText("Switch")).toBeInTheDocument();
  });

  it("exposes setStatus function", () => {
    function Consumer() {
      const ctx = useAdminContext();
      return (
        <>
          <div data-testid="status">{ctx.status}</div>
          <button onClick={() => ctx.setStatus("test status")}>SetStatus</button>
        </>
      );
    }
    render(
      <AdminProvider>
        <Consumer />
      </AdminProvider>,
    );
    expect(screen.getByTestId("status")).toHaveTextContent("");
  });

  it("exposes navigateAdmin function", () => {
    function Consumer() {
      const ctx = useAdminContext();
      return <button onClick={() => ctx.navigateAdmin("/admin?tab=users")}>Navigate</button>;
    }
    render(
      <AdminProvider>
        <Consumer />
      </AdminProvider>,
    );
    expect(screen.getByText("Navigate")).toBeInTheDocument();
  });

  it("exposes clanNameById map", () => {
    function Consumer() {
      const ctx = useAdminContext();
      return <div data-testid="map-size">{ctx.clanNameById.size}</div>;
    }
    render(
      <AdminProvider>
        <Consumer />
      </AdminProvider>,
    );
    expect(screen.getByTestId("map-size")).toHaveTextContent("0");
  });

  it("exposes refreshEmailConfirmations function", () => {
    function Consumer() {
      const ctx = useAdminContext();
      return <div data-testid="has-refresh">{typeof ctx.refreshEmailConfirmations}</div>;
    }
    render(
      <AdminProvider>
        <Consumer />
      </AdminProvider>,
    );
    expect(screen.getByTestId("has-refresh")).toHaveTextContent("function");
  });

  /* ── selectedClanId starts empty ── */

  it("provides initial selectedClanId as empty string", () => {
    function Consumer() {
      const ctx = useAdminContext();
      return <div data-testid="clan-id">{ctx.selectedClanId || "empty"}</div>;
    }
    render(
      <AdminProvider>
        <Consumer />
      </AdminProvider>,
    );
    expect(screen.getByTestId("clan-id")).toHaveTextContent("empty");
  });

  /* ── currentUserId starts empty then loads ── */

  it("provides initial currentUserId as empty", () => {
    function Consumer() {
      const ctx = useAdminContext();
      return <div data-testid="user-id">{ctx.currentUserId || "none"}</div>;
    }
    render(
      <AdminProvider>
        <Consumer />
      </AdminProvider>,
    );
    expect(screen.getByTestId("user-id")).toHaveTextContent("none");
  });

  /* ── status starts empty ── */

  it("provides initial status as empty string", () => {
    function Consumer() {
      const ctx = useAdminContext();
      return <div data-testid="status">{ctx.status || "empty"}</div>;
    }
    render(
      <AdminProvider>
        <Consumer />
      </AdminProvider>,
    );
    expect(screen.getByTestId("status")).toHaveTextContent("empty");
  });

  /* ── defaultClanId starts empty ── */

  it("provides initial defaultClanId as empty string", () => {
    function Consumer() {
      const ctx = useAdminContext();
      return <div data-testid="default-clan">{ctx.defaultClanId || "none"}</div>;
    }
    render(
      <AdminProvider>
        <Consumer />
      </AdminProvider>,
    );
    expect(screen.getByTestId("default-clan")).toHaveTextContent("none");
  });

  /* ── unassignedClanId starts empty ── */

  it("provides initial unassignedClanId as empty string", () => {
    function Consumer() {
      const ctx = useAdminContext();
      return <div data-testid="unassigned-id">{ctx.unassignedClanId || "none"}</div>;
    }
    render(
      <AdminProvider>
        <Consumer />
      </AdminProvider>,
    );
    expect(screen.getByTestId("unassigned-id")).toHaveTextContent("none");
  });

  /* ── emailConfirmationsByUserId starts empty ── */

  it("provides initial emailConfirmationsByUserId as empty object", () => {
    function Consumer() {
      const ctx = useAdminContext();
      return <div data-testid="email-map">{Object.keys(ctx.emailConfirmationsByUserId).length}</div>;
    }
    render(
      <AdminProvider>
        <Consumer />
      </AdminProvider>,
    );
    expect(screen.getByTestId("email-map")).toHaveTextContent("0");
  });

  /* ── supabase is exposed ── */

  it("exposes supabase client", () => {
    function Consumer() {
      const ctx = useAdminContext();
      return <div data-testid="has-sb">{typeof ctx.supabase.from}</div>;
    }
    render(
      <AdminProvider>
        <Consumer />
      </AdminProvider>,
    );
    expect(screen.getByTestId("has-sb")).toHaveTextContent("function");
  });

  /* ── setSelectedClanId is a function ── */

  it("exposes setSelectedClanId function", () => {
    function Consumer() {
      const ctx = useAdminContext();
      return <div data-testid="fn-type">{typeof ctx.setSelectedClanId}</div>;
    }
    render(
      <AdminProvider>
        <Consumer />
      </AdminProvider>,
    );
    expect(screen.getByTestId("fn-type")).toHaveTextContent("function");
  });

  /* ── loadClans is a function ── */

  it("exposes loadClans function", () => {
    function Consumer() {
      const ctx = useAdminContext();
      return <div data-testid="fn-type">{typeof ctx.loadClans}</div>;
    }
    render(
      <AdminProvider>
        <Consumer />
      </AdminProvider>,
    );
    expect(screen.getByTestId("fn-type")).toHaveTextContent("function");
  });

  /* ── setPendingApprovals is a function ── */

  it("exposes setPendingApprovals function", () => {
    function Consumer() {
      const ctx = useAdminContext();
      return <div data-testid="fn-type">{typeof ctx.setPendingApprovals}</div>;
    }
    render(
      <AdminProvider>
        <Consumer />
      </AdminProvider>,
    );
    expect(screen.getByTestId("fn-type")).toHaveTextContent("function");
  });
});
