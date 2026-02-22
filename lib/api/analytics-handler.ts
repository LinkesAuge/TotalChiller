import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { z } from "zod";
import { standardLimiter } from "@/lib/rate-limit";
import { requireAuth } from "@/lib/api/require-auth";
import { apiError } from "@/lib/api/validation";
import { captureApiError } from "@/lib/api/logger";

/**
 * Recommended maxDuration for all analytics routes.
 * Effective only on Vercel Pro (Hobby plan is capped at 10 s).
 */
export const ANALYTICS_MAX_DURATION = 30;

/* ── Route factory ── */

interface AnalyticsHandlerConfig<T extends z.ZodTypeAny> {
  schema: T;
  routeLabel: string;
  handler: (supabase: SupabaseClient, params: z.infer<T>) => Promise<NextResponse>;
}

/**
 * Factory for analytics GET handlers.
 * Wraps rate-limiting, auth, param parsing, and error handling.
 */
export function createAnalyticsHandler<T extends z.ZodTypeAny>(
  config: AnalyticsHandlerConfig<T>,
): (request: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest): Promise<NextResponse> => {
    const blocked = standardLimiter.check(request);
    if (blocked) return blocked;

    try {
      const auth = await requireAuth();
      if (auth.error) return auth.error;

      const rawParams = Object.fromEntries(request.nextUrl.searchParams.entries());
      const parsed = config.schema.safeParse(rawParams);
      if (!parsed.success) return apiError("Invalid query parameters.", 400);

      return await config.handler(auth.supabase, parsed.data as z.infer<T>);
    } catch (err) {
      captureApiError(config.routeLabel, err);
      return apiError("Internal server error.", 500);
    }
  };
}

/* ── RPC helper ── */

/**
 * Call a Supabase RPC that uses SECURITY DEFINER with an internal auth check.
 * The RPC returns `{ error: "access_denied" }` when the caller lacks access.
 */
export async function callClanRpc(
  supabase: SupabaseClient,
  rpcName: string,
  params: Record<string, unknown>,
  routeLabel: string,
): Promise<NextResponse> {
  const { data, error } = await supabase.rpc(rpcName, params);

  if (error) {
    captureApiError(routeLabel, error);
    return apiError("Failed to load data.", 500);
  }

  if (!data || (data as Record<string, unknown>).error === "access_denied") {
    return apiError("Access denied.", 403);
  }

  return NextResponse.json({ data });
}

/* ── Auth helper ── */

/**
 * Parallel clan-membership + admin check. Returns an error response when
 * the caller has no access, or `null` when access is granted.
 *
 * Use for routes that query tables directly instead of calling an RPC with
 * SECURITY DEFINER (which handles auth internally).
 */
export async function requireClanAccess(supabase: SupabaseClient, clanId: string): Promise<NextResponse | null> {
  const [{ data: isMember }, { data: isAdmin }] = await Promise.all([
    supabase.rpc("is_clan_member", { target_clan: clanId }),
    supabase.rpc("is_any_admin"),
  ]);

  if (!isMember && !isAdmin) return apiError("Access denied.", 403);
  return null;
}
