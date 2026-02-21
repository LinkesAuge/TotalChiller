// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import PageShell from "./page-shell";

vi.mock("next-intl", () => ({
  useTranslations: vi.fn(() => vi.fn((key: string) => key)),
  useLocale: vi.fn(() => "de"),
}));
vi.mock("next/image", () => ({
  __esModule: true,
  default: ({ fill, priority, unoptimized, ...props }: any) => {
    const React = require("react");
    return React.createElement("img", props);
  },
}));
vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, ...props }: any) => {
    const React = require("react");
    return React.createElement("a", props, children);
  },
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));
vi.mock("./auth-actions", () => ({
  __esModule: true,
  default: () => {
    const React = require("react");
    return React.createElement("div", { "data-testid": "auth-actions" }, "AuthActions");
  },
}));
vi.mock("./section-hero", () => ({
  __esModule: true,
  default: (props: any) => {
    const React = require("react");
    return React.createElement("div", { "data-testid": "section-hero" }, props.title);
  },
}));

describe("PageShell", () => {
  it("renders title via PageTopBar", () => {
    render(<PageShell title="My Page">Content</PageShell>);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("My Page");
  });

  it("renders children inside content-inner", () => {
    const { container } = render(<PageShell title="T">Hello</PageShell>);
    expect(container.querySelector(".content-inner")?.textContent).toContain("Hello");
  });

  it("renders AuthActions by default", () => {
    render(<PageShell title="T">C</PageShell>);
    expect(screen.getByTestId("auth-actions")).toBeTruthy();
  });

  it("hides actions when actions=null", () => {
    render(
      <PageShell title="T" actions={null}>
        C
      </PageShell>,
    );
    expect(screen.queryByTestId("auth-actions")).toBeNull();
  });

  it("renders custom actions", () => {
    render(
      <PageShell title="T" actions={<button>Custom</button>}>
        C
      </PageShell>,
    );
    expect(screen.getByText("Custom")).toBeTruthy();
    expect(screen.queryByTestId("auth-actions")).toBeNull();
  });

  it("renders SectionHero when hero props are provided", () => {
    render(
      <PageShell title="T" heroTitle="Hero" heroSubtitle="Sub" bannerSrc="/b.jpg">
        C
      </PageShell>,
    );
    expect(screen.getByTestId("section-hero")).toBeTruthy();
  });

  it("renders heroSlot when provided (overrides default hero)", () => {
    render(
      <PageShell
        title="T"
        heroSlot={<div data-testid="custom-hero">Custom</div>}
        heroTitle="H"
        heroSubtitle="S"
        bannerSrc="/b.jpg"
      >
        C
      </PageShell>,
    );
    expect(screen.getByTestId("custom-hero")).toBeTruthy();
    expect(screen.queryByTestId("section-hero")).toBeNull();
  });

  it("applies contentClassName", () => {
    const { container } = render(
      <PageShell title="T" contentClassName="extra">
        C
      </PageShell>,
    );
    expect(container.querySelector(".content-inner.extra")).toBeTruthy();
  });

  it("renders breadcrumb", () => {
    render(
      <PageShell title="T" breadcrumb="Admin">
        C
      </PageShell>,
    );
    expect(screen.getByText("Admin")).toBeTruthy();
  });
});
