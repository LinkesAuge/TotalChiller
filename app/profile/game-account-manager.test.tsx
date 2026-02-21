// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("next-intl", () => ({
  useTranslations: vi.fn(() => vi.fn((key: string) => key)),
  useLocale: vi.fn(() => "de"),
}));
vi.mock("../components/ui/icon-button", () => ({
  __esModule: true,
  default: ({ children, ariaLabel, onClick }: any) => {
    const React = require("react");
    return React.createElement("button", { "aria-label": ariaLabel, onClick }, children);
  },
}));
vi.mock("../components/ui/game-button", () => ({
  __esModule: true,
  default: ({ children, ...props }: any) => {
    const React = require("react");
    return React.createElement("button", props, children);
  },
}));

import GameAccountManager from "./game-account-manager";
import type { GameAccountView } from "@/lib/types/domain";

const approvedAccount: GameAccountView = {
  id: "ga1",
  game_username: "PlayerOne",
  approval_status: "approved",
  created_at: "2025-01-01T00:00:00Z",
};

const pendingAccount: GameAccountView = {
  id: "ga2",
  game_username: "PlayerTwo",
  approval_status: "pending",
  created_at: "2025-01-02T00:00:00Z",
};

describe("GameAccountManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders title and add button", () => {
    render(<GameAccountManager initialAccounts={[]} initialDefaultId={null} />);
    expect(screen.getByText("title")).toBeInTheDocument();
    expect(screen.getByText("addAccount")).toBeInTheDocument();
  });

  it("renders empty state when no accounts", () => {
    render(<GameAccountManager initialAccounts={[]} initialDefaultId={null} />);
    expect(screen.getByText("noAccounts")).toBeInTheDocument();
  });

  it("renders account list with game usernames", () => {
    render(<GameAccountManager initialAccounts={[approvedAccount, pendingAccount]} initialDefaultId={null} />);
    expect(screen.getByText("PlayerOne")).toBeInTheDocument();
    expect(screen.getByText("PlayerTwo")).toBeInTheDocument();
  });

  it("shows approved and pending status badges", () => {
    render(<GameAccountManager initialAccounts={[approvedAccount, pendingAccount]} initialDefaultId={null} />);
    expect(screen.getByText("approved")).toBeInTheDocument();
    expect(screen.getByText("pendingApproval")).toBeInTheDocument();
  });

  it("shows default badge for default account", () => {
    render(<GameAccountManager initialAccounts={[approvedAccount]} initialDefaultId="ga1" />);
    expect(screen.getByText("defaultAccount")).toBeInTheDocument();
  });

  it("toggles form visibility on add button click", () => {
    render(<GameAccountManager initialAccounts={[]} initialDefaultId={null} />);
    fireEvent.click(screen.getByText("addAccount"));
    expect(screen.getByText("cancel")).toBeInTheDocument();
    expect(screen.getByLabelText("gameUsernameLabel")).toBeInTheDocument();
  });

  it("shows set as default button for approved non-default accounts", () => {
    render(<GameAccountManager initialAccounts={[approvedAccount]} initialDefaultId={null} />);
    expect(screen.getByLabelText("setAsDefault")).toBeInTheDocument();
  });

  it("shows remove default button for default accounts", () => {
    render(<GameAccountManager initialAccounts={[approvedAccount]} initialDefaultId="ga1" />);
    expect(screen.getByLabelText("removeDefault")).toBeInTheDocument();
  });

  it("renders subtitle with counts", () => {
    render(<GameAccountManager initialAccounts={[approvedAccount, pendingAccount]} initialDefaultId={null} />);
    expect(screen.getByText(/approvedCount/)).toBeInTheDocument();
  });
});
