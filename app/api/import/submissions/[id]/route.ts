import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { standardLimiter } from "@/lib/rate-limit";
import { requireAuth } from "@/lib/api/require-auth";
import { requireAdmin } from "@/lib/api/require-admin";
import { apiError, uuidSchema, parseJsonBody } from "@/lib/api/validation";
import { captureApiError } from "@/lib/api/logger";
import { SubmissionDetailQuerySchema, SubmissionPatchSchema } from "@/lib/api/import-schemas";
import type { SupabaseClient } from "@supabase/supabase-js";
import createSupabaseServiceRoleClient from "@/lib/supabase/service-role-client";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const STAGED_TABLES: Record<string, string> = {
  chests: "staged_chest_entries",
  members: "staged_member_entries",
  events: "staged_event_entries",
};

const PRODUCTION_TABLES: Record<string, string> = {
  chests: "chest_entries",
  members: "member_snapshots",
  events: "event_results",
};

type SubmissionType = "chests" | "members" | "events";

interface StagedEntryForProductionMatch {
  player_name: string;
  chest_name?: string | null;
  source?: string | null;
  level?: string | null;
  opened_at?: string | null;
  coordinates?: string | null;
  score?: number | null;
  captured_at?: string | null;
  event_name?: string | null;
  event_points?: number | null;
}

function applyNullableEq<Q>(query: Q, column: string, value: unknown): Q {
  const q = query as unknown as { is: (col: string, val: null) => Q; eq: (col: string, val: unknown) => Q };
  if (value === null || value === undefined) return q.is(column, null);
  return q.eq(column, value);
}

async function buildFilterOptionsQuery(
  supabase: SupabaseClient,
  tableName: string,
  subTypeStr: string,
  submissionId: string,
): Promise<Record<string, unknown[]>> {
  const filterOptions: Record<string, unknown[]> = {};
  const playerNameQuery = supabase.from(tableName).select("player_name").eq("submission_id", submissionId).limit(10000);

  if (subTypeStr === "chests") {
    const [{ data: playerNames }, { data: chestNames }, { data: sources }] = await Promise.all([
      playerNameQuery,
      supabase.from(tableName).select("chest_name").eq("submission_id", submissionId).limit(10000),
      supabase.from(tableName).select("source").eq("submission_id", submissionId).limit(10000),
    ]);
    filterOptions.player_name = [
      ...new Set((playerNames ?? []).map((r: { player_name: string }) => r.player_name)),
    ].sort();
    filterOptions.chest_name = [...new Set((chestNames ?? []).map((r: { chest_name: string }) => r.chest_name))].sort();
    filterOptions.source = [...new Set((sources ?? []).map((r: { source: string }) => r.source))].sort();
  } else if (subTypeStr === "events") {
    const [{ data: playerNames }, { data: eventNames }] = await Promise.all([
      playerNameQuery,
      supabase
        .from(tableName)
        .select("event_name")
        .eq("submission_id", submissionId)
        .not("event_name", "is", null)
        .limit(10000),
    ]);
    filterOptions.player_name = [
      ...new Set((playerNames ?? []).map((r: { player_name: string }) => r.player_name)),
    ].sort();
    filterOptions.event_name = [...new Set((eventNames ?? []).map((r: { event_name: string }) => r.event_name))].sort();
  } else {
    const { data: playerNames } = await playerNameQuery;
    filterOptions.player_name = [
      ...new Set((playerNames ?? []).map((r: { player_name: string }) => r.player_name)),
    ].sort();
  }

  return filterOptions;
}

