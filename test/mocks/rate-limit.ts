import { vi } from "vitest";

/**
 * Mocks rate-limit module so all limiters allow requests through.
 *
 * Usage:
 * ```ts
 * vi.mock("@/lib/rate-limit", () => rateLimitMock());
 * ```
 */
export function rateLimitMock() {
  const noopLimiter = { check: vi.fn().mockReturnValue(null) };
  return {
    createRateLimiter: vi.fn(() => noopLimiter),
    strictLimiter: noopLimiter,
    standardLimiter: noopLimiter,
    relaxedLimiter: noopLimiter,
  };
}
