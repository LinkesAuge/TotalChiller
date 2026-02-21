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

function getLastWeekBounds(): { start: string; end: string } {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  const thisMonday = new Date(now);
  thisMonday.setUTCDate(now.getUTCDate() - diff);
  thisMonday.setUTCHours(0, 0, 0, 0);
  const lastMonday = new Date(thisMonday);
  lastMonday.setUTCDate(thisMonday.getUTCDate() - 7);
  return { start: lastMonday.toISOString(), end: thisMonday.toISOString() };
}

function getLast7Days(): string[] {
  const days: string[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(now.getUTCDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

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

    const weekStart = getWeekStart();
    const lastWeek = getLastWeekBounds();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);

    const [membersRes, powerRes, chestsRes, chestsLastWeekRes, eventsRes, chestsRecentRes, eventParticipationRes] =
      await Promise.all([
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
          .from("chest_entries")
          .select("id", { count: "exact", head: true })
          .eq("clan_id", clanId)
          .gte("opened_at", lastWeek.start)
          .lt("opened_at", lastWeek.end),
        supabase
          .from("event_results")
          .select("linked_event_id")
          .eq("clan_id", clanId)
          .not("linked_event_id", "is", null)
          .limit(10000),
        supabase
          .from("chest_entries")
          .select("opened_at, player_name, game_account_id")
          .eq("clan_id", clanId)
          .gte("opened_at", sevenDaysAgo.toISOString())
          .order("opened_at", { ascending: true })
          .limit(50000),
        supabase
          .from("event_results")
          .select("linked_event_id, game_account_id")
          .eq("clan_id", clanId)
          .not("linked_event_id", "is", null)
          .order("event_date", { ascending: false })
          .limit(10000),
      ]);

    for (const [label, res] of [
      ["members", membersRes],
      ["power", powerRes],
      ["chests", chestsRes],
      ["chestsLastWeek", chestsLastWeekRes],
      ["events", eventsRes],
      ["chestsRecent", chestsRecentRes],
      ["eventParticipation", eventParticipationRes],
    ] as const) {
      if (res.error) captureApiError(`GET /api/analytics/stats (${label})`, res.error);
    }

    const membersCount = membersRes.count ?? 0;
    const chestsThisWeek = chestsRes.count ?? 0;
    const chestsLastWeek = chestsLastWeekRes.count ?? 0;

    // Deduplicate snapshots: latest per game account
    const seen = new Set<string>();
    let totalPower = 0;
    for (const row of powerRes.data ?? []) {
      const gaId = row.game_account_id as string;
      if (seen.has(gaId)) continue;
      seen.add(gaId);
      totalPower += (row.score as number | null) ?? 0;
    }
    const playerCount = seen.size;
    const avgPower = playerCount > 0 ? Math.round(totalPower / playerCount) : 0;

    // Count distinct linked events
    const eventIds = new Set<string>();
    for (const row of eventsRes.data ?? []) {
      if (row.linked_event_id) eventIds.add(row.linked_event_id as string);
    }

    // Daily chest activity (last 7 days) + top collector this week — from single query
    const dailyMap = new Map<string, number>();
    for (const day of getLast7Days()) {
      dailyMap.set(day, 0);
    }
    const collectorCounts = new Map<string, { name: string; count: number }>();
    for (const row of chestsRecentRes.data ?? []) {
      const openedAt = row.opened_at as string;
      const day = openedAt.slice(0, 10);
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
      },
    });
  } catch (err) {
    captureApiError("GET /api/analytics/stats", err);
    return apiError("Internal server error.", 500);
  }
}
