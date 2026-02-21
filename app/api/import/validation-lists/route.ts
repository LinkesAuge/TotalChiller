import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { standardLimiter } from "@/lib/rate-limit";
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
        .select("entity_type, ocr_text, corrected_text, updated_at")
        .eq("clan_id", clanId)
        .order("updated_at", { ascending: false }),
      svc.from("known_names").select("entity_type, name").eq("clan_id", clanId),
    ]);

    const corrections: Record<string, Record<string, string>> = {
      player: {},
      chest: {},
      source: {},
    };
    let lastUpdatedAt: string | null = null;

    for (const row of (correctionsRes.data ?? []) as Array<{
      entity_type: string;
      ocr_text: string;
      corrected_text: string;
      updated_at: string;
    }>) {
      const bucket = corrections[row.entity_type];
      if (bucket) {
        bucket[row.ocr_text] = row.corrected_text;
      }
      if (!lastUpdatedAt) lastUpdatedAt = row.updated_at;
    }

    const knownNames: Record<string, string[]> = {
      player: [],
      chest: [],
      source: [],
    };

    for (const row of (knownNamesRes.data ?? []) as Array<{
      entity_type: string;
      name: string;
    }>) {
      const bucket = knownNames[row.entity_type];
      if (bucket) {
        bucket.push(row.name);
      }
    }

    return NextResponse.json({
      data: { corrections, knownNames, lastUpdatedAt },
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
