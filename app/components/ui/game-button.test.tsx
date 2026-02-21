// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import GameButton from "./game-button";

vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: any) => {
    const React = require("react");
    return React.createElement("img", props);
  },
}));

describe("GameButton", () => {
  it("renders with default variant and children text", () => {
    render(<GameButton>Click me</GameButton>);
    expect(screen.getByRole("button", { name: /click me/i })).toBeTruthy();
    expect(screen.getByText("Click me")).toBeTruthy();
  });

  it("defaults to type=button", () => {
    render(<GameButton>Go</GameButton>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });

  it("passes type prop through", () => {
    render(<GameButton type="submit">Send</GameButton>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
  });

  it("fires onClick when clicked", () => {
    const handler = vi.fn();
    render(<GameButton onClick={handler}>Act</GameButton>);
    fireEvent.click(screen.getByRole("button"));
    expect(handler).toHaveBeenCalledOnce();
  });

  it("does not fire onClick when disabled", () => {
    const handler = vi.fn();
    render(
      <GameButton onClick={handler} disabled>
        Nope
      </GameButton>,
    );
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    fireEvent.click(btn);
    expect(handler).not.toHaveBeenCalled();
  });

  it("applies the disabled class", () => {
    render(<GameButton disabled>Dis</GameButton>);
    expect(screen.getByRole("button").className).toContain("gbtn--disabled");
  });

  it("does not apply disabled class when not disabled", () => {
    render(<GameButton>Abled</GameButton>);
    expect(screen.getByRole("button").className).not.toContain("gbtn--disabled");
  });

  it("passes ariaLabel to the button", () => {
    render(<GameButton ariaLabel="Custom label">X</GameButton>);
    expect(screen.getByRole("button")).toHaveAttribute("aria-label", "Custom label");
  });

  it("applies className prop", () => {
    render(<GameButton className="extra">Go</GameButton>);
    expect(screen.getByRole("button").className).toContain("extra");
  });

  it("renders an image background for each variant", () => {
    const variants = [
      "ornate1",
      "ornate2",
      "ornate3",
      "hero",
      "green",
      "orange",
      "purple",
      "turquoise",
      "standard",
    ] as const;
    for (const v of variants) {
      const { container, unmount } = render(<GameButton variant={v}>V</GameButton>);
      expect(container.querySelector("img")).toBeTruthy();
      unmount();
    }
  });

  it("applies fontSize override via inline style", () => {
    const { container } = render(<GameButton fontSize="1.5rem">Big</GameButton>);
    const label = container.querySelector(".gbtn-label") as HTMLElement;
    expect(label.style.fontSize).toBe("1.5rem");
  });
});
