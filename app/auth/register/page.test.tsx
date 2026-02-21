// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("next-intl", () => ({
  useTranslations: vi.fn(() => vi.fn((key: string) => key)),
}));
vi.mock("next/image", () => ({
  __esModule: true,
  default: ({ fill, priority, unoptimized, ...props }: any) => require("react").createElement("img", props),
}));
vi.mock("../../hooks/use-supabase", () => ({
  useSupabase: vi.fn(() => ({
    auth: {
      signUp: vi.fn().mockResolvedValue({ error: null }),
    },
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

import RegisterPage from "./page";

describe("RegisterPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders registration form fields", () => {
    render(<RegisterPage />);
    expect(screen.getByLabelText("email")).toBeInTheDocument();
    expect(screen.getByLabelText("username")).toBeInTheDocument();
    expect(screen.getByLabelText("password")).toBeInTheDocument();
    expect(screen.getByLabelText("confirmPassword")).toBeInTheDocument();
  });

  it("renders submit button", () => {
    render(<RegisterPage />);
    expect(screen.getByRole("button", { name: /submit/ })).toBeInTheDocument();
  });

  it("renders heading", () => {
    render(<RegisterPage />);
    expect(screen.getByText("heading")).toBeInTheDocument();
  });

  it("renders sign-in link", () => {
    render(<RegisterPage />);
    expect(screen.getByText("signInToExisting")).toBeInTheDocument();
  });

  it("shows password mismatch validation", async () => {
    render(<RegisterPage />);
    fireEvent.change(screen.getByLabelText("email"), {
      target: { value: "test@test.com" },
    });
    fireEvent.change(screen.getByLabelText("username"), {
      target: { value: "testuser" },
    });
    fireEvent.change(screen.getByLabelText("password"), {
      target: { value: "pass123" },
    });
    fireEvent.change(screen.getByLabelText("confirmPassword"), {
      target: { value: "different" },
    });
    fireEvent.submit(screen.getByRole("button", { name: /submit/ }));
    expect(await screen.findByText("passwordMismatch")).toBeInTheDocument();
  });

  it("renders auth info card", () => {
    render(<RegisterPage />);
    expect(screen.getByTestId("auth-info-card")).toBeInTheDocument();
  });

  it("shows username length error when username is too short", async () => {
    render(<RegisterPage />);
    fireEvent.change(screen.getByLabelText("email"), { target: { value: "test@test.com" } });
    fireEvent.change(screen.getByLabelText("username"), { target: { value: "a" } });
    fireEvent.change(screen.getByLabelText("password"), { target: { value: "pass123" } });
    fireEvent.change(screen.getByLabelText("confirmPassword"), { target: { value: "pass123" } });
    fireEvent.submit(screen.getByRole("button", { name: /submit/ }));
    expect(await screen.findByText("usernameLengthError")).toBeInTheDocument();
  });

  it("shows success panel after successful registration", async () => {
    render(<RegisterPage />);
    fireEvent.change(screen.getByLabelText("email"), { target: { value: "new@test.com" } });
    fireEvent.change(screen.getByLabelText("username"), { target: { value: "newuser" } });
    fireEvent.change(screen.getByLabelText("password"), { target: { value: "securepass" } });
    fireEvent.change(screen.getByLabelText("confirmPassword"), { target: { value: "securepass" } });
    fireEvent.submit(screen.getByRole("button", { name: /submit/ }));
    expect(await screen.findByText("successHeading")).toBeInTheDocument();
    expect(screen.getByText("successIntro")).toBeInTheDocument();
    expect(screen.getByText("successStep1Title")).toBeInTheDocument();
    expect(screen.getByText("successStep2Title")).toBeInTheDocument();
    expect(screen.getByText("successStep3Title")).toBeInTheDocument();
    expect(screen.getByText("successStep4Title")).toBeInTheDocument();
  });

  it("shows success note and back-to-login link after registration", async () => {
    render(<RegisterPage />);
    fireEvent.change(screen.getByLabelText("email"), { target: { value: "new@test.com" } });
    fireEvent.change(screen.getByLabelText("username"), { target: { value: "newuser" } });
    fireEvent.change(screen.getByLabelText("password"), { target: { value: "pass123" } });
    fireEvent.change(screen.getByLabelText("confirmPassword"), { target: { value: "pass123" } });
    fireEvent.submit(screen.getByRole("button", { name: /submit/ }));
    expect(await screen.findByText("successNote")).toBeInTheDocument();
    expect(screen.getByText("backToLogin")).toBeInTheDocument();
    const loginLink = screen.getByText("backToLogin").closest("a");
    expect(loginLink).toHaveAttribute("href", "/auth/login");
  });

  it("shows auth error when supabase signUp fails", async () => {
    const { useSupabase } = await import("../../hooks/use-supabase");
    vi.mocked(useSupabase).mockReturnValue({
      auth: {
        signUp: vi.fn().mockResolvedValue({ error: { message: "Email already registered" } }),
      },
    } as any);
    render(<RegisterPage />);
    fireEvent.change(screen.getByLabelText("email"), { target: { value: "dup@test.com" } });
    fireEvent.change(screen.getByLabelText("username"), { target: { value: "dupuser" } });
    fireEvent.change(screen.getByLabelText("password"), { target: { value: "pass123" } });
    fireEvent.change(screen.getByLabelText("confirmPassword"), { target: { value: "pass123" } });
    fireEvent.submit(screen.getByRole("button", { name: /submit/ }));
    expect(await screen.findByText("Email already registered")).toBeInTheDocument();
  });

  it("disables submit button during submission", async () => {
    let resolveSignUp: (value: any) => void;
    const signUpPromise = new Promise((resolve) => {
      resolveSignUp = resolve;
    });
    const { useSupabase } = await import("../../hooks/use-supabase");
    vi.mocked(useSupabase).mockReturnValue({
      auth: {
        signUp: vi.fn().mockReturnValue(signUpPromise),
      },
    } as any);
    render(<RegisterPage />);
    fireEvent.change(screen.getByLabelText("email"), { target: { value: "test@test.com" } });
    fireEvent.change(screen.getByLabelText("username"), { target: { value: "testuser" } });
    fireEvent.change(screen.getByLabelText("password"), { target: { value: "pass123" } });
    fireEvent.change(screen.getByLabelText("confirmPassword"), { target: { value: "pass123" } });
    fireEvent.submit(screen.getByRole("button", { name: /submit/ }));
    expect(screen.getByRole("button", { name: /submit/ })).toBeDisabled();
    resolveSignUp!({ error: null });
  });

  it("renders auth info card with community info", () => {
    render(<RegisterPage />);
    expect(screen.getByText("joinCommunity")).toBeInTheDocument();
    expect(screen.getByText("joinText")).toBeInTheDocument();
    expect(screen.getByText("afterRegistration")).toBeInTheDocument();
    expect(screen.getByText("benefits")).toBeInTheDocument();
    expect(screen.getByText("benefit1")).toBeInTheDocument();
  });

  it("renders requirements section with links", () => {
    render(<RegisterPage />);
    expect(screen.getByText("requirements")).toBeInTheDocument();
    expect(screen.getByText("passwordRecoveryPage")).toBeInTheDocument();
    const forgotLink = screen.getByText("passwordRecoveryPage").closest("a");
    expect(forgotLink).toHaveAttribute("href", "/auth/forgot");
  });

  it("renders info links to home, about, contact, privacy", () => {
    render(<RegisterPage />);
    expect(screen.getByText("homePage")).toBeInTheDocument();
    expect(screen.getByText("aboutPage")).toBeInTheDocument();
    expect(screen.getByText("contactUs")).toBeInTheDocument();
    expect(screen.getByText("privacyPolicy")).toBeInTheDocument();
  });

  it("renders alreadyHaveAccount text with sign-in link", () => {
    render(<RegisterPage />);
    expect(screen.getByText("alreadyHaveAccount")).toBeInTheDocument();
    const signInLink = screen.getByText("signInToExisting").closest("a");
    expect(signInLink).toHaveAttribute("href", "/auth/login");
  });

  it("transitions to success view after form submission", async () => {
    render(<RegisterPage />);
    fireEvent.change(screen.getByLabelText("email"), { target: { value: "test@test.com" } });
    fireEvent.change(screen.getByLabelText("username"), { target: { value: "testuser" } });
    fireEvent.change(screen.getByLabelText("password"), { target: { value: "pass123" } });
    fireEvent.change(screen.getByLabelText("confirmPassword"), { target: { value: "pass123" } });
    fireEvent.submit(screen.getByRole("button", { name: /submit/ }));
    expect(await screen.findByText("successHeading")).toBeInTheDocument();
  });
});
