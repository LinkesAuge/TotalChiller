import { z } from "zod";
import { uuidSchema } from "@/lib/api/validation";
import { createAnalyticsHandler, callClanRpc } from "@/lib/api/analytics-handler";

export const maxDuration = 30;

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
export const GET = createAnalyticsHandler({
  schema: querySchema,
  routeLabel: "GET /api/analytics/player",
  handler(supabase, params) {
    return callClanRpc(
      supabase,
      "get_clan_player_analytics",
      {
        p_clan_id: params.clan_id,
        p_name: params.name,
        p_ga: params.ga ?? null,
      },
      "GET /api/analytics/player",
    );
  },
});
