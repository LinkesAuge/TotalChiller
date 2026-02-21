// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next-intl", () => ({
  useTranslations: vi.fn(() => vi.fn((key: string) => key)),
  useLocale: vi.fn(() => "de"),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

vi.mock("next/dynamic", () => ({
  __esModule: true,
  default: () => {
    const React = require("react");
    return () => React.createElement("div", { "data-testid": "mock-tab" }, "Tab Content");
  },
}));

import DesignSystemClient from "./design-system-client";

describe("DesignSystemClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", () => {
    render(<DesignSystemClient />);
    expect(screen.getByText("title")).toBeInTheDocument();
  });

  it("renders subtitle", () => {
    render(<DesignSystemClient />);
    expect(screen.getByText("subtitle")).toBeInTheDocument();
  });

  it("renders three tab buttons", () => {
    render(<DesignSystemClient />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(3);
  });

  it("first tab is active by default", () => {
    render(<DesignSystemClient />);
    const buttons = screen.getAllByRole("button");
    expect(buttons[0]?.className).toContain("active");
  });

  it("renders active tab content", () => {
    render(<DesignSystemClient />);
    expect(screen.getByTestId("mock-tab")).toBeInTheDocument();
  });

  it("switches to second tab on click", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    render(<DesignSystemClient />);
    const buttons = screen.getAllByRole("button");
    await user.click(buttons[1]);
    expect(buttons[1].className).toContain("active");
    expect(buttons[0].className).not.toContain("active");
  });

  it("switches to third tab on click", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    render(<DesignSystemClient />);
    const buttons = screen.getAllByRole("button");
    await user.click(buttons[2]);
    expect(buttons[2].className).toContain("active");
    expect(buttons[0].className).not.toContain("active");
    expect(buttons[1].className).not.toContain("active");
  });

  it("switches back to first tab after switching away", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    render(<DesignSystemClient />);
    const buttons = screen.getAllByRole("button");
    await user.click(buttons[1]);
    expect(buttons[1].className).toContain("active");
    await user.click(buttons[0]);
    expect(buttons[0].className).toContain("active");
    expect(buttons[1].className).not.toContain("active");
  });

  it("renders tab descriptions as title attributes", () => {
    render(<DesignSystemClient />);
    const buttons = screen.getAllByRole("button");
    expect(buttons[0]).toHaveAttribute("title", "tabs.assetLibraryDesc");
    expect(buttons[1]).toHaveAttribute("title", "tabs.uiInventoryDesc");
    expect(buttons[2]).toHaveAttribute("title", "tabs.assignmentsDesc");
  });

  it("renders tab labels", () => {
    render(<DesignSystemClient />);
    expect(screen.getByText("tabs.assetLibrary")).toBeInTheDocument();
    expect(screen.getByText("tabs.uiInventory")).toBeInTheDocument();
    expect(screen.getByText("tabs.assignments")).toBeInTheDocument();
  });

  it("keeps active tab content rendered after switching", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    render(<DesignSystemClient />);
    await user.click(screen.getAllByRole("button")[2]);
    expect(screen.getByTestId("mock-tab")).toBeInTheDocument();
  });
});
