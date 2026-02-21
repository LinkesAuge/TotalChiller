import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { standardLimiter } from "@/lib/rate-limit";
import { requireAuth } from "@/lib/api/require-auth";
import { requireAdmin } from "@/lib/api/require-admin";
import { apiError, uuidSchema } from "@/lib/api/validation";
import { captureApiError } from "@/lib/api/logger";
import { SubmissionDetailQuerySchema } from "@/lib/api/import-schemas";
import createSupabaseServiceRoleClient from "@/lib/supabase/service-role-client";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const STAGED_TABLES: Record<string, string> = {
  chests: "staged_chest_entries",
  members: "staged_member_entries",
  events: "staged_event_entries",
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

    return NextResponse.json({
      data: {
        submission,
        items: items ?? [],
        total: count ?? 0,
        page,
        perPage,
        statusCounts,
      },
    });
  } catch (err) {
    captureApiError("GET /api/import/submissions/[id]", err);
    return apiError("Internal server error.", 500);
  }
}

/**
 * DELETE /api/import/submissions/[id] — Delete a pending submission (admin only).
 * Cascading FKs handle staged entry cleanup.
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
    if (existing.status !== "pending") {
      return apiError("Only pending submissions can be deleted.", 409);
    }

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
