// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("next-intl", () => ({
  useTranslations: vi.fn(() => vi.fn((key: string) => key)),
}));
vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: any) => require("react").createElement("img", props),
}));
vi.mock("@marsidev/react-turnstile", () => ({
  Turnstile: vi.fn(({ onSuccess }: any) => {
    const React = require("react");
    return React.createElement(
      "button",
      {
        "data-testid": "turnstile",
        type: "button",
        onClick: () => onSuccess?.("test-token"),
      },
      "Verify",
    );
  }),
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

import ForgotPasswordPage from "./page";

describe("ForgotPasswordPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ ok: true }),
    }) as any;
    Object.defineProperty(window, "location", {
      value: { href: "", origin: "http://localhost:3000" },
      writable: true,
    });
  });

  // ── Rendering ──

  it("renders email field", () => {
    render(<ForgotPasswordPage />);
    expect(screen.getByLabelText("email")).toBeInTheDocument();
  });

  it("renders email field as type email", () => {
    render(<ForgotPasswordPage />);
    expect(screen.getByLabelText("email")).toHaveAttribute("type", "email");
  });

  it("renders email field as required", () => {
    render(<ForgotPasswordPage />);
    expect(screen.getByLabelText("email")).toBeRequired();
  });

  it("renders email placeholder", () => {
    render(<ForgotPasswordPage />);
    expect(screen.getByPlaceholderText("emailPlaceholder")).toBeInTheDocument();
  });

  it("renders submit button", () => {
    render(<ForgotPasswordPage />);
    expect(screen.getByRole("button", { name: "submit" })).toBeInTheDocument();
  });

  it("renders heading", () => {
    render(<ForgotPasswordPage />);
    expect(screen.getByText("heading")).toBeInTheDocument();
  });

  it("renders description text", () => {
    render(<ForgotPasswordPage />);
    expect(screen.getByText("description")).toBeInTheDocument();
  });

  it("renders back-to-login link", () => {
    render(<ForgotPasswordPage />);
    const link = screen.getByText("backToLogin");
    expect(link).toBeInTheDocument();
    expect(link.closest("a")).toHaveAttribute("href", "/auth/login");
  });

  it("renders create account link", () => {
    render(<ForgotPasswordPage />);
    const link = screen.getByText("createAccount");
    expect(link).toBeInTheDocument();
    expect(link.closest("a")).toHaveAttribute("href", "/auth/register");
  });

  it("renders auth info card", () => {
    render(<ForgotPasswordPage />);
    expect(screen.getByTestId("auth-info-card")).toBeInTheDocument();
    expect(screen.getByText("recoveryTitle")).toBeInTheDocument();
  });

  it("renders recovery steps", () => {
    render(<ForgotPasswordPage />);
    expect(screen.getByText("step1")).toBeInTheDocument();
    expect(screen.getByText("step5")).toBeInTheDocument();
  });

  it("renders troubleshooting section", () => {
    render(<ForgotPasswordPage />);
    expect(screen.getByText("troubleshooting")).toBeInTheDocument();
    expect(screen.getByText(/troubleshootingText/)).toBeInTheDocument();
  });

  it("renders security section", () => {
    render(<ForgotPasswordPage />);
    expect(screen.getByText("securityTitle")).toBeInTheDocument();
    expect(screen.getByText("securityText")).toBeInTheDocument();
  });

  it("does not show status message initially", () => {
    render(<ForgotPasswordPage />);
    expect(screen.queryByText("sending")).not.toBeInTheDocument();
    expect(screen.queryByText("sent")).not.toBeInTheDocument();
  });

  // ── Form interaction ──

  it("updates email field value", () => {
    render(<ForgotPasswordPage />);
    const input = screen.getByLabelText("email");
    fireEvent.change(input, { target: { value: "user@test.com" } });
    expect(input).toHaveValue("user@test.com");
  });

  // ── Successful submission (no turnstile key) ──

  it("calls fetch with correct payload on submit", async () => {
    render(<ForgotPasswordPage />);
    fireEvent.change(screen.getByLabelText("email"), { target: { value: "user@test.com" } });
    fireEvent.submit(screen.getByRole("button", { name: "submit" }).closest("form")!);

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: expect.stringContaining("user@test.com"),
      });
    });
  });

  it("shows 'sent' status on successful submission", async () => {
    render(<ForgotPasswordPage />);
    fireEvent.change(screen.getByLabelText("email"), { target: { value: "user@test.com" } });
    fireEvent.submit(screen.getByRole("button", { name: "submit" }).closest("form")!);

    await waitFor(() => {
      expect(screen.getByText("sent")).toBeInTheDocument();
    });
  });

  it("shows sending status during submission", async () => {
    let resolveResponse: any;
    (globalThis.fetch as any).mockReturnValue(
      new Promise((r) => {
        resolveResponse = r;
      }),
    );
    render(<ForgotPasswordPage />);
    fireEvent.change(screen.getByLabelText("email"), { target: { value: "user@test.com" } });
    fireEvent.submit(screen.getByRole("button", { name: "submit" }).closest("form")!);

    expect(screen.getByText("sending")).toBeInTheDocument();
    resolveResponse({ ok: true, json: () => Promise.resolve({ ok: true }) });
    await waitFor(() => {
      expect(screen.getByText("sent")).toBeInTheDocument();
    });
  });

  // ── Error handling ──

  it("shows error when API returns errorKey", async () => {
    (globalThis.fetch as any).mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({ errorKey: "rateLimited" }),
    });
    render(<ForgotPasswordPage />);
    fireEvent.change(screen.getByLabelText("email"), { target: { value: "user@test.com" } });
    fireEvent.submit(screen.getByRole("button", { name: "submit" }).closest("form")!);

    await waitFor(() => {
      expect(screen.getByText("rateLimited")).toBeInTheDocument();
    });
  });

  it("shows unknownError when API throws", async () => {
    (globalThis.fetch as any).mockRejectedValue(new Error("network fail"));
    render(<ForgotPasswordPage />);
    fireEvent.change(screen.getByLabelText("email"), { target: { value: "user@test.com" } });
    fireEvent.submit(screen.getByRole("button", { name: "submit" }).closest("form")!);

    await waitFor(() => {
      expect(screen.getByText("unknownError")).toBeInTheDocument();
    });
  });

  it("re-enables submit button after error", async () => {
    (globalThis.fetch as any).mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({ errorKey: "error" }),
    });
    render(<ForgotPasswordPage />);
    fireEvent.change(screen.getByLabelText("email"), { target: { value: "user@test.com" } });
    fireEvent.submit(screen.getByRole("button", { name: "submit" }).closest("form")!);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "submit" })).not.toBeDisabled();
    });
  });

  it("re-enables submit button after network error", async () => {
    (globalThis.fetch as any).mockRejectedValue(new Error("fail"));
    render(<ForgotPasswordPage />);
    fireEvent.change(screen.getByLabelText("email"), { target: { value: "user@test.com" } });
    fireEvent.submit(screen.getByRole("button", { name: "submit" }).closest("form")!);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "submit" })).not.toBeDisabled();
    });
  });

  // ── Loading state ──

  it("disables submit button during submission", async () => {
    let resolveResponse: any;
    (globalThis.fetch as any).mockReturnValue(
      new Promise((r) => {
        resolveResponse = r;
      }),
    );
    render(<ForgotPasswordPage />);
    fireEvent.change(screen.getByLabelText("email"), { target: { value: "user@test.com" } });
    fireEvent.submit(screen.getByRole("button", { name: "submit" }).closest("form")!);

    expect(screen.getByRole("button", { name: "submit" })).toBeDisabled();
    resolveResponse({ ok: true, json: () => Promise.resolve({ ok: true }) });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "submit" })).not.toBeDisabled();
    });
  });

  // ── Redirect URL construction ──

  it("sends correct redirectTo URL", async () => {
    render(<ForgotPasswordPage />);
    fireEvent.change(screen.getByLabelText("email"), { target: { value: "user@test.com" } });
    fireEvent.submit(screen.getByRole("button", { name: "submit" }).closest("form")!);

    await waitFor(() => {
      const callBody = JSON.parse((globalThis.fetch as any).mock.calls[0][1].body);
      expect(callBody.redirectTo).toContain("/auth/callback?next=/auth/update");
    });
  });

  // ── Links in info card ──

  it("renders links to contact, login, register, home, about pages", () => {
    render(<ForgotPasswordPage />);
    const links = screen.getAllByRole("link");
    const hrefs = links.map((l) => l.getAttribute("href"));
    expect(hrefs).toContain("/auth/login");
    expect(hrefs).toContain("/auth/register");
    expect(hrefs).toContain("/contact");
  });
});
