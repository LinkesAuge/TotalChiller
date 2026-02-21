// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next-intl", () => ({
  useTranslations: vi.fn(() => vi.fn((key: string) => key)),
}));

const mockUseSiteContent = vi.fn();
vi.mock("../components/use-site-content", () => ({
  useSiteContent: (...args: any[]) => mockUseSiteContent(...args),
}));
vi.mock("../components/editable-text", () => ({
  __esModule: true,
  default: ({ value, className }: any) => {
    const React = require("react");
    return React.createElement("span", { className }, typeof value === "string" ? value.slice(0, 100) : value);
  },
}));
vi.mock("../components/cms-page-shell", () => ({
  __esModule: true,
  default: ({ children, isLoaded, error, title }: any) => {
    const React = require("react");
    if (error) return React.createElement("div", null, error);
    if (!isLoaded) return React.createElement("div", null, "Loading...");
    return React.createElement("div", { "data-testid": "cms-shell" }, React.createElement("h1", null, title), children);
  },
}));

import PrivacyClient from "./privacy-client";

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

describe("PrivacyClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSiteContent.mockReturnValue(baseSiteContent());
  });

  it("renders loading state", () => {
    mockUseSiteContent.mockReturnValue(baseSiteContent({ isLoaded: false }));
    render(<PrivacyClient />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders error state", () => {
    mockUseSiteContent.mockReturnValue(baseSiteContent({ error: "Network error" }));
    render(<PrivacyClient />);
    expect(screen.getByText("Network error")).toBeInTheDocument();
  });

  it("renders privacy policy content when loaded", () => {
    render(<PrivacyClient />);
    expect(screen.getByTestId("cms-shell")).toBeInTheDocument();
    expect(screen.getByText("title")).toBeInTheDocument();
  });

  it("renders card title and byline editable texts", () => {
    render(<PrivacyClient />);
    expect(screen.getByText("cardTitle")).toBeInTheDocument();
    expect(screen.getByText("byline")).toBeInTheDocument();
  });

  it("calls useSiteContent with 'privacy'", () => {
    render(<PrivacyClient />);
    expect(mockUseSiteContent).toHaveBeenCalledWith("privacy");
  });
});
