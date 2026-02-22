import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { standardLimiter } from "@/lib/rate-limit";
import { requireAuth } from "@/lib/api/require-auth";
import { apiError, uuidSchema, parseJsonBody } from "@/lib/api/validation";
import { captureApiError } from "@/lib/api/logger";

/* ── Schemas ── */

const periodEnum = z.enum(["daily", "weekly", "monthly"]);

const getSchema = z.object({
  clan_id: uuidSchema,
  active_only: z.enum(["true", "false"]).default("true"),
});

const createSchema = z.object({
  clan_id: uuidSchema,
  game_account_id: uuidSchema.nullable().optional(),
  period: periodEnum,
  target_count: z.number().int().min(1, "Target must be at least 1."),
  is_active: z.boolean().default(true),
});

const updateSchema = z.object({
  id: uuidSchema,
  clan_id: uuidSchema,
  period: periodEnum.optional(),
  target_count: z.number().int().min(1).optional(),
  is_active: z.boolean().optional(),
});

const deleteSchema = z.object({
  clan_id: uuidSchema,
  id: uuidSchema,
});

/**
 * GET /api/analytics/rules/chests
 *
 * Returns all chest goals for a clan (clan-wide + individual) with player names.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const blocked = standardLimiter.check(request);
  if (blocked) return blocked;

  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { supabase } = auth;

    const rawParams = Object.fromEntries(request.nextUrl.searchParams.entries());
    const parsed = getSchema.safeParse(rawParams);
    if (!parsed.success) return apiError("Invalid query parameters.", 400);

    const { clan_id, active_only } = parsed.data;

    const [{ data: isMember }, { data: isAdmin }] = await Promise.all([
      supabase.rpc("is_clan_member", { target_clan: clan_id }),
      supabase.rpc("is_any_admin"),
    ]);
    if (!isMember && !isAdmin) return apiError("Access denied.", 403);

    let query = supabase
      .from("clan_chest_goals")
      .select("*, game_accounts(game_username)")
      .eq("clan_id", clan_id)
      .order("period")
      .order("created_at", { ascending: false });

    if (active_only === "true") {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query;

    if (error) {
      captureApiError("GET /api/analytics/rules/chests", error);
      return apiError("Failed to load chest goals.", 500);
    }

    type RawRow = {
      game_accounts: { game_username: string } | null;
      [key: string]: unknown;
    };

    const goals = ((data ?? []) as RawRow[]).map((row) => {
      const { game_accounts: ga, ...rest } = row;
      return { ...rest, player_name: ga?.game_username ?? null };
    });

    return NextResponse.json({ data: goals });
  } catch (err) {
    captureApiError("GET /api/analytics/rules/chests", err);
    return apiError("Internal server error.", 500);
  }
}

/**
 * POST /api/analytics/rules/chests
 *
 * Creates a new chest goal (clan-wide or individual). Admin only.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const blocked = standardLimiter.check(request);
  if (blocked) return blocked;

  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { userId, supabase } = auth;

    const body = await parseJsonBody(request, createSchema);
    if (body.error) return body.error;
    const { clan_id, game_account_id, period, target_count, is_active } = body.data;

    const { data: isAdmin } = await supabase.rpc("is_clan_admin", { target_clan: clan_id });
    if (!isAdmin) return apiError("Admin access required.", 403);

    if (game_account_id) {
      const { data: account } = await supabase
        .from("game_account_clan_memberships")
        .select("id")
        .eq("game_account_id", game_account_id)
        .eq("clan_id", clan_id)
        .eq("is_active", true)
        .maybeSingle();

      if (!account) return apiError("Game account not found in this clan.", 404);
    }

    const { data, error } = await supabase
      .from("clan_chest_goals")
      .insert({
        clan_id,
        game_account_id: game_account_id ?? null,
        period,
        target_count,
        is_active,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return apiError("A goal for this period already exists.", 409);
      }
      captureApiError("POST /api/analytics/rules/chests", error);
      return apiError("Failed to create chest goal.", 500);
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    captureApiError("POST /api/analytics/rules/chests", err);
    return apiError("Internal server error.", 500);
  }
}

/**
 * PUT /api/analytics/rules/chests
 *
 * Updates an existing chest goal. Admin only.
 */
export async function PUT(request: NextRequest): Promise<NextResponse> {
  const blocked = standardLimiter.check(request);
  if (blocked) return blocked;

  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { supabase } = auth;

    const body = await parseJsonBody(request, updateSchema);
    if (body.error) return body.error;
    const { id, clan_id, ...fields } = body.data;

    const { data: isAdmin } = await supabase.rpc("is_clan_admin", { target_clan: clan_id });
    if (!isAdmin) return apiError("Admin access required.", 403);

    const updateFields: Record<string, unknown> = {};
    if (fields.period !== undefined) updateFields.period = fields.period;
    if (fields.target_count !== undefined) updateFields.target_count = fields.target_count;
    if (fields.is_active !== undefined) updateFields.is_active = fields.is_active;

    if (Object.keys(updateFields).length === 0) {
      return apiError("No fields to update.", 400);
    }

    const { error } = await supabase.from("clan_chest_goals").update(updateFields).eq("id", id).eq("clan_id", clan_id);

    if (error) {
      if (error.code === "23505") {
        return apiError("A goal for this period already exists.", 409);
      }
      captureApiError("PUT /api/analytics/rules/chests", error);
      return apiError("Failed to update chest goal.", 500);
    }

    return NextResponse.json({ data: { id } });
  } catch (err) {
    captureApiError("PUT /api/analytics/rules/chests", err);
    return apiError("Internal server error.", 500);
  }
}

/**
 * DELETE /api/analytics/rules/chests
 *
 * Deletes a chest goal. Admin only.
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const blocked = standardLimiter.check(request);
  if (blocked) return blocked;

  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { supabase } = auth;

    const rawParams = Object.fromEntries(request.nextUrl.searchParams.entries());
    const parsed = deleteSchema.safeParse(rawParams);
    if (!parsed.success) return apiError("Invalid query parameters.", 400);

    const { clan_id, id } = parsed.data;

    const { data: isAdmin } = await supabase.rpc("is_clan_admin", { target_clan: clan_id });
    if (!isAdmin) return apiError("Admin access required.", 403);

    const { error } = await supabase.from("clan_chest_goals").delete().eq("id", id).eq("clan_id", clan_id);

    if (error) {
      captureApiError("DELETE /api/analytics/rules/chests", error);
      return apiError("Failed to delete chest goal.", 500);
    }

    return NextResponse.json({ data: { deleted: true } });
  } catch (err) {
    captureApiError("DELETE /api/analytics/rules/chests", err);
    return apiError("Internal server error.", 500);
  }
}
