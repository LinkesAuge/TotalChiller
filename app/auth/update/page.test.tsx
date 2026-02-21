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
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("../../hooks/use-supabase", () => ({
  useSupabase: vi.fn(() => ({
    auth: {
      updateUser: vi.fn().mockResolvedValue({ error: null }),
    },
  })),
}));
vi.mock("../../../lib/supabase/error-utils", () => ({
  getAuthErrorKey: (err: any) => err?.message ?? "unknownError",
}));

import UpdatePasswordPage from "./page";

describe("UpdatePasswordPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders password and confirm password fields", () => {
    render(<UpdatePasswordPage />);
    expect(screen.getByLabelText("newPassword")).toBeInTheDocument();
    expect(screen.getByLabelText("confirmPassword")).toBeInTheDocument();
  });

  it("renders submit button", () => {
    render(<UpdatePasswordPage />);
    expect(screen.getByRole("button", { name: "submit" })).toBeInTheDocument();
  });

  it("renders heading", () => {
    render(<UpdatePasswordPage />);
    expect(screen.getByText("heading")).toBeInTheDocument();
  });

  it("shows mismatch error when passwords differ", async () => {
    render(<UpdatePasswordPage />);
    fireEvent.change(screen.getByLabelText("newPassword"), {
      target: { value: "pass123" },
    });
    fireEvent.change(screen.getByLabelText("confirmPassword"), {
      target: { value: "different" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "submit" }));
    expect(await screen.findByText("mismatch")).toBeInTheDocument();
  });
});
