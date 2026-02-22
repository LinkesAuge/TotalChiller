import { NextResponse } from "next/server";
import { z } from "zod";
import { uuidSchema, escapeLikePattern } from "@/lib/api/validation";
import { berlinWeekBounds, berlinDateRangeUTC } from "@/lib/timezone";
import { createAnalyticsHandler, callClanRpc } from "@/lib/api/analytics-handler";

export const maxDuration = 30;

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
  page_size: z.coerce.number().int().min(1).max(10000).default(25),
});

export const GET = createAnalyticsHandler({
  schema: querySchema,
  routeLabel: "GET /api/data/chests",
  handler(supabase, params) {
    const weekDefaults = berlinWeekBounds();
    const from = params.from ?? weekDefaults.from;
    const to = params.to ?? weekDefaults.to;

    if (from > to) {
      return Promise.resolve(
        NextResponse.json({
          data: {
            rankings: [],
            chart_data: [],
            chest_type_distribution: [],
            filters: { chest_names: [], sources: [] },
            total: 0,
            page: params.page,
            page_size: params.page_size,
          },
        }),
      );
    }

    const { fromUTC, toUTC } = berlinDateRangeUTC(from, to);

    return callClanRpc(
      supabase,
      "get_clan_chest_analytics",
      {
        p_clan_id: params.clan_id,
        p_from_utc: fromUTC,
        p_to_utc: toUTC,
        p_player: params.player ? escapeLikePattern(params.player) : null,
        p_chest_name: params.chest_name ?? null,
        p_source: params.source ?? null,
        p_page: params.page,
        p_page_size: params.page_size,
      },
      "GET /api/data/chests",
    );
  },
});
