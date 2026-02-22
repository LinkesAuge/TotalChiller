import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { standardLimiter } from "@/lib/rate-limit";
import { requireAuth } from "@/lib/api/require-auth";
import { apiError, uuidSchema, escapeLikePattern } from "@/lib/api/validation";
import { captureApiError } from "@/lib/api/logger";
import { berlinWeekBounds, toBerlinDate, berlinDateRangeUTC } from "@/lib/timezone";

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
  chest_name: z.string().max(200).optional(),
  source: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(25),
});

/**
 * GET /api/analytics/chests
 *
 * Chest rankings with date range, filters, and pagination.
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

    const { clan_id, player, chest_name, source, page, page_size } = parsed.data;
    const weekDefaults = berlinWeekBounds();
    const from = parsed.data.from ?? weekDefaults.from;
    const to = parsed.data.to ?? weekDefaults.to;

    if (from > to) {
      return NextResponse.json({
        data: {
          rankings: [],
          chart_data: [],
          chest_type_distribution: [],
          filters: { chest_names: [], sources: [] },
          total: 0,
        },
      });
    }

    const { data: isMember } = await supabase.rpc("is_clan_member", { target_clan: clan_id });
    const { data: isAdmin } = await supabase.rpc("is_any_admin");
    if (!isMember && !isAdmin) return apiError("Access denied.", 403);

    const { fromUTC, toUTC } = berlinDateRangeUTC(from, to);

    let query = supabase
      .from("chest_entries")
      .select("player_name, chest_name, source, opened_at, game_account_id")
      .eq("clan_id", clan_id)
      .gte("opened_at", fromUTC)
      .lt("opened_at", toUTC)
      .limit(10000);

    if (player) query = query.ilike("player_name", `%${escapeLikePattern(player)}%`);
    if (chest_name) query = query.eq("chest_name", chest_name);
    if (source) query = query.eq("source", source);

    const { data: rows, error } = await query;
    if (error) {
      captureApiError("GET /api/analytics/chests", error);
      return apiError("Failed to load chest data.", 500);
    }

    const entries = rows ?? [];

    // Aggregate rankings by player with per-chest-type breakdown
    const playerMap = new Map<
      string,
      { count: number; game_account_id: string | null; chest_breakdown: Map<string, number> }
    >();
    const chestNames = new Set<string>();
    const chestNameCounts = new Map<string, number>();
    const sources = new Set<string>();
    const dateMap = new Map<string, number>();

    for (const row of entries) {
      const name = row.player_name as string;
      const cn = row.chest_name as string;
      const existing = playerMap.get(name);
      if (existing) {
        existing.count += 1;
        existing.chest_breakdown.set(cn, (existing.chest_breakdown.get(cn) ?? 0) + 1);
      } else {
        const breakdown = new Map<string, number>();
        breakdown.set(cn, 1);
        playerMap.set(name, {
          count: 1,
          game_account_id: row.game_account_id as string | null,
          chest_breakdown: breakdown,
        });
      }
      chestNames.add(cn);
      chestNameCounts.set(cn, (chestNameCounts.get(cn) ?? 0) + 1);
      sources.add(row.source as string);

      const dateKey = toBerlinDate(row.opened_at as string);
      dateMap.set(dateKey, (dateMap.get(dateKey) ?? 0) + 1);
    }

    // Sort by count desc, then alphabetically
    const sorted = [...playerMap.entries()].sort((a, b) => {
      const diff = b[1].count - a[1].count;
      return diff !== 0 ? diff : a[0].localeCompare(b[0]);
    });

    const total = sorted.length;
    const offset = (page - 1) * page_size;
    const rankings = sorted.slice(offset, offset + page_size).map(([name, data], i) => ({
      rank: offset + i + 1,
      player_name: name,
      game_account_id: data.game_account_id,
      count: data.count,
      chest_breakdown: Object.fromEntries(data.chest_breakdown),
    }));

    // Chart data: daily counts sorted by date
    const chartData = [...dateMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    // Chest type distribution (sorted by count desc)
    const chestTypeDistribution = [...chestNameCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));

    return NextResponse.json({
      data: {
        rankings,
        chart_data: chartData,
        chest_type_distribution: chestTypeDistribution,
        filters: {
          chest_names: [...chestNames].sort(),
          sources: [...sources].sort(),
        },
        total,
        page,
        page_size,
      },
    });
  } catch (err) {
    captureApiError("GET /api/analytics/chests", err);
    return apiError("Internal server error.", 500);
  }
}
