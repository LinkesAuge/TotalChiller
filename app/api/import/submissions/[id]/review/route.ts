import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { standardLimiter } from "@/lib/rate-limit";
import { requireAdmin } from "@/lib/api/require-admin";
import { apiError, parseJsonBody, uuidSchema } from "@/lib/api/validation";
import { captureApiError } from "@/lib/api/logger";
import { ReviewRequestSchema, type ReviewItemAction } from "@/lib/api/import-schemas";
import createSupabaseServiceRoleClient from "@/lib/supabase/service-role-client";

const STAGED_TABLE: Record<string, string> = {
  chests: "staged_chest_entries",
  members: "staged_member_entries",
  events: "staged_event_entries",
};

const PRODUCTION_TABLE: Record<string, string> = {
  chests: "chest_entries",
  members: "member_snapshots",
  events: "event_results",
};

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface SubmissionRow {
  id: string;
  clan_id: string;
  submission_type: string;
  status: string;
  linked_event_id: string | null;
}

type StagedRow = Record<string, unknown>;

export async function POST(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const blocked = standardLimiter.check(request);
  if (blocked) return blocked;

  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;
    const { userId, supabase: _supabase } = auth;

    const { id } = await context.params;
    const idResult = uuidSchema.safeParse(id);
    if (!idResult.success) return apiError("Invalid submission ID.", 400);

    const body = await parseJsonBody(request, ReviewRequestSchema);
    if (body.error) return body.error;
    const review = body.data;

    const svc = createSupabaseServiceRoleClient();

    const { data: sub, error: subErr } = await svc
      .from("data_submissions")
      .select("id, clan_id, submission_type, status, linked_event_id")
      .eq("id", id)
      .single()
      .returns<SubmissionRow>();

    if (subErr || !sub) return apiError("Submission not found.", 404);
    if (sub.status !== "pending" && sub.status !== "partial") {
      return apiError("Submission is not reviewable.", 409);
    }

    const stagedTable = STAGED_TABLE[sub.submission_type];
    const productionTable = PRODUCTION_TABLE[sub.submission_type];
    if (!stagedTable || !productionTable) {
      return apiError("Unknown submission type.", 400);
    }

    let productionRowsCreated = 0;

    if (review.action) {
      productionRowsCreated = await processBulkAction(svc, review.action, sub, stagedTable, productionTable);
    } else if (review.items) {
      productionRowsCreated = await processItemActions(svc, review.items, sub, stagedTable, productionTable, userId);
    }

    const [{ data: statusRows }, { count: matchedTotal }] = await Promise.all([
      svc.from(stagedTable).select("item_status").eq("submission_id", sub.id).limit(10000),
      svc
        .from(stagedTable)
        .select("id", { count: "exact", head: true })
        .eq("submission_id", sub.id)
        .not("matched_game_account_id", "is", null),
    ]);

    const counts = { approved: 0, rejected: 0, pending: 0, auto_matched: 0 };
    for (const row of (statusRows ?? []) as Array<{ item_status: string }>) {
      const s = row.item_status as keyof typeof counts;
      if (s in counts) counts[s]++;
    }

    const total = counts.approved + counts.rejected + counts.pending + counts.auto_matched;
    let submissionStatus: string;
    if (total === 0) {
      submissionStatus = "pending";
    } else if (counts.approved === total) {
      submissionStatus = "approved";
    } else if (counts.rejected === total) {
      submissionStatus = "rejected";
    } else {
      submissionStatus = "partial";
    }

    const { error: updateErr } = await svc
      .from("data_submissions")
      .update({
        approved_count: counts.approved,
        rejected_count: counts.rejected,
        matched_count: matchedTotal ?? 0,
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
        status: submissionStatus,
      })
      .eq("id", sub.id);

    if (updateErr) {
      captureApiError("POST /api/import/submissions/[id]/review (status update)", updateErr);
      return apiError("Failed to update submission status.", 500);
    }

    return NextResponse.json({
      data: {
        submissionStatus,
        approvedCount: counts.approved,
        rejectedCount: counts.rejected,
        productionRowsCreated,
      },
    });
  } catch (err) {
    captureApiError("POST /api/import/submissions/[id]/review", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

/* ── Bulk actions ── */

async function processBulkAction(
  svc: SupabaseClient,
  action: string,
  submission: SubmissionRow,
  stagedTable: string,
  productionTable: string,
): Promise<number> {
  if (action === "reject_all") {
    const { error } = await svc
      .from(stagedTable)
      .update({ item_status: "rejected" })
      .eq("submission_id", submission.id);
    if (error) captureApiError("POST /api/import/submissions/[id]/review (reject_all)", error);
    return 0;
  }

  // approve_all  → fetch items not yet approved (avoids re-copying to production)
  // approve_matched → fetch only auto_matched items
  const { data: toCopy } =
    action === "approve_matched"
      ? await svc
          .from(stagedTable)
          .select("*")
          .eq("submission_id", submission.id)
          .eq("item_status", "auto_matched")
          .limit(10000)
      : await svc
          .from(stagedTable)
          .select("*")
          .eq("submission_id", submission.id)
          .neq("item_status", "approved")
          .limit(10000);

  if (action === "approve_all") {
    const { error } = await svc
      .from(stagedTable)
      .update({ item_status: "approved" })
      .eq("submission_id", submission.id);
    if (error) captureApiError("POST /api/import/submissions/[id]/review (approve_all)", error);
  } else if (toCopy && toCopy.length > 0) {
    const ids = (toCopy as Array<{ id: string }>).map((i) => i.id);
    const { error } = await svc
      .from(stagedTable)
      .update({ item_status: "approved" })
      .in("id", ids)
      .eq("submission_id", submission.id);
    if (error) captureApiError("POST /api/import/submissions/[id]/review (approve_matched)", error);
  }

  if (!toCopy || toCopy.length === 0) return 0;
  return copyToProduction(svc, toCopy as StagedRow[], submission, productionTable);
}

/* ── Per-item actions ── */

async function processItemActions(
  svc: SupabaseClient,
  items: ReviewItemAction[],
  submission: SubmissionRow,
  stagedTable: string,
  productionTable: string,
  reviewerId: string,
): Promise<number> {
  const approveIds: string[] = [];
  const rejectIds: string[] = [];
  const correctionCandidates: Array<{ itemId: string; matchGameAccountId: string }> = [];

  for (const item of items) {
    if (item.action === "approve") {
      approveIds.push(item.id);
      if (item.matchGameAccountId) {
        await svc
          .from(stagedTable)
          .update({ matched_game_account_id: item.matchGameAccountId })
          .eq("id", item.id)
          .eq("submission_id", submission.id);
      }
      if (item.saveCorrection && item.matchGameAccountId) {
        correctionCandidates.push({
          itemId: item.id,
          matchGameAccountId: item.matchGameAccountId,
        });
      }
    } else {
      rejectIds.push(item.id);
    }
  }

  if (approveIds.length > 0) {
    const { error: approveErr } = await svc
      .from(stagedTable)
      .update({ item_status: "approved" })
      .in("id", approveIds)
      .eq("submission_id", submission.id);
    if (approveErr) captureApiError("POST /api/import/submissions/[id]/review (approve)", approveErr);
  }
  if (rejectIds.length > 0) {
    const { error: rejectErr } = await svc
      .from(stagedTable)
      .update({ item_status: "rejected" })
      .in("id", rejectIds)
      .eq("submission_id", submission.id);
    if (rejectErr) captureApiError("POST /api/import/submissions/[id]/review (reject)", rejectErr);
  }

  let productionRowsCreated = 0;
  if (approveIds.length > 0) {
    const { data: approvedItems } = await svc
      .from(stagedTable)
      .select("*")
      .in("id", approveIds)
      .eq("submission_id", submission.id)
      .limit(10000);

    if (approvedItems && approvedItems.length > 0) {
      productionRowsCreated = await copyToProduction(svc, approvedItems as StagedRow[], submission, productionTable);
    }
  }

  if (correctionCandidates.length > 0) {
    await upsertCorrections(svc, correctionCandidates, submission, stagedTable, reviewerId);
  }

  return productionRowsCreated;
}

/* ── Copy staged → production ── */

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
  submission: SubmissionRow,
  productionTable: string,
): Promise<number> {
  const rows = items.map((item) => mapToProductionRow(item, submission));
  const { data } = await svc.from(productionTable).insert(rows).select("id");
  return data?.length ?? 0;
}

/* ── OCR corrections for manual matches ── */

async function upsertCorrections(
  svc: SupabaseClient,
  candidates: Array<{ itemId: string; matchGameAccountId: string }>,
  submission: SubmissionRow,
  stagedTable: string,
  reviewerId: string,
): Promise<void> {
  const itemIds = candidates.map((c) => c.itemId);
  const accountIds = [...new Set(candidates.map((c) => c.matchGameAccountId))];

  const [stagedRes, accountRes] = await Promise.all([
    svc.from(stagedTable).select("id, player_name").in("id", itemIds).eq("submission_id", submission.id),
    svc.from("game_accounts").select("id, game_username").in("id", accountIds),
  ]);

  const nameById = new Map<string, string>();
  for (const r of (stagedRes.data ?? []) as Array<{ id: string; player_name: string }>) {
    nameById.set(r.id, r.player_name);
  }

  const usernameById = new Map<string, string>();
  for (const r of (accountRes.data ?? []) as Array<{ id: string; game_username: string }>) {
    usernameById.set(r.id, r.game_username);
  }

  const rows: Array<{
    clan_id: string;
    entity_type: string;
    ocr_text: string;
    corrected_text: string;
    created_by: string;
  }> = [];

  for (const c of candidates) {
    const playerName = nameById.get(c.itemId);
    const gameUsername = usernameById.get(c.matchGameAccountId);
    if (playerName && gameUsername && playerName.toLowerCase() !== gameUsername.toLowerCase()) {
      rows.push({
        clan_id: submission.clan_id,
        entity_type: "player",
        ocr_text: playerName,
        corrected_text: gameUsername,
        created_by: reviewerId,
      });
    }
  }

  if (rows.length > 0) {
    await svc.from("ocr_corrections").upsert(rows, { onConflict: "clan_id,entity_type,ocr_text" });
  }
}
