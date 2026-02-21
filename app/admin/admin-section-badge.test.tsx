// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next-intl", () => ({
  useTranslations: vi.fn(() => vi.fn((key: string) => key)),
}));

const mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
}));

import AdminSectionBadge from "./admin-section-badge";

describe("AdminSectionBadge", () => {
  it("renders with default tab (clans) when no tab param", () => {
    render(<AdminSectionBadge />);
    expect(screen.getByText("clans")).toBeInTheDocument();
  });

  it("renders a badge element", () => {
    const { container } = render(<AdminSectionBadge />);
    const badge = container.querySelector(".badge");
    expect(badge).toBeInTheDocument();
  });

  it("renders correct label for users tab", () => {
    mockSearchParams.set("tab", "users");
    render(<AdminSectionBadge />);
    expect(screen.getByText("users")).toBeInTheDocument();
    mockSearchParams.delete("tab");
  });

  it("renders correct label for logs tab", () => {
    mockSearchParams.set("tab", "logs");
    render(<AdminSectionBadge />);
    expect(screen.getByText("logs")).toBeInTheDocument();
    mockSearchParams.delete("tab");
  });

  it("falls back to clans for unknown tab", () => {
    mockSearchParams.set("tab", "unknown");
    render(<AdminSectionBadge />);
    expect(screen.getByText("clans")).toBeInTheDocument();
    mockSearchParams.delete("tab");
  });
});
