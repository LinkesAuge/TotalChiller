import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { standardLimiter } from "@/lib/rate-limit";
import { requireAuth } from "@/lib/api/require-auth";
import { requireAdmin } from "@/lib/api/require-admin";
import { apiError, uuidSchema, parseJsonBody } from "@/lib/api/validation";
import { captureApiError } from "@/lib/api/logger";
import { SubmissionDetailQuerySchema, SubmissionPatchSchema } from "@/lib/api/import-schemas";
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
    const { page, per_page: perPage, item_status } = parsed.data;

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

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, display_name")
      .eq("id", submissionRaw.submitted_by)
      .maybeSingle();

    const submission = { ...submissionRaw, profiles: profile };

    const tableName = STAGED_TABLES[submission.submission_type as string];
    if (!tableName) {
      return apiError("Unknown submission type.", 500);
    }

    let itemsQuery = supabase
      .from(tableName)
      .select("*, game_accounts:matched_game_account_id(id, game_username)", { count: "exact" })
      .eq("submission_id", id)
      .order("created_at", { ascending: true });

    if (item_status) {
      itemsQuery = itemsQuery.eq("item_status", item_status);
    }

    const from = (page - 1) * perPage;
    const to = from + perPage - 1;
    itemsQuery = itemsQuery.range(from, to);

    const { data: items, error: itemsError, count } = await itemsQuery;

    if (itemsError) {
      captureApiError("GET /api/import/submissions/[id] items", itemsError);
      return apiError("Failed to load staged entries.", 500);
    }

    const { data: statusRows, error: statusError } = await supabase
      .from(tableName)
      .select("item_status")
      .eq("submission_id", id)
      .limit(10000);

    if (statusError) {
      captureApiError("GET /api/import/submissions/[id] statusCounts", statusError);
      return apiError("Failed to compute status counts.", 500);
    }

    const statusCounts: Record<string, number> = {};
    for (const row of statusRows ?? []) {
      const s = row.item_status as string;
      statusCounts[s] = (statusCounts[s] ?? 0) + 1;
    }

    const clanId = submissionRaw.clan_id as string;
    const svc = createSupabaseServiceRoleClient();
    const { data: membershipRows } = await svc
      .from("game_account_clan_memberships")
      .select("game_accounts!inner(id, game_username)")
      .eq("clan_id", clanId)
      .eq("is_active", true)
      .returns<Array<{ game_accounts: { id: string; game_username: string } }>>();

    const clanGameAccounts: Array<{ id: string; game_username: string }> = [];
    if (membershipRows) {
      for (const row of membershipRows) {
        clanGameAccounts.push(row.game_accounts);
      }
      clanGameAccounts.sort((a, b) => a.game_username.localeCompare(b.game_username));
    }

    return NextResponse.json({
      data: {
        submission,
        items: items ?? [],
        total: count ?? 0,
        page,
        perPage,
        statusCounts,
        clanGameAccounts,
      },
    });
  } catch (err) {
    captureApiError("GET /api/import/submissions/[id]", err);
    return apiError("Internal server error.", 500);
  }
}

/**
 * DELETE /api/import/submissions/[id] — Delete a submission (admin only).
 * Staged entries are removed via CASCADE FK. Production rows (chest_entries,
 * member_snapshots, event_results) keep their data — the FK is SET NULL.
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

    /* ── 1. Entry assignment ── */
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
