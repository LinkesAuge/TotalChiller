import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { standardLimiter } from "@/lib/rate-limit";
import { requireAuth } from "@/lib/api/require-auth";
import { apiError, uuidSchema } from "@/lib/api/validation";
import { captureApiError } from "@/lib/api/logger";

/**
 * GET /api/members/snapshots?clan_id=<uuid>
 *
 * Returns the latest member_snapshots row per game_account_id for a clan.
 * Used by the members page to display coordinates, score, and last-updated date.
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

    const { data: isMember } = await supabase.rpc("is_clan_member", { target_clan: clanId });
    const { data: isAdmin } = await supabase.rpc("is_any_admin");
    if (!isMember && !isAdmin) {
      return apiError("Access denied.", 403);
    }

    // Fetch all snapshots for this clan, ordered by date descending.
    // We deduplicate in application code to get the latest per game_account_id.
    const { data: rows, error } = await supabase
      .from("member_snapshots")
      .select("game_account_id, player_name, coordinates, score, snapshot_date")
      .eq("clan_id", clanId)
      .not("game_account_id", "is", null)
      .order("snapshot_date", { ascending: false })
      .limit(5000);

    if (error) {
      captureApiError("GET /api/members/snapshots", error);
      return apiError("Failed to load snapshots.", 500);
    }

    const seen = new Set<string>();
    const latest: Array<{
      game_account_id: string;
      player_name: string;
      coordinates: string | null;
      score: number | null;
      snapshot_date: string;
    }> = [];

    for (const row of rows ?? []) {
      const gaId = row.game_account_id as string;
      if (seen.has(gaId)) continue;
      seen.add(gaId);
      latest.push({
        game_account_id: gaId,
        player_name: row.player_name as string,
        coordinates: (row.coordinates as string | null) ?? null,
        score: (row.score as number | null) ?? null,
        snapshot_date: row.snapshot_date as string,
      });
    }

    return NextResponse.json({ data: latest });
  } catch (err) {
    captureApiError("GET /api/members/snapshots", err);
    return apiError("Internal server error.", 500);
  }
}
