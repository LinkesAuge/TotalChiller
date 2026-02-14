import { NextResponse } from "next/server";
import { captureApiError } from "@/lib/api/logger";
import { requireAuth } from "../../../lib/api/require-auth";
import { relaxedLimiter } from "../../../lib/rate-limit";
import { chartQuerySchema, escapeLikePattern } from "../../../lib/api/validation";
import type {
  ScoreOverTimePoint,
  TopPlayerPoint,
  ChestTypePoint,
  ChartSummary,
  ChartsApiResponse,
} from "../../charts/chart-types";
import type { GameAccountSummary } from "@/lib/types/domain";

/** Maximum number of top players returned. */
const TOP_PLAYERS_LIMIT = 15;

/** Maximum chest types returned (rest grouped as "Other"). */
const CHEST_TYPES_LIMIT = 10;

/** Row shape returned from the chest_entries query. */
interface ChestRow {
  readonly collected_date: string;
  readonly player: string;
  readonly source: string;
  readonly chest: string;
  readonly score: number;
  readonly clan_id: string;
}

/** Narrow view of a game account used when resolving personal usernames. */
type GameAccountRow = Pick<GameAccountSummary, "game_username">;

/**
 * GET /api/charts
 *
 * Returns pre-aggregated chart datasets for the authenticated user,
 * scoped by clan and optional filters.
 */
export async function GET(request: Request): Promise<Response> {
  const blocked = relaxedLimiter.check(request);
  if (blocked) return blocked;
  try {
    const url = new URL(request.url);
    const rawParams = {
      clanId: url.searchParams.get("clanId") ?? undefined,
      gameAccountId: url.searchParams.get("gameAccountId") ?? undefined,
      dateFrom: url.searchParams.get("dateFrom") ?? undefined,
      dateTo: url.searchParams.get("dateTo") ?? undefined,
      player: url.searchParams.get("player") ?? undefined,
      source: url.searchParams.get("source") ?? undefined,
    };
    const parsed = chartQuerySchema.safeParse(rawParams);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((issue) => issue.message).join(", ") },
        { status: 400 },
      );
    }
    const { clanId, gameAccountId, dateFrom, dateTo, player: playerFilter, source: sourceFilter } = parsed.data;
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { supabase } = auth;
    /* ── Build chest entries query ── */
    let query = supabase.from("chest_entries").select("collected_date,player,source,chest,score,clan_id");
    if (clanId) {
      query = query.eq("clan_id", clanId);
    }
    if (dateFrom) {
      query = query.gte("collected_date", dateFrom);
    }
    if (dateTo) {
      query = query.lte("collected_date", dateTo);
    }
    if (playerFilter) {
      query = query.ilike("player", `%${escapeLikePattern(playerFilter)}%`);
    }
    if (sourceFilter) {
      query = query.ilike("source", `%${escapeLikePattern(sourceFilter)}%`);
    }
    query = query.order("collected_date", { ascending: true });
    /* ── Build game accounts query for personal score ── */
    const accountsQuery = gameAccountId
      ? supabase.from("game_accounts").select("game_username").eq("id", gameAccountId).maybeSingle()
      : supabase
          .from("game_accounts")
          .select("game_username")
          .eq("user_id", auth.userId)
          .eq("approval_status", "approved");
    /* ── Fetch chest entries and game accounts in parallel ── */
    const [chestResult, accountResult] = await Promise.all([query, accountsQuery]);
    if (chestResult.error) {
      captureApiError("GET /api/charts", chestResult.error);
      return NextResponse.json({ error: "Failed to load chest data." }, { status: 500 });
    }
    const entries = (chestResult.data ?? []) as readonly ChestRow[];
    let personalUsernames: readonly string[] = [];
    if (gameAccountId && accountResult.data) {
      personalUsernames = [(accountResult.data as GameAccountRow).game_username.toLowerCase()];
    } else if (!gameAccountId && accountResult.data) {
      personalUsernames = ((accountResult.data as GameAccountRow[] | null) ?? []).map((a) =>
        a.game_username.toLowerCase(),
      );
    }
    const personalSet = new Set(personalUsernames);
    /* ── Aggregate: Score over time ── */
    const scoreOverTime = aggregateScoreOverTime(entries);
    /* ── Aggregate: Top players ── */
    const topPlayers = aggregateTopPlayers(entries);
    /* ── Aggregate: Chest types ── */
    const chestTypes = aggregateChestTypes(entries);
    /* ── Aggregate: Personal score over time ── */
    const personalEntries = entries.filter((r) => personalSet.has(r.player.toLowerCase()));
    const personalScore = aggregateScoreOverTime(personalEntries);
    /* ── Summary ── */
    const summary = buildSummary(entries);
    const payload: ChartsApiResponse = {
      scoreOverTime,
      topPlayers,
      chestTypes,
      personalScore,
      summary,
    };
    return NextResponse.json(payload);
  } catch (err) {
    captureApiError("GET /api/charts", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

/* ── Aggregation helpers ── */

function aggregateScoreOverTime(entries: readonly ChestRow[]): ScoreOverTimePoint[] {
  const map = new Map<string, { totalScore: number; entryCount: number }>();
  for (const row of entries) {
    const existing = map.get(row.collected_date);
    if (existing) {
      existing.totalScore += row.score;
      existing.entryCount += 1;
    } else {
      map.set(row.collected_date, { totalScore: row.score, entryCount: 1 });
    }
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, agg]) => ({ date, ...agg }));
}

