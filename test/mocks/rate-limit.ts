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
  return {
    createRateLimiter: vi.fn(() => ({ check: vi.fn().mockReturnValue(null) })),
    strictLimiter: { check: vi.fn().mockReturnValue(null) },
    standardLimiter: { check: vi.fn().mockReturnValue(null) },
    relaxedLimiter: { check: vi.fn().mockReturnValue(null) },
  };
}
