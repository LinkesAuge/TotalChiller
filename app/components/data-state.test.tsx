// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

vi.mock("next-intl", () => ({
  useTranslations: vi.fn(() => vi.fn((key: string) => key)),
  useLocale: vi.fn(() => "de"),
}));

vi.mock("./ui/game-alert", () => ({
  __esModule: true,
  default: ({ variant, title, onRetry, className }: any) => {
    const React = require("react");
    return React.createElement(
      "div",
      { "data-testid": "game-alert", "data-variant": variant, className },
      React.createElement("span", null, title),
      onRetry ? React.createElement("button", { onClick: onRetry }, "Retry") : null,
    );
  },
}));

import DataState from "./data-state";

describe("DataState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading alert when isLoading=true", () => {
    render(
      <DataState isLoading={true}>
        <p>Content</p>
      </DataState>,
    );
    const alert = screen.getByTestId("game-alert");
    expect(alert).toHaveAttribute("data-variant", "info");
  });

  it("renders custom loadingNode when provided", () => {
    render(
      <DataState isLoading={true} loadingNode={<div data-testid="custom-loader">Loading…</div>}>
        <p>Content</p>
      </DataState>,
    );
    expect(screen.getByTestId("custom-loader")).toBeInTheDocument();
    expect(screen.queryByTestId("game-alert")).not.toBeInTheDocument();
  });

  it("renders error alert when error is set", () => {
    render(
      <DataState isLoading={false} error="Something broke">
        <p>Content</p>
      </DataState>,
    );
    const alert = screen.getByTestId("game-alert");
    expect(alert).toHaveAttribute("data-variant", "error");
    expect(screen.getByText("Something broke")).toBeInTheDocument();
  });

  it("renders error with retry button when onRetry provided", () => {
    const onRetry = vi.fn();
    render(
      <DataState isLoading={false} error="Fail" onRetry={onRetry}>
        <p>Content</p>
      </DataState>,
    );
    const btn = screen.getByText("Retry");
    btn.click();
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("renders empty state card when isEmpty=true", () => {
    render(
      <DataState isLoading={false} isEmpty={true} emptyMessage="No items">
        <p>Content</p>
      </DataState>,
    );
    expect(screen.getByText("No items")).toBeInTheDocument();
    expect(screen.queryByText("Content")).not.toBeInTheDocument();
  });

  it("renders empty with subtitle when emptySubtitle provided", () => {
    render(
      <DataState isLoading={false} isEmpty={true} emptyMessage="No items" emptySubtitle="Try later">
        <p>Content</p>
      </DataState>,
    );
    expect(screen.getByText("Try later")).toBeInTheDocument();
  });

  it("renders custom emptyNode when provided", () => {
    render(
      <DataState isLoading={false} isEmpty={true} emptyNode={<div data-testid="custom-empty">Nothing</div>}>
        <p>Content</p>
      </DataState>,
    );
    expect(screen.getByTestId("custom-empty")).toBeInTheDocument();
  });

  it("renders children when not loading, no error, not empty", () => {
    render(
      <DataState isLoading={false}>
        <p>Content</p>
      </DataState>,
    );
    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("uses default loading message from translations", () => {
    render(
      <DataState isLoading={true}>
        <p>Content</p>
      </DataState>,
    );
    expect(screen.getByText("loading")).toBeInTheDocument();
  });

  it("applies className to loading/error/empty states", () => {
    const { rerender } = render(
      <DataState isLoading={true} className="extra">
        <p>Content</p>
      </DataState>,
    );
    expect(screen.getByTestId("game-alert")).toHaveClass("extra");

    rerender(
      <DataState isLoading={false} error="Err" className="extra">
        <p>Content</p>
      </DataState>,
    );
    expect(screen.getByTestId("game-alert")).toHaveClass("extra");

    rerender(
      <DataState isLoading={false} isEmpty={true} emptyMessage="No data" className="extra">
        <p>Content</p>
      </DataState>,
    );
    expect(document.querySelector(".card.extra")).toBeInTheDocument();
  });
});
