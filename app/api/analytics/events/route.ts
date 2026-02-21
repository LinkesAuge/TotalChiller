import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { standardLimiter } from "@/lib/rate-limit";
import { requireAuth } from "@/lib/api/require-auth";
import { apiError, uuidSchema } from "@/lib/api/validation";
import { captureApiError } from "@/lib/api/logger";
import { toBerlinDate } from "@/lib/timezone";

const MAX_PAGE_SIZE = 10000;

const querySchema = z.object({
  clan_id: uuidSchema,
  event_id: uuidSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(25),
});

/**
 * GET /api/analytics/events
 *
 * Without event_id: list of events with aggregated stats.
 * With event_id: detailed results for a specific event.
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

    const { clan_id, event_id, page, page_size } = parsed.data;

    const { data: isMember } = await supabase.rpc("is_clan_member", { target_clan: clan_id });
    const { data: isAdmin } = await supabase.rpc("is_any_admin");
    if (!isMember && !isAdmin) return apiError("Access denied.", 403);

    if (event_id) {
      return await getEventDetail(supabase, clan_id, event_id, page, page_size);
    }

    return await getEventList(supabase, clan_id, page, page_size);
  } catch (err) {
    captureApiError("GET /api/analytics/events", err);
    return apiError("Internal server error.", 500);
  }
}

async function getEventList(
  supabase: SupabaseClient,
  clanId: string,
  page: number,
  pageSize: number,
): Promise<NextResponse> {
  const { data: rows, error } = await supabase
    .from("event_results")
    .select("linked_event_id, event_name, event_date, event_points, player_name, game_account_id")
    .eq("clan_id", clanId)
    .not("linked_event_id", "is", null)
    .limit(10000);

  if (error) {
    captureApiError("GET /api/analytics/events (list)", error);
    return apiError("Failed to load events.", 500);
  }

  const entries = (rows ?? []) as Array<{
    linked_event_id: string;
    event_name: string | null;
    event_date: string;
    event_points: number;
    player_name: string;
    game_account_id: string | null;
  }>;

  // Aggregate by linked_event_id
  const eventMap = new Map<
    string,
    { event_name: string | null; event_date: string; participant_count: number; total_points: number }
  >();

  for (const row of entries) {
    const eid = row.linked_event_id;
    const points = row.event_points ?? 0;
    const existing = eventMap.get(eid);
    if (existing) {
      existing.participant_count += 1;
      existing.total_points += points;
      if (row.event_date > existing.event_date) {
        existing.event_date = row.event_date;
        if (row.event_name) existing.event_name = row.event_name;
      }
    } else {
      eventMap.set(eid, {
        event_name: row.event_name,
        event_date: row.event_date,
        participant_count: 1,
        total_points: points,
      });
    }
  }

  // Also try to get event titles + date range from the events table for linked events
  const eventIds = [...eventMap.keys()];
  let eventDetails = new Map<string, { title: string; starts_at: string; ends_at: string }>();
  if (eventIds.length > 0) {
    const { data: eventsData } = await supabase
      .from("events")
      .select("id, title, starts_at, ends_at")
      .in("id", eventIds);

    if (eventsData) {
      eventDetails = new Map(
        (eventsData as Array<{ id: string; title: string; starts_at: string; ends_at: string }>).map((e) => [
          e.id,
          { title: e.title, starts_at: e.starts_at, ends_at: e.ends_at },
        ]),
      );
    }
  }

  const sorted = [...eventMap.entries()]
    .map(([id, data]) => {
      const detail = eventDetails.get(id);
      return {
        linked_event_id: id,
        event_name: detail?.title ?? data.event_name ?? "Unknown Event",
        event_date: data.event_date,
        starts_at: detail?.starts_at ?? null,
        ends_at: detail?.ends_at ?? null,
        participant_count: data.participant_count,
        total_points: data.total_points,
      };
    })
    .sort((a, b) => b.event_date.localeCompare(a.event_date));

  const total = sorted.length;
  const offset = (page - 1) * pageSize;
  const events = sorted.slice(offset, offset + pageSize);

  // Participation trend: chronological participant count per event
  const participationTrend = [...sorted]
    .sort((a, b) => a.event_date.localeCompare(b.event_date))
    .map((e) => ({
      event_name: e.event_name.length > 20 ? e.event_name.slice(0, 20) + "…" : e.event_name,
      date: toBerlinDate(e.event_date),
      participants: e.participant_count,
      avg_points: e.participant_count > 0 ? Math.round(e.total_points / e.participant_count) : 0,
    }));

  // Latest event full ranking
  const latestEvent = sorted[0];
  let latestEventRanking: Array<{
    rank: number;
    player_name: string;
    event_points: number;
    game_account_id: string | null;
  }> = [];
  let latestEventName = "";
  let latestEventDate = "";

  let latestEventStartsAt = "";
  let latestEventEndsAt = "";

  if (latestEvent) {
    latestEventName = latestEvent.event_name;
    latestEventDate = latestEvent.event_date;
    latestEventStartsAt = latestEvent.starts_at ?? "";
    latestEventEndsAt = latestEvent.ends_at ?? "";
    const latestResults = entries
      .filter((r) => r.linked_event_id === latestEvent.linked_event_id)
      .sort((a, b) => (b.event_points ?? 0) - (a.event_points ?? 0));
    latestEventRanking = latestResults.map((r, i) => ({
      rank: i + 1,
      player_name: r.player_name ?? "Unknown",
      event_points: r.event_points ?? 0,
      game_account_id: r.game_account_id ?? null,
    }));
  }

  // Best performers across all events (top 10 by avg points, min 2 events)
  const playerStats = new Map<
    string,
    { name: string; total_points: number; event_count: number; game_account_id: string | null }
  >();
  let highestSingleScore = 0;
  let highestSingleName = "";
  let highestSingleEvent = "";

  for (const row of entries) {
    const name = row.player_name ?? "Unknown";
    const gaId = row.game_account_id ?? null;
    const key = gaId ?? name;
    const pts = row.event_points ?? 0;

    const existing = playerStats.get(key);
    if (existing) {
      existing.total_points += pts;
      existing.event_count += 1;
    } else {
      playerStats.set(key, { name, total_points: pts, event_count: 1, game_account_id: gaId });
    }

    if (pts > highestSingleScore) {
      highestSingleScore = pts;
      highestSingleName = name;
      highestSingleEvent = row.event_name ?? "Event";
    }
  }

  const bestPerformers = [...playerStats.values()]
    .filter((p) => p.event_count >= 2)
    .map((p) => ({
      player_name: p.name,
      game_account_id: p.game_account_id,
      avg_points: Math.round(p.total_points / p.event_count),
      event_count: p.event_count,
      total_points: p.total_points,
    }))
    .sort((a, b) => b.avg_points - a.avg_points)
    .slice(0, 10);

  return NextResponse.json({
    data: {
      events,
      participation_trend: participationTrend,
      total,
      page,
      page_size: pageSize,
      latest_event_ranking: latestEventRanking,
      latest_event_name: latestEventName,
      latest_event_date: latestEventDate,
      latest_event_starts_at: latestEventStartsAt,
      latest_event_ends_at: latestEventEndsAt,
      best_performers: bestPerformers,
      highest_single_score: {
        player_name: highestSingleName,
        event_name: highestSingleEvent,
        event_points: highestSingleScore,
      },
    },
  });
}

async function getEventDetail(
  supabase: SupabaseClient,
  clanId: string,
  eventId: string,
  page: number,
  pageSize: number,
): Promise<NextResponse> {
  const { data: eventRow } = await supabase
    .from("events")
    .select("id, title, description, starts_at, ends_at")
    .eq("id", eventId)
    .eq("clan_id", clanId)
    .maybeSingle();

  // Get all results for this event
  const {
    data: results,
    error,
    count,
  } = await supabase
    .from("event_results")
    .select("player_name, event_points, game_account_id, event_name", { count: "exact" })
    .eq("clan_id", clanId)
    .eq("linked_event_id", eventId)
    .order("event_points", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (error) {
    captureApiError("GET /api/analytics/events (detail)", error);
    return apiError("Failed to load event results.", 500);
  }

  const total = count ?? 0;
  const rankings = (
    (results ?? []) as Array<{
      player_name: string;
      event_points: number;
      game_account_id: string | null;
      event_name: string | null;
    }>
  ).map((r, i) => ({
    rank: (page - 1) * pageSize + i + 1,
    player_name: r.player_name,
    event_points: r.event_points,
    game_account_id: r.game_account_id,
  }));

  const eventMeta = eventRow
    ? {
        id: eventRow.id as string,
        title: eventRow.title as string,
        description: eventRow.description as string | null,
        starts_at: eventRow.starts_at as string | null,
        ends_at: eventRow.ends_at as string | null,
      }
    : null;

  // Fallback event name from results if no calendar event
  const eventName =
    eventMeta?.title ?? (results as Array<{ event_name: string | null }> | null)?.[0]?.event_name ?? "Event";

  return NextResponse.json({
    data: {
      event_meta: eventMeta,
      event_name: eventName,
      rankings,
      total,
      page,
      page_size: pageSize,
    },
  });
}
