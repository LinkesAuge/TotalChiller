import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { standardLimiter } from "@/lib/rate-limit";
import { requireAuth } from "@/lib/api/require-auth";
import { apiError, uuidSchema } from "@/lib/api/validation";
import { captureApiError } from "@/lib/api/logger";

function getWeekStart(): string {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - diff);
  monday.setUTCHours(0, 0, 0, 0);
  return monday.toISOString();
}

/**
 * GET /api/analytics/stats?clan_id=<uuid>
 *
 * Dashboard quick stats: member count, total power, chests this week, events with results.
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
    if (!isMember && !isAdmin) return apiError("Access denied.", 403);

    const weekStart = getWeekStart();

    const [membersRes, powerRes, chestsRes, eventsRes] = await Promise.all([
      supabase
        .from("game_account_clan_memberships")
        .select("id", { count: "exact", head: true })
        .eq("clan_id", clanId)
        .eq("is_active", true),
      supabase
        .from("member_snapshots")
        .select("game_account_id, score")
        .eq("clan_id", clanId)
        .not("game_account_id", "is", null)
        .order("snapshot_date", { ascending: false })
        .limit(5000),
      supabase
        .from("chest_entries")
        .select("id", { count: "exact", head: true })
        .eq("clan_id", clanId)
        .gte("opened_at", weekStart),
      supabase
        .from("event_results")
        .select("linked_event_id")
        .eq("clan_id", clanId)
        .not("linked_event_id", "is", null)
        .limit(10000),
    ]);

    // Log any query errors (non-fatal -- fall back to 0)
    for (const [label, res] of [
      ["members", membersRes],
      ["power", powerRes],
      ["chests", chestsRes],
      ["events", eventsRes],
    ] as const) {
      if (res.error) captureApiError(`GET /api/analytics/stats (${label})`, res.error);
    }

    const membersCount = membersRes.count ?? 0;
    const chestsThisWeek = chestsRes.count ?? 0;

    // Deduplicate snapshots: latest per game account
    const seen = new Set<string>();
    let totalPower = 0;
    for (const row of powerRes.data ?? []) {
      const gaId = row.game_account_id as string;
      if (seen.has(gaId)) continue;
      seen.add(gaId);
      totalPower += (row.score as number | null) ?? 0;
    }

    // Count distinct linked events
    const eventIds = new Set<string>();
    for (const row of eventsRes.data ?? []) {
      if (row.linked_event_id) eventIds.add(row.linked_event_id as string);
    }

    return NextResponse.json({
      data: {
        members_count: membersCount,
        total_power: totalPower,
        chests_this_week: chestsThisWeek,
        events_with_results: eventIds.size,
      },
    });
  } catch (err) {
    captureApiError("GET /api/analytics/stats", err);
    return apiError("Internal server error.", 500);
  }
}
