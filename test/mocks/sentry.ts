import { vi } from "vitest";

/**
 * Usage:
 * ```ts
 * vi.mock("@sentry/nextjs", () => sentryMock());
 * ```
 */
export function sentryMock() {
  return {
    captureException: vi.fn(),
    captureMessage: vi.fn(),
    withScope: vi.fn((cb: (scope: unknown) => void) => cb({ setTag: vi.fn(), setExtra: vi.fn() })),
    setTag: vi.fn(),
    setExtra: vi.fn(),
    setUser: vi.fn(),
    init: vi.fn(),
  };
}
