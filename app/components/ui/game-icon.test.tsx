// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import GameIcon, { ICON_MAP, SIZE_PX } from "./game-icon";

vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: any) => {
    const React = require("react");
    return React.createElement("img", props);
  },
}));

describe("GameIcon", () => {
  it("renders a mapped icon with the correct src and default md size", () => {
    const { container } = render(<GameIcon name="search" />);
    const img = container.querySelector("img")!;
    expect(img).toHaveAttribute("src", ICON_MAP.search);
    expect(img).toHaveAttribute("width", String(SIZE_PX.md));
    expect(img).toHaveAttribute("height", String(SIZE_PX.md));
  });

  it("renders a raw path starting with /", () => {
    const { container } = render(<GameIcon name="/custom/path.png" />);
    const img = container.querySelector("img")!;
    expect(img).toHaveAttribute("src", "/custom/path.png");
  });

  it.each(["xs", "sm", "md", "lg", "xl"] as const)("applies the correct pixel size for size=%s", (size) => {
    const { container } = render(<GameIcon name="star" size={size} />);
    const img = container.querySelector("img")!;
    expect(img).toHaveAttribute("width", String(SIZE_PX[size]));
    expect(img).toHaveAttribute("height", String(SIZE_PX[size]));
  });

  it("passes className to the wrapper span", () => {
    const { container } = render(<GameIcon name="home" className="extra" />);
    const wrapper = container.querySelector("span.game-icon.extra");
    expect(wrapper).toBeTruthy();
  });

  it("passes alt text to the image", () => {
    render(<GameIcon name="home" alt="Home icon" />);
    expect(screen.getByAltText("Home icon")).toBeTruthy();
  });

  it("renders an empty span for an unknown icon name", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { container } = render(<GameIcon name="does-not-exist" />);
    const span = container.querySelector("span");
    expect(span).toBeTruthy();
    expect(container.querySelector("img")).toBeNull();
    warnSpy.mockRestore();
  });

  it("logs a warning in development for unknown icon names", () => {
    vi.stubEnv("NODE_ENV", "development");
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(<GameIcon name="nonexistent" />);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("nonexistent"));
    warnSpy.mockRestore();
    vi.unstubAllEnvs();
  });

  it("uses empty alt by default (decorative icon)", () => {
    const { container } = render(<GameIcon name="home" />);
    const img = container.querySelector("img")!;
    expect(img).toHaveAttribute("alt", "");
  });
});
