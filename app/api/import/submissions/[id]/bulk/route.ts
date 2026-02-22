import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { standardLimiter } from "@/lib/rate-limit";
import { requireAdmin } from "@/lib/api/require-admin";
import { apiError, uuidSchema, parseJsonBody } from "@/lib/api/validation";
import { captureApiError } from "@/lib/api/logger";
import { BulkEntryActionSchema } from "@/lib/api/import-schemas";
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

type StagedRow = Record<string, unknown>;

interface SubmissionRow {
  id: string;
  clan_id: string;
  submission_type: string;
  status: string;
  linked_event_id: string | null;
}

/**
 * POST /api/import/submissions/[id]/bulk
 *
 * Bulk operations on selected staged entries: delete, reject, approve, rematch.
 */
export async function POST(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const blocked = standardLimiter.check(request);
  if (blocked) return blocked;

  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;
    const { userId } = auth;

    const { id } = await context.params;
    const idParsed = uuidSchema.safeParse(id);
    if (!idParsed.success) return apiError("Invalid submission ID.", 400);

    const body = await parseJsonBody(request, BulkEntryActionSchema);
    if (body.error) return body.error;
    const { entryIds, action } = body.data;

    const svc = createSupabaseServiceRoleClient();

    const { data: sub, error: subErr } = await svc
      .from("data_submissions")
      .select("id, clan_id, submission_type, status, linked_event_id")
      .eq("id", id)
      .maybeSingle();

    if (subErr || !sub) return apiError("Submission not found.", 404);

    const submission = sub as unknown as SubmissionRow;
    const stagedTable = STAGED_TABLES[submission.submission_type];
    const productionTable = PRODUCTION_TABLES[submission.submission_type];
    if (!stagedTable || !productionTable) return apiError("Unknown submission type.", 500);

    let affectedCount = 0;

    if (action === "delete") {
      const { data: entries } = await svc
        .from(stagedTable)
        .select("id, item_status, player_name")
        .in("id", entryIds)
        .eq("submission_id", id);

      const approvedNames = (entries ?? [])
        .filter((e) => (e as { item_status: string }).item_status === "approved")
        .map((e) => (e as { player_name: string }).player_name);

      if (approvedNames.length > 0) {
        for (const name of approvedNames) {
          await svc.from(productionTable).delete().eq("submission_id", id).eq("player_name", name);
        }
      }

      const { error: delErr } = await svc.from(stagedTable).delete().in("id", entryIds).eq("submission_id", id);
      if (delErr) {
        captureApiError("POST /api/import/submissions/[id]/bulk (delete)", delErr);
        return apiError("Failed to delete entries.", 500);
      }
      affectedCount = entries?.length ?? 0;
    } else if (action === "reject") {
      const { error, count } = await svc
        .from(stagedTable)
        .update({ item_status: "rejected" })
        .in("id", entryIds)
        .eq("submission_id", id);
      if (error) {
        captureApiError("POST /api/import/submissions/[id]/bulk (reject)", error);
        return apiError("Failed to reject entries.", 500);
      }
      affectedCount = count ?? 0;
    } else if (action === "approve") {
      const { data: toCopy } = await svc
        .from(stagedTable)
        .select("*")
        .in("id", entryIds)
        .eq("submission_id", id)
        .neq("item_status", "approved");

      const { error, count } = await svc
        .from(stagedTable)
        .update({ item_status: "approved" })
        .in("id", entryIds)
        .eq("submission_id", id);
      if (error) {
        captureApiError("POST /api/import/submissions/[id]/bulk (approve)", error);
        return apiError("Failed to approve entries.", 500);
      }

      if (toCopy && toCopy.length > 0) {
        await copyToProduction(svc, toCopy as StagedRow[], submission, productionTable);
      }
      affectedCount = count ?? 0;
    } else if (action === "rematch") {
      const { data: membershipRows } = await svc
        .from("game_account_clan_memberships")
        .select("game_accounts!inner(id, game_username)")
        .eq("clan_id", submission.clan_id)
        .eq("is_active", true)
        .returns<Array<{ game_accounts: { id: string; game_username: string } }>>();

      const gameAccounts = new Map<string, { id: string; game_username: string }>();
      for (const row of membershipRows ?? []) {
        gameAccounts.set(row.game_accounts.game_username.toLowerCase(), row.game_accounts);
      }

      const { data: correctionRows } = await svc
        .from("ocr_corrections")
        .select("ocr_text, corrected_text")
        .eq("clan_id", submission.clan_id)
        .eq("entity_type", "player");

      const corrections = new Map<string, string>();
      for (const row of correctionRows ?? []) {
        corrections.set((row.ocr_text as string).toLowerCase(), row.corrected_text as string);
      }

      const { data: pendingRows } = await svc
        .from(stagedTable)
        .select("id, player_name")
        .in("id", entryIds)
        .eq("submission_id", id)
        .eq("item_status", "pending")
        .is("matched_game_account_id", null);

      const groupedByAccount = new Map<string, string[]>();
      for (const row of pendingRows ?? []) {
        const playerName = (row.player_name as string).toLowerCase();
        let matched = gameAccounts.get(playerName);
        if (!matched) {
          const corrected = corrections.get(playerName);
          if (corrected) matched = gameAccounts.get(corrected.toLowerCase());
        }
        if (!matched) continue;
        const ids = groupedByAccount.get(matched.id) ?? [];
        ids.push(row.id as string);
        groupedByAccount.set(matched.id, ids);
      }

      affectedCount = 0;
      for (const [accountId, ids] of groupedByAccount.entries()) {
        const { error } = await svc
          .from(stagedTable)
          .update({ matched_game_account_id: accountId, item_status: "auto_matched" })
          .in("id", ids)
          .eq("submission_id", id)
          .eq("item_status", "pending")
          .is("matched_game_account_id", null);
        if (error) {
          captureApiError("POST /api/import/submissions/[id]/bulk (rematch update)", error);
          return apiError("Re-matching failed.", 500);
        }
        affectedCount += ids.length;
      }
    }

    // Recompute counts
    const [{ data: statusRows }, { count: matchedTotal }, { count: remaining }] = await Promise.all([
      svc.from(stagedTable).select("item_status").eq("submission_id", id).limit(10000),
      svc
        .from(stagedTable)
        .select("id", { count: "exact", head: true })
        .eq("submission_id", id)
        .not("matched_game_account_id", "is", null),
      svc.from(stagedTable).select("id", { count: "exact", head: true }).eq("submission_id", id),
    ]);

    if (remaining === 0) {
      await svc.from("data_submissions").delete().eq("id", id);
      return NextResponse.json({ data: { affectedCount, submissionDeleted: true } });
    }

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
        approved_count: counts.approved,
        rejected_count: counts.rejected,
        matched_count: matchedTotal ?? 0,
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
        status: submissionStatus,
      })
      .eq("id", id);

    return NextResponse.json({
      data: {
        affectedCount,
        submissionDeleted: false,
        submissionStatus,
        counts,
      },
    });
  } catch (err) {
    captureApiError("POST /api/import/submissions/[id]/bulk", err);
    return apiError("Internal server error.", 500);
  }
}

