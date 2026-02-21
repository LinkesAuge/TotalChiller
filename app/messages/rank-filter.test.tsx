// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("next-intl", () => ({
  useTranslations: vi.fn(() => vi.fn((key: string) => key)),
  useLocale: vi.fn(() => "de"),
}));

vi.mock("./use-messages", () => ({
  ALL_RANKS: ["leader", "superior", "officer", "veteran", "soldier", "guest"],
  RANK_PRESET_FUEHRUNG: { ranks: ["leader", "superior", "officer"], includeWebmaster: true },
  RANK_PRESET_MITGLIEDER: { ranks: ["veteran", "soldier", "guest"], includeWebmaster: false },
}));

vi.mock("@radix-ui/react-popover", () => ({
  Root: ({ children }: any) => {
    const React = require("react");
    return React.createElement("div", null, children);
  },
  Trigger: ({ children, asChild }: any) => {
    const React = require("react");
    return asChild ? children : React.createElement("button", null, children);
  },
  Portal: ({ children }: any) => {
    const React = require("react");
    return React.createElement("div", null, children);
  },
  Content: ({ children, ...props }: any) => {
    const React = require("react");
    return React.createElement("div", { role: "dialog", ...props }, children);
  },
}));

import { RankFilter } from "./rank-filter";

describe("RankFilter", () => {
  const defaultProps = {
    selectedRanks: [] as readonly string[],
    onRanksChange: vi.fn(),
    includeWebmaster: false,
    onIncludeWebmasterChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders rank filter label and trigger button", () => {
    render(<RankFilter {...defaultProps} />);
    const matches = screen.getAllByText("rankFilter");
    expect(matches.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("button", { name: "rankFilter" })).toBeTruthy();
  });

  it("shows all rank checkboxes (6 ranks + webmaster)", () => {
    render(<RankFilter {...defaultProps} />);
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes).toHaveLength(7);
  });

  it("toggles a rank checkbox when clicked", () => {
    const onRanksChange = vi.fn();
    render(<RankFilter {...defaultProps} onRanksChange={onRanksChange} />);
    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[0]);
    expect(onRanksChange).toHaveBeenCalledWith(["leader"]);
  });

  it("calls selectAll preset when all ranks button clicked", () => {
    const onRanksChange = vi.fn();
    const onIncludeWebmasterChange = vi.fn();
    render(
      <RankFilter
        {...defaultProps}
        onRanksChange={onRanksChange}
        onIncludeWebmasterChange={onIncludeWebmasterChange}
      />,
    );
    const allBtn = screen.getByText("allRanks");
    fireEvent.click(allBtn);
    expect(onRanksChange).toHaveBeenCalledWith(["leader", "superior", "officer", "veteran", "soldier", "guest"]);
    expect(onIncludeWebmasterChange).toHaveBeenCalledWith(true);
  });

  it("calls applyPreset for Fuehrung preset", () => {
    const onRanksChange = vi.fn();
    const onIncludeWebmasterChange = vi.fn();
    render(
      <RankFilter
        {...defaultProps}
        onRanksChange={onRanksChange}
        onIncludeWebmasterChange={onIncludeWebmasterChange}
      />,
    );
    fireEvent.click(screen.getByText("presetFuehrung"));
    expect(onRanksChange).toHaveBeenCalledWith(["leader", "superior", "officer"]);
    expect(onIncludeWebmasterChange).toHaveBeenCalledWith(true);
  });

  it("calls applyPreset for Mitglieder preset", () => {
    const onRanksChange = vi.fn();
    const onIncludeWebmasterChange = vi.fn();
    render(
      <RankFilter
        {...defaultProps}
        onRanksChange={onRanksChange}
        onIncludeWebmasterChange={onIncludeWebmasterChange}
      />,
    );
    fireEvent.click(screen.getByText("presetMitglieder"));
    expect(onRanksChange).toHaveBeenCalledWith(["veteran", "soldier", "guest"]);
    expect(onIncludeWebmasterChange).toHaveBeenCalledWith(false);
  });

  it("toggles includeWebmaster checkbox", () => {
    const onIncludeWebmasterChange = vi.fn();
    render(<RankFilter {...defaultProps} onIncludeWebmasterChange={onIncludeWebmasterChange} />);
    const checkboxes = screen.getAllByRole("checkbox");
    const webmasterCheckbox = checkboxes[checkboxes.length - 1];
    fireEvent.click(webmasterCheckbox);
    expect(onIncludeWebmasterChange).toHaveBeenCalledWith(true);
  });
});
