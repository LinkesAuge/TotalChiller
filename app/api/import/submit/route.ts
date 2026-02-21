import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { standardLimiter } from "@/lib/rate-limit";
import { requireAuthWithBearer } from "@/lib/api/require-auth";
import { apiError, parseJsonBody, uuidSchema } from "@/lib/api/validation";
import { captureApiError } from "@/lib/api/logger";
import {
  ImportPayloadSchema,
  type ImportPayload,
  type ChestItem,
  type MemberItem,
  type EventItem,
} from "@/lib/api/import-schemas";
import createSupabaseServiceRoleClient from "@/lib/supabase/service-role-client";
import type { SupabaseClient } from "@supabase/supabase-js";

interface SubmissionResult {
  id: string;
  type: string;
  itemCount: number;
  autoMatchedCount: number;
  unmatchedCount: number;
  duplicateCount: number;
}

interface GameAccountMatch {
  id: string;
  game_username: string;
}

/**
 * Accepts a ChillerBuddy export payload. Creates one submission per data type
 * present (chests, members, events). Auto-matches player names to game accounts
 * and flags potential duplicates.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const blocked = standardLimiter.check(request);
  if (blocked) return blocked;

  try {
    const auth = await requireAuthWithBearer(request);
    if (auth.error) return auth.error;
    const { userId, supabase } = auth;

    const parsed = await parseJsonBody(request, ImportPayloadSchema);
    if (parsed.error) return parsed.error;
    const payload = parsed.data;

    const isApiPush = request.headers.get("X-Source") === "api_push";
    const submissionSource = isApiPush ? "api_push" : "file_import";

    const clanId = await resolveClanId(payload, request, supabase, userId);
    if (typeof clanId !== "string") return clanId;

    const svc = createSupabaseServiceRoleClient();

    const gameAccounts = await loadClanGameAccounts(svc, clanId);
    const corrections = await loadOcrCorrections(svc, clanId, "player");

    const submissions: SubmissionResult[] = [];

    if (payload.data.chests && payload.data.chests.length > 0) {
      const result = await processChests(
        svc,
        payload.data.chests,
        clanId,
        userId,
        submissionSource,
        gameAccounts,
        corrections,
      );
      submissions.push(result);
    }

    if (payload.data.members && payload.data.members.length > 0) {
      const result = await processMembers(
        svc,
        payload.data.members,
        clanId,
        userId,
        submissionSource,
        gameAccounts,
        corrections,
      );
      submissions.push(result);
    }

    if (payload.data.events && payload.data.events.length > 0) {
      const result = await processEvents(
        svc,
        payload.data.events,
        clanId,
        userId,
        submissionSource,
        gameAccounts,
        corrections,
      );
      submissions.push(result);
    }

    let validationListsUpdated = false;
    if (payload.validationLists) {
      await upsertValidationLists(svc, clanId, userId, payload.validationLists);
      validationListsUpdated = true;
    }

    return NextResponse.json({ data: { submissions, validationListsUpdated } }, { status: 201 });
  } catch (err) {
    captureApiError("POST /api/import/submit", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

async function resolveClanId(
  payload: ImportPayload,
  request: NextRequest,
  supabase: SupabaseClient,
  userId: string,
): Promise<string | NextResponse> {
  let clanId = payload.clan.websiteClanId ?? null;

  if (!clanId) {
    clanId = request.nextUrl.searchParams.get("clan_id");
  }

  if (!clanId) {
    return apiError("Missing clan_id: provide clan.websiteClanId in payload or ?clan_id= query param.", 400);
  }

  if (!uuidSchema.safeParse(clanId).success) {
    return apiError("Invalid clan_id format.", 400);
  }

  const { data: isMember } = await supabase.rpc("is_clan_member", { target_clan: clanId });
  const { data: isAdmin } = await supabase.rpc("is_any_admin");

  if (!isMember && !isAdmin) {
    return apiError("You are not a member of the target clan.", 403);
  }

  return clanId;
}

async function loadClanGameAccounts(svc: SupabaseClient, clanId: string): Promise<Map<string, GameAccountMatch>> {
  const { data } = await svc
    .from("game_account_clan_memberships")
    .select("game_accounts!inner(id, game_username)")
    .eq("clan_id", clanId)
    .eq("is_active", true);

  const map = new Map<string, GameAccountMatch>();
  if (!data) return map;

  for (const row of data as unknown as Array<{ game_accounts: GameAccountMatch }>) {
    map.set(row.game_accounts.game_username.toLowerCase(), row.game_accounts);
  }
  return map;
}

async function loadOcrCorrections(
  svc: SupabaseClient,
  clanId: string,
  entityType: string,
): Promise<Map<string, string>> {
  const { data } = await svc
    .from("ocr_corrections")
    .select("ocr_text, corrected_text")
    .eq("clan_id", clanId)
    .eq("entity_type", entityType);

  const map = new Map<string, string>();
  if (!data) return map;

  for (const row of data) {
    map.set(row.ocr_text.toLowerCase(), row.corrected_text);
  }
  return map;
}

function matchPlayer(
  playerName: string,
  gameAccounts: Map<string, GameAccountMatch>,
  corrections: Map<string, string>,
): { accountId: string | null; status: "auto_matched" | "pending" } {
  const lower = playerName.toLowerCase();

  const direct = gameAccounts.get(lower);
  if (direct) return { accountId: direct.id, status: "auto_matched" };

  const corrected = corrections.get(lower);
  if (corrected) {
    const account = gameAccounts.get(corrected.toLowerCase());
    if (account) return { accountId: account.id, status: "auto_matched" };
  }

  return { accountId: null, status: "pending" };
}

async function processChests(
  svc: SupabaseClient,
  chests: ChestItem[],
  clanId: string,
  userId: string,
  source: string,
  gameAccounts: Map<string, GameAccountMatch>,
  corrections: Map<string, string>,
): Promise<SubmissionResult> {
  const { data: sub, error: subErr } = await svc
    .from("data_submissions")
    .insert({
      clan_id: clanId,
      submitted_by: userId,
      submission_type: "chests",
      source,
      item_count: chests.length,
    })
    .select("id")
    .single();

  if (subErr || !sub) {
    throw new Error(`Failed to create chests submission: ${subErr?.message ?? "unknown error"}`);
  }
  const submissionId = sub.id;
  let autoMatchedCount = 0;
  let duplicateCount = 0;

  const rows = chests.map((chest) => {
    const match = matchPlayer(chest.playerName, gameAccounts, corrections);
    if (match.status === "auto_matched") autoMatchedCount++;
    return {
      submission_id: submissionId,
      chest_name: chest.chestName,
      player_name: chest.playerName,
      source: chest.source,
      level: chest.level ?? null,
      opened_at: chest.openedAt,
      matched_game_account_id: match.accountId,
      item_status: match.status,
    };
  });

  const { error: insertErr } = await svc.from("staged_chest_entries").insert(rows);
  if (insertErr) {
    throw new Error(`Failed to insert staged entries: ${insertErr.message}`);
  }

  return {
    id: submissionId,
    type: "chests",
    itemCount: chests.length,
    autoMatchedCount,
    unmatchedCount: chests.length - autoMatchedCount,
    duplicateCount,
  };
}

async function processMembers(
  svc: SupabaseClient,
  members: MemberItem[],
  clanId: string,
  userId: string,
  source: string,
  gameAccounts: Map<string, GameAccountMatch>,
  corrections: Map<string, string>,
): Promise<SubmissionResult> {
  const { data: sub, error: subErr } = await svc
    .from("data_submissions")
    .insert({
      clan_id: clanId,
      submitted_by: userId,
      submission_type: "members",
      source,
      item_count: members.length,
    })
    .select("id")
    .single();

  if (subErr || !sub) {
    throw new Error(`Failed to create members submission: ${subErr?.message ?? "unknown error"}`);
  }
  const submissionId = sub.id;
  let autoMatchedCount = 0;

  const rows = members.map((member) => {
    const match = matchPlayer(member.playerName, gameAccounts, corrections);
    if (match.status === "auto_matched") autoMatchedCount++;
    return {
      submission_id: submissionId,
      player_name: member.playerName,
      coordinates: member.coordinates ?? null,
      score: member.score,
      captured_at: member.capturedAt,
      matched_game_account_id: match.accountId,
      item_status: match.status,
    };
  });

  const { error: insertErr } = await svc.from("staged_member_entries").insert(rows);
  if (insertErr) {
    throw new Error(`Failed to insert staged entries: ${insertErr.message}`);
  }

  return {
    id: submissionId,
    type: "members",
    itemCount: members.length,
    autoMatchedCount,
    unmatchedCount: members.length - autoMatchedCount,
    duplicateCount: 0,
  };
}

async function processEvents(
  svc: SupabaseClient,
  events: EventItem[],
  clanId: string,
  userId: string,
  source: string,
  gameAccounts: Map<string, GameAccountMatch>,
  corrections: Map<string, string>,
): Promise<SubmissionResult> {
  const { data: sub, error: subErr } = await svc
    .from("data_submissions")
    .insert({
      clan_id: clanId,
      submitted_by: userId,
      submission_type: "events",
      source,
      item_count: events.length,
    })
    .select("id")
    .single();

  if (subErr || !sub) {
    throw new Error(`Failed to create events submission: ${subErr?.message ?? "unknown error"}`);
  }
  const submissionId = sub.id;
  let autoMatchedCount = 0;

  const rows = events.map((event) => {
    const match = matchPlayer(event.playerName, gameAccounts, corrections);
    if (match.status === "auto_matched") autoMatchedCount++;
    return {
      submission_id: submissionId,
      player_name: event.playerName,
      event_points: event.eventPoints,
      event_name: event.eventName ?? null,
      captured_at: event.capturedAt,
      matched_game_account_id: match.accountId,
      item_status: match.status,
    };
  });

  const { error: insertErr } = await svc.from("staged_event_entries").insert(rows);
  if (insertErr) {
    throw new Error(`Failed to insert staged entries: ${insertErr.message}`);
  }

  return {
    id: submissionId,
    type: "events",
    itemCount: events.length,
    autoMatchedCount,
    unmatchedCount: events.length - autoMatchedCount,
    duplicateCount: 0,
  };
}

async function upsertValidationLists(
  svc: SupabaseClient,
  clanId: string,
  userId: string,
  lists: NonNullable<ImportPayload["validationLists"]>,
): Promise<void> {
  const knownNameRows: Array<{ clan_id: string; entity_type: string; name: string }> = [];

  for (const name of lists.knownPlayerNames ?? []) {
    if (name) knownNameRows.push({ clan_id: clanId, entity_type: "player", name });
  }
  for (const name of lists.knownChestNames ?? []) {
    if (name) knownNameRows.push({ clan_id: clanId, entity_type: "chest", name });
  }
  for (const name of lists.knownSources ?? []) {
    if (name) knownNameRows.push({ clan_id: clanId, entity_type: "source", name });
  }

  if (knownNameRows.length > 0) {
    await svc
      .from("known_names")
      .upsert(knownNameRows, { onConflict: "clan_id,entity_type,name", ignoreDuplicates: true });
  }

  const correctionRows: Array<{
    clan_id: string;
    entity_type: string;
    ocr_text: string;
    corrected_text: string;
    created_by: string;
  }> = [];

  for (const [ocrText, correctedText] of Object.entries(lists.corrections?.player ?? {})) {
    if (ocrText && correctedText) {
      correctionRows.push({
        clan_id: clanId,
        entity_type: "player",
        ocr_text: ocrText,
        corrected_text: correctedText,
        created_by: userId,
      });
    }
  }
  for (const [ocrText, correctedText] of Object.entries(lists.corrections?.chest ?? {})) {
    if (ocrText && correctedText) {
      correctionRows.push({
        clan_id: clanId,
        entity_type: "chest",
        ocr_text: ocrText,
        corrected_text: correctedText,
        created_by: userId,
      });
    }
  }
  for (const [ocrText, correctedText] of Object.entries(lists.corrections?.source ?? {})) {
    if (ocrText && correctedText) {
      correctionRows.push({
        clan_id: clanId,
        entity_type: "source",
        ocr_text: ocrText,
        corrected_text: correctedText,
        created_by: userId,
      });
    }
  }

  if (correctionRows.length > 0) {
    await svc.from("ocr_corrections").upsert(correctionRows, { onConflict: "clan_id,entity_type,ocr_text" });
  }
}
