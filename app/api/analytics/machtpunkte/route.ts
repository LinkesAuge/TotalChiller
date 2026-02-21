import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { standardLimiter } from "@/lib/rate-limit";
import { requireAuth } from "@/lib/api/require-auth";
import { apiError, uuidSchema, escapeLikePattern } from "@/lib/api/validation";
import { captureApiError } from "@/lib/api/logger";
import { berlinCompareDate, toBerlinDate } from "@/lib/timezone";

const MAX_PAGE_SIZE = 10000;

const querySchema = z.object({
  clan_id: uuidSchema,
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  player: z.string().max(200).optional(),
  compare: z.enum(["week", "month", "all_time", "custom"]).default("week"),
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(25),
});

/**
 * GET /api/analytics/machtpunkte
 *
 * Power score standings with delta, history for charts, and clan total.
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
    if (!parsed.success) return apiError("Invalid query parameters.", 400);

    const { clan_id, player, compare, page, page_size } = parsed.data;

    const { data: isMember } = await supabase.rpc("is_clan_member", { target_clan: clan_id });
    const { data: isAdmin } = await supabase.rpc("is_any_admin");
    if (!isMember && !isAdmin) return apiError("Access denied.", 403);

    // Fetch snapshots for this clan (ordered by date desc)
    let query = supabase
      .from("member_snapshots")
      .select("game_account_id, player_name, score, snapshot_date")
      .eq("clan_id", clan_id)
      .not("game_account_id", "is", null)
      .order("snapshot_date", { ascending: false })
      .limit(10000);

    if (player) {
      query = query.ilike("player_name", `%${escapeLikePattern(player)}%`);
    }

    // When filtering by player, run a separate unfiltered query for clan total
    const clanTotalPromise = player
      ? supabase
          .from("member_snapshots")
          .select("game_account_id, score")
          .eq("clan_id", clan_id)
          .not("game_account_id", "is", null)
          .order("snapshot_date", { ascending: false })
          .limit(5000)
      : null;

    const [{ data: rows, error }, clanTotalRes] = await Promise.all([query, clanTotalPromise ?? Promise.resolve(null)]);
    if (error) {
      captureApiError("GET /api/analytics/machtpunkte", error);
      return apiError("Failed to load power data.", 500);
    }

    const entries = (rows ?? []) as Array<{
      game_account_id: string;
      player_name: string;
      score: number | null;
      snapshot_date: string;
    }>;

    // Determine compare cutoff date
    const compareCutoff =
      compare === "custom" && parsed.data.from
        ? `${parsed.data.from}T00:00:00.000Z`
        : compare === "all_time"
          ? null
          : berlinCompareDate(compare as "week" | "month");

    // Build standings: latest and previous score per game account
    const accountData = new Map<
      string,
      {
        player_name: string;
        latest_score: number;
        latest_date: string;
        previous_score: number | null;
        snapshots: Array<{ date: string; score: number }>;
      }
    >();

    for (const row of entries) {
      const gaId = row.game_account_id;
      const score = row.score ?? 0;
      const existing = accountData.get(gaId);

      if (!existing) {
        accountData.set(gaId, {
          player_name: row.player_name,
          latest_score: score,
          latest_date: row.snapshot_date,
          previous_score: null,
          snapshots: [{ date: row.snapshot_date, score }],
        });
      } else {
        existing.snapshots.push({ date: row.snapshot_date, score });
      }
    }

    // Calculate previous_score based on compare mode
    for (const [, data] of accountData) {
      if (compare === "all_time") {
        const oldest = data.snapshots[data.snapshots.length - 1];
        if (oldest && data.snapshots.length > 1) {
          data.previous_score = oldest.score;
        }
      } else if (compareCutoff) {
        let bestMatch: { date: string; score: number } | null = null;
        for (const snap of data.snapshots) {
          if (snap.date <= compareCutoff) {
            if (!bestMatch || snap.date > bestMatch.date) {
              bestMatch = snap;
            }
          }
        }
        data.previous_score = bestMatch?.score ?? null;
      } else {
        data.previous_score = data.snapshots.length > 1 ? (data.snapshots[1]?.score ?? null) : null;
      }
    }

    // Sort by latest score desc
    const sorted = [...accountData.entries()].sort((a, b) => b[1].latest_score - a[1].latest_score);

    const total = sorted.length;
    const offset = (page - 1) * page_size;
    let clanTotal = 0;

    const standings = sorted.slice(offset, offset + page_size).map(([gaId, data], i) => ({
      rank: offset + i + 1,
      player_name: data.player_name,
      game_account_id: gaId,
      score: data.latest_score,
      previous_score: data.previous_score,
      delta: data.previous_score !== null ? data.latest_score - data.previous_score : null,
    }));

    // Clan total: use unfiltered data when player filter is active
    if (clanTotalRes?.data) {
      const seenForTotal = new Set<string>();
      for (const row of clanTotalRes.data) {
        const gaId = row.game_account_id as string;
        if (seenForTotal.has(gaId)) continue;
        seenForTotal.add(gaId);
        clanTotal += (row.score as number | null) ?? 0;
      }
    } else {
      for (const [, data] of sorted) {
        clanTotal += data.latest_score;
      }
    }

    // History data for charts: top 10 players, all their snapshots
    const from = parsed.data.from;
    const to = parsed.data.to;
    const top10Ids = new Set(sorted.slice(0, 10).map(([id]) => id));
    const history: Array<{ date: string; player_name: string; score: number }> = [];

    for (const [gaId, data] of accountData) {
      if (!top10Ids.has(gaId)) continue;
      for (const snap of data.snapshots) {
        if (from && snap.date < from) continue;
        if (to && snap.date > `${to}T23:59:59.999Z`) continue;
        history.push({ date: snap.date, player_name: data.player_name, score: snap.score });
      }
    }

    history.sort((a, b) => a.date.localeCompare(b.date));

    // Clan total power trend: aggregate total power per snapshot date
    const dateTotalMap = new Map<string, Map<string, number>>();
    for (const [gaId, data] of accountData) {
      for (const snap of data.snapshots) {
        const dateKey = toBerlinDate(snap.date);
        let dateAccounts = dateTotalMap.get(dateKey);
        if (!dateAccounts) {
          dateAccounts = new Map();
          dateTotalMap.set(dateKey, dateAccounts);
        }
        const existing = dateAccounts.get(gaId);
        if (!existing || snap.score > existing) {
          dateAccounts.set(gaId, snap.score);
        }
      }
    }
    const clanTotalHistory = [...dateTotalMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, accounts]) => {
        let total_power = 0;
        for (const score of accounts.values()) total_power += score;
        return { date, total_power, player_count: accounts.size };
      });

    // Power distribution: bucket players into ranges for histogram
    const scores = sorted.map(([, data]) => data.latest_score);
    let powerDistribution: Array<{ range: string; count: number }> = [];
    if (scores.length > 0) {
      const maxScore = Math.max(...scores);
      const bucketSize = maxScore > 0 ? Math.ceil(maxScore / 8) : 1;
      const bucketMap = new Map<number, number>();
      for (const score of scores) {
        const bucketStart = Math.floor(score / bucketSize) * bucketSize;
        bucketMap.set(bucketStart, (bucketMap.get(bucketStart) ?? 0) + 1);
      }
      powerDistribution = [...bucketMap.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([bucketStart, count]) => ({
          range: `${(bucketStart / 1000).toFixed(0)}k–${((bucketStart + bucketSize) / 1000).toFixed(0)}k`,
          count,
        }));
    }

    return NextResponse.json({
      data: {
        standings,
        history,
        clan_total: clanTotal,
        clan_total_history: clanTotalHistory,
        power_distribution: powerDistribution,
        total,
        page,
        page_size,
      },
    });
  } catch (err) {
    captureApiError("GET /api/analytics/machtpunkte", err);
    return apiError("Internal server error.", 500);
  }
}
