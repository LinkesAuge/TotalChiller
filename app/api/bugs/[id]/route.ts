import { NextResponse, type NextRequest } from "next/server";
import { captureApiError } from "@/lib/api/logger";
import { requireAuth } from "@/lib/api/require-auth";
import { uuidSchema, bugReportUpdateSchema, apiError, parseJsonBody } from "@/lib/api/validation";
import createSupabaseServiceRoleClient from "@/lib/supabase/service-role-client";
import getIsContentManager from "@/lib/supabase/role-access";
import { standardLimiter, strictLimiter } from "@/lib/rate-limit";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/bugs/[id] — Full detail for a single bug report.
 * Includes screenshots, reporter profile, and category name.
 */
export async function GET(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const blocked = standardLimiter.check(request);
  if (blocked) return blocked;
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { id } = await context.params;
    const parsed = uuidSchema.safeParse(id);
    if (!parsed.success) return apiError("Invalid report ID.", 400);

    const svc = createSupabaseServiceRoleClient();

    const { data: report, error: reportErr } = await svc
      .from("bug_reports")
      .select("*, bug_report_categories(name, slug), profiles!bug_reports_reporter_id_fkey(username, display_name)")
      .eq("id", id)
      .maybeSingle();

    if (reportErr) {
      captureApiError("GET /api/bugs/[id]", reportErr);
      return apiError("Failed to load report.", 500);
    }
    if (!report) return apiError("Report not found.", 404);

    /* Fetch screenshots */
    const { data: screenshots } = await svc
      .from("bug_report_screenshots")
      .select("id, report_id, storage_path, file_name, created_at")
      .eq("report_id", id)
      .order("created_at", { ascending: true });

    type RawReport = Record<string, unknown> & {
      bug_report_categories: { name: string; slug: string | null } | null;
      profiles: { username: string | null; display_name: string | null } | null;
    };
    const r = report as RawReport;

    return NextResponse.json({
      data: {
        ...r,
        category_name: r.bug_report_categories?.name ?? null,
        category_slug: r.bug_report_categories?.slug ?? null,
        reporter: r.profiles ?? null,
        screenshots: screenshots ?? [],
        bug_report_categories: undefined,
        profiles: undefined,
      },
    });
  } catch (err) {
    captureApiError("GET /api/bugs/[id]", err);
    return apiError("Internal server error.", 500);
  }
}

/**
 * PATCH /api/bugs/[id] — Update a bug report.
 * Admins can change status, priority, category.
 * Reporter can update their own description.
 */
export async function PATCH(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const blocked = standardLimiter.check(request);
  if (blocked) return blocked;
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { id } = await context.params;
    const idParsed = uuidSchema.safeParse(id);
    if (!idParsed.success) return apiError("Invalid report ID.", 400);

    const parsed = await parseJsonBody(request, bugReportUpdateSchema);
    if (parsed.error) return parsed.error;

    const svc = createSupabaseServiceRoleClient();

    /* Check report exists and who owns it */
    const { data: existing } = await svc.from("bug_reports").select("reporter_id, status").eq("id", id).maybeSingle();
    if (!existing) return apiError("Report not found.", 404);

    const isReporter = (existing.reporter_id as string) === auth.userId;
    const isCM = await getIsContentManager({ supabase: auth.supabase });

    const updates: Record<string, unknown> = {};
    const body = parsed.data;

    /* Admin-only fields */
    if (body.status !== undefined || body.priority !== undefined) {
      if (!isCM) return apiError("Forbidden: admin access required.", 403);
      if (body.status !== undefined) {
        updates.status = body.status;
        if (body.status === "resolved") updates.resolved_at = new Date().toISOString();
        if (body.status === "closed") updates.closed_at = new Date().toISOString();
        if (body.status === "open") {
          updates.resolved_at = null;
          updates.closed_at = null;
        }
      }
      if (body.priority !== undefined) updates.priority = body.priority;
    }

    /* Reporter (or admin) can update title, description, category, page_url */
    if (body.title !== undefined) {
      if (!isReporter && !isCM) return apiError("Forbidden.", 403);
      updates.title = body.title.trim();
    }
    if (body.description !== undefined) {
      if (!isReporter && !isCM) return apiError("Forbidden.", 403);
      updates.description = body.description.trim();
    }
    if (body.category_id !== undefined) {
      if (!isReporter && !isCM) return apiError("Forbidden.", 403);
      updates.category_id = body.category_id;
    }
    if (body.page_url !== undefined) {
      if (!isReporter && !isCM) return apiError("Forbidden.", 403);
      updates.page_url = body.page_url?.trim() || null;
    }

    if (Object.keys(updates).length === 0) return apiError("No valid fields to update.", 400);
    updates.updated_at = new Date().toISOString();

    const { data: updated, error: updateErr } = await svc
      .from("bug_reports")
      .update(updates)
      .eq("id", id)
      .select("id, status, priority, updated_at")
      .single();

    if (updateErr) {
      captureApiError("PATCH /api/bugs/[id]", updateErr);
      return apiError("Failed to update report.", 500);
    }

    return NextResponse.json({ data: updated });
  } catch (err) {
    captureApiError("PATCH /api/bugs/[id]", err);
    return apiError("Internal server error.", 500);
  }
}

/**
 * DELETE /api/bugs/[id] — Delete a bug report.
 * Reporter or admin can delete. Cascades to comments and screenshots.
 */
export async function DELETE(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const blocked = strictLimiter.check(request);
  if (blocked) return blocked;
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { id } = await context.params;
    const parsed = uuidSchema.safeParse(id);
    if (!parsed.success) return apiError("Invalid report ID.", 400);

    const svc = createSupabaseServiceRoleClient();

    const { data: existing } = await svc.from("bug_reports").select("reporter_id").eq("id", id).maybeSingle();
    if (!existing) return apiError("Report not found.", 404);

    const isReporter = (existing.reporter_id as string) === auth.userId;
    const isCM = await getIsContentManager({ supabase: auth.supabase });
    if (!isReporter && !isCM) return apiError("Forbidden.", 403);

    /* Delete screenshots, comments, then the report (FK cascade would also handle this) */
    await svc.from("bug_report_screenshots").delete().eq("report_id", id);
    await svc.from("bug_report_comments").delete().eq("report_id", id);
    const { data: deleted, error: deleteErr } = await svc.from("bug_reports").delete().eq("id", id).select("id");
    if (deleteErr || !deleted?.length) {
      if (deleteErr) captureApiError("DELETE /api/bugs/[id]", deleteErr);
      return apiError("Failed to delete report.", 500);
    }

    return NextResponse.json({ data: { id } });
  } catch (err) {
    captureApiError("DELETE /api/bugs/[id]", err);
    return apiError("Internal server error.", 500);
  }
}
