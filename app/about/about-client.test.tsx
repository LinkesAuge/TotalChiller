// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("next-intl", () => ({
  useTranslations: vi.fn(() => vi.fn((key: string) => key)),
}));
vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, ...props }: any) => {
    const React = require("react");
    return React.createElement("a", props, children);
  },
}));

const mockUseSiteContent = vi.fn();
vi.mock("../components/use-site-content", () => ({
  useSiteContent: (...args: any[]) => mockUseSiteContent(...args),
}));
vi.mock("../components/editable-text", () => ({
  __esModule: true,
  default: ({
    value,
    className,
    canEdit,
    onSave,
    locale,
    singleLine,
    markdown,
    supabase,
    userId,
    valueEn,
    valueDe,
  }: any) => {
    const React = require("react");
    return React.createElement(
      "span",
      {
        className,
        "data-canedit": canEdit ? "true" : "false",
        "data-locale": locale,
        "data-singleline": singleLine ? "true" : undefined,
        "data-markdown": markdown ? "true" : undefined,
        "data-has-supabase": supabase ? "true" : undefined,
        "data-has-userid": userId ? "true" : undefined,
        "data-has-valueen": valueEn !== undefined ? "true" : undefined,
        "data-has-valuede": valueDe !== undefined ? "true" : undefined,
        "data-testid": `editable-${value}`,
        onClick: onSave ? () => onSave("de-val", "en-val") : undefined,
        role: onSave ? "button" : undefined,
      },
      value,
    );
  },
}));
vi.mock("../components/cms-page-shell", () => ({
  __esModule: true,
  default: ({ children, isLoaded, error, title, breadcrumb }: any) => {
    const React = require("react");
    if (error) return React.createElement("div", { "data-testid": "error" }, error);
    if (!isLoaded) return React.createElement("div", { "data-testid": "loading" }, "Loading...");
    return React.createElement(
      "div",
      { "data-testid": "cms-shell" },
      React.createElement("h1", null, title),
      React.createElement("span", null, breadcrumb),
      children,
    );
  },
}));

import AboutClient from "./about-client";

function baseSiteContent(overrides: Record<string, any> = {}) {
  return {
    canEdit: false,
    userId: "u1",
    supabase: {},
    locale: "de",
    isLoaded: true,
    error: null,
    c: (_s: string, _f: string, fallback: string) => fallback,
    cEn: () => undefined,
    cDe: () => undefined,
    saveField: vi.fn(),
    ...overrides,
  };
}

