import { describe, it, expect, beforeEach, vi } from "vitest";
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
});