async function findProductionRowIdsForStagedEntry(
  svc: ReturnType<typeof createSupabaseServiceRoleClient>,
  productionTable: string,
  submissionType: SubmissionType,
  submissionId: string,
  stagedEntry: StagedEntryForProductionMatch,
  limit = 1,
): Promise<string[]> {
  let query = svc
    .from(productionTable)
    .select("id")
    .eq("submission_id", submissionId)
    .eq("player_name", stagedEntry.player_name)
    .limit(limit);

  if (submissionType === "chests") {
    query = query.eq("chest_name", stagedEntry.chest_name ?? "").eq("source", stagedEntry.source ?? "");
    query = applyNullableEq(query, "level", stagedEntry.level ?? null);
    query = query.eq("opened_at", stagedEntry.opened_at ?? "");
  } else if (submissionType === "members") {
    query = applyNullableEq(query, "coordinates", stagedEntry.coordinates ?? null);
    query = applyNullableEq(query, "score", stagedEntry.score ?? null);
    query = query.eq("snapshot_date", stagedEntry.captured_at ?? "");
  } else {
    query = applyNullableEq(query, "event_name", stagedEntry.event_name ?? null);
    query = query.eq("event_points", stagedEntry.event_points ?? 0);
    query = query.eq("event_date", stagedEntry.captured_at ?? "");
  }

  const { data } = await query;
  return (data ?? []).map((row) => row.id as string);
}

/**
 * GET /api/import/submissions/[id] — Submission detail with paginated staged entries.
 */
