// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import AuthActions from "./auth-actions";

const mockGetUser = vi.fn();
const mockSignOut = vi.fn(async () => ({}));
const mockFrom = vi.fn();

vi.mock("next-intl", () => ({
  useTranslations: vi.fn(() => vi.fn((key: string) => key)),
}));
vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: any) => {
    const React = require("react");
    return React.createElement("img", props);
  },
}));
vi.mock("../hooks/use-supabase", () => ({
  useSupabase: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
      signOut: mockSignOut,
    },
    from: mockFrom,
  })),
}));
vi.mock("./notification-bell", () => ({
  __esModule: true,
  default: ({ isOpen, onToggle, onClose }: any) => {
    const React = require("react");
    return React.createElement(
      "div",
      { "data-testid": "notification-bell" },
      React.createElement("button", { onClick: onToggle, "data-testid": "bell-trigger" }, "Bell"),
    );
  },
}));

function mockAuthUser(profile = { user_db: "TestUser", username: "testuser", display_name: "Test User" }) {
  mockGetUser.mockResolvedValue({
    data: { user: { email: "test@test.com", id: "user-1" } },
  });
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({ data: profile }),
      }),
    }),
  });
}

function mockNoUser() {
  mockGetUser.mockResolvedValue({
    data: { user: null },
  });
}

describe("AuthActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthUser();
    delete (window as any).location;
    (window as any).location = { href: "" };
  });

  it("renders loading skeleton initially", () => {
    const { container } = render(<AuthActions />);
    expect(container.querySelector("[aria-busy='true']")).toBeTruthy();
  });

  it("renders user info after loading", async () => {
    render(<AuthActions />);
    await waitFor(() => {
      expect(screen.getByText("Test User")).toBeTruthy();
    });
  });

  it("shows notification bell component", async () => {
    render(<AuthActions />);
    await waitFor(() => {
      expect(screen.getByTestId("notification-bell")).toBeTruthy();
    });
  });

  it("shows profile menu button with initials", async () => {
    render(<AuthActions />);
    await waitFor(() => {
      expect(screen.getByText("Test User")).toBeTruthy();
    });
    expect(screen.getByText("TE")).toBeTruthy();
  });

  it("shows skeleton when user has no email", async () => {
    mockNoUser();
    render(<AuthActions />);
    await waitFor(() => {
      const { container } = render(<AuthActions />);
      expect(container.querySelector("[aria-busy='true']")).toBeTruthy();
    });
  });

  it("opens profile menu on click", async () => {
    render(<AuthActions />);
    await waitFor(() => {
      expect(screen.getByText("Test User")).toBeTruthy();
    });
    fireEvent.click(screen.getByText("TE"));
    await waitFor(() => {
      expect(screen.getByText("profile")).toBeTruthy();
      expect(screen.getByText("messages")).toBeTruthy();
      expect(screen.getByText("settings")).toBeTruthy();
      expect(screen.getByText("signOut")).toBeTruthy();
    });
  });

  it("toggles profile menu on repeated clicks", async () => {
    render(<AuthActions />);
    await waitFor(() => {
      expect(screen.getByText("Test User")).toBeTruthy();
    });
    fireEvent.click(screen.getByText("TE"));
    expect(screen.getByText("profile")).toBeTruthy();
    fireEvent.click(screen.getByText("TE"));
    expect(screen.queryByText("profile")).toBeNull();
  });

  it("shows profile link to /profile", async () => {
    render(<AuthActions />);
    await waitFor(() => {
      expect(screen.getByText("Test User")).toBeTruthy();
    });
    fireEvent.click(screen.getByText("TE"));
    const profileLink = screen.getByText("profile").closest("a");
    expect(profileLink?.getAttribute("href")).toBe("/profile");
  });

  it("shows messages link to /messages", async () => {
    render(<AuthActions />);
    await waitFor(() => {
      expect(screen.getByText("Test User")).toBeTruthy();
    });
    fireEvent.click(screen.getByText("TE"));
    const link = screen.getByText("messages").closest("a");
    expect(link?.getAttribute("href")).toBe("/messages");
  });

  it("shows settings link to /settings", async () => {
    render(<AuthActions />);
    await waitFor(() => {
      expect(screen.getByText("Test User")).toBeTruthy();
    });
    fireEvent.click(screen.getByText("TE"));
    const link = screen.getByText("settings").closest("a");
    expect(link?.getAttribute("href")).toBe("/settings");
  });

  it("signs out on signOut button click", async () => {
    const saved = window.location;
    delete (window as any).location;
    (window as any).location = { href: "http://localhost", assign: vi.fn(), replace: vi.fn(), reload: vi.fn() };
    render(<AuthActions />);
    await waitFor(() => {
      expect(screen.getByText("Test User")).toBeTruthy();
    });
    fireEvent.click(screen.getByText("TE"));
    fireEvent.click(screen.getByText("signOut"));
    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledOnce();
    });
    expect((window as any).location.href).toBe("/home");
    (window as any).location = saved;
  });

  it("displays display_name in initials and summary", async () => {
    mockAuthUser({ user_db: "DB", username: "user", display_name: "Anna Maria" });
    render(<AuthActions />);
    await waitFor(() => {
      expect(screen.getByText("Anna Maria")).toBeTruthy();
      expect(screen.getByText("AN")).toBeTruthy();
    });
  });

  it("falls back to username when no display_name", async () => {
    mockAuthUser({ user_db: "DB", username: "testuser", display_name: "" });
    render(<AuthActions />);
    await waitFor(() => {
      expect(screen.getByText("testuser")).toBeTruthy();
    });
  });

  it("falls back to user_db when no display_name or username", async () => {
    mockAuthUser({ user_db: "DBUser", username: "", display_name: "" });
    render(<AuthActions />);
    await waitFor(() => {
      expect(screen.getByText("DBUser")).toBeTruthy();
    });
  });

  it("falls back to email when no profile data", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { email: "test@test.com", id: "user-1" } },
    });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        }),
      }),
    });
    render(<AuthActions />);
    await waitFor(() => {
      expect(screen.getByText("test@test.com")).toBeTruthy();
    });
  });

  it("shows email in profile panel", async () => {
    render(<AuthActions />);
    await waitFor(() => {
      expect(screen.getByText("Test User")).toBeTruthy();
    });
    fireEvent.click(screen.getByText("TE"));
    expect(screen.getByText("test@test.com")).toBeTruthy();
  });

  it("closes panel on click outside", async () => {
    render(<AuthActions />);
    await waitFor(() => {
      expect(screen.getByText("Test User")).toBeTruthy();
    });
    fireEvent.click(screen.getByText("TE"));
    expect(screen.getByText("profile")).toBeTruthy();
    fireEvent.mouseDown(document.body);
    await waitFor(() => {
      expect(screen.queryByText("profile")).toBeNull();
    });
  });

  it("toggles notification bell", async () => {
    render(<AuthActions />);
    await waitFor(() => {
      expect(screen.getByTestId("bell-trigger")).toBeTruthy();
    });
    fireEvent.click(screen.getByTestId("bell-trigger"));
    expect(screen.getByTestId("notification-bell")).toBeTruthy();
  });

  it("shows user without profile with id but no userId on profile query", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { email: "no-profile@test.com", id: "user-2" } },
    });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: { user_db: "", username: "", display_name: "" } }),
        }),
      }),
    });
    render(<AuthActions />);
    await waitFor(() => {
      expect(screen.getByText("no-profile@test.com")).toBeTruthy();
    });
  });
});
