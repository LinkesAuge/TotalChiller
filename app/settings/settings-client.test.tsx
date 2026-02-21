// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("next-intl", () => ({
  useTranslations: vi.fn(() => vi.fn((key: string) => key)),
}));

const mockSupabase = {
  auth: {
    getUser: vi.fn().mockResolvedValue({ data: { user: { email: "test@example.com", id: "u1" } } }),
    updateUser: vi.fn().mockResolvedValue({ error: null }),
  },
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({
          data: { user_db: "test", username: "testuser", display_name: "Test User" },
        }),
        ilike: vi.fn().mockReturnValue({
          neq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          }),
        }),
      }),
    }),
    upsert: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { username: "test", display_name: "Test" } }),
      }),
    }),
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    }),
  }),
};
vi.mock("../hooks/use-supabase", () => ({
  useSupabase: () => mockSupabase,
}));
vi.mock("@/lib/hooks/use-user-role", () => ({
  useUserRole: () => ({ isAdmin: false }),
}));
vi.mock("../components/language-selector", () => ({
  __esModule: true,
  default: () => {
    const React = require("react");
    return React.createElement("div", { "data-testid": "language-selector" });
  },
}));
vi.mock("../components/ui/game-button", () => ({
  __esModule: true,
  default: ({ children, ...props }: any) => {
    const React = require("react");
    return React.createElement("button", props, children);
  },
}));
vi.mock("@/app/admin/admin-types", () => ({
  buildFallbackUserDb: () => "fallback_user",
}));

globalThis.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: () =>
    Promise.resolve({
      data: {
        messages_enabled: true,
        news_enabled: true,
        events_enabled: true,
        system_enabled: true,
        bugs_email_enabled: false,
      },
    }),
});

import SettingsClient from "./settings-client";

describe("SettingsClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: {
            messages_enabled: true,
            news_enabled: true,
            events_enabled: true,
            system_enabled: true,
            bugs_email_enabled: false,
          },
        }),
    });
  });

  it("renders all settings sections", () => {
    render(<SettingsClient userId="u1" />);
    expect(screen.getByText("accountDetails")).toBeInTheDocument();
    expect(screen.getAllByText("username").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("nickname").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("password")).toBeInTheDocument();
    expect(screen.getByText("notifications")).toBeInTheDocument();
    expect(screen.getByText("language")).toBeInTheDocument();
  });

  it("renders email input", () => {
    render(<SettingsClient userId="u1" />);
    expect(screen.getByLabelText("email")).toBeInTheDocument();
  });

  it("renders password inputs", () => {
    render(<SettingsClient userId="u1" />);
    expect(screen.getByLabelText("newPassword")).toBeInTheDocument();
    expect(screen.getByLabelText("confirmPassword")).toBeInTheDocument();
  });

  it("renders notification toggles", () => {
    render(<SettingsClient userId="u1" />);
    expect(screen.getByLabelText("notifMessages")).toBeInTheDocument();
    expect(screen.getByLabelText("notifNews")).toBeInTheDocument();
    expect(screen.getByLabelText("notifEvents")).toBeInTheDocument();
    expect(screen.getByLabelText("notifSystem")).toBeInTheDocument();
  });

  it("does not show bugs email toggle for non-admins", () => {
    render(<SettingsClient userId="u1" />);
    expect(screen.queryByLabelText("notifBugsEmail")).not.toBeInTheDocument();
  });

  it("renders language selector", () => {
    render(<SettingsClient userId="u1" />);
    expect(screen.getByTestId("language-selector")).toBeInTheDocument();
  });

  it("renders update buttons for each section", () => {
    render(<SettingsClient userId="u1" />);
    expect(screen.getByText("updateEmail")).toBeInTheDocument();
    expect(screen.getByText("updateUsername")).toBeInTheDocument();
    expect(screen.getByText("updateNickname")).toBeInTheDocument();
    expect(screen.getAllByText("updatePassword").length).toBeGreaterThanOrEqual(1);
  });

  it("disables username input for non-admins", () => {
    render(<SettingsClient userId="u1" />);
    const usernameInput = screen.getByLabelText("username");
    expect(usernameInput).toBeDisabled();
  });
});
