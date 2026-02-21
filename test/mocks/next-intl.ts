import { vi } from "vitest";

/**
 * Mock translation function — returns the key (optionally with interpolated values).
 * e.g. t("greeting") → "greeting", t("hello", { name: "X" }) → "hello"
 */
function createMockT() {
  return vi.fn((key: string) => key);
}

/**
 * Usage:
 * ```ts
 * vi.mock("next-intl", () => nextIntlMock());
 * ```
 */
export function nextIntlMock() {
  return {
    useTranslations: vi.fn(() => createMockT()),
    useLocale: vi.fn(() => "de"),
    useNow: vi.fn(() => new Date()),
    useTimeZone: vi.fn(() => "Europe/Berlin"),
    useFormatter: vi.fn(() => ({
      number: (n: number) => String(n),
      dateTime: (d: Date) => d.toISOString(),
      relativeTime: (d: Date) => d.toISOString(),
    })),
    NextIntlClientProvider: ({ children }: { children: React.ReactNode }) => children,
  };
}

/**
 * Usage for server-side:
 * ```ts
 * vi.mock("next-intl/server", () => nextIntlServerMock());
 * ```
 */
export function nextIntlServerMock() {
  return {
    getTranslations: vi.fn().mockResolvedValue(createMockT()),
    getLocale: vi.fn().mockResolvedValue("de"),
    getMessages: vi.fn().mockResolvedValue({}),
    getNow: vi.fn().mockResolvedValue(new Date()),
    getTimeZone: vi.fn().mockResolvedValue("Europe/Berlin"),
  };
}
