import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { standardLimiter } from "@/lib/rate-limit";
import { requireAuth } from "@/lib/api/require-auth";
import { apiError, uuidSchema, parseJsonBody } from "@/lib/api/validation";
import { captureApiError } from "@/lib/api/logger";

/* ── Schemas ── */

const getSchema = z.object({
  clan_id: uuidSchema,
  active_only: z.enum(["true", "false"]).default("true"),
});

const tierSchema = z
  .object({
    min_power: z.number().int().min(0),
    max_power: z.number().int().min(1).nullable(),
    required_points: z.number().int().min(0).nullable(),
    sort_order: z.number().int().min(0),
  })
  .refine((t) => t.max_power === null || t.max_power > t.min_power, {
    message: "max_power must be greater than min_power.",
  });

const createSchema = z.object({
  clan_id: uuidSchema,
  name: z.string().min(1, "Name is required.").max(200),
  event_type_ids: z.array(uuidSchema).default([]),
  description: z.string().max(2000).nullable().optional(),
  is_active: z.boolean().default(true),
  tiers: z.array(tierSchema).min(1, "At least one tier is required."),
});

const updateSchema = z.object({
  id: uuidSchema,
  clan_id: uuidSchema,
  name: z.string().min(1).max(200).optional(),
  event_type_ids: z.array(uuidSchema).optional(),
  description: z.string().max(2000).nullable().optional(),
  is_active: z.boolean().optional(),
  tiers: z
    .array(tierSchema.extend({ id: uuidSchema.optional() }))
    .min(1, "At least one tier is required.")
    .optional(),
});

const deleteSchema = z.object({
  clan_id: uuidSchema,
  id: uuidSchema,
});

