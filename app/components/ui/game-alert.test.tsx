// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import GameAlert from "./game-alert";

vi.mock("next/image", () => ({
  __esModule: true,
  default: ({ fill, priority, unoptimized, ...props }: any) => {
    const React = require("react");
    return React.createElement("img", props);
  },
}));

describe("GameAlert", () => {
  it("renders with role=alert", () => {
    render(<GameAlert variant="info" />);
    expect(screen.getByRole("alert")).toBeTruthy();
  });

  it.each(["warn", "success", "error", "info"] as const)("applies the variant class for variant=%s", (variant) => {
    render(<GameAlert variant={variant} />);
    expect(screen.getByRole("alert").className).toContain(`game-alert--${variant}`);
  });

  it("renders a title when provided", () => {
    render(<GameAlert variant="warn" title="Watch out!" />);
    expect(screen.getByText("Watch out!")).toBeTruthy();
  });

  it("does not render a title element when title is omitted", () => {
    const { container } = render(<GameAlert variant="info" />);
    expect(container.querySelector(".game-alert__title")).toBeNull();
  });

  it("renders children as body content", () => {
    render(<GameAlert variant="success">All good!</GameAlert>);
    expect(screen.getByText("All good!")).toBeTruthy();
  });

  it("does not render body when children are omitted", () => {
    const { container } = render(<GameAlert variant="error" />);
    expect(container.querySelector(".game-alert__text")).toBeNull();
  });

  it("renders a retry button when onRetry is provided", () => {
    const handler = vi.fn();
    render(<GameAlert variant="error" onRetry={handler} />);
    const retryBtn = screen.getByRole("button", { name: /retry/i });
    fireEvent.click(retryBtn);
    expect(handler).toHaveBeenCalledOnce();
  });

  it("does not render retry button when onRetry is omitted", () => {
    render(<GameAlert variant="error" />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("applies extra className", () => {
    render(<GameAlert variant="info" className="my-class" />);
    expect(screen.getByRole("alert").className).toContain("my-class");
  });

  it("renders the correct icon for each variant", () => {
    const { container } = render(<GameAlert variant="warn" />);
    expect(container.querySelector(".game-alert__icon")).toBeTruthy();
  });
});
