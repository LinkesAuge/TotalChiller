import { NextResponse } from "next/server";

/**
 * Simple in-memory sliding-window rate limiter.
 *
 * Usage:
 *   const limiter = createRateLimiter({ windowMs: 60_000, max: 20 });
 *   // In route handler:
 *   const blocked = limiter.check(request);
 *   if (blocked) return blocked;
 */

interface RateLimitOptions {
  /** Time window in milliseconds. */
  readonly windowMs: number;
  /** Maximum requests per window. */
  readonly max: number;
}

interface RateLimiter {
  /** Returns a 429 response if the limit is exceeded, or null if the request is allowed. */
  check(request: Request): NextResponse | null;
}

/** Garbage-collect expired entries every 60 s. */
let gcTimer: ReturnType<typeof setInterval> | null = null;
const allStores: { store: Map<string, number[]>; windowMs: number }[] = [];

function ensureGc(): void {
  if (gcTimer) return;
  gcTimer = setInterval(() => {
    const now = Date.now();
    for (const { store, windowMs } of allStores) {
      for (const [key, timestamps] of store) {
        const filtered = timestamps.filter((t) => now - t < windowMs);
        if (filtered.length === 0) {
          store.delete(key);
        } else {
          store.set(key, filtered);
        }
      }
    }
  }, 60_000);
  /* Allow the process to exit even if the timer is active. */
  if (typeof gcTimer === "object" && "unref" in gcTimer) {
    gcTimer.unref();
  }
}

function getClientIp(request: Request): string {
  const headers = request.headers;
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown";
}

export function createRateLimiter(options: RateLimitOptions): RateLimiter {
  const { windowMs, max } = options;
  /* Each limiter gets its own store so endpoints don't cross-contaminate. */
  const store = new Map<string, number[]>();
  allStores.push({ store, windowMs });
  ensureGc();
  return {
    check(request: Request): NextResponse | null {
      const ip = getClientIp(request);
      const now = Date.now();
      const timestamps = store.get(ip) ?? [];
      const recent = timestamps.filter((t) => now - t < windowMs);
      if (recent.length >= max) {
        return NextResponse.json(
          { error: "Too many requests. Please try again later." },
          {
            status: 429,
            headers: {
              "Retry-After": String(Math.ceil(windowMs / 1000)),
            },
          },
        );
      }
      recent.push(now);
      store.set(ip, recent);
      return null;
    },
  };
}

/* ── Pre-configured limiters for different sensitivity levels ── */

/** Strict: 10 requests per minute (admin, auth). */
export const strictLimiter = createRateLimiter({ windowMs: 60_000, max: 10 });

/** Standard: 30 requests per minute (messages, mutations). */
export const standardLimiter = createRateLimiter({ windowMs: 60_000, max: 30 });

/** Relaxed: 60 requests per minute (read-heavy endpoints). */
export const relaxedLimiter = createRateLimiter({ windowMs: 60_000, max: 60 });
