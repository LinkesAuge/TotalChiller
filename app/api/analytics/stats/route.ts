import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { standardLimiter } from "@/lib/rate-limit";
import { requireAuth } from "@/lib/api/require-auth";
import { apiError, uuidSchema } from "@/lib/api/validation";
import { captureApiError } from "@/lib/api/logger";
import {
  berlinWeekStartISO,
  berlinLastWeekBounds,
  berlinLast7Days,
  berlinDaysAgoISO,
  toBerlinDate,
} from "@/lib/timezone";

/**
 * GET /api/analytics/stats?clan_id=<uuid>
 *
 * Extended dashboard stats: member count, total/avg power, chests this/last week,
 * top collector, power delta, events, daily chest activity, participation rate.
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

    const weekStart = berlinWeekStartISO();
    const lastWeek = berlinLastWeekBounds();
    const sevenDaysAgoISO = berlinDaysAgoISO(7);

    const [
      membersRes,
      powerRes,
      chestsRes,
      chestsLastWeekRes,
      eventsRes,
      chestsRecentRes,
      eventParticipationRes,
      chestsAllTimeRes,
      newestMemberRes,
      lastWeekPowerRes,
    ] = await Promise.all([
      supabase
        .from("game_account_clan_memberships")
        .select("id", { count: "exact", head: true })
        .eq("clan_id", clanId)
        .eq("is_active", true),
      supabase
        .from("member_snapshots")
        .select("game_account_id, score, player_name")
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
        .from("chest_entries")
        .select("id", { count: "exact", head: true })
        .eq("clan_id", clanId)
        .gte("opened_at", lastWeek.start)
        .lt("opened_at", lastWeek.end),
      supabase
        .from("event_results")
        .select("linked_event_id, game_account_id, player_name, event_points")
        .eq("clan_id", clanId)
        .not("linked_event_id", "is", null)
        .limit(10000),
      supabase
        .from("chest_entries")
        .select("opened_at, player_name, game_account_id")
        .eq("clan_id", clanId)
        .gte("opened_at", sevenDaysAgoISO)
        .order("opened_at", { ascending: true })
        .limit(50000),
      supabase
        .from("event_results")
        .select("linked_event_id, game_account_id")
        .eq("clan_id", clanId)
        .not("linked_event_id", "is", null)
        .order("event_date", { ascending: false })
        .limit(10000),
      supabase.from("chest_entries").select("id", { count: "exact", head: true }).eq("clan_id", clanId),
      supabase
        .from("game_account_clan_memberships")
        .select("created_at, game_accounts(game_username)")
        .eq("clan_id", clanId)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1),
      supabase
        .from("member_snapshots")
        .select("game_account_id, score")
        .eq("clan_id", clanId)
        .not("game_account_id", "is", null)
        .lt("snapshot_date", weekStart)
        .order("snapshot_date", { ascending: false })
        .limit(5000),
    ]);

    for (const [label, res] of [
      ["members", membersRes],
      ["power", powerRes],
      ["chests", chestsRes],
      ["chestsLastWeek", chestsLastWeekRes],
      ["events", eventsRes],
      ["chestsRecent", chestsRecentRes],
      ["eventParticipation", eventParticipationRes],
      ["chestsAllTime", chestsAllTimeRes],
      ["newestMember", newestMemberRes],
      ["lastWeekPower", lastWeekPowerRes],
    ] as const) {
      if (res.error) captureApiError(`GET /api/analytics/stats (${label})`, res.error);
    }

    const membersCount = membersRes.count ?? 0;
    const chestsThisWeek = chestsRes.count ?? 0;
    const chestsLastWeek = chestsLastWeekRes.count ?? 0;

    // Deduplicate snapshots: latest per game account + find strongest player
    const seen = new Set<string>();
    let totalPower = 0;
    let strongestPlayerName = "";
    let strongestPlayerScore = 0;
    for (const row of powerRes.data ?? []) {
      const gaId = row.game_account_id as string;
      if (seen.has(gaId)) continue;
      seen.add(gaId);
      const score = (row.score as number | null) ?? 0;
      totalPower += score;
      if (score > strongestPlayerScore) {
        strongestPlayerScore = score;
        strongestPlayerName = (row.player_name as string) ?? gaId;
      }
    }
    const playerCount = seen.size;
    const avgPower = playerCount > 0 ? Math.round(totalPower / playerCount) : 0;

    // Last week's total power for delta calculation
    const seenLastWeekPower = new Set<string>();
    let lastWeekTotalPower = 0;
    for (const row of lastWeekPowerRes.data ?? []) {
      const gaId = row.game_account_id as string;
      if (seenLastWeekPower.has(gaId)) continue;
      seenLastWeekPower.add(gaId);
      lastWeekTotalPower += (row.score as number | null) ?? 0;
    }
    const powerDeltaWeek = lastWeekTotalPower > 0 ? totalPower - lastWeekTotalPower : 0;

    // Count distinct linked events + find most active event participant
    const eventIds = new Set<string>();
    const eventPlayerCounts = new Map<string, { name: string; events: Set<string>; totalPoints: number }>();
    for (const row of eventsRes.data ?? []) {
      const eid = row.linked_event_id as string;
      if (eid) eventIds.add(eid);
      const gaId = (row.game_account_id as string | null) ?? (row.player_name as string);
      const existing = eventPlayerCounts.get(gaId);
      if (existing) {
        if (eid) existing.events.add(eid);
        existing.totalPoints += (row.event_points as number) ?? 0;
      } else {
        eventPlayerCounts.set(gaId, {
          name: row.player_name as string,
          events: eid ? new Set([eid]) : new Set(),
          totalPoints: (row.event_points as number) ?? 0,
        });
      }
    }
    let mostActivePlayerName = "";
    let mostActivePlayerEvents = 0;
    for (const entry of eventPlayerCounts.values()) {
      if (entry.events.size > mostActivePlayerEvents) {
        mostActivePlayerEvents = entry.events.size;
        mostActivePlayerName = entry.name;
      }
    }

    // Daily chest activity (last 7 days) + top collector this week — from single query
    const dailyMap = new Map<string, number>();
    for (const day of berlinLast7Days()) {
      dailyMap.set(day, 0);
    }
    const collectorCounts = new Map<string, { name: string; count: number }>();
    for (const row of chestsRecentRes.data ?? []) {
      const openedAt = row.opened_at as string;
      const day = toBerlinDate(openedAt);
      dailyMap.set(day, (dailyMap.get(day) ?? 0) + 1);

      if (openedAt >= weekStart) {
        const name = row.player_name as string;
        const key = (row.game_account_id as string | null) ?? name;
        const entry = collectorCounts.get(key);
        if (entry) {
          entry.count++;
        } else {
          collectorCounts.set(key, { name, count: 1 });
        }
      }
    }
    const chests_daily = [...dailyMap.entries()].map(([date, count]) => ({ date, count }));
    let topCollectorName = "";
    let topCollectorCount = 0;
    for (const entry of collectorCounts.values()) {
      if (entry.count > topCollectorCount) {
        topCollectorName = entry.name;
        topCollectorCount = entry.count;
      }
    }

    // Latest event participation rate
    let lastEventParticipationRate = 0;
    const participationRows = eventParticipationRes.data ?? [];
    if (participationRows.length > 0 && membersCount > 0) {
      const latestEventId = participationRows[0]?.linked_event_id as string;
      if (latestEventId) {
        const latestParticipants = new Set<string>();
        for (const row of participationRows) {
          if ((row.linked_event_id as string) === latestEventId && row.game_account_id) {
            latestParticipants.add(row.game_account_id as string);
          }
        }
        lastEventParticipationRate = Math.round((latestParticipants.size / membersCount) * 100);
      }
    }

    // Newest member
    const newestMemberRow = newestMemberRes.data?.[0];
    const newestMemberName = (newestMemberRow?.game_accounts as { game_username?: string } | null)?.game_username ?? "";
    const newestMemberDate = (newestMemberRow?.created_at as string) ?? "";

    // Total chests all time
    const totalChestsAllTime = chestsAllTimeRes.count ?? 0;

    // Avg chests per player this week
    const uniqueCollectorsThisWeek = collectorCounts.size;
    const avgChestsPerPlayer = uniqueCollectorsThisWeek > 0 ? Math.round(chestsThisWeek / uniqueCollectorsThisWeek) : 0;

    return NextResponse.json({
      data: {
        members_count: membersCount,
        total_power: totalPower,
        avg_power: avgPower,
        chests_this_week: chestsThisWeek,
        chests_last_week: chestsLastWeek,
        events_with_results: eventIds.size,
        top_collector_name: topCollectorName,
        top_collector_count: topCollectorCount,
        last_event_participation_rate: lastEventParticipationRate,
        chests_daily,
        strongest_player_name: strongestPlayerName,
        strongest_player_score: strongestPlayerScore,
        newest_member_name: newestMemberName,
        newest_member_date: newestMemberDate,
        total_chests_all_time: totalChestsAllTime,
        power_delta_week: powerDeltaWeek,
        avg_chests_per_player: avgChestsPerPlayer,
        most_active_player_name: mostActivePlayerName,
        most_active_player_events: mostActivePlayerEvents,
      },
    });
  } catch (err) {
    captureApiError("GET /api/analytics/stats", err);
    return apiError("Internal server error.", 500);
  }
}