export async function GET(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const blocked = standardLimiter.check(request);
  if (blocked) return blocked;

  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { supabase } = auth;

    const { id } = await context.params;
    const idParsed = uuidSchema.safeParse(id);
    if (!idParsed.success) return apiError("Invalid submission ID.", 400);

    const raw = Object.fromEntries(request.nextUrl.searchParams);
    const parsed = SubmissionDetailQuerySchema.safeParse(raw);
    if (!parsed.success) {
      return apiError("Invalid query parameters.", 400);
    }
    const {
      page,
      per_page: perPage,
      item_status,
      search,
      unmatched,
      filter_chest_name,
      filter_source,
      filter_event_name,
      filter_player_name,
      filter_matched_player,
      sort_by,
      sort_dir,
      skip_filter_options,
    } = parsed.data;

    const SORTABLE_COLUMNS: Record<string, ReadonlySet<string>> = {
      chests: new Set(["player_name", "chest_name", "source", "level", "opened_at", "item_status", "created_at"]),
      members: new Set(["player_name", "coordinates", "score", "captured_at", "item_status", "created_at"]),
      events: new Set(["player_name", "event_name", "event_points", "captured_at", "item_status", "created_at"]),
    };

    const { data: submissionRaw, error: subError } = await supabase
      .from("data_submissions")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (subError) {
      captureApiError("GET /api/import/submissions/[id]", subError);
      return apiError("Failed to load submission.", 500);
    }
    if (!submissionRaw) return apiError("Submission not found.", 404);

    const subTypeStr = submissionRaw.submission_type as string;
    const tableName = STAGED_TABLES[subTypeStr];
    if (!tableName) {
      return apiError("Unknown submission type.", 500);
    }

    const allowedSort = SORTABLE_COLUMNS[subTypeStr];
    const resolvedSortCol = sort_by && allowedSort?.has(sort_by) ? sort_by : "created_at";
    const resolvedSortAsc = sort_dir !== "desc";
    const skipFilters = skip_filter_options === "true";
    const clanId = submissionRaw.clan_id as string;

    // -- Build items query (with filters, sort, pagination) --
    let itemsQuery = supabase
      .from(tableName)
      .select("*, game_accounts:matched_game_account_id(id, game_username)", { count: "exact" })
      .eq("submission_id", id)
      .order(resolvedSortCol, { ascending: resolvedSortAsc });

    if (item_status) itemsQuery = itemsQuery.eq("item_status", item_status);
    if (search) {
      const searchLower = `%${search.toLowerCase()}%`;
      if (subTypeStr === "chests") {
        itemsQuery = itemsQuery.or(
          `player_name.ilike.${searchLower},chest_name.ilike.${searchLower},source.ilike.${searchLower}`,
        );
      } else if (subTypeStr === "events") {
        itemsQuery = itemsQuery.or(`player_name.ilike.${searchLower},event_name.ilike.${searchLower}`);
      } else {
        itemsQuery = itemsQuery.ilike("player_name", searchLower);
      }
    }
    if (unmatched === "true") itemsQuery = itemsQuery.is("matched_game_account_id", null);
    if (filter_player_name) itemsQuery = itemsQuery.eq("player_name", filter_player_name);
    if (filter_matched_player) itemsQuery = itemsQuery.eq("matched_game_account_id", filter_matched_player);
    if (filter_chest_name) itemsQuery = itemsQuery.eq("chest_name", filter_chest_name);
    if (filter_source) itemsQuery = itemsQuery.eq("source", filter_source);
    if (filter_event_name) itemsQuery = itemsQuery.eq("event_name", filter_event_name);

    const from = (page - 1) * perPage;
    const to = from + perPage - 1;
    itemsQuery = itemsQuery.range(from, to);

    // -- Build all independent queries to run in parallel --
    const profilePromise = supabase
      .from("profiles")
      .select("id, display_name")
      .eq("id", submissionRaw.submitted_by)
      .maybeSingle();

    const itemsPromise = itemsQuery;

    const statusCountsPromise = Promise.all([
      supabase
        .from(tableName)
        .select("id", { count: "exact", head: true })
        .eq("submission_id", id)
        .eq("item_status", "pending"),
      supabase
        .from(tableName)
        .select("id", { count: "exact", head: true })
        .eq("submission_id", id)
        .eq("item_status", "auto_matched"),
      supabase
        .from(tableName)
        .select("id", { count: "exact", head: true })
        .eq("submission_id", id)
        .eq("item_status", "approved"),
      supabase
        .from(tableName)
        .select("id", { count: "exact", head: true })
        .eq("submission_id", id)
        .eq("item_status", "rejected"),
    ]);

    const filterOptionsPromise = skipFilters
      ? Promise.resolve(null)
      : buildFilterOptionsQuery(supabase, tableName, subTypeStr, id);

    const svc = createSupabaseServiceRoleClient();
    const clanGameAccountsPromise = skipFilters
      ? Promise.resolve(null)
      : svc
          .from("game_account_clan_memberships")
          .select("game_accounts!inner(id, game_username)")
          .eq("clan_id", clanId)
          .eq("is_active", true)
          .returns<Array<{ game_accounts: { id: string; game_username: string } }>>();

    // -- Execute all in parallel --
    const [profileResult, itemsResult, statusCountsResult, filterOptionsResult, clanGameAccountsResult] =
      await Promise.all([
        profilePromise,
        itemsPromise,
        statusCountsPromise,
        filterOptionsPromise,
        clanGameAccountsPromise,
      ]);

    if (itemsResult.error) {
      captureApiError("GET /api/import/submissions/[id] items", itemsResult.error);
      return apiError("Failed to load staged entries.", 500);
    }

    const [pendingCount, autoMatchedCount, approvedCount, rejectedCount] = statusCountsResult;
    const statusCounts: Record<string, number> = {
      pending: pendingCount.count ?? 0,
      auto_matched: autoMatchedCount.count ?? 0,
      approved: approvedCount.count ?? 0,
      rejected: rejectedCount.count ?? 0,
    };

    const submission = { ...submissionRaw, profiles: profileResult.data };

    let clanGameAccounts: Array<{ id: string; game_username: string }> | null = null;
    if (clanGameAccountsResult && "data" in clanGameAccountsResult && clanGameAccountsResult.data) {
      clanGameAccounts = clanGameAccountsResult.data
        .map((row) => row.game_accounts)
        .sort((a, b) => a.game_username.localeCompare(b.game_username));
    }

    return NextResponse.json({
      data: {
        submission,
        items: itemsResult.data ?? [],
        total: itemsResult.count ?? 0,
        page,
        perPage,
        statusCounts,
        clanGameAccounts,
        filterOptions: filterOptionsResult,
      },
    });
  } catch (err) {
    captureApiError("GET /api/import/submissions/[id]", err);
    return apiError("Internal server error.", 500);
  }
}

