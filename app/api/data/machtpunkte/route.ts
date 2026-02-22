import { z } from "zod";
import { uuidSchema, escapeLikePattern } from "@/lib/api/validation";
import { berlinCompareDate, berlinDateRangeUTC } from "@/lib/timezone";
import { createAnalyticsHandler, callClanRpc } from "@/lib/api/analytics-handler";

export const maxDuration = 30;

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
 * GET /api/data/machtpunkte
 *
 * Power score standings with delta, history for charts, and clan total.
 */
export const GET = createAnalyticsHandler({
  schema: querySchema,
  routeLabel: "GET /api/data/machtpunkte",
  handler(supabase, params) {
    const { clan_id, player, compare, page, page_size } = params;

    const compareCutoff =
      compare === "custom" && params.from
        ? berlinDateRangeUTC(params.from, params.from).fromUTC
        : compare === "all_time"
          ? null
          : berlinCompareDate(compare as "week" | "month");

    const fromUTC = params.from ? berlinDateRangeUTC(params.from, params.from).fromUTC : null;
    const toUTC = params.to ? berlinDateRangeUTC(params.to, params.to).toUTC : null;

    return callClanRpc(
      supabase,
      "get_clan_power_analytics",
      {
        p_clan_id: clan_id,
        p_compare: compare,
        p_compare_cutoff: compareCutoff,
        p_player: player ? escapeLikePattern(player) : null,
        p_from_utc: fromUTC,
        p_to_utc: toUTC,
        p_page: page,
        p_page_size: page_size,
      },
      "GET /api/data/machtpunkte",
    );
  },
});