function aggregateTopPlayers(entries: readonly ChestRow[]): TopPlayerPoint[] {
  const map = new Map<string, { totalScore: number; entryCount: number }>();
  for (const row of entries) {
    const key = row.player;
    const existing = map.get(key);
    if (existing) {
      existing.totalScore += row.score;
      existing.entryCount += 1;
    } else {
      map.set(key, { totalScore: row.score, entryCount: 1 });
    }
  }
  return Array.from(map.entries())
    .map(([player, agg]) => ({ player, ...agg }))
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, TOP_PLAYERS_LIMIT);
}

function aggregateChestTypes(entries: readonly ChestRow[]): ChestTypePoint[] {
  const map = new Map<string, { count: number; totalScore: number }>();
  for (const row of entries) {
    const existing = map.get(row.chest);
    if (existing) {
      existing.count += 1;
      existing.totalScore += row.score;
    } else {
      map.set(row.chest, { count: 1, totalScore: row.score });
    }
  }
  const sorted = Array.from(map.entries())
    .map(([chest, agg]) => ({ chest, ...agg }))
    .sort((a, b) => b.count - a.count);
  if (sorted.length <= CHEST_TYPES_LIMIT) {
    return sorted;
  }
  const top = sorted.slice(0, CHEST_TYPES_LIMIT);
  const rest = sorted.slice(CHEST_TYPES_LIMIT);
  const otherCount = rest.reduce((sum, r) => sum + r.count, 0);
  const otherScore = rest.reduce((sum, r) => sum + r.totalScore, 0);
  top.push({ chest: "Other", count: otherCount, totalScore: otherScore });
  return top;
}

function buildSummary(entries: readonly ChestRow[]): ChartSummary {
  const totalChests = entries.length;
  const totalScore = entries.reduce((sum, r) => sum + r.score, 0);
  const avgScore = totalChests > 0 ? Math.round(totalScore / totalChests) : 0;
  const uniquePlayers = new Set(entries.map((r) => r.player.toLowerCase())).size;
  const chestCounts = new Map<string, number>();
  for (const row of entries) {
    chestCounts.set(row.chest, (chestCounts.get(row.chest) ?? 0) + 1);
  }
  let topChestType = "—";
  let topCount = 0;
  for (const [chest, count] of chestCounts) {
    if (count > topCount) {
      topCount = count;
      topChestType = chest;
    }
  }
  return { totalChests, totalScore, avgScore, topChestType, uniquePlayers };
}
