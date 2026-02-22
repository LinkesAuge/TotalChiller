// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next-intl", () => ({
  useTranslations: vi.fn(() => vi.fn((key: string) => key)),
}));

vi.mock("@/app/components/page-shell", () => ({
  __esModule: true,
  default: ({ children, breadcrumb, title, heroTitle, heroSubtitle, bannerSrc }: any) => {
    const React = require("react");
    return React.createElement(
      "div",
      { "data-testid": "page-shell" },
      React.createElement("span", { "data-testid": "breadcrumb" }, breadcrumb),
      React.createElement("h1", null, title),
      heroTitle && React.createElement("span", { "data-testid": "hero-title" }, heroTitle),
      heroSubtitle && React.createElement("span", { "data-testid": "hero-subtitle" }, heroSubtitle),
      bannerSrc && React.createElement("span", { "data-testid": "banner-src" }, bannerSrc),
      children,
    );
  },
}));

import AnalyticsPlaceholder from "./analytics-placeholder";

describe("AnalyticsPlaceholder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the page shell with correct breadcrumb", () => {
    render(<AnalyticsPlaceholder />);
    expect(screen.getByTestId("breadcrumb").textContent).toBe("breadcrumb");
  });

  it("renders the page shell with title", () => {
    render(<AnalyticsPlaceholder />);
    expect(screen.getByText("title")).toBeInTheDocument();
  });

  it("renders hero title", () => {
    render(<AnalyticsPlaceholder />);
    expect(screen.getByTestId("hero-title").textContent).toBe("heroTitle");
  });

  it("renders hero subtitle", () => {
    render(<AnalyticsPlaceholder />);
    expect(screen.getByTestId("hero-subtitle").textContent).toBe("heroSubtitle");
  });

  it("renders banner src", () => {
    render(<AnalyticsPlaceholder />);
    expect(screen.getByTestId("banner-src").textContent).toBe("/assets/banners/banner_gold_dragon.png");
  });

  it("renders the coming soon message", () => {
    render(<AnalyticsPlaceholder />);
    expect(screen.getByText("comingSoon")).toBeInTheDocument();
  });

  it("renders the decorative bar chart SVG icon", () => {
    render(<AnalyticsPlaceholder />);
    const svg = document.querySelector("svg");
    expect(svg).toBeTruthy();
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
    expect(svg?.getAttribute("width")).toBe("48");
    expect(svg?.getAttribute("height")).toBe("48");
  });

  it("renders SVG with correct stroke color", () => {
    render(<AnalyticsPlaceholder />);
    const svg = document.querySelector("svg");
    expect(svg?.getAttribute("stroke")).toBe("var(--color-gold-2)");
  });

  it("renders the SVG path element", () => {
    render(<AnalyticsPlaceholder />);
    const path = document.querySelector("svg path");
    expect(path).toBeTruthy();
    expect(path?.getAttribute("d")).toBe("M18 20V10M12 20V4M6 20v-6");
  });

  it("renders the content-inner wrapper", () => {
    render(<AnalyticsPlaceholder />);
    expect(document.querySelector(".content-inner")).toBeTruthy();
  });

  it("renders a card section with col-span-2", () => {
    render(<AnalyticsPlaceholder />);
    const card = document.querySelector("section.card.col-span-2");
    expect(card).toBeTruthy();
  });

  it("renders the coming soon text with correct styling", () => {
    render(<AnalyticsPlaceholder />);
    const p = screen.getByText("comingSoon");
    expect(p.className).toContain("text-center");
    expect(p.style.maxWidth).toBe("360px");
  });

  it("renders SVG with reduced opacity", () => {
    render(<AnalyticsPlaceholder />);
    const svg = document.querySelector("svg");
    expect(svg?.style.opacity).toBe("0.6");
  });

  it("calls useTranslations with 'analytics'", async () => {
    const nextIntl = await import("next-intl");
    render(<AnalyticsPlaceholder />);
    expect(nextIntl.useTranslations).toHaveBeenCalledWith("analytics");
  });
});
