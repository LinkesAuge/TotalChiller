import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { standardLimiter } from "@/lib/rate-limit";
import { requireAuth } from "@/lib/api/require-auth";
import { apiError, uuidSchema } from "@/lib/api/validation";
import { captureApiError } from "@/lib/api/logger";

export const maxDuration = 30;

/**
 * GET /api/members/snapshots?clan_id=<uuid>
 *
 * Returns the latest member_snapshots row per game_account_id for a clan.
 * Uses a SECURITY DEFINER RPC with DISTINCT ON for efficiency.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const blocked = standardLimiter.check(request);
  if (blocked) return blocked;

  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { supabase } = auth;

    const clanId = request.nextUrl.searchParams.get("clan_id");
    if (!clanId || !uuidSchema.safeParse(clanId).success) {
      return apiError("Missing or invalid clan_id.", 400);
    }

    const { data, error } = await supabase.rpc("get_clan_latest_snapshots", {
      p_clan_id: clanId,
    });

    if (error) {
      captureApiError("GET /api/members/snapshots", error);
      return apiError("Failed to load snapshots.", 500);
    }

    if (!data || (data as Record<string, unknown>).error === "access_denied") {
      return apiError("Access denied.", 403);
    }

    return NextResponse.json({ data });
  } catch (err) {
    captureApiError("GET /api/members/snapshots", err);
    return apiError("Internal server error.", 500);
  }
}
