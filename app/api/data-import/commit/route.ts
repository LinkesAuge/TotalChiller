import { NextResponse } from "next/server";
import { z } from "zod";
import { captureApiError } from "@/lib/api/logger";
import { requireAdmin } from "../../../../lib/api/require-admin";
import createSupabaseServiceRoleClient from "../../../../lib/supabase/service-role-client";
import { strictLimiter } from "../../../../lib/rate-limit";
import { dateStringSchema, parseJsonBody } from "../../../../lib/api/validation";

const COMMIT_ROW_SCHEMA = z.object({
  collected_date: dateStringSchema,
  player: z.string().min(1),
  source: z.string().min(1),
  chest: z.string().min(1),
  score: z.number(),
  clan: z.string().min(1),
});

const COMMIT_SCHEMA = z.object({
  rows: z.array(COMMIT_ROW_SCHEMA).min(1),
});

interface CommitRowInput {
  readonly collected_date: string;
  readonly player: string;
  readonly source: string;
  readonly chest: string;
  readonly score: number;
  readonly clan: string;
}

/**
 * Commits data import rows using service role access.
 */
export async function POST(request: Request): Promise<Response> {
  const blocked = strictLimiter.check(request);
  if (blocked) return blocked;

  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;
    const parsed = await parseJsonBody(request, COMMIT_SCHEMA);
    if (parsed.error) return parsed.error;
    const rows: CommitRowInput[] = parsed.data.rows;
    const clanNames = Array.from(new Set(rows.map((row) => row.clan)));
    const serviceClient = createSupabaseServiceRoleClient();
    const { data: existingClans, error: clanFetchError } = await serviceClient
      .from("clans")
      .select("id,name")
      .in("name", clanNames);
    if (clanFetchError) {
      captureApiError("POST /api/data-import/commit", clanFetchError);
      return NextResponse.json({ error: "Failed to resolve clan names." }, { status: 500 });
    }
    const existingClanNames = new Set((existingClans ?? []).map((clan) => clan.name));
    const missingClanNames = clanNames.filter((name) => !existingClanNames.has(name));
    if (missingClanNames.length > 0) {
      const { error: clanInsertError } = await serviceClient
        .from("clans")
        .insert(missingClanNames.map((name) => ({ name })));
      if (clanInsertError) {
        captureApiError("POST /api/data-import/commit", clanInsertError);
        return NextResponse.json({ error: "Failed to create missing clans." }, { status: 500 });
      }
    }
    const { data: finalClans, error: clanReloadError } = await serviceClient
      .from("clans")
      .select("id,name")
      .in("name", clanNames);
    if (clanReloadError) {
      captureApiError("POST /api/data-import/commit", clanReloadError);
      return NextResponse.json({ error: "Failed to resolve clan names." }, { status: 500 });
    }
    const clanIdByName = new Map<string, string>((finalClans ?? []).map((clan) => [clan.name, clan.id]));
    const payload = rows.map((row) => ({
      collected_date: row.collected_date,
      player: row.player,
      source: row.source,
      chest: row.chest,
      score: row.score,
      clan_id: clanIdByName.get(row.clan) ?? "",
      created_by: auth.userId,
      updated_by: auth.userId,
    }));
    if (payload.some((entry) => !entry.clan_id)) {
      return NextResponse.json({ error: "Some rows have unknown clan names." }, { status: 400 });
    }
    const { error } = await serviceClient.from("chest_entries").insert(payload);
    if (error) {
      captureApiError("POST /api/data-import/commit", error);
      return NextResponse.json({ error: "Failed to import data." }, { status: 500 });
    }
    return NextResponse.json({ insertedCount: payload.length }, { status: 201 });
  } catch (err) {
    captureApiError("POST /api/data-import/commit", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