/**
 * DELETE /api/import/submissions/[id] — Delete a submission or a single entry (admin only).
 *
 * Without ?entryId: deletes the whole submission. Staged entries are removed via
 * CASCADE FK. Production rows keep their data (FK is SET NULL).
 *
 * With ?entryId=uuid: deletes a single staged entry. Updates counts on the
 * submission. If the entry was approved, also removes the production row.
 * If it was the last entry, deletes the entire submission.
 */
export async function DELETE(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const blocked = standardLimiter.check(request);
  if (blocked) return blocked;

  try {
    const admin = await requireAdmin();
    if (admin.error) return admin.error;

    const { id } = await context.params;
    const idParsed = uuidSchema.safeParse(id);
    if (!idParsed.success) return apiError("Invalid submission ID.", 400);

    const svc = createSupabaseServiceRoleClient();
    const entryId = request.nextUrl.searchParams.get("entryId");

    /* ── Delete single entry ── */
    if (entryId) {
      const entryIdParsed = uuidSchema.safeParse(entryId);
      if (!entryIdParsed.success) return apiError("Invalid entry ID.", 400);

      const { data: submission, error: subErr } = await svc
        .from("data_submissions")
        .select("id, submission_type, status, clan_id")
        .eq("id", id)
        .maybeSingle();
      if (subErr || !submission) return apiError("Submission not found.", 404);

      const subType = submission.submission_type as string;
      const tableName = STAGED_TABLES[subType];
      const productionTable = PRODUCTION_TABLES[subType];
      if (!tableName) return apiError("Unknown submission type.", 500);

      const { data: entry, error: entryErr } = await svc
        .from(tableName)
        .select("*")
        .eq("id", entryId)
        .eq("submission_id", id)
        .maybeSingle();

      if (entryErr || !entry) return apiError("Entry not found in this submission.", 404);

      if ((entry.item_status as string) === "approved" && productionTable) {
        const productionIds = await findProductionRowIdsForStagedEntry(
          svc,
          productionTable,
          subType as SubmissionType,
          id,
          entry as unknown as StagedEntryForProductionMatch,
          1,
        );
        if (productionIds.length > 0) {
          const { error: prodDeleteErr } = await svc.from(productionTable).delete().in("id", productionIds);
          if (prodDeleteErr) {
            captureApiError("DELETE /api/import/submissions/[id] entry production", prodDeleteErr);
            return apiError("Failed to delete linked production entry.", 500);
          }
        }
      }

      const { error: delErr } = await svc.from(tableName).delete().eq("id", entryId).eq("submission_id", id);
      if (delErr) {
        captureApiError("DELETE /api/import/submissions/[id] entry", delErr);
        return apiError("Failed to delete entry.", 500);
      }

      const { count: remaining } = await svc
        .from(tableName)
        .select("id", { count: "exact", head: true })
        .eq("submission_id", id);

      if (remaining === 0) {
        await svc.from("data_submissions").delete().eq("id", id);
        return NextResponse.json({ data: { deleted: true, submissionDeleted: true } });
      }

      const { data: statusRows } = await svc.from(tableName).select("item_status").eq("submission_id", id).limit(10000);
      const { count: matchedTotal } = await svc
        .from(tableName)
        .select("id", { count: "exact", head: true })
        .eq("submission_id", id)
        .not("matched_game_account_id", "is", null);

      const counts = { approved: 0, rejected: 0, pending: 0, auto_matched: 0 };
      for (const row of (statusRows ?? []) as Array<{ item_status: string }>) {
        const s = row.item_status as keyof typeof counts;
        if (s in counts) counts[s]++;
      }
      const total = counts.approved + counts.rejected + counts.pending + counts.auto_matched;
      let submissionStatus: string;
      if (total === 0) submissionStatus = "pending";
      else if (counts.approved === total) submissionStatus = "approved";
      else if (counts.rejected === total) submissionStatus = "rejected";
      else submissionStatus = "partial";

      await svc
        .from("data_submissions")
        .update({
          item_count: remaining ?? 0,
          matched_count: matchedTotal ?? 0,
          approved_count: counts.approved,
          rejected_count: counts.rejected,
          status: submissionStatus,
        })
        .eq("id", id);

      return NextResponse.json({ data: { deleted: true, submissionDeleted: false, remaining } });
    }

    /* ── Delete whole submission ── */
    const { data: existing, error: fetchError } = await svc
      .from("data_submissions")
      .select("id, status")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      captureApiError("DELETE /api/import/submissions/[id] fetch", fetchError);
      return apiError("Failed to look up submission.", 500);
    }
    if (!existing) return apiError("Submission not found.", 404);

    const { error: deleteError } = await svc.from("data_submissions").delete().eq("id", id);

    if (deleteError) {
      captureApiError("DELETE /api/import/submissions/[id]", deleteError);
      return apiError("Failed to delete submission.", 500);
    }

    return NextResponse.json({ data: { deleted: true } });
  } catch (err) {
    captureApiError("DELETE /api/import/submissions/[id]", err);
    return apiError("Internal server error.", 500);
  }
}

