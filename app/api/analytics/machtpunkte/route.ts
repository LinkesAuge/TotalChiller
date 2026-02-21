import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { standardLimiter } from "@/lib/rate-limit";
import { requireAuth } from "@/lib/api/require-auth";
import { apiError, uuidSchema, escapeLikePattern } from "@/lib/api/validation";
import { captureApiError } from "@/lib/api/logger";

const MAX_PAGE_SIZE = 100;

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

    const { clan_id, player, page, page_size } = parsed.data;

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
        if (existing.previous_score === null) {
          existing.previous_score = score;
        }
        existing.snapshots.push({ date: row.snapshot_date, score });
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

    return NextResponse.json({
      data: {
        standings,
        history,
        clan_total: clanTotal,
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
