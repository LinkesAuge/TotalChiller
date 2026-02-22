import { z } from "zod";
import { uuidSchema } from "@/lib/api/validation";
import { berlinWeekStartISO, berlinLastWeekBounds, berlinDaysAgoISO } from "@/lib/timezone";
import { ANALYTICS_MAX_DURATION, createAnalyticsHandler, callClanRpc } from "@/lib/api/analytics-handler";

export const maxDuration = ANALYTICS_MAX_DURATION;

const querySchema = z.object({
  clan_id: uuidSchema,
});

/**
 * GET /api/analytics/stats?clan_id=<uuid>
 *
 * Extended dashboard stats via a single Supabase RPC.
 */
export const GET = createAnalyticsHandler({
  schema: querySchema,
  routeLabel: "GET /api/analytics/stats",
  handler(supabase, params) {
    const weekStart = berlinWeekStartISO();
    const lastWeek = berlinLastWeekBounds();
    const sevenDaysAgo = berlinDaysAgoISO(7);

    return callClanRpc(
      supabase,
      "get_clan_stats_overview",
      {
        p_clan_id: params.clan_id,
        p_week_start: weekStart,
        p_last_week_start: lastWeek.start,
        p_last_week_end: lastWeek.end,
        p_seven_days_ago: sevenDaysAgo,
      },
      "GET /api/analytics/stats",
    );
  },
});
