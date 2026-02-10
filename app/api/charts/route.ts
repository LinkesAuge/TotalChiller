import { NextResponse } from "next/server";
import createSupabaseServerClient from "../../../lib/supabase/server-client";
import { relaxedLimiter } from "../../../lib/rate-limit";
import type {
  ScoreOverTimePoint,
  TopPlayerPoint,
  ChestTypePoint,
  ChartSummary,
  ChartsApiResponse,
} from "../../charts/chart-types";

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

/** Row shape returned from the game_accounts query. */
interface GameAccountRow {
  readonly game_username: string;
}

/**
 * GET /api/charts
 *
 * Returns pre-aggregated chart datasets for the authenticated user,
 * scoped by clan and optional filters.
 */
export async function GET(request: Request): Promise<Response> {
  const blocked = relaxedLimiter.check(request);
  if (blocked) return blocked;
  const url = new URL(request.url);
  const clanId = url.searchParams.get("clanId") ?? "";
  const gameAccountId = url.searchParams.get("gameAccountId") ?? "";
  const dateFrom = url.searchParams.get("dateFrom") ?? "";
  const dateTo = url.searchParams.get("dateTo") ?? "";
  const playerFilter = url.searchParams.get("player") ?? "";
  const sourceFilter = url.searchParams.get("source") ?? "";

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

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
    query = query.ilike("player", `%${playerFilter}%`);
  }
  if (sourceFilter) {
    query = query.ilike("source", `%${sourceFilter}%`);
  }

  query = query.order("collected_date", { ascending: true });

  /* ── Build game accounts query for personal score ── */
  const accountsQuery = gameAccountId
    ? supabase.from("game_accounts").select("game_username").eq("id", gameAccountId).maybeSingle()
    : supabase
        .from("game_accounts")
        .select("game_username")
        .eq("user_id", userData.user.id)
        .eq("approval_status", "approved");

  /* ── Fetch chest entries and game accounts in parallel ── */
  const [chestResult, accountResult] = await Promise.all([query, accountsQuery]);
  if (chestResult.error) {
    return NextResponse.json({ error: chestResult.error.message }, { status: 500 });
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
