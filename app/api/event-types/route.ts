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

const createSchema = z.object({
  clan_id: uuidSchema,
  name: z.string().min(1, "Name is required.").max(200),
  banner_url: z.string().max(500).nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
  is_active: z.boolean().default(true),
});

const updateSchema = z.object({
  id: uuidSchema,
  clan_id: uuidSchema,
  name: z.string().min(1).max(200).optional(),
  banner_url: z.string().max(500).nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
  is_active: z.boolean().optional(),
});

const deleteSchema = z.object({
  clan_id: uuidSchema,
  id: uuidSchema,
});

const API_LABEL = "event-types";

/**
 * GET /api/event-types
 *
 * Returns all event types for a clan.
 * Accessible to all clan members (read-only).
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

    let query = supabase.from("clan_event_types").select("*").eq("clan_id", clan_id).order("name", { ascending: true });

    if (active_only === "true") {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query;

    if (error) {
      captureApiError(`GET ${API_LABEL}`, error);
      return apiError("Failed to load event types.", 500);
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (err) {
    captureApiError(`GET ${API_LABEL}`, err);
    return apiError("Internal server error.", 500);
  }
}

/**
 * POST /api/event-types
 *
 * Creates a new event type. Clan admin only.
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
    const { clan_id, name, banner_url, description, is_active } = body.data;

    const { data: isAdmin } = await supabase.rpc("is_clan_admin", { target_clan: clan_id });
    if (!isAdmin) return apiError("Admin access required.", 403);

    const { data: eventType, error: insertError } = await supabase
      .from("clan_event_types")
      .insert({
        clan_id,
        name,
        banner_url: banner_url ?? null,
        description: description ?? null,
        is_active,
        created_by: userId,
      })
      .select()
      .single();

    if (insertError || !eventType) {
      captureApiError(`POST ${API_LABEL}`, insertError);
      return apiError("Failed to create event type.", 500);
    }

    return NextResponse.json({ data: eventType }, { status: 201 });
  } catch (err) {
    captureApiError(`POST ${API_LABEL}`, err);
    return apiError("Internal server error.", 500);
  }
}

/**
 * PUT /api/event-types
 *
 * Updates an existing event type. Clan admin only.
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

    const { data: existing } = await supabase
      .from("clan_event_types")
      .select("id")
      .eq("id", id)
      .eq("clan_id", clan_id)
      .maybeSingle();

    if (!existing) return apiError("Event type not found.", 404);

    const updateFields: Record<string, unknown> = {};
    if (fields.name !== undefined) updateFields.name = fields.name;
    if (fields.banner_url !== undefined) updateFields.banner_url = fields.banner_url;
    if (fields.description !== undefined) updateFields.description = fields.description;
    if (fields.is_active !== undefined) updateFields.is_active = fields.is_active;

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json({ data: { id } });
    }

    const { error } = await supabase.from("clan_event_types").update(updateFields).eq("id", id).eq("clan_id", clan_id);

    if (error) {
      captureApiError(`PUT ${API_LABEL}`, error);
      return apiError("Failed to update event type.", 500);
    }

    return NextResponse.json({ data: { id } });
  } catch (err) {
    captureApiError(`PUT ${API_LABEL}`, err);
    return apiError("Internal server error.", 500);
  }
}

/**
 * DELETE /api/event-types
 *
 * Deletes an event type (cascades to junction rows). Clan admin only.
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

    const { error } = await supabase.from("clan_event_types").delete().eq("id", id).eq("clan_id", clan_id);

    if (error) {
      captureApiError(`DELETE ${API_LABEL}`, error);
      return apiError("Failed to delete event type.", 500);
    }

    return NextResponse.json({ data: { deleted: true } });
  } catch (err) {
    captureApiError(`DELETE ${API_LABEL}`, err);
    return apiError("Internal server error.", 500);
  }
}
