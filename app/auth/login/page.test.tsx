// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mockSignInWithPassword = vi.fn();
const mockRpc = vi.fn();
const mockFrom = vi.fn();

vi.mock("next-intl", () => ({
  useTranslations: vi.fn(() => vi.fn((key: string) => key)),
}));
vi.mock("next/image", () => ({
  __esModule: true,
  default: ({ fill, priority, unoptimized, ...props }: any) => require("react").createElement("img", props),
}));
vi.mock("../../hooks/use-supabase", () => ({
  useSupabase: vi.fn(() => ({
    auth: { signInWithPassword: mockSignInWithPassword },
    rpc: mockRpc,
    from: mockFrom,
  })),
}));
vi.mock("../../../lib/supabase/error-utils", () => ({
  getAuthErrorKey: (err: any) => err?.message ?? "unknownError",
}));
vi.mock("../components/auth-info-card", () => ({
  __esModule: true,
  default: ({ children, title }: any) =>
    require("react").createElement(
      "div",
      { "data-testid": "auth-info-card" },
      require("react").createElement("h2", null, title),
      children,
    ),
}));

import LoginPage from "./page";

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignInWithPassword.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    mockRpc.mockResolvedValue({ data: null, error: null });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: [{ id: "ga1" }], error: null }),
        }),
      }),
    });
    Object.defineProperty(window, "location", {
      value: { href: "", origin: "http://localhost" },
      writable: true,
    });
  });

  // ── Rendering ──

  it("renders login form with identifier and password fields", () => {
    render(<LoginPage />);
    expect(screen.getByLabelText("identifier")).toBeInTheDocument();
    expect(screen.getByLabelText("password")).toBeInTheDocument();
  });

  it("renders submit button", () => {
    render(<LoginPage />);
    expect(screen.getByRole("button", { name: /submit/ })).toBeInTheDocument();
  });

  it("renders heading", () => {
    render(<LoginPage />);
    expect(screen.getByText("heading")).toBeInTheDocument();
  });

  it("renders forgot password link", () => {
    render(<LoginPage />);
    const link = screen.getByText("forgotPassword");
    expect(link).toBeInTheDocument();
    expect(link.closest("a")).toHaveAttribute("href", "/auth/forgot");
  });

  it("renders create account link", () => {
    render(<LoginPage />);
    const link = screen.getByText("createAccount");
    expect(link).toBeInTheDocument();
    expect(link.closest("a")).toHaveAttribute("href", "/auth/register");
  });

  it("renders auth info card", () => {
    render(<LoginPage />);
    expect(screen.getByTestId("auth-info-card")).toBeInTheDocument();
    expect(screen.getByText("welcomeBack")).toBeInTheDocument();
  });

  it("renders placeholder text for inputs", () => {
    render(<LoginPage />);
    expect(screen.getByPlaceholderText("identifierPlaceholder")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("passwordPlaceholder")).toBeInTheDocument();
  });

  it("renders inputs as required", () => {
    render(<LoginPage />);
    expect(screen.getByLabelText("identifier")).toBeRequired();
    expect(screen.getByLabelText("password")).toBeRequired();
  });

  it("renders password field as type password", () => {
    render(<LoginPage />);
    expect(screen.getByLabelText("password")).toHaveAttribute("type", "password");
  });

  it("renders feature list items in info card", () => {
    render(<LoginPage />);
    expect(screen.getByText("feature1")).toBeInTheDocument();
    expect(screen.getByText("feature7")).toBeInTheDocument();
  });

  it("does not show status message initially", () => {
    render(<LoginPage />);
    expect(screen.queryByText("signingIn")).not.toBeInTheDocument();
    expect(screen.queryByText("signedIn")).not.toBeInTheDocument();
  });

  // ── Form interaction ──

  it("updates identifier field value", () => {
    render(<LoginPage />);
    const input = screen.getByLabelText("identifier");
    fireEvent.change(input, { target: { value: "testuser" } });
    expect(input).toHaveValue("testuser");
  });

  it("updates password field value", () => {
    render(<LoginPage />);
    const input = screen.getByLabelText("password");
    fireEvent.change(input, { target: { value: "secret123" } });
    expect(input).toHaveValue("secret123");
  });

  // ── Email login ──

  it("calls signInWithPassword with email directly when identifier contains @", async () => {
    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText("identifier"), { target: { value: "user@test.com" } });
    fireEvent.change(screen.getByLabelText("password"), { target: { value: "pass123" } });
    fireEvent.submit(screen.getByRole("button", { name: /submit/ }).closest("form")!);

    await waitFor(() => {
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: "user@test.com",
        password: "pass123",
      });
    });
  });

  // ── Username login ──

  it("calls rpc to resolve username when identifier lacks @", async () => {
    mockRpc.mockResolvedValue({ data: "resolved@email.com", error: null });
    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText("identifier"), { target: { value: "myuser" } });
    fireEvent.change(screen.getByLabelText("password"), { target: { value: "pass123" } });
    fireEvent.submit(screen.getByRole("button", { name: /submit/ }).closest("form")!);

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith("get_email_for_username", { input_username: "myuser" });
    });
    await waitFor(() => {
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: "resolved@email.com",
        password: "pass123",
      });
    });
  });

  it("shows usernameNotFound when rpc returns no email", async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });
    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText("identifier"), { target: { value: "baduser" } });
    fireEvent.change(screen.getByLabelText("password"), { target: { value: "pass123" } });
    fireEvent.submit(screen.getByRole("button", { name: /submit/ }).closest("form")!);

    await waitFor(() => {
      expect(screen.getByText("usernameNotFound")).toBeInTheDocument();
    });
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
  });

  it("shows usernameNotFound when rpc returns error", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "fail" } });
    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText("identifier"), { target: { value: "baduser" } });
    fireEvent.change(screen.getByLabelText("password"), { target: { value: "pass" } });
    fireEvent.submit(screen.getByRole("button", { name: /submit/ }).closest("form")!);

    await waitFor(() => {
      expect(screen.getByText("usernameNotFound")).toBeInTheDocument();
    });
  });

  // ── Auth errors ──

  it("shows error message when signIn fails", async () => {
    mockSignInWithPassword.mockResolvedValue({ data: {}, error: { message: "Invalid credentials" } });
    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText("identifier"), { target: { value: "user@test.com" } });
    fireEvent.change(screen.getByLabelText("password"), { target: { value: "wrong" } });
    fireEvent.submit(screen.getByRole("button", { name: /submit/ }).closest("form")!);

    await waitFor(() => {
      expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
    });
  });

  // ── Loading state ──

  it("shows signing in status during submission", async () => {
    let resolveSignIn: any;
    mockSignInWithPassword.mockReturnValue(
      new Promise((r) => {
        resolveSignIn = r;
      }),
    );
    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText("identifier"), { target: { value: "user@test.com" } });
    fireEvent.change(screen.getByLabelText("password"), { target: { value: "pass" } });
    fireEvent.submit(screen.getByRole("button", { name: /submit/ }).closest("form")!);

    expect(screen.getByText("signingIn")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /submit/ })).toBeDisabled();

    resolveSignIn({ data: { user: { id: "u1" } }, error: null });
    await waitFor(() => {
      expect(screen.getByText("signedIn")).toBeInTheDocument();
    });
  });

  // ── Redirect logic ──

  it("redirects to / on successful login with existing game accounts", async () => {
    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText("identifier"), { target: { value: "user@test.com" } });
    fireEvent.change(screen.getByLabelText("password"), { target: { value: "pass" } });
    fireEvent.submit(screen.getByRole("button", { name: /submit/ }).closest("form")!);

    await waitFor(() => {
      expect(window.location.href).toBe("/");
    });
  });

  it("redirects to /profile when no game accounts exist", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    });
    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText("identifier"), { target: { value: "user@test.com" } });
    fireEvent.change(screen.getByLabelText("password"), { target: { value: "pass" } });
    fireEvent.submit(screen.getByRole("button", { name: /submit/ }).closest("form")!);

    await waitFor(() => {
      expect(window.location.href).toBe("/profile");
    });
  });

  it("redirects to / on accounts query error (graceful fallback)", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: null, error: { message: "fail" } }),
        }),
      }),
    });
    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText("identifier"), { target: { value: "user@test.com" } });
    fireEvent.change(screen.getByLabelText("password"), { target: { value: "pass" } });
    fireEvent.submit(screen.getByRole("button", { name: /submit/ }).closest("form")!);

    await waitFor(() => {
      expect(window.location.href).toBe("/");
    });
  });

  it("trims whitespace from identifier", async () => {
    mockRpc.mockResolvedValue({ data: "resolved@email.com", error: null });
    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText("identifier"), { target: { value: "  myuser  " } });
    fireEvent.change(screen.getByLabelText("password"), { target: { value: "pass" } });
    fireEvent.submit(screen.getByRole("button", { name: /submit/ }).closest("form")!);

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith("get_email_for_username", { input_username: "myuser" });
    });
  });

  it("redirects to / when signIn succeeds but user object is missing", async () => {
    mockSignInWithPassword.mockResolvedValue({ data: {}, error: null });
    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText("identifier"), { target: { value: "user@test.com" } });
    fireEvent.change(screen.getByLabelText("password"), { target: { value: "pass" } });
    fireEvent.submit(screen.getByRole("button", { name: /submit/ }).closest("form")!);

    await waitFor(() => {
      expect(window.location.href).toBe("/");
    });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("resolves username to email and completes login with redirect", async () => {
    mockRpc.mockResolvedValue({ data: "found@email.com", error: null });
    mockSignInWithPassword.mockResolvedValue({ data: { user: { id: "u2" } }, error: null });
    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText("identifier"), { target: { value: "validuser" } });
    fireEvent.change(screen.getByLabelText("password"), { target: { value: "pass" } });
    fireEvent.submit(screen.getByRole("button", { name: /submit/ }).closest("form")!);

    await waitFor(() => {
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: "found@email.com",
        password: "pass",
      });
    });
    await waitFor(() => {
      expect(window.location.href).toBe("/");
    });
  });
});
