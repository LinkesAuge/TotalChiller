import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createRateLimiter } from "./rate-limit";

/** Build a minimal Request with the given IP in x-forwarded-for. */
function makeRequest(ip: string = "192.168.1.1"): Request {
  return new Request("http://localhost/api/test", {
    headers: { "x-forwarded-for": ip },
  });
}

describe("createRateLimiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /* ── Basic behaviour ── */

  it("allows requests under the limit", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 3 });
    const request = makeRequest();
    expect(limiter.check(request)).toBeNull();
    expect(limiter.check(request)).toBeNull();
    expect(limiter.check(request)).toBeNull();
  });

  it("blocks requests exceeding the limit", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 2 });
    const request = makeRequest();
    limiter.check(request);
    limiter.check(request);
    const blocked = limiter.check(request);
    expect(blocked).not.toBeNull();
    expect(blocked?.status).toBe(429);
  });

  it("tracks different IPs independently", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 1 });
    expect(limiter.check(makeRequest("10.0.0.1"))).toBeNull();
    expect(limiter.check(makeRequest("10.0.0.2"))).toBeNull();
    // First IP is now blocked
    const blockedResponse = limiter.check(makeRequest("10.0.0.1"));
    expect(blockedResponse?.status).toBe(429);
  });

  it("includes Retry-After header in 429 response", async () => {
    const limiter = createRateLimiter({ windowMs: 30_000, max: 1 });
    const request = makeRequest("10.0.0.99");
    limiter.check(request);
    const blocked = limiter.check(request);
    expect(blocked?.headers.get("Retry-After")).toBe("30");
  });

  it("returns a JSON body with error message on 429", async () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 1 });
    const request = makeRequest("10.0.0.50");
    limiter.check(request);
    const blocked = limiter.check(request);
    const body = (await blocked?.json()) as { error: string };
    expect(body.error).toContain("Too many requests");
  });

  /* ── Isolated stores (critical — root cause of "Too many requests" bug) ── */

  it("different limiter instances do NOT share state", () => {
    const limiterA = createRateLimiter({ windowMs: 60_000, max: 2 });
    const limiterB = createRateLimiter({ windowMs: 60_000, max: 2 });
    const ip = "10.0.0.100";

    // Exhaust limiter A for this IP
    limiterA.check(makeRequest(ip));
    limiterA.check(makeRequest(ip));
    expect(limiterA.check(makeRequest(ip))?.status).toBe(429);

    // Limiter B should still allow the same IP — separate store
    expect(limiterB.check(makeRequest(ip))).toBeNull();
    expect(limiterB.check(makeRequest(ip))).toBeNull();
    // Only now should limiter B block
    expect(limiterB.check(makeRequest(ip))?.status).toBe(429);
  });

  it("exhausting one limiter does not affect another for the same IP", () => {
    const strict = createRateLimiter({ windowMs: 60_000, max: 1 });
    const relaxed = createRateLimiter({ windowMs: 60_000, max: 100 });
    const ip = "10.0.0.200";

    // Exhaust strict limiter
    strict.check(makeRequest(ip));
    expect(strict.check(makeRequest(ip))?.status).toBe(429);

    // Relaxed limiter should be unaffected
    expect(relaxed.check(makeRequest(ip))).toBeNull();
  });

  /* ── Window expiry ── */

  it("allows requests again after the window expires", () => {
    const limiter = createRateLimiter({ windowMs: 10_000, max: 1 });
    const ip = "10.0.0.150";

    limiter.check(makeRequest(ip));
    expect(limiter.check(makeRequest(ip))?.status).toBe(429);

    // Advance time past the window
    vi.advanceTimersByTime(10_001);

    // Should be allowed again
    expect(limiter.check(makeRequest(ip))).toBeNull();
  });

  it("partially expired timestamps are cleaned during check", () => {
    const limiter = createRateLimiter({ windowMs: 5_000, max: 2 });
    const ip = "10.0.0.175";

    // Use both slots
    limiter.check(makeRequest(ip));
    limiter.check(makeRequest(ip));
    expect(limiter.check(makeRequest(ip))?.status).toBe(429);

    // Advance past the window so old entries expire
    vi.advanceTimersByTime(5_001);

    // Both old entries should be expired; two new requests should succeed
    expect(limiter.check(makeRequest(ip))).toBeNull();
    expect(limiter.check(makeRequest(ip))).toBeNull();
    expect(limiter.check(makeRequest(ip))?.status).toBe(429);
  });

  /* ── IP extraction edge cases ── */

  it("uses x-real-ip when x-forwarded-for is absent", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 1 });
    const req = new Request("http://localhost/api/test", {
      headers: { "x-real-ip": "172.16.0.1" },
    });
    expect(limiter.check(req)).toBeNull();
    expect(limiter.check(req)?.status).toBe(429);

    // Different x-real-ip should be independent
    const req2 = new Request("http://localhost/api/test", {
      headers: { "x-real-ip": "172.16.0.2" },
    });
    expect(limiter.check(req2)).toBeNull();
  });

  it("falls back to 'unknown' when no IP headers present", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 1 });
    const req = new Request("http://localhost/api/test");
    expect(limiter.check(req)).toBeNull();
    expect(limiter.check(req)?.status).toBe(429);
  });

  it("uses first IP from x-forwarded-for when multiple are present", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 1 });
    const req = new Request("http://localhost/api/test", {
      headers: { "x-forwarded-for": "203.0.113.1, 70.41.3.18, 150.172.238.178" },
    });
    expect(limiter.check(req)).toBeNull();
    // Same first IP should be blocked
    expect(limiter.check(req)?.status).toBe(429);

    // Request with a different first IP in the chain should be independent
    const req2 = new Request("http://localhost/api/test", {
      headers: { "x-forwarded-for": "198.51.100.1, 70.41.3.18" },
    });
    expect(limiter.check(req2)).toBeNull();
  });
});
