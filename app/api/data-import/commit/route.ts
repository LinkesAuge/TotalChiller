import { NextResponse } from "next/server";
import { z } from "zod";
import createSupabaseServerClient from "../../../../lib/supabase/server-client";
import createSupabaseServiceRoleClient from "../../../../lib/supabase/service-role-client";
import { strictLimiter } from "../../../../lib/rate-limit";

const COMMIT_ROW_SCHEMA = z.object({
  collected_date: z.string().min(1),
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
  const parsed = COMMIT_SCHEMA.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id ?? "";
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const { data: isAdmin, error: adminError } = await supabase.rpc("is_any_admin");
  if (adminError || !isAdmin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  const rows: CommitRowInput[] = parsed.data.rows;
  const clanNames = Array.from(new Set(rows.map((row) => row.clan)));
  const serviceClient = createSupabaseServiceRoleClient();
  const { data: existingClans, error: clanFetchError } = await serviceClient
    .from("clans")
    .select("id,name")
    .in("name", clanNames);
  if (clanFetchError) {
    return NextResponse.json({ error: clanFetchError.message }, { status: 500 });
  }
  const existingClanNames = new Set((existingClans ?? []).map((clan) => clan.name));
  const missingClanNames = clanNames.filter((name) => !existingClanNames.has(name));
  if (missingClanNames.length > 0) {
    const { error: clanInsertError } = await serviceClient
      .from("clans")
      .insert(missingClanNames.map((name) => ({ name })));
    if (clanInsertError) {
      return NextResponse.json({ error: clanInsertError.message }, { status: 500 });
    }
  }
  const { data: finalClans, error: clanReloadError } = await serviceClient
    .from("clans")
    .select("id,name")
    .in("name", clanNames);
  if (clanReloadError) {
    return NextResponse.json({ error: clanReloadError.message }, { status: 500 });
  }
  const clanIdByName = new Map<string, string>((finalClans ?? []).map((clan) => [clan.name, clan.id]));
  const payload = rows.map((row) => ({
    collected_date: row.collected_date,
    player: row.player,
    source: row.source,
    chest: row.chest,
    score: row.score,
    clan_id: clanIdByName.get(row.clan) ?? "",
    created_by: userId,
    updated_by: userId,
  }));
  if (payload.some((entry) => !entry.clan_id)) {
    return NextResponse.json({ error: "Some rows have unknown clan names." }, { status: 400 });
  }
  const { error } = await serviceClient.from("chest_entries").insert(payload);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ insertedCount: payload.length });
}