/**
 * GET /api/data/rules/events
 *
 * Returns all event rule sets with their tiers for a clan.
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
      .from("clan_event_rule_sets")
      .select("*, clan_event_rule_tiers(*), clan_event_rule_set_events(event_type_id, clan_event_types(id, name))")
      .eq("clan_id", clan_id)
      .order("created_at", { ascending: false });

    if (active_only === "true") {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query;

    if (error) {
      captureApiError("GET /api/data/rules/events", error);
      return apiError("Failed to load event rules.", 500);
    }

    type JunctionRow = {
      event_type_id: string;
      clan_event_types: { id: string; name: string } | null;
    };

    type RawRow = {
      clan_event_rule_tiers: Array<{
        id: string;
        rule_set_id: string;
        min_power: number;
        max_power: number | null;
        required_points: number | null;
        sort_order: number;
        created_at: string;
      }>;
      clan_event_rule_set_events: JunctionRow[];
      [key: string]: unknown;
    };

    const ruleSets = ((data ?? []) as RawRow[]).map((row) => {
      const { clan_event_rule_tiers: tiers, clan_event_rule_set_events: junctions, ...rest } = row;
      const eventTypes = (junctions ?? [])
        .map((j) => j.clan_event_types)
        .filter((d): d is { id: string; name: string } => d !== null);
      return {
        ...rest,
        tiers: [...tiers].sort((a, b) => a.sort_order - b.sort_order),
        event_types: eventTypes,
      };
    });

    return NextResponse.json({ data: ruleSets });
  } catch (err) {
    captureApiError("GET /api/data/rules/events", err);
    return apiError("Internal server error.", 500);
  }
}

/**
 * POST /api/data/rules/events
 *
 * Creates a new event rule set with tiers. Admin only.
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
    const { clan_id, name, event_type_ids, description, is_active, tiers } = body.data;

    const { data: isAdmin } = await supabase.rpc("is_clan_admin", { target_clan: clan_id });
    if (!isAdmin) return apiError("Admin access required.", 403);

    const { data: ruleSet, error: insertError } = await supabase
      .from("clan_event_rule_sets")
      .insert({
        clan_id,
        name,
        description: description ?? null,
        is_active,
        created_by: userId,
      })
      .select()
      .single();

    if (insertError || !ruleSet) {
      captureApiError("POST /api/data/rules/events (rule set)", insertError);
      return apiError("Failed to create rule set.", 500);
    }

    const ruleSetId = (ruleSet as { id: string }).id;

    const tierRows = tiers.map((t) => ({
      rule_set_id: ruleSetId,
      min_power: t.min_power,
      max_power: t.max_power,
      required_points: t.required_points,
      sort_order: t.sort_order,
    }));

    const { error: tiersError } = await supabase.from("clan_event_rule_tiers").insert(tierRows);

    if (tiersError) {
      captureApiError("POST /api/data/rules/events (tiers)", tiersError);
      await supabase.from("clan_event_rule_sets").delete().eq("id", ruleSetId);
      return apiError("Failed to create rule tiers.", 500);
    }

    if (event_type_ids.length > 0) {
      const junctionRows = event_type_ids.map((typeId) => ({
        rule_set_id: ruleSetId,
        event_type_id: typeId,
      }));

      const { error: junctionError } = await supabase.from("clan_event_rule_set_events").insert(junctionRows);

      if (junctionError) {
        captureApiError("POST /api/data/rules/events (junctions)", junctionError);
        await supabase.from("clan_event_rule_sets").delete().eq("id", ruleSetId);
        return apiError("Failed to link event types.", 500);
      }
    }

    return NextResponse.json({ data: ruleSet }, { status: 201 });
  } catch (err) {
    captureApiError("POST /api/data/rules/events", err);
    return apiError("Internal server error.", 500);
  }
}

/**
 * PUT /api/data/rules/events
 *
 * Updates an existing event rule set and optionally replaces its tiers. Admin only.
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
    const { id, clan_id, tiers, event_type_ids, ...fields } = body.data;

    const { data: isAdmin } = await supabase.rpc("is_clan_admin", { target_clan: clan_id });
    if (!isAdmin) return apiError("Admin access required.", 403);

    const { data: existing } = await supabase
      .from("clan_event_rule_sets")
      .select("id")
      .eq("id", id)
      .eq("clan_id", clan_id)
      .maybeSingle();

    if (!existing) return apiError("Rule set not found.", 404);

    const updateFields: Record<string, unknown> = {};
    if (fields.name !== undefined) updateFields.name = fields.name;
    if (fields.description !== undefined) updateFields.description = fields.description;
    if (fields.is_active !== undefined) updateFields.is_active = fields.is_active;

    if (Object.keys(updateFields).length > 0) {
      const { error } = await supabase
        .from("clan_event_rule_sets")
        .update(updateFields)
        .eq("id", id)
        .eq("clan_id", clan_id);

      if (error) {
        captureApiError("PUT /api/data/rules/events (set)", error);
        return apiError("Failed to update rule set.", 500);
      }
    }

    if (event_type_ids !== undefined) {
      const { data: oldJunctions } = await supabase
        .from("clan_event_rule_set_events")
        .select("rule_set_id, event_type_id")
        .eq("rule_set_id", id);

      const { error: junctionDelError } = await supabase
        .from("clan_event_rule_set_events")
        .delete()
        .eq("rule_set_id", id);

      if (junctionDelError) {
        captureApiError("PUT /api/data/rules/events (delete junctions)", junctionDelError);
        return apiError("Failed to update event type links.", 500);
      }

      if (event_type_ids.length > 0) {
        const junctionRows = event_type_ids.map((typeId) => ({
          rule_set_id: id,
          event_type_id: typeId,
        }));

        const { error: junctionError } = await supabase.from("clan_event_rule_set_events").insert(junctionRows);

        if (junctionError) {
          captureApiError("PUT /api/data/rules/events (junctions)", junctionError);
          if (oldJunctions?.length) {
            await supabase.from("clan_event_rule_set_events").insert(oldJunctions);
          }
          return apiError("Failed to update event type links.", 500);
        }
      }
    }

    if (tiers) {
      // Snapshot existing tiers before replacing (for rollback on failure)
      const { data: oldTiers } = await supabase
        .from("clan_event_rule_tiers")
        .select("rule_set_id, min_power, max_power, required_points, sort_order")
        .eq("rule_set_id", id);

      const { error: delError } = await supabase.from("clan_event_rule_tiers").delete().eq("rule_set_id", id);

      if (delError) {
        captureApiError("PUT /api/data/rules/events (delete tiers)", delError);
        return apiError("Failed to update tiers.", 500);
      }

      if (tiers.length > 0) {
        const tierRows = tiers.map((t) => ({
          rule_set_id: id,
          min_power: t.min_power,
          max_power: t.max_power,
          required_points: t.required_points,
          sort_order: t.sort_order,
        }));

        const { error: insError } = await supabase.from("clan_event_rule_tiers").insert(tierRows);

        if (insError) {
          captureApiError("PUT /api/data/rules/events (insert tiers)", insError);
          // Attempt to restore old tiers
          if (oldTiers && oldTiers.length > 0) {
            try {
              await supabase.from("clan_event_rule_tiers").insert(oldTiers);
            } catch {
              /* best-effort rollback */
            }
          }
          return apiError("Failed to update tiers.", 500);
        }
      }
    }

    return NextResponse.json({ data: { id } });
  } catch (err) {
    captureApiError("PUT /api/data/rules/events", err);
    return apiError("Internal server error.", 500);
  }
}

/**
 * DELETE /api/data/rules/events
 *
 * Deletes an event rule set (cascades to tiers). Admin only.
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

    const { error } = await supabase.from("clan_event_rule_sets").delete().eq("id", id).eq("clan_id", clan_id);

    if (error) {
      captureApiError("DELETE /api/data/rules/events", error);
      return apiError("Failed to delete rule set.", 500);
    }

    return NextResponse.json({ data: { deleted: true } });
  } catch (err) {
    captureApiError("DELETE /api/data/rules/events", err);
    return apiError("Internal server error.", 500);
  }
}
