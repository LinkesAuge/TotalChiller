// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import LanguageSelector from "./language-selector";

vi.mock("next-intl", () => ({
  useTranslations: vi.fn(() => vi.fn((key: string) => key)),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("../../i18n/routing", () => ({
  routing: { locales: ["de", "en"], defaultLocale: "de" },
  LOCALE_COOKIE: "NEXT_LOCALE",
}));
vi.mock("../hooks/use-supabase", () => ({
  useSupabase: vi.fn(() => ({
    auth: {
      getUser: vi.fn(async () => ({ data: { user: null } })),
      updateUser: vi.fn(),
    },
  })),
}));

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(document, "cookie", {
    writable: true,
    value: "NEXT_LOCALE=de",
  });
});

describe("LanguageSelector", () => {
  it("renders DE and EN buttons in full mode", () => {
    render(<LanguageSelector />);
    expect(screen.getByText("DE")).toBeDefined();
    expect(screen.getByText("EN")).toBeDefined();
  });

  it("renders single button in compact mode", () => {
    render(<LanguageSelector compact />);
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBe(1);
  });

  it("shows current locale uppercase in compact mode", () => {
    render(<LanguageSelector compact />);
    expect(screen.getByText("DE")).toBeDefined();
  });

  it("has radiogroup role in full mode", () => {
    render(<LanguageSelector />);
    expect(screen.getByRole("radiogroup")).toBeDefined();
  });
});
