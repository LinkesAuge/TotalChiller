import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { uuidSchema } from "@/lib/api/validation";
import { apiError } from "@/lib/api/validation";
import { captureApiError } from "@/lib/api/logger";
import { createAnalyticsHandler, callClanRpc, requireClanAccess } from "@/lib/api/analytics-handler";

export const maxDuration = 30;

const MAX_PAGE_SIZE = 10000;

const querySchema = z.object({
  clan_id: uuidSchema,
  event_id: uuidSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(25),
});

export const GET = createAnalyticsHandler({
  schema: querySchema,
  routeLabel: "GET /api/data/events",
  async handler(supabase, params) {
    const { clan_id, event_id, page, page_size } = params;

    if (event_id) {
      const denied = await requireClanAccess(supabase, clan_id);
      if (denied) return denied;
      return getEventDetail(supabase, clan_id, event_id, page, page_size);
    }

    return callClanRpc(
      supabase,
      "get_clan_event_list",
      { p_clan_id: clan_id, p_page: page, p_page_size: page_size },
      "GET /api/data/events (list)",
    );
  },
});

async function getEventDetail(
  supabase: SupabaseClient,
  clanId: string,
  eventId: string,
  page: number,
  pageSize: number,
): Promise<NextResponse> {
  const [eventRowResult, resultsResult] = await Promise.all([
    supabase
      .from("events")
      .select("id, title, description, starts_at, ends_at")
      .eq("id", eventId)
      .eq("clan_id", clanId)
      .maybeSingle(),
    supabase
      .from("event_results")
      .select("player_name, event_points, game_account_id, event_name", { count: "exact" })
      .eq("clan_id", clanId)
      .eq("linked_event_id", eventId)
      .order("event_points", { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1),
  ]);

  const { data: eventRow } = eventRowResult;
  const { data: results, error, count } = resultsResult;

  if (error) {
    captureApiError("GET /api/data/events (detail)", error);
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