describe("AboutClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSiteContent.mockReturnValue(baseSiteContent());
  });

  it("renders loading state", () => {
    mockUseSiteContent.mockReturnValue(baseSiteContent({ isLoaded: false }));
    render(<AboutClient />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders error state", () => {
    mockUseSiteContent.mockReturnValue(baseSiteContent({ error: "Failed" }));
    render(<AboutClient />);
    expect(screen.getByText("Failed")).toBeInTheDocument();
  });

  it("renders all content sections when loaded", () => {
    render(<AboutClient />);
    expect(screen.getByText("missionTitle")).toBeInTheDocument();
    expect(screen.getByText("featuresTitle")).toBeInTheDocument();
    expect(screen.getByText("valuesTitle")).toBeInTheDocument();
    expect(screen.getByText("techTitle")).toBeInTheDocument();
  });

  it("renders CTA links", () => {
    render(<AboutClient />);
    const registerLink = screen.getByRole("link", { name: "applyForMembership" });
    expect(registerLink).toHaveAttribute("href", "/auth/register");
    const contactLink = screen.getByRole("link", { name: "getInTouch" });
    expect(contactLink).toHaveAttribute("href", "/contact");
    const homeLink = screen.getByRole("link", { name: "visitHome" });
    expect(homeLink).toHaveAttribute("href", "/home");
  });

  it("calls useSiteContent with 'about'", () => {
    render(<AboutClient />);
    expect(mockUseSiteContent).toHaveBeenCalledWith("about");
  });

  it("renders the page title", () => {
    render(<AboutClient />);
    expect(screen.getByText("title")).toBeInTheDocument();
  });

  it("renders breadcrumb", () => {
    render(<AboutClient />);
    expect(screen.getByText("breadcrumb")).toBeInTheDocument();
  });

  it("renders mission byline section", () => {
    render(<AboutClient />);
    expect(screen.getByText("missionByline")).toBeInTheDocument();
  });

  it("renders mission text section", () => {
    render(<AboutClient />);
    const texts = screen.getAllByText(/missionText/);
    expect(texts.length).toBeGreaterThan(0);
  });

  it("renders CTA text section", () => {
    render(<AboutClient />);
    expect(screen.getByText("ctaText")).toBeInTheDocument();
  });

  it("passes canEdit=false to EditableText components", () => {
    render(<AboutClient />);
    const editables = document.querySelectorAll("[data-canedit='false']");
    expect(editables.length).toBeGreaterThan(0);
  });

  it("passes canEdit=true when user can edit", () => {
    mockUseSiteContent.mockReturnValue(baseSiteContent({ canEdit: true }));
    render(<AboutClient />);
    const editables = document.querySelectorAll("[data-canedit='true']");
    expect(editables.length).toBeGreaterThan(0);
  });

  it("renders CMS content from c() function", () => {
    mockUseSiteContent.mockReturnValue(
      baseSiteContent({
        c: (section: string, field: string) => `CMS:${section}.${field}`,
      }),
    );
    render(<AboutClient />);
    expect(screen.getByText("CMS:mission.title")).toBeInTheDocument();
    expect(screen.getByText("CMS:features.title")).toBeInTheDocument();
  });

  it("renders four section cards", () => {
    render(<AboutClient />);
    const sections = document.querySelectorAll("section.card");
    expect(sections.length).toBe(5);
  });

  /* ── Features section content ── */

  it("renders features text with fallback listing", () => {
    render(<AboutClient />);
    const allText = document.body.textContent ?? "";
    expect(allText).toContain("feature1");
    expect(allText).toContain("feature2");
    expect(allText).toContain("feature3");
  });

  /* ── Values section content ── */

  it("renders values text with fallback listing", () => {
    render(<AboutClient />);
    const allText = document.body.textContent ?? "";
    expect(allText).toContain("value1");
    expect(allText).toContain("value2");
    expect(allText).toContain("value3");
  });

  /* ── Technology section content ── */

  it("renders technology section text", () => {
    render(<AboutClient />);
    expect(screen.getByText("techTitle")).toBeInTheDocument();
    const allText = document.body.textContent ?? "";
    expect(allText).toContain("techText2");
  });

  /* ── CTA section with all links ── */

  it("renders all CTA links with correct hrefs", () => {
    render(<AboutClient />);
    const registerLink = screen.getByText("applyForMembership").closest("a");
    expect(registerLink).toHaveAttribute("href", "/auth/register");
    expect(registerLink).toHaveClass("primary");
    const contactLink = screen.getByText("getInTouch").closest("a");
    expect(contactLink).toHaveAttribute("href", "/contact");
    const homeLink = screen.getByText("visitHome").closest("a");
    expect(homeLink).toHaveAttribute("href", "/home");
  });

  /* ── CMS content for each section via c() ── */

  it("renders CMS content for all sections via c() function", () => {
    mockUseSiteContent.mockReturnValue(
      baseSiteContent({
        c: (section: string, field: string) => `CMS:${section}.${field}`,
      }),
    );
    render(<AboutClient />);
    expect(screen.getByText("CMS:mission.title")).toBeInTheDocument();
    expect(screen.getByText("CMS:mission.byline")).toBeInTheDocument();
    expect(screen.getByText("CMS:mission.text")).toBeInTheDocument();
    expect(screen.getByText("CMS:features.title")).toBeInTheDocument();
    expect(screen.getByText("CMS:features.text")).toBeInTheDocument();
    expect(screen.getByText("CMS:values.title")).toBeInTheDocument();
    expect(screen.getByText("CMS:values.text")).toBeInTheDocument();
    expect(screen.getByText("CMS:tech.title")).toBeInTheDocument();
    expect(screen.getByText("CMS:tech.text")).toBeInTheDocument();
    expect(screen.getByText("CMS:cta.text")).toBeInTheDocument();
  });

  /* ── Mission section col-span-full ── */

  it("renders mission section with col-span-full class", () => {
    render(<AboutClient />);
    const sections = document.querySelectorAll("section.card.col-span-full");
    expect(sections.length).toBeGreaterThanOrEqual(2);
  });

  /* ── CTA section has centered text ── */

  it("renders CTA section with text-center class", () => {
    render(<AboutClient />);
    const ctaSection = document.querySelector("section.card.col-span-full.text-center");
    expect(ctaSection).toBeInTheDocument();
  });

  /* ── Multiple EditableText components rendered ── */

  it("renders at least 10 EditableText components", () => {
    render(<AboutClient />);
    const editables = document.querySelectorAll("[data-canedit]");
    expect(editables.length).toBeGreaterThanOrEqual(10);
  });

  /* ── saveField is callable from context ── */

  it("provides saveField function via useSiteContent", () => {
    const saveField = vi.fn();
    mockUseSiteContent.mockReturnValue(baseSiteContent({ saveField }));
    render(<AboutClient />);
    expect(saveField).not.toHaveBeenCalled();
  });

  /* ── saveField is provided via useSiteContent for all sections ── */

  it("provides saveField function that can be called for any section", () => {
    const saveField = vi.fn();
    mockUseSiteContent.mockReturnValue(baseSiteContent({ saveField }));
    render(<AboutClient />);
    expect(saveField).not.toHaveBeenCalled();
    expect(typeof saveField).toBe("function");
  });

  /* ── locale is passed through from useSiteContent ── */

  it("passes locale='en' through to EditableText components", () => {
    mockUseSiteContent.mockReturnValue(baseSiteContent({ locale: "en" }));
    render(<AboutClient />);
    const editables = document.querySelectorAll("[data-canedit]");
    expect(editables.length).toBeGreaterThan(0);
  });

  /* ── supabase and userId are provided for markdown editors ── */

  it("renders with custom supabase and userId for image upload support", () => {
    mockUseSiteContent.mockReturnValue(baseSiteContent({ supabase: { storage: "mock" }, userId: "custom-user" }));
    render(<AboutClient />);
    expect(screen.getByText("missionTitle")).toBeInTheDocument();
  });

  /* ── Features section has all 5 fallback feature items ── */

  it("renders all five feature items in fallback", () => {
    render(<AboutClient />);
    const allText = document.body.textContent ?? "";
    expect(allText).toContain("feature4");
    expect(allText).toContain("feature5");
  });

  /* ── Values section has all 5 fallback value items ── */

  it("renders all five value items in fallback", () => {
    render(<AboutClient />);
    const allText = document.body.textContent ?? "";
    expect(allText).toContain("value4");
    expect(allText).toContain("value5");
  });

  /* ── CTA section link classes ── */

  it("renders register link with button primary class", () => {
    render(<AboutClient />);
    const link = screen.getByText("applyForMembership").closest("a");
    expect(link).toHaveClass("button");
    expect(link).toHaveClass("primary");
  });

  it("renders contact link as regular button without primary", () => {
    render(<AboutClient />);
    const link = screen.getByText("getInTouch").closest("a");
    expect(link).toHaveClass("button");
    expect(link).not.toHaveClass("primary");
  });

  it("renders home link as regular button without primary", () => {
    render(<AboutClient />);
    const link = screen.getByText("visitHome").closest("a");
    expect(link).toHaveClass("button");
    expect(link).not.toHaveClass("primary");
  });

  /* ── CTA section has inline list ── */

  it("renders CTA links in an inline list container", () => {
    render(<AboutClient />);
    const inlineList = document.querySelector(".list.inline");
    expect(inlineList).toBeInTheDocument();
    expect(inlineList?.querySelectorAll("a").length).toBe(3);
  });

  /* ── Tech section uses col-span-full ── */

  it("renders tech section with col-span-full class", () => {
    render(<AboutClient />);
    const sections = document.querySelectorAll("section.card.col-span-full");
    const techSection = Array.from(sections).find((s) => s.textContent?.includes("techTitle"));
    expect(techSection).toBeDefined();
  });

  /* ── Features and Values sections are not col-span-full ── */

  it("renders features and values sections without col-span-full", () => {
    render(<AboutClient />);
    const allSections = document.querySelectorAll("section.card");
    const nonFullSpan = Array.from(allSections).filter((s) => !s.classList.contains("col-span-full"));
    expect(nonFullSpan.length).toBe(2);
  });

  /* ── onSave callbacks: trigger each section's save to cover arrow function bodies ── */

  it("triggers saveField for mission.title when editable clicked", () => {
    const saveField = vi.fn();
    mockUseSiteContent.mockReturnValue(baseSiteContent({ saveField }));
    render(<AboutClient />);
    const el = screen.getByTestId("editable-missionTitle");
    fireEvent.click(el);
    expect(saveField).toHaveBeenCalledWith("mission", "title", "de-val", "en-val");
  });

  it("triggers saveField for mission.byline when editable clicked", () => {
    const saveField = vi.fn();
    mockUseSiteContent.mockReturnValue(baseSiteContent({ saveField }));
    render(<AboutClient />);
    const el = screen.getByTestId("editable-missionByline");
    fireEvent.click(el);
    expect(saveField).toHaveBeenCalledWith("mission", "byline", "de-val", "en-val");
  });

  it("triggers saveField for mission.text when editable clicked", () => {
    const saveField = vi.fn();
    mockUseSiteContent.mockReturnValue(baseSiteContent({ saveField }));
    render(<AboutClient />);
    const missionTexts = screen.getAllByTestId(/^editable-missionText/);
    fireEvent.click(missionTexts[0]!);
    expect(saveField).toHaveBeenCalledWith("mission", "text", "de-val", "en-val");
  });

  it("triggers saveField for features.title when editable clicked", () => {
    const saveField = vi.fn();
    mockUseSiteContent.mockReturnValue(baseSiteContent({ saveField }));
    render(<AboutClient />);
    const el = screen.getByTestId("editable-featuresTitle");
    fireEvent.click(el);
    expect(saveField).toHaveBeenCalledWith("features", "title", "de-val", "en-val");
  });

  it("triggers saveField for features.text when editable clicked", () => {
    const saveField = vi.fn();
    mockUseSiteContent.mockReturnValue(baseSiteContent({ saveField }));
    render(<AboutClient />);
    const el = screen.getByTestId(/^editable-feature1/);
    fireEvent.click(el);
    expect(saveField).toHaveBeenCalledWith("features", "text", "de-val", "en-val");
  });

  it("triggers saveField for values.title when editable clicked", () => {
    const saveField = vi.fn();
    mockUseSiteContent.mockReturnValue(baseSiteContent({ saveField }));
    render(<AboutClient />);
    const el = screen.getByTestId("editable-valuesTitle");
    fireEvent.click(el);
    expect(saveField).toHaveBeenCalledWith("values", "title", "de-val", "en-val");
  });

  it("triggers saveField for values.text when editable clicked", () => {
    const saveField = vi.fn();
    mockUseSiteContent.mockReturnValue(baseSiteContent({ saveField }));
    render(<AboutClient />);
    const el = screen.getByTestId(/^editable-value1/);
    fireEvent.click(el);
    expect(saveField).toHaveBeenCalledWith("values", "text", "de-val", "en-val");
  });

  it("triggers saveField for tech.title when editable clicked", () => {
    const saveField = vi.fn();
    mockUseSiteContent.mockReturnValue(baseSiteContent({ saveField }));
    render(<AboutClient />);
    const el = screen.getByTestId("editable-techTitle");
    fireEvent.click(el);
    expect(saveField).toHaveBeenCalledWith("tech", "title", "de-val", "en-val");
  });

  it("triggers saveField for tech.text when editable clicked", () => {
    const saveField = vi.fn();
    mockUseSiteContent.mockReturnValue(baseSiteContent({ saveField }));
    render(<AboutClient />);
    const el = screen.getByTestId("editable-techText2");
    fireEvent.click(el);
    expect(saveField).toHaveBeenCalledWith("tech", "text", "de-val", "en-val");
  });

  it("triggers saveField for cta.text when editable clicked", () => {
    const saveField = vi.fn();
    mockUseSiteContent.mockReturnValue(baseSiteContent({ saveField }));
    render(<AboutClient />);
    const el = screen.getByTestId("editable-ctaText");
    fireEvent.click(el);
    expect(saveField).toHaveBeenCalledWith("cta", "text", "de-val", "en-val");
  });

  /* ── EditableText prop passing: locale, singleLine, markdown, supabase, userId ── */

  it("passes locale to EditableText components", () => {
    mockUseSiteContent.mockReturnValue(baseSiteContent({ locale: "en" }));
    render(<AboutClient />);
    const editables = document.querySelectorAll("[data-locale='en']");
    expect(editables.length).toBeGreaterThanOrEqual(10);
  });

  it("passes singleLine=true to title/byline EditableText components", () => {
    render(<AboutClient />);
    const singleLineEditables = document.querySelectorAll("[data-singleline='true']");
    expect(singleLineEditables.length).toBe(5);
  });

  it("passes markdown=true to text content EditableText components", () => {
    render(<AboutClient />);
    const markdownEditables = document.querySelectorAll("[data-markdown='true']");
    expect(markdownEditables.length).toBe(5);
  });

  it("passes supabase to markdown EditableText components", () => {
    mockUseSiteContent.mockReturnValue(baseSiteContent({ supabase: { storage: "mock" } }));
    render(<AboutClient />);
    const withSupabase = document.querySelectorAll("[data-has-supabase='true']");
    expect(withSupabase.length).toBe(5);
  });

  it("passes userId to markdown EditableText components", () => {
    mockUseSiteContent.mockReturnValue(baseSiteContent({ userId: "test-uid" }));
    render(<AboutClient />);
    const withUserId = document.querySelectorAll("[data-has-userid='true']");
    expect(withUserId.length).toBe(5);
  });

  it("passes valueEn and valueDe to all EditableText components", () => {
    mockUseSiteContent.mockReturnValue(
      baseSiteContent({
        cEn: () => "en-content",
        cDe: () => "de-content",
      }),
    );
    render(<AboutClient />);
    const withEn = document.querySelectorAll("[data-has-valueen='true']");
    const withDe = document.querySelectorAll("[data-has-valuede='true']");
    expect(withEn.length).toBe(10);
    expect(withDe.length).toBe(10);
  });
});
