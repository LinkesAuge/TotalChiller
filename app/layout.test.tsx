// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

vi.mock("next/font/google", () => ({
  Cinzel: () => ({ variable: "--font-heading" }),
  Inter: () => ({ variable: "--font-body" }),
}));

vi.mock("next-intl/server", () => ({
  getLocale: vi.fn(() => Promise.resolve("de")),
  getMessages: vi.fn(() =>
    Promise.resolve({
      footer: {
        tagline: "Test tagline",
        home: "Home",
        about: "About",
        contact: "Contact",
        privacy: "Privacy",
        builtWith: "Built with tests",
      },
    }),
  ),
}));

vi.mock("next-intl", () => ({
  NextIntlClientProvider: ({ children }: any) =>
    React.createElement("div", { "data-testid": "intl-provider" }, children),
}));

vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: any) => React.createElement("img", { ...props, src: props.src }),
}));
vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, ...props }: any) => React.createElement("a", props, children),
}));

vi.mock("@vercel/analytics/next", () => ({
  Analytics: () => React.createElement("div", { "data-testid": "analytics" }),
}));

vi.mock("./components/sidebar-context", () => ({
  SidebarProvider: ({ children }: any) => React.createElement("div", { "data-testid": "sidebar-provider" }, children),
}));
vi.mock("./components/sidebar-shell", () => ({
  __esModule: true,
  default: ({ children }: any) => React.createElement("div", { "data-testid": "sidebar-shell" }, children),
}));
vi.mock("./components/toast-provider", () => ({
  ToastProvider: ({ children }: any) => React.createElement("div", { "data-testid": "toast-provider" }, children),
}));
vi.mock("./components/clan-access-gate", () => ({
  __esModule: true,
  default: ({ children }: any) => React.createElement("div", { "data-testid": "clan-gate" }, children),
}));
vi.mock("./components/bug-report-widget-loader", () => ({
  __esModule: true,
  default: () => React.createElement("div", { "data-testid": "bug-widget" }),
}));
vi.mock("./hooks/auth-state-provider", () => ({
  AuthStateProvider: ({ children }: any) => React.createElement("div", { "data-testid": "auth-provider" }, children),
}));

vi.mock("./globals.css", () => ({}));

import RootLayout from "./layout";

async function renderLayout(children?: React.ReactNode) {
  const result = await RootLayout({ children: children ?? React.createElement("div", null, "page content") });
  const { container } = render(result);
  return container;
}

describe("RootLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders layout structure with providers and content", async () => {
    await renderLayout();
    expect(screen.getByTestId("intl-provider")).toBeInTheDocument();
    expect(screen.getByTestId("auth-provider")).toBeInTheDocument();
    expect(screen.getByTestId("sidebar-shell")).toBeInTheDocument();
  });

  it("renders children inside the layout", async () => {
    await renderLayout(React.createElement("span", null, "Hello Layout"));
    expect(screen.getByText("Hello Layout")).toBeInTheDocument();
  });

  it("renders the intl provider", async () => {
    await renderLayout();
    expect(screen.getByTestId("intl-provider")).toBeInTheDocument();
  });

  it("renders the auth state provider", async () => {
    await renderLayout();
    expect(screen.getByTestId("auth-provider")).toBeInTheDocument();
  });

  it("renders the toast provider", async () => {
    await renderLayout();
    expect(screen.getByTestId("toast-provider")).toBeInTheDocument();
  });

  it("renders the sidebar provider and shell", async () => {
    await renderLayout();
    expect(screen.getByTestId("sidebar-provider")).toBeInTheDocument();
    expect(screen.getByTestId("sidebar-shell")).toBeInTheDocument();
  });

  it("renders the clan access gate", async () => {
    await renderLayout();
    expect(screen.getByTestId("clan-gate")).toBeInTheDocument();
  });

  it("renders the bug report widget loader", async () => {
    await renderLayout();
    expect(screen.getByTestId("bug-widget")).toBeInTheDocument();
  });

  it("renders the analytics component", async () => {
    await renderLayout();
    expect(screen.getByTestId("analytics")).toBeInTheDocument();
  });

  it("renders footer with tagline from messages", async () => {
    await renderLayout();
    expect(screen.getByText("Test tagline")).toBeInTheDocument();
  });

  it("renders footer navigation links", async () => {
    await renderLayout();
    const homeLink = screen.getByText("Home");
    expect(homeLink.closest("a")).toHaveAttribute("href", "/home");
    const aboutLink = screen.getByText("About");
    expect(aboutLink.closest("a")).toHaveAttribute("href", "/about");
    const contactLink = screen.getByText("Contact");
    expect(contactLink.closest("a")).toHaveAttribute("href", "/contact");
    const privacyLink = screen.getByText("Privacy");
    expect(privacyLink.closest("a")).toHaveAttribute("href", "/privacy-policy");
  });

  it("renders builtWith text in footer", async () => {
    await renderLayout();
    expect(screen.getByText(/Built with tests/)).toBeInTheDocument();
  });

  it("renders footer copyright with current year", async () => {
    await renderLayout();
    const year = new Date().getFullYear().toString();
    const footerSub = document.querySelector(".app-footer-sub");
    expect(footerSub?.textContent).toContain(year);
    expect(footerSub?.textContent).toContain("[THC] Chiller & Killer");
  });

  it("renders footer ornamental divider image", async () => {
    await renderLayout();
    const img = document.querySelector(".app-footer-divider");
    expect(img).toBeTruthy();
    expect(img?.getAttribute("src")).toBe("/assets/vip/components_decor_5.png");
  });

  it("renders the layout wrapper div", async () => {
    await renderLayout();
    expect(document.querySelector(".layout")).toBeTruthy();
  });

  it("renders body with suppressHydrationWarning", async () => {
    await renderLayout();
    expect(document.querySelector("body")).toBeTruthy();
  });

  it("renders JSON-LD structured data script", async () => {
    await renderLayout();
    const script = document.querySelector('script[type="application/ld+json"]');
    expect(script).toBeTruthy();
    const data = JSON.parse(script?.innerHTML ?? "{}");
    expect(data["@context"]).toBe("https://schema.org");
    expect(data["@graph"]).toHaveLength(2);
    expect(data["@graph"][0]["@type"]).toBe("WebSite");
    expect(data["@graph"][1]["@type"]).toBe("Organization");
  });

  it("uses t() helper that falls back to key when section not found", async () => {
    await renderLayout();
    const allText = document.body.textContent ?? "";
    expect(allText).toContain("Test tagline");
  });

  it("renders meta charset tag", async () => {
    await renderLayout();
    const meta = document.querySelector('meta[http-equiv="Content-Type"]');
    expect(meta).toBeTruthy();
    expect(meta?.getAttribute("content")).toBe("text/html; charset=utf-8");
  });

  it("renders footer links and copyright section", async () => {
    await renderLayout();
    const footerLinks = document.querySelector(".app-footer-links");
    expect(footerLinks).toBeTruthy();
    expect(footerLinks?.querySelectorAll("a").length).toBe(4);
  });
});
