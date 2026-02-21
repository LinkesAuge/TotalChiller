// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: any) => {
    const React = require("react");
    return React.createElement("img", props);
  },
}));

import SectionHero from "./section-hero";

describe("SectionHero", () => {
  it("renders title and subtitle", () => {
    render(<SectionHero title="News" subtitle="Latest updates" bannerSrc="/banner.jpg" />);
    expect(screen.getByText("News")).toBeInTheDocument();
    expect(screen.getByText("Latest updates")).toBeInTheDocument();
  });

  it("renders banner image with correct src", () => {
    render(<SectionHero title="News" subtitle="Latest updates" bannerSrc="/banner.jpg" />);
    const banner = screen.getByAltText("News hero banner");
    expect(banner).toHaveAttribute("src", "/banner.jpg");
  });

  it("renders decorative images", () => {
    const { container } = render(<SectionHero title="News" subtitle="Latest updates" bannerSrc="/banner.jpg" />);
    const images = container.querySelectorAll("img");
    expect(images.length).toBeGreaterThanOrEqual(3);
  });
});