function mapToProductionRow(item: StagedRow, sub: SubmissionRow): Record<string, unknown> {
  const base = {
    clan_id: sub.clan_id,
    submission_id: sub.id,
    game_account_id: (item.matched_game_account_id as string | null) ?? null,
    player_name: item.player_name as string,
  };

  switch (sub.submission_type) {
    case "chests":
      return {
        ...base,
        chest_name: item.chest_name,
        source: item.source,
        level: item.level ?? null,
        opened_at: item.opened_at,
      };
    case "members":
      return {
        ...base,
        coordinates: item.coordinates ?? null,
        score: item.score ?? null,
        snapshot_date: item.captured_at,
      };
    case "events":
      return {
        ...base,
        event_points: item.event_points,
        event_name: item.event_name ?? null,
        event_date: item.captured_at,
        linked_event_id: sub.linked_event_id,
      };
    default:
      throw new Error(`Unknown submission type: ${sub.submission_type}`);
  }
}

async function copyToProduction(
  svc: SupabaseClient,
  items: StagedRow[],
  sub: SubmissionRow,
  table: string,
): Promise<number> {
  const rows = items.map((item) => mapToProductionRow(item, sub));
  const { data } = await svc.from(table).insert(rows).select("id");
  return data?.length ?? 0;
}
