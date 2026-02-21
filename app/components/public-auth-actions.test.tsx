// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import PublicAuthActions from "./public-auth-actions";

const mockUseAuth = vi.fn(() => ({ isAuthenticated: false }));

vi.mock("next-intl", () => ({
  useTranslations: vi.fn(() => vi.fn((key: string) => key)),
}));
vi.mock("../hooks/use-auth", () => ({
  useAuth: () => mockUseAuth(),
}));
vi.mock("./auth-actions", () => ({
  __esModule: true,
  default: () => {
    const React = require("react");
    return React.createElement("div", { "data-testid": "auth-actions" });
  },
}));

describe("PublicAuthActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ isAuthenticated: false });
  });

  it("renders sign-in and register links when not authenticated", () => {
    render(<PublicAuthActions />);
    expect(screen.getByText("signIn")).toBeInTheDocument();
    expect(screen.getByText("joinTheChillers")).toBeInTheDocument();
  });

  it("sign-in link points to /auth/login", () => {
    render(<PublicAuthActions />);
    const signIn = screen.getByText("signIn");
    expect(signIn.closest("a")).toHaveAttribute("href", "/auth/login");
  });

  it("register link points to /auth/register", () => {
    render(<PublicAuthActions />);
    const register = screen.getByText("joinTheChillers");
    expect(register.closest("a")).toHaveAttribute("href", "/auth/register");
  });

  it("hides sign-in and register links when authenticated", () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true });
    render(<PublicAuthActions />);
    expect(screen.queryByText("signIn")).not.toBeInTheDocument();
    expect(screen.queryByText("joinTheChillers")).not.toBeInTheDocument();
  });

  it("always renders AuthActions component", () => {
    render(<PublicAuthActions />);
    expect(screen.getByTestId("auth-actions")).toBeInTheDocument();
  });

  it("renders AuthActions even when authenticated", () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true });
    render(<PublicAuthActions />);
    expect(screen.getByTestId("auth-actions")).toBeInTheDocument();
  });
});
