import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { standardLimiter } from "@/lib/rate-limit";
import { requireAuth } from "@/lib/api/require-auth";
import { requireAuthWithBearer } from "@/lib/api/require-auth";
import { apiError, parseJsonBody, uuidSchema } from "@/lib/api/validation";
import { captureApiError } from "@/lib/api/logger";
import { ValidationListPushSchema } from "@/lib/api/import-schemas";
import createSupabaseServiceRoleClient from "@/lib/supabase/service-role-client";

/**
 * GET /api/import/validation-lists?clan_id=uuid
 *
 * Returns OCR corrections and known names for a clan,
 * grouped by entity type (player, chest, source).
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const blocked = standardLimiter.check(request);
  if (blocked) return blocked;

  try {
    const auth = await requireAuthWithBearer(request);
    if (auth.error) return auth.error;

    const clanId = request.nextUrl.searchParams.get("clan_id");
    if (!clanId || !uuidSchema.safeParse(clanId).success) {
      return apiError("Valid clan_id query parameter is required.", 400);
    }

    const { supabase } = auth;
    const [memberRes, adminRes] = await Promise.all([
      supabase.rpc("is_clan_member", { target_clan: clanId }),
      supabase.rpc("is_any_admin"),
    ]);
    if (!memberRes.data && !adminRes.data) {
      return apiError("You are not a member of the target clan.", 403);
    }

    const svc = createSupabaseServiceRoleClient();

    const [correctionsRes, knownNamesRes] = await Promise.all([
      svc
        .from("ocr_corrections")
        .select("id, entity_type, ocr_text, corrected_text, updated_at")
        .eq("clan_id", clanId)
        .order("updated_at", { ascending: false }),
      svc.from("known_names").select("id, entity_type, name").eq("clan_id", clanId).order("name"),
    ]);

    const corrections: Record<string, Record<string, string>> = {
      player: {},
      chest: {},
      source: {},
    };
    let lastUpdatedAt: string | null = null;
    const correctionEntries: Array<{
      id: string;
      entity_type: string;
      ocr_text: string;
      corrected_text: string;
    }> = [];

    for (const row of (correctionsRes.data ?? []) as Array<{
      id: string;
      entity_type: string;
      ocr_text: string;
      corrected_text: string;
      updated_at: string;
    }>) {
      const bucket = corrections[row.entity_type];
      if (bucket) {
        bucket[row.ocr_text] = row.corrected_text;
      }
      correctionEntries.push({
        id: row.id,
        entity_type: row.entity_type,
        ocr_text: row.ocr_text,
        corrected_text: row.corrected_text,
      });
      if (!lastUpdatedAt) lastUpdatedAt = row.updated_at;
    }

    const knownNames: Record<string, string[]> = {
      player: [],
      chest: [],
      source: [],
    };
    const knownNameEntries: Array<{
      id: string;
      entity_type: string;
      name: string;
    }> = [];

    for (const row of (knownNamesRes.data ?? []) as Array<{
      id: string;
      entity_type: string;
      name: string;
    }>) {
      const bucket = knownNames[row.entity_type];
      if (bucket) {
        bucket.push(row.name);
      }
      knownNameEntries.push({ id: row.id, entity_type: row.entity_type, name: row.name });
    }

    return NextResponse.json({
      data: { corrections, knownNames, lastUpdatedAt, correctionEntries, knownNameEntries },
    });
  } catch (err) {
    captureApiError("GET /api/import/validation-lists", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

/**
 * POST /api/import/validation-lists
 *
 * Upserts known names and OCR corrections for a clan.
 * Known names use ignoreDuplicates; corrections use last-write-wins.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const blocked = standardLimiter.check(request);
  if (blocked) return blocked;

  try {
    const auth = await requireAuthWithBearer(request);
    if (auth.error) return auth.error;
    const { userId, supabase } = auth;

    const parsed = await parseJsonBody(request, ValidationListPushSchema);
    if (parsed.error) return parsed.error;
    const body = parsed.data;

    const [memberRes, adminRes] = await Promise.all([
      supabase.rpc("is_clan_member", { target_clan: body.clanId }),
      supabase.rpc("is_any_admin"),
    ]);
    if (!memberRes.data && !adminRes.data) {
      return apiError("You are not a member of the target clan.", 403);
    }

    const svc = createSupabaseServiceRoleClient();

    const knownNameRows: Array<{ clan_id: string; entity_type: string; name: string }> = [];
    for (const name of body.knownPlayerNames ?? []) {
      if (name) knownNameRows.push({ clan_id: body.clanId, entity_type: "player", name });
    }
    for (const name of body.knownChestNames ?? []) {
      if (name) knownNameRows.push({ clan_id: body.clanId, entity_type: "chest", name });
    }
    for (const name of body.knownSources ?? []) {
      if (name) knownNameRows.push({ clan_id: body.clanId, entity_type: "source", name });
    }

    let knownNamesUpserted = 0;
    if (knownNameRows.length > 0) {
      const { data } = await svc
        .from("known_names")
        .upsert(knownNameRows, { onConflict: "clan_id,entity_type,name", ignoreDuplicates: true })
        .select("id");
      knownNamesUpserted = data?.length ?? 0;
    }

    const correctionRows: Array<{
      clan_id: string;
      entity_type: string;
      ocr_text: string;
      corrected_text: string;
      created_by: string;
    }> = [];

    for (const [ocrText, correctedText] of Object.entries(body.corrections?.player ?? {})) {
      if (ocrText && correctedText) {
        correctionRows.push({
          clan_id: body.clanId,
          entity_type: "player",
          ocr_text: ocrText,
          corrected_text: correctedText,
          created_by: userId,
        });
      }
    }
    for (const [ocrText, correctedText] of Object.entries(body.corrections?.chest ?? {})) {
      if (ocrText && correctedText) {
        correctionRows.push({
          clan_id: body.clanId,
          entity_type: "chest",
          ocr_text: ocrText,
          corrected_text: correctedText,
          created_by: userId,
        });
      }
    }
    for (const [ocrText, correctedText] of Object.entries(body.corrections?.source ?? {})) {
      if (ocrText && correctedText) {
        correctionRows.push({
          clan_id: body.clanId,
          entity_type: "source",
          ocr_text: ocrText,
          corrected_text: correctedText,
          created_by: userId,
        });
      }
    }

    let correctionsUpserted = 0;
    if (correctionRows.length > 0) {
      const { data } = await svc
        .from("ocr_corrections")
        .upsert(correctionRows, { onConflict: "clan_id,entity_type,ocr_text" })
        .select("id");
      correctionsUpserted = data?.length ?? 0;
    }

    return NextResponse.json({
      data: { correctionsUpserted, knownNamesUpserted },
    });
  } catch (err) {
    captureApiError("POST /api/import/validation-lists", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

/* ── DELETE /api/import/validation-lists ── */