/**
 * PATCH /api/import/submissions/[id] — Update submission metadata or assign entries.
 *
 * Supports three operations (all editable at any time regardless of status):
 * 1. Set/change reference_date (primarily for member submissions)
 * 2. Set/change/unlink linked_event_id (for event submissions)
 * 3. Assign a game account to a staged entry (entryId + matchGameAccountId)
 */
export async function PATCH(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const blocked = standardLimiter.check(request);
  if (blocked) return blocked;

  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;
    const { supabase: _supabase } = auth;

    const { id } = await context.params;
    const idParsed = uuidSchema.safeParse(id);
    if (!idParsed.success) return apiError("Invalid submission ID.", 400);

    const body = await parseJsonBody(request, SubmissionPatchSchema);
    if (body.error) return body.error;
    const patch = body.data;

    const svc = createSupabaseServiceRoleClient();

    const { data: submission, error: subErr } = await svc
      .from("data_submissions")
      .select("id, clan_id, submission_type, status")
      .eq("id", id)
      .maybeSingle();

    if (subErr || !submission) return apiError("Submission not found.", 404);

    const subType = submission.submission_type as string;
    const subStatus = submission.status as string;
    const clanId = submission.clan_id as string;

    /* ── 1a. Entry field editing ── */
    if (patch.entryId !== undefined && patch.editFields !== undefined) {
      const tableName = STAGED_TABLES[subType];
      const productionTable = PRODUCTION_TABLES[subType];
      if (!tableName) return apiError("Unknown submission type.", 500);

      const allowedFields: Record<string, readonly string[]> = {
        chests: ["player_name", "chest_name", "source", "level", "opened_at"],
        members: ["player_name", "coordinates", "score", "captured_at"],
        events: ["player_name", "event_name", "event_points", "captured_at"],
      };
      const allowed = new Set(allowedFields[subType] ?? []);
      const updates: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(patch.editFields)) {
        if (val !== undefined && allowed.has(key)) {
          updates[key] = val;
        }
      }
      if (Object.keys(updates).length === 0) {
        return apiError("No valid fields to update for this submission type.", 400);
      }

      const { data: currentEntry, error: currentErr } = await svc
        .from(tableName)
        .select("*")
        .eq("id", patch.entryId)
        .eq("submission_id", id)
        .maybeSingle();

      if (currentErr || !currentEntry) return apiError("Entry not found in this submission.", 404);

      const { error: updateErr } = await svc
        .from(tableName)
        .update(updates)
        .eq("id", patch.entryId)
        .eq("submission_id", id);

      if (updateErr) {
        captureApiError("PATCH /api/import/submissions/[id] editFields", updateErr);
        return apiError("Failed to update entry.", 500);
      }

      if ((currentEntry.item_status as string) === "approved" && productionTable) {
        const prodUpdates: Record<string, unknown> = {};
        const fieldMap: Record<string, string> = {
          player_name: "player_name",
          chest_name: "chest_name",
          source: "source",
          level: "level",
          opened_at: "opened_at",
          coordinates: "coordinates",
          score: "score",
          captured_at: subType === "members" ? "snapshot_date" : "event_date",
          event_name: "event_name",
          event_points: "event_points",
        };
        for (const [key, val] of Object.entries(updates)) {
          const prodKey = fieldMap[key];
          if (prodKey) prodUpdates[prodKey] = val;
        }
        if (Object.keys(prodUpdates).length > 0) {
          const productionIds = await findProductionRowIdsForStagedEntry(
            svc,
            productionTable,
            subType as SubmissionType,
            id,
            currentEntry as unknown as StagedEntryForProductionMatch,
            1,
          );
          if (productionIds.length > 0) {
            const { error: prodUpdateErr } = await svc
              .from(productionTable)
              .update(prodUpdates)
              .in("id", productionIds);
            if (prodUpdateErr) {
              captureApiError("PATCH /api/import/submissions/[id] editFields production", prodUpdateErr);
              return apiError("Staged entry updated but production sync failed.", 500);
            }
          }
        }
      }

      return NextResponse.json({ data: { updated: true } });
    }

    /* ── 1b. Entry assignment ── */
    if (patch.entryId !== undefined && patch.matchGameAccountId !== undefined) {
      const tableName = STAGED_TABLES[subType];
      if (!tableName) return apiError("Unknown submission type.", 500);

      const { data: currentEntry, error: currentErr } = await svc
        .from(tableName)
        .select("item_status, player_name")
        .eq("id", patch.entryId)
        .eq("submission_id", id)
        .maybeSingle();

      if (currentErr || !currentEntry) return apiError("Entry not found in this submission.", 404);

      const prevStatus = currentEntry.item_status as string;
      const preserveStatus = prevStatus === "approved" || prevStatus === "rejected";
      const newStatus = preserveStatus ? prevStatus : patch.matchGameAccountId ? "auto_matched" : "pending";

      const { data: updated, error: updateErr } = await svc
        .from(tableName)
        .update({
          matched_game_account_id: patch.matchGameAccountId,
          item_status: newStatus,
        })
        .eq("id", patch.entryId)
        .eq("submission_id", id)
        .select(
          "id, player_name, item_status, matched_game_account_id, game_accounts:matched_game_account_id(id, game_username)",
        )
        .maybeSingle();

      if (updateErr) {
        captureApiError("PATCH /api/import/submissions/[id] assign", updateErr);
        return apiError("Failed to update entry.", 500);
      }
      if (!updated) return apiError("Entry not found in this submission.", 404);

      if (prevStatus === "approved") {
        const productionTable = PRODUCTION_TABLES[subType];
        if (productionTable) {
          const { error: prodErr } = await svc
            .from(productionTable)
            .update({ game_account_id: patch.matchGameAccountId })
            .eq("submission_id", id)
            .eq("player_name", currentEntry.player_name as string);

          if (prodErr) {
            captureApiError("PATCH /api/import/submissions/[id] production propagation", prodErr);
            return apiError("Staged entry updated but production sync failed.", 500);
          }

          await svc
            .from(tableName)
            .update({ matched_game_account_id: patch.matchGameAccountId })
            .eq("submission_id", id)
            .eq("player_name", currentEntry.player_name as string)
            .eq("item_status", "approved")
            .neq("id", patch.entryId);
        }
      }

      const { count: matchedTotal } = await svc
        .from(tableName)
        .select("id", { count: "exact", head: true })
        .eq("submission_id", id)
        .not("matched_game_account_id", "is", null);

      const newMatchedCount = matchedTotal ?? 0;

      await svc.from("data_submissions").update({ matched_count: newMatchedCount }).eq("id", id);

      if (patch.saveCorrection && patch.matchGameAccountId && updated.player_name) {
        const raw = updated.game_accounts as unknown;
        const gameAccount = Array.isArray(raw)
          ? (raw[0] as { id: string; game_username: string } | undefined)
          : (raw as { id: string; game_username: string } | null);
        if (gameAccount) {
          await svc.from("ocr_corrections").upsert(
            {
              clan_id: clanId,
              entity_type: "player",
              ocr_text: updated.player_name,
              corrected_text: gameAccount.game_username,
            },
            { onConflict: "clan_id,entity_type,ocr_text" },
          );
        }
      }

      return NextResponse.json({
        data: {
          ...updated,
          matchedCount: newMatchedCount,
        },
      });
    }

    /* ── 2. Metadata updates ── */
    const submissionUpdate: Record<string, unknown> = {};
    const warnings: string[] = [];

    if (patch.referenceDate !== undefined) {
      const newDate = patch.referenceDate;
      submissionUpdate.reference_date = newDate;

      if (newDate && subType === "members") {
        const { data: existing } = await svc
          .from("data_submissions")
          .select("id, item_count, status")
          .eq("clan_id", clanId)
          .eq("submission_type", "members")
          .eq("reference_date", newDate)
          .neq("id", id)
          .limit(1)
          .maybeSingle();

        if (existing) {
          warnings.push(
            `Another member submission for ${newDate} already exists (${existing.item_count} entries, status: ${existing.status}).`,
          );
        }
      }

      if (subStatus === "approved" && subType === "members" && newDate) {
        await svc.from("member_snapshots").update({ snapshot_date: newDate }).eq("submission_id", id);
      }
    }

    if (patch.linkedEventId !== undefined) {
      if (subType !== "events") {
        return apiError("linked_event_id can only be set on event submissions.", 400);
      }

      const eventId = patch.linkedEventId;

      if (eventId) {
        const { data: evt } = await svc.from("events").select("id, clan_id").eq("id", eventId).maybeSingle();

        if (!evt) return apiError("Event not found.", 404);
        if ((evt.clan_id as string) !== clanId) {
          return apiError("Event belongs to a different clan.", 403);
        }

        const { data: existingLink } = await svc
          .from("data_submissions")
          .select("id, item_count, status")
          .eq("linked_event_id", eventId)
          .neq("id", id)
          .limit(1)
          .maybeSingle();

        if (existingLink) {
          warnings.push(
            `Another submission is already linked to this event (${existingLink.item_count} entries, status: ${existingLink.status}).`,
          );
        }
      }

      submissionUpdate.linked_event_id = eventId;

      if (subStatus === "approved") {
        await svc.from("event_results").update({ linked_event_id: eventId }).eq("submission_id", id);
      }
    }

    if (Object.keys(submissionUpdate).length === 0) {
      return apiError("No fields to update.", 400);
    }

    const { error: updateErr } = await svc.from("data_submissions").update(submissionUpdate).eq("id", id);

    if (updateErr) {
      captureApiError("PATCH /api/import/submissions/[id] metadata", updateErr);
      return apiError("Failed to update submission.", 500);
    }

    return NextResponse.json({
      data: { updated: true, warnings: warnings.length > 0 ? warnings : undefined },
    });
  } catch (err) {
    captureApiError("PATCH /api/import/submissions/[id]", err);
    return apiError("Internal server error.", 500);
  }
}
