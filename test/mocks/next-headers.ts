import { vi } from "vitest";

const mockCookieStore = new Map<string, { name: string; value: string }>();

export const cookiesMock = {
  get: vi.fn((name: string) => mockCookieStore.get(name)),
  set: vi.fn((nameOrOptions: string | { name: string; value: string }, value?: string) => {
    if (typeof nameOrOptions === "string") {
      mockCookieStore.set(nameOrOptions, { name: nameOrOptions, value: value ?? "" });
    } else {
      mockCookieStore.set(nameOrOptions.name, nameOrOptions);
    }
  }),
  getAll: vi.fn(() => Array.from(mockCookieStore.values())),
  has: vi.fn((name: string) => mockCookieStore.has(name)),
  delete: vi.fn((name: string) => mockCookieStore.delete(name)),
};

const mockHeadersStore = new Map<string, string>();

export const headersMock = {
  get: vi.fn((name: string) => mockHeadersStore.get(name) ?? null),
  has: vi.fn((name: string) => mockHeadersStore.has(name)),
  entries: vi.fn(() => mockHeadersStore.entries()),
  forEach: vi.fn((cb: (value: string, key: string) => void) => mockHeadersStore.forEach(cb)),
};

export function setCookie(name: string, value: string): void {
  mockCookieStore.set(name, { name, value });
}

export function setHeader(name: string, value: string): void {
  mockHeadersStore.set(name, value);
}

export function clearCookies(): void {
  mockCookieStore.clear();
}

export function clearHeaders(): void {
  mockHeadersStore.clear();
}

/**
 * Call this in vi.mock("next/headers") to get working cookies/headers mocks.
 *
 * Usage:
 * ```ts
 * vi.mock("next/headers", () => nextHeadersMock());
 * ```
 */
export function nextHeadersMock() {
  return {
    cookies: vi.fn().mockResolvedValue(cookiesMock),
    headers: vi.fn().mockResolvedValue(headersMock),
  };
}
