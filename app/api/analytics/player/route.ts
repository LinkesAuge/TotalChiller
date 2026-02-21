import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { standardLimiter } from "@/lib/rate-limit";
import { requireAuth } from "@/lib/api/require-auth";
import { apiError, uuidSchema } from "@/lib/api/validation";
import { captureApiError } from "@/lib/api/logger";
import { toBerlinDate, berlinWeekKey } from "@/lib/timezone";

const querySchema = z.object({
  clan_id: uuidSchema,
  ga: uuidSchema.optional(),
  name: z.string().min(1).max(200),
});

/**
 * GET /api/analytics/player?clan_id=<uuid>&name=<string>&ga=<uuid>
 *
 * Aggregated stats for a single player across chests, events, and power.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const blocked = standardLimiter.check(request);
  if (blocked) return blocked;

  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { supabase } = auth;

    const rawParams = Object.fromEntries(request.nextUrl.searchParams.entries());
    const parsed = querySchema.safeParse(rawParams);
    if (!parsed.success) return apiError("Missing or invalid parameters.", 400);

    const { clan_id, ga, name } = parsed.data;

    const { data: isMember } = await supabase.rpc("is_clan_member", { target_clan: clan_id });
    const { data: isAdmin } = await supabase.rpc("is_any_admin");
    if (!isMember && !isAdmin) return apiError("Access denied.", 403);

    const playerFilter = ga
      ? { column: "game_account_id" as const, value: ga }
      : { column: "player_name" as const, value: name };

    const [chestsRes, eventsRes, powerRes, chestsCountRes, eventsCountRes] = await Promise.all([
      supabase
        .from("chest_entries")
        .select("chest_name, opened_at, source")
        .eq("clan_id", clan_id)
        .eq(playerFilter.column, playerFilter.value)
        .order("opened_at", { ascending: false })
        .limit(5000),
      supabase
        .from("event_results")
        .select("event_name, event_points, event_date, linked_event_id")
        .eq("clan_id", clan_id)
        .eq(playerFilter.column, playerFilter.value)
        .order("event_date", { ascending: false })
        .limit(5000),
      supabase
        .from("member_snapshots")
        .select("score, snapshot_date")
        .eq("clan_id", clan_id)
        .eq(playerFilter.column, playerFilter.value)
        .order("snapshot_date", { ascending: false })
        .limit(1000),
      supabase
        .from("chest_entries")
        .select("id", { count: "exact", head: true })
        .eq("clan_id", clan_id)
        .eq(playerFilter.column, playerFilter.value),
      supabase
        .from("event_results")
        .select("id", { count: "exact", head: true })
        .eq("clan_id", clan_id)
        .eq(playerFilter.column, playerFilter.value),
    ]);

    for (const [label, res] of [
      ["chests", chestsRes],
      ["events", eventsRes],
      ["power", powerRes],
      ["chestsCount", chestsCountRes],
      ["eventsCount", eventsCountRes],
    ] as const) {
      if (res.error) captureApiError(`GET /api/analytics/player (${label})`, res.error);
    }

    // --- Chests ---
    const chestRows = (chestsRes.data ?? []) as Array<{
      chest_name: string;
      opened_at: string;
      source: string;
    }>;
    const totalChests = chestsCountRes.count ?? chestRows.length;
    const fetchedChestCount = chestRows.length;
    const chestTypeCounts = new Map<string, number>();
    const chestSourceCounts = new Map<string, number>();
    const chestDailyMap = new Map<string, number>();
    const chestWeeklyMap = new Map<string, number>();
    let firstChestDate: string | null = null;
    let lastChestDate: string | null = null;

    for (const row of chestRows) {
      chestTypeCounts.set(row.chest_name, (chestTypeCounts.get(row.chest_name) ?? 0) + 1);
      if (row.source) {
        chestSourceCounts.set(row.source, (chestSourceCounts.get(row.source) ?? 0) + 1);
      }
      const day = toBerlinDate(row.opened_at);
      chestDailyMap.set(day, (chestDailyMap.get(day) ?? 0) + 1);

      const weekKey = berlinWeekKey(row.opened_at);
      chestWeeklyMap.set(weekKey, (chestWeeklyMap.get(weekKey) ?? 0) + 1);

      if (!lastChestDate || day > lastChestDate) lastChestDate = day;
      if (!firstChestDate || day < firstChestDate) firstChestDate = day;
    }

    const chestTypeDistribution = [...chestTypeCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([n, count]) => ({ name: n, count }));
    const chestSourceDistribution = [...chestSourceCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([n, count]) => ({ name: n, count }));
    const chestTrend = [...chestDailyMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));
    const chestWeeklyTrend = [...chestWeeklyMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, count]) => ({ week, count }));

    const activeDays = chestDailyMap.size;
    const avgChestsPerDay = activeDays > 0 ? Math.round((fetchedChestCount / activeDays) * 10) / 10 : 0;
    const activeWeeks = chestWeeklyMap.size;
    const avgChestsPerWeek = activeWeeks > 0 ? Math.round((fetchedChestCount / activeWeeks) * 10) / 10 : 0;
    const bestDay = chestDailyMap.size > 0 ? [...chestDailyMap.entries()].sort((a, b) => b[1] - a[1])[0]! : null;

    // --- Events ---
    const eventRows = (eventsRes.data ?? []) as Array<{
      event_name: string | null;
      event_points: number;
      event_date: string;
      linked_event_id: string | null;
    }>;
    const totalEvents = eventsCountRes.count ?? eventRows.length;
    const fetchedEventCount = eventRows.length;
    const totalEventPoints = eventRows.reduce((s, r) => s + r.event_points, 0);
    const avgEventPoints = fetchedEventCount > 0 ? Math.round(totalEventPoints / fetchedEventCount) : 0;
    let bestEventScore = 0;
    let bestEventName = "";
    let worstEventScore = Infinity;
    let worstEventName = "";
    const sortedEventPoints: number[] = [];

    const eventHistory = eventRows
      .map((r) => {
        sortedEventPoints.push(r.event_points);
        if (r.event_points > bestEventScore) {
          bestEventScore = r.event_points;
          bestEventName = r.event_name ?? "Event";
        }
        if (r.event_points < worstEventScore) {
          worstEventScore = r.event_points;
          worstEventName = r.event_name ?? "Event";
        }
        return {
          event_name: r.event_name ?? "Event",
          event_points: r.event_points,
          date: toBerlinDate(r.event_date),
        };
      })
      .reverse();

    sortedEventPoints.sort((a, b) => a - b);
    let medianEventPoints = 0;
    if (sortedEventPoints.length > 0) {
      const mid = Math.floor(sortedEventPoints.length / 2);
      medianEventPoints =
        sortedEventPoints.length % 2 === 1
          ? sortedEventPoints[mid]!
          : Math.round((sortedEventPoints[mid - 1]! + sortedEventPoints[mid]!) / 2);
    }
    if (totalEvents === 0) {
      worstEventScore = 0;
      worstEventName = "";
    }

    const eventPointsStdDev =
      fetchedEventCount > 1
        ? Math.round(
            Math.sqrt(
              eventRows.reduce((s, r) => s + (r.event_points - avgEventPoints) ** 2, 0) / (fetchedEventCount - 1),
            ),
          )
        : 0;

    // --- Power ---
    const powerRows = (powerRes.data ?? []) as Array<{
      score: number | null;
      snapshot_date: string;
    }>;
    const currentScore = powerRows[0]?.score ?? 0;
    const previousScore = powerRows[1]?.score ?? null;
    const powerDelta = previousScore !== null ? currentScore - previousScore : null;
    const powerHistory = powerRows
      .map((r) => ({
        date: toBerlinDate(r.snapshot_date),
        score: r.score ?? 0,
      }))
      .reverse();

    const powerScores = powerRows.map((r) => r.score ?? 0).filter((s) => s > 0);
    const maxPower = powerScores.length > 0 ? Math.max(...powerScores) : currentScore;
    const minPower = powerScores.length > 0 ? Math.min(...powerScores) : currentScore;

    let growthRate: number | null = null;
    if (powerHistory.length >= 2) {
      const first = powerHistory[0]!.score;
      const last = powerHistory[powerHistory.length - 1]!.score;
      if (first > 0) {
        growthRate = Math.round(((last - first) / first) * 1000) / 10;
      }
    }

    // Clan rank — deduplicate to latest snapshot per player for accurate ranking
    let clanRank: number | null = null;
    let clanSize: number | null = null;
    if (currentScore > 0) {
      const { data: allSnapshots } = await supabase
        .from("member_snapshots")
        .select("game_account_id, score")
        .eq("clan_id", clan_id)
        .not("game_account_id", "is", null)
        .order("snapshot_date", { ascending: false })
        .limit(10000);

      const latestByPlayer = new Map<string, number>();
      for (const row of allSnapshots ?? []) {
        const gaId = row.game_account_id as string;
        if (!latestByPlayer.has(gaId)) {
          latestByPlayer.set(gaId, (row.score as number | null) ?? 0);
        }
      }

      let higherCount = 0;
      let activeCount = 0;
      for (const score of latestByPlayer.values()) {
        if (score > 0) activeCount++;
        if (score > currentScore) higherCount++;
      }
      clanRank = higherCount + 1;
      clanSize = activeCount;
    }

    return NextResponse.json({
      data: {
        player_name: name,
        chests: {
          total: totalChests,
          type_distribution: chestTypeDistribution,
          source_distribution: chestSourceDistribution,
          trend: chestTrend,
          weekly_trend: chestWeeklyTrend,
          active_days: activeDays,
          avg_per_day: avgChestsPerDay,
          avg_per_week: avgChestsPerWeek,
          best_day: bestDay ? { date: bestDay[0], count: bestDay[1] } : null,
          first_date: firstChestDate,
          last_date: lastChestDate,
        },
        events: {
          total: totalEvents,
          total_points: totalEventPoints,
          avg_points: avgEventPoints,
          median_points: medianEventPoints,
          std_dev: eventPointsStdDev,
          best_score: bestEventScore,
          best_event_name: bestEventName,
          worst_score: worstEventScore,
          worst_event_name: worstEventName,
          history: eventHistory,
        },
        power: {
          current_score: currentScore,
          previous_score: previousScore,
          delta: powerDelta,
          clan_rank: clanRank,
          clan_size: clanSize,
          max_score: maxPower,
          min_score: minPower,
          growth_rate: growthRate,
          history: powerHistory,
        },
      },
    });
  } catch (err) {
    captureApiError("GET /api/analytics/player", err);
    return apiError("Internal server error.", 500);
  }
}
