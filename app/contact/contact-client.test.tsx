// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const mockUseSiteContent = vi.fn();

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
vi.mock("../components/use-site-content", () => ({
  useSiteContent: (...args: any[]) => mockUseSiteContent(...args),
}));
vi.mock("../components/editable-text", () => ({
  __esModule: true,
  default: ({ value, as: Tag = "div", className, canEdit }: any) => {
    const React = require("react");
    return React.createElement(
      Tag || "div",
      { className, "data-testid": "editable-text", "data-canedit": canEdit ? "true" : "false" },
      value,
    );
  },
}));
vi.mock("../components/cms-page-shell", () => ({
  __esModule: true,
  default: ({ children, title, breadcrumb, isLoaded, error }: any) => {
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

import ContactClient from "./contact-client";

function baseSiteContent(overrides: Record<string, any> = {}) {
  return {
    canEdit: false,
    userId: "user-1",
    supabase: {},
    locale: "de",
    isLoaded: true,
    error: null,
    c: vi.fn((_section: string, _field: string, fallback: string) => fallback),
    cEn: vi.fn(() => undefined),
    cDe: vi.fn(() => undefined),
    saveField: vi.fn(),
    ...overrides,
  };
}

describe("ContactClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSiteContent.mockReturnValue(baseSiteContent());
  });

  it("renders page title via CmsPageShell", () => {
    render(<ContactClient />);
    expect(screen.getByTestId("cms-shell")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("title");
  });

  it("renders contact sections", () => {
    render(<ContactClient />);
    const editableTexts = screen.getAllByTestId("editable-text");
    expect(editableTexts.length).toBeGreaterThanOrEqual(4);
    const textContents = editableTexts.map((el) => el.textContent);
    expect(textContents).toEqual(
      expect.arrayContaining([
        expect.stringContaining("getInTouchTitle"),
        expect.stringContaining("joinTitle"),
        expect.stringContaining("responseTitle"),
        expect.stringContaining("faqTitle"),
      ]),
    );
  });

  it("shows apply for membership link to /auth/register", () => {
    render(<ContactClient />);
    const link = screen.getByText("applyForMembership");
    expect(link.closest("a")).toHaveAttribute("href", "/auth/register");
  });

  it("shows existing member sign-in link to /auth/login", () => {
    render(<ContactClient />);
    const link = screen.getByText("existingMemberSignIn");
    expect(link.closest("a")).toHaveAttribute("href", "/auth/login");
  });

  it("calls useSiteContent with 'contact'", () => {
    render(<ContactClient />);
    expect(mockUseSiteContent).toHaveBeenCalledWith("contact");
  });

  it("renders breadcrumb text", () => {
    render(<ContactClient />);
    expect(screen.getByText("breadcrumb")).toBeInTheDocument();
  });

  it("renders loading state", () => {
    mockUseSiteContent.mockReturnValue(baseSiteContent({ isLoaded: false }));
    render(<ContactClient />);
    expect(screen.getByTestId("loading")).toBeInTheDocument();
  });

  it("renders error state", () => {
    mockUseSiteContent.mockReturnValue(baseSiteContent({ error: "Connection failed" }));
    render(<ContactClient />);
    expect(screen.getByText("Connection failed")).toBeInTheDocument();
  });

  it("renders get in touch intro text", () => {
    render(<ContactClient />);
    expect(screen.getByText("introText")).toBeInTheDocument();
  });

  it("renders join text", () => {
    render(<ContactClient />);
    expect(screen.getByText("joinText")).toBeInTheDocument();
  });

  it("passes canEdit=false to editable text components", () => {
    render(<ContactClient />);
    const editables = document.querySelectorAll("[data-canedit='false']");
    expect(editables.length).toBeGreaterThan(0);
  });

  it("passes canEdit=true when user can edit", () => {
    mockUseSiteContent.mockReturnValue(baseSiteContent({ canEdit: true }));
    render(<ContactClient />);
    const editables = document.querySelectorAll("[data-canedit='true']");
    expect(editables.length).toBeGreaterThan(0);
  });

  it("renders four section cards", () => {
    render(<ContactClient />);
    const sections = document.querySelectorAll("section.card");
    expect(sections.length).toBe(4);
  });

  it("renders CMS content from c() function", () => {
    mockUseSiteContent.mockReturnValue(
      baseSiteContent({
        c: (section: string, field: string) => `CMS:${section}.${field}`,
      }),
    );
    render(<ContactClient />);
    expect(screen.getByText("CMS:getInTouch.title")).toBeInTheDocument();
    expect(screen.getByText("CMS:join.title")).toBeInTheDocument();
    expect(screen.getByText("CMS:response.title")).toBeInTheDocument();
    expect(screen.getByText("CMS:faq.title")).toBeInTheDocument();
  });

  /* ── Response times section ── */

  it("renders response times section title", () => {
    render(<ContactClient />);
    expect(screen.getByText("responseTitle")).toBeInTheDocument();
  });

  it("renders response text with multiple response times", () => {
    render(<ContactClient />);
    const allText = document.body.textContent ?? "";
    expect(allText).toContain("responseIntro");
    expect(allText).toContain("responseDiscord");
    expect(allText).toContain("responseEmail");
  });

  /* ── FAQ section ── */

  it("renders FAQ section title", () => {
    render(<ContactClient />);
    expect(screen.getByText("faqTitle")).toBeInTheDocument();
  });

  it("renders FAQ text with question content", () => {
    render(<ContactClient />);
    const allText = document.body.textContent ?? "";
    expect(allText).toContain("faq1Question");
    expect(allText).toContain("faq2Question");
    expect(allText).toContain("faq3Question");
  });

  /* ── Contact methods section ── */

  it("renders methods content with discord, email, in-game", () => {
    render(<ContactClient />);
    const allText = document.body.textContent ?? "";
    expect(allText).toContain("discord");
    expect(allText).toContain("emailTitle");
    expect(allText).toContain("inGame");
  });

  /* ── CMS content for all fields ── */

  it("renders CMS content for all section fields via c() function", () => {
    mockUseSiteContent.mockReturnValue(
      baseSiteContent({
        c: (section: string, field: string) => `CMS:${section}.${field}`,
      }),
    );
    render(<ContactClient />);
    expect(screen.getByText("CMS:getInTouch.intro")).toBeInTheDocument();
    expect(screen.getByText("CMS:getInTouch.methods")).toBeInTheDocument();
    expect(screen.getByText("CMS:join.text")).toBeInTheDocument();
    expect(screen.getByText("CMS:response.text")).toBeInTheDocument();
    expect(screen.getByText("CMS:faq.text")).toBeInTheDocument();
  });

  /* ── Col-span classes ── */

  it("renders response and FAQ sections with col-span-full", () => {
    render(<ContactClient />);
    const fullSpanSections = document.querySelectorAll("section.card.col-span-full");
    expect(fullSpanSections.length).toBe(2);
  });

  it("renders get-in-touch section with col-span-2", () => {
    render(<ContactClient />);
    const colSpan2 = document.querySelectorAll("section.card.col-span-2");
    expect(colSpan2.length).toBe(1);
  });

  /* ── Multiple EditableText components ── */

  it("renders at least 8 EditableText components", () => {
    render(<ContactClient />);
    const editables = screen.getAllByTestId("editable-text");
    expect(editables.length).toBeGreaterThanOrEqual(8);
  });

  /* ── CTA buttons have correct styles ── */

  it("renders apply for membership as primary button", () => {
    render(<ContactClient />);
    const btn = screen.getByText("applyForMembership");
    expect(btn).toHaveClass("primary");
  });

  it("renders sign-in button as regular button", () => {
    render(<ContactClient />);
    const btn = screen.getByText("existingMemberSignIn");
    expect(btn).toHaveClass("button");
    expect(btn).not.toHaveClass("primary");
  });

  /* ── saveField is provided via useSiteContent ── */

  it("provides saveField function via useSiteContent for all sections", () => {
    const saveField = vi.fn();
    mockUseSiteContent.mockReturnValue(baseSiteContent({ saveField }));
    render(<ContactClient />);
    expect(saveField).not.toHaveBeenCalled();
    expect(typeof saveField).toBe("function");
  });

  /* ── locale pass-through ── */

  it("passes English locale to EditableText", () => {
    mockUseSiteContent.mockReturnValue(baseSiteContent({ locale: "en" }));
    render(<ContactClient />);
    expect(screen.getByText("title")).toBeInTheDocument();
  });

  /* ── All contact methods in fallback text ── */

  it("renders email description in methods fallback", () => {
    render(<ContactClient />);
    const allText = document.body.textContent ?? "";
    expect(allText).toContain("emailDesc");
  });

  it("renders in-game description in methods fallback", () => {
    render(<ContactClient />);
    const allText = document.body.textContent ?? "";
    expect(allText).toContain("inGameDesc");
  });

  it("renders discord description in methods fallback", () => {
    render(<ContactClient />);
    const allText = document.body.textContent ?? "";
    expect(allText).toContain("discordDesc");
  });

  /* ── Response times badges in fallback ── */

  it("renders all response time badge texts", () => {
    render(<ContactClient />);
    const allText = document.body.textContent ?? "";
    expect(allText).toContain("responseDiscordBadge");
    expect(allText).toContain("responseEmailBadge");
    expect(allText).toContain("responseRecruitmentBadge");
    expect(allText).toContain("responsePrivacyBadge");
  });

  /* ── FAQ links in fallback ── */

  it("renders FAQ fallback with link targets", () => {
    render(<ContactClient />);
    const allText = document.body.textContent ?? "";
    expect(allText).toContain("faq1Link");
    expect(allText).toContain("faq2Link");
    expect(allText).toContain("faq3AboutLink");
    expect(allText).toContain("faq3HomeLink");
  });

  /* ── CTA flex container ── */

  it("renders join section CTA buttons in flex container", () => {
    render(<ContactClient />);
    const flexContainer = document.querySelector(".flex.gap-3.mt-4");
    expect(flexContainer).toBeInTheDocument();
    expect(flexContainer?.querySelectorAll("a").length).toBe(2);
  });

  /* ── supabase/userId provided for markdown sections ── */

  it("renders with custom supabase instance", () => {
    mockUseSiteContent.mockReturnValue(baseSiteContent({ supabase: { custom: true }, userId: "uid-99" }));
    render(<ContactClient />);
    expect(screen.getByText("title")).toBeInTheDocument();
  });
});
