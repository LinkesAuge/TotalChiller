// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import ClanAccessGate from "./clan-access-gate";

function chainEnd(result: unknown) {
  return {
    returns: vi.fn(() => Promise.resolve(result)),
    then: (fn?: ((v: unknown) => unknown) | null, rej?: ((r: unknown) => unknown) | null) =>
      Promise.resolve(result).then(fn, rej),
  };
}

vi.mock("next-intl", () => ({
  useTranslations: vi.fn(() => vi.fn((key: string) => key)),
  useLocale: vi.fn(() => "de"),
}));

const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: mockRefresh, back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => mockPathname,
}));

let mockPathname = "/dashboard";

const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
};

vi.mock("../hooks/use-supabase", () => ({
  useSupabase: () => mockSupabase,
}));
vi.mock("@/lib/public-paths", () => ({
  isPublicPath: (p: string) => p === "/home" || p === "/about",
}));
vi.mock("../../i18n/routing", () => ({
  LOCALE_COOKIE: "NEXT_LOCALE",
  routing: { locales: ["de", "en"] },
}));

describe("ClanAccessGate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = "/dashboard";
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });
  });

  it("renders children immediately for public paths", () => {
    mockPathname = "/home";
    render(
      <ClanAccessGate>
        <div>Public content</div>
      </ClanAccessGate>,
    );
    expect(screen.getByText("Public content")).toBeTruthy();
  });

  it("renders children immediately for admin paths", () => {
    mockPathname = "/admin/users";
    render(
      <ClanAccessGate>
        <div>Admin content</div>
      </ClanAccessGate>,
    );
    expect(screen.getByText("Admin content")).toBeTruthy();
  });

  it("shows loading state initially for non-exempt paths", () => {
    render(
      <ClanAccessGate>
        <div>Protected content</div>
      </ClanAccessGate>,
    );
    expect(screen.getByText("loadingTitle")).toBeTruthy();
    expect(screen.queryByText("Protected content")).toBeNull();
  });

  it("shows denied state when user is not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });
    render(
      <ClanAccessGate>
        <div>Content</div>
      </ClanAccessGate>,
    );
    await waitFor(() => expect(screen.getByText("noAccessMessage")).toBeTruthy());
  });

  it("shows denied state when no memberships exist", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1", user_metadata: {} } } });
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue(chainEnd({ data: [], error: null })),
        }),
      }),
    });
    render(
      <ClanAccessGate>
        <div>Content</div>
      </ClanAccessGate>,
    );
    await waitFor(() => expect(screen.getByText("noAccessMessage")).toBeTruthy());
  });

  it("shows unassigned state when user only has unassigned clans", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1", user_metadata: {} } } });
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue(
            chainEnd({
              data: [{ id: "m1", clans: { is_unassigned: true } }],
              error: null,
            }),
          ),
        }),
      }),
    });
    render(
      <ClanAccessGate>
        <div>Content</div>
      </ClanAccessGate>,
    );
    await waitFor(() => expect(screen.getByText("unassignedMessage")).toBeTruthy());
  });

  it("shows children when user has a real clan", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1", user_metadata: {} } } });
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue(
            chainEnd({
              data: [{ id: "m1", clans: { is_unassigned: false } }],
              error: null,
            }),
          ),
        }),
      }),
    });
    render(
      <ClanAccessGate>
        <div>Protected content</div>
      </ClanAccessGate>,
    );
    await waitFor(() => expect(screen.getByText("Protected content")).toBeTruthy());
  });

  it("shows denied when supabase returns an error", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1", user_metadata: {} } } });
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue(chainEnd({ data: null, error: new Error("DB error") })),
        }),
      }),
    });
    render(
      <ClanAccessGate>
        <div>Content</div>
      </ClanAccessGate>,
    );
    await waitFor(() => expect(screen.getByText("noAccessMessage")).toBeTruthy());
  });

  it("renders profile and home links in denied state", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });
    render(
      <ClanAccessGate>
        <div>Content</div>
      </ClanAccessGate>,
    );
    await waitFor(() => {
      expect(screen.getByText("goProfile")).toBeTruthy();
      expect(screen.getByText("goHome")).toBeTruthy();
    });
  });

  it("renders profile and home links in unassigned state", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1", user_metadata: {} } } });
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue(
            chainEnd({
              data: [{ id: "m1", clans: { is_unassigned: true } }],
              error: null,
            }),
          ),
        }),
      }),
    });
    render(
      <ClanAccessGate>
        <div>Content</div>
      </ClanAccessGate>,
    );
    await waitFor(() => {
      expect(screen.getByText("goProfile")).toBeTruthy();
      expect(screen.getByText("goHome")).toBeTruthy();
    });
  });

  it("profile link points to /profile in denied state", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });
    render(
      <ClanAccessGate>
        <div>Content</div>
      </ClanAccessGate>,
    );
    await waitFor(() => {
      const profileLink = screen.getByText("goProfile").closest("a");
      expect(profileLink?.getAttribute("href")).toBe("/profile");
    });
  });

  it("home link points to /home in denied state", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });
    render(
      <ClanAccessGate>
        <div>Content</div>
      </ClanAccessGate>,
    );
    await waitFor(() => {
      const homeLink = screen.getByText("goHome").closest("a");
      expect(homeLink?.getAttribute("href")).toBe("/home");
    });
  });

  it("renders children for /about public path", () => {
    mockPathname = "/about";
    render(
      <ClanAccessGate>
        <div>About content</div>
      </ClanAccessGate>,
    );
    expect(screen.getByText("About content")).toBeTruthy();
  });

  it("renders children for /admin sub-paths", () => {
    mockPathname = "/admin/settings";
    render(
      <ClanAccessGate>
        <div>Admin settings</div>
      </ClanAccessGate>,
    );
    expect(screen.getByText("Admin settings")).toBeTruthy();
  });

  it("shows denied when data has only null clans", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1", user_metadata: {} } } });
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue(
            chainEnd({
              data: [{ id: "m1", clans: null }],
              error: null,
            }),
          ),
        }),
      }),
    });
    render(
      <ClanAccessGate>
        <div>Content</div>
      </ClanAccessGate>,
    );
    await waitFor(() => expect(screen.getByText("unassignedMessage")).toBeTruthy());
  });

  it("shows granted when mix of unassigned and real clan", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1", user_metadata: {} } } });
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue(
            chainEnd({
              data: [
                { id: "m1", clans: { is_unassigned: true } },
                { id: "m2", clans: { is_unassigned: false } },
              ],
              error: null,
            }),
          ),
        }),
      }),
    });
    render(
      <ClanAccessGate>
        <div>Protected content</div>
      </ClanAccessGate>,
    );
    await waitFor(() => expect(screen.getByText("Protected content")).toBeTruthy());
  });

  it("shows loading message text", () => {
    render(
      <ClanAccessGate>
        <div>Protected</div>
      </ClanAccessGate>,
    );
    expect(screen.getByText("loadingMessage")).toBeTruthy();
  });

  it("syncs locale from user_metadata when language differs from cookie", async () => {
    Object.defineProperty(document, "cookie", {
      writable: true,
      value: "NEXT_LOCALE=de",
    });
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "u1", user_metadata: { language: "en" } } },
    });
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue(
            chainEnd({
              data: [{ id: "m1", clans: { is_unassigned: false } }],
              error: null,
            }),
          ),
        }),
      }),
    });
    render(
      <ClanAccessGate>
        <div>Content</div>
      </ClanAccessGate>,
    );
    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled();
    });
  });
});