const DeleteSchema = z
  .object({
    table: z.enum(["ocr_corrections", "known_names"]),
    id: z.string().uuid().optional(),
    ids: z.array(z.string().uuid()).min(1).max(500).optional(),
  })
  .refine((d) => d.id || d.ids, { message: "Either id or ids must be provided." });

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const blocked = standardLimiter.check(request);
  if (blocked) return blocked;

  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { supabase } = auth;

    const { data: isAdmin } = await supabase.rpc("is_any_admin");
    if (!isAdmin) return apiError("Admin access required.", 403);

    const parsed = await parseJsonBody(request, DeleteSchema);
    if (parsed.error) return parsed.error;
    const body = parsed.data;

    const svc = createSupabaseServiceRoleClient();
    const idsToDelete = body.ids ?? (body.id ? [body.id] : []);
    const { error } = await svc.from(body.table).delete().in("id", idsToDelete);
    if (error) {
      captureApiError("DELETE /api/import/validation-lists", error);
      return apiError("Failed to delete entries.", 500);
    }

    return NextResponse.json({ data: { deleted: idsToDelete.length } });
  } catch (err) {
    captureApiError("DELETE /api/import/validation-lists", err);
    return apiError("Internal server error.", 500);
  }
}

/* ── PATCH /api/import/validation-lists ── */

const entityTypeEnum = z.enum(["player", "chest", "source"]);

const PatchCorrectionSchema = z.object({
  table: z.literal("ocr_corrections"),
  id: z.string().uuid(),
  corrected_text: z.string().min(1).optional(),
  ocr_text: z.string().min(1).optional(),
  entity_type: entityTypeEnum.optional(),
});

const PatchKnownNameSchema = z.object({
  table: z.literal("known_names"),
  id: z.string().uuid(),
  name: z.string().min(1).optional(),
  entity_type: entityTypeEnum.optional(),
});

const PatchBatchTypeSchema = z.object({
  table: z.enum(["ocr_corrections", "known_names"]),
  ids: z.array(z.string().uuid()).min(1).max(500),
  entity_type: entityTypeEnum,
});

const PatchSchema = z.union([PatchCorrectionSchema, PatchKnownNameSchema, PatchBatchTypeSchema]);

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const blocked = standardLimiter.check(request);
  if (blocked) return blocked;

  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { supabase } = auth;

    const { data: isAdmin } = await supabase.rpc("is_any_admin");
    if (!isAdmin) return apiError("Admin access required.", 403);

    const parsed = await parseJsonBody(request, PatchSchema);
    if (parsed.error) return parsed.error;
    const body = parsed.data;

    const svc = createSupabaseServiceRoleClient();

    if ("ids" in body && body.ids) {
      const { error } = await svc.from(body.table).update({ entity_type: body.entity_type }).in("id", body.ids);
      if (error) {
        captureApiError("PATCH /api/import/validation-lists (batch)", error);
        return apiError("Failed to update entries.", 500);
      }
      return NextResponse.json({ data: { updated: body.ids.length } });
    }

    const item = body as z.infer<typeof PatchCorrectionSchema> | z.infer<typeof PatchKnownNameSchema>;

    if (item.table === "ocr_corrections") {
      const updates: Record<string, string> = {};
      if (item.corrected_text) updates.corrected_text = item.corrected_text;
      if (item.ocr_text) updates.ocr_text = item.ocr_text;
      if (item.entity_type) updates.entity_type = item.entity_type;
      if (Object.keys(updates).length === 0) return apiError("No fields to update.", 400);
      const { error } = await svc.from("ocr_corrections").update(updates).eq("id", item.id);
      if (error) {
        captureApiError("PATCH /api/import/validation-lists (correction)", error);
        return apiError("Failed to update correction.", 500);
      }
    } else {
      const updates: Record<string, string> = {};
      if (item.name) updates.name = item.name;
      if (item.entity_type) updates.entity_type = item.entity_type;
      if (Object.keys(updates).length === 0) return apiError("No fields to update.", 400);
      const { error } = await svc.from("known_names").update(updates).eq("id", item.id);
      if (error) {
        captureApiError("PATCH /api/import/validation-lists (known_name)", error);
        return apiError("Failed to update known name.", 500);
      }
    }

    return NextResponse.json({ data: { updated: true } });
  } catch (err) {
    captureApiError("PATCH /api/import/validation-lists", err);
    return apiError("Internal server error.", 500);
  }
}
