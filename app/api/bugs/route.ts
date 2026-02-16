import { NextResponse, type NextRequest } from "next/server";
import { captureApiError } from "@/lib/api/logger";
import { requireAuth } from "@/lib/api/require-auth";
import { bugReportCreateSchema, bugListQuerySchema, apiError, parseJsonBody } from "@/lib/api/validation";
import createSupabaseServiceRoleClient from "@/lib/supabase/service-role-client";
import { standardLimiter } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email/send-email";
import { buildBugReportEmail } from "@/lib/email/bug-report-email";

/**
 * GET /api/bugs — List bug reports with optional filters.
 * Returns reports with reporter profile, category name, and counts.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const blocked = standardLimiter.check(request);
  if (blocked) return blocked;
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const params = bugListQuerySchema.safeParse({
      status: request.nextUrl.searchParams.get("status") ?? undefined,
      category: request.nextUrl.searchParams.get("category") ?? undefined,
      search: request.nextUrl.searchParams.get("search") ?? undefined,
    });
    if (!params.success) return apiError("Invalid query parameters.", 400);

    const { status, category, search } = params.data;
    const svc = createSupabaseServiceRoleClient();

    let query = svc
      .from("bug_reports")
      .select("*, bug_report_categories(name, slug), profiles!bug_reports_reporter_id_fkey(username, display_name)")
      .order("created_at", { ascending: false });

    if (status !== "all") query = query.eq("status", status);
    if (category) query = query.eq("category_id", category);

    const { data: reports, error: reportsErr } = await query;
    if (reportsErr) {
      captureApiError("GET /api/bugs", reportsErr);
      return apiError("Failed to load bug reports.", 500);
    }

    /* Fetch comment + screenshot counts in bulk */
    const reportIds = (reports ?? []).map((r) => (r as { id: string }).id);
    const commentCounts = new Map<string, number>();
    const screenshotCounts = new Map<string, number>();

    if (reportIds.length > 0) {
      const { data: comments } = await svc.from("bug_report_comments").select("report_id").in("report_id", reportIds);
      for (const c of comments ?? []) {
        const rid = c.report_id as string;
        commentCounts.set(rid, (commentCounts.get(rid) ?? 0) + 1);
      }

      const { data: screenshots } = await svc
        .from("bug_report_screenshots")
        .select("report_id")
        .in("report_id", reportIds);
      for (const s of screenshots ?? []) {
        const rid = s.report_id as string;
        screenshotCounts.set(rid, (screenshotCounts.get(rid) ?? 0) + 1);
      }
    }

    /* Flatten and filter */
    type RawReport = Record<string, unknown> & {
      id: string;
      title: string;
      bug_report_categories: { name: string; slug: string | null } | null;
      profiles: { username: string | null; display_name: string | null } | null;
    };

    let items = (reports ?? []).map((raw) => {
      const r = raw as RawReport;
      return {
        ...r,
        category_name: r.bug_report_categories?.name ?? null,
        category_slug: r.bug_report_categories?.slug ?? null,
        reporter: r.profiles ?? null,
        comment_count: commentCounts.get(r.id) ?? 0,
        screenshot_count: screenshotCounts.get(r.id) ?? 0,
        bug_report_categories: undefined,
        profiles: undefined,
      };
    });

    /* Search filter (client-side for simplicity; DB has few rows) */
    if (search) {
      const lower = search.toLowerCase();
      items = items.filter(
        (r) =>
          r.title.toLowerCase().includes(lower) ||
          (r as unknown as { description: string }).description?.toLowerCase().includes(lower),
      );
    }

    return NextResponse.json({ data: items });
  } catch (err) {
    captureApiError("GET /api/bugs", err);
    return apiError("Internal server error.", 500);
  }
}

/**
 * POST /api/bugs — Create a new bug report.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const blocked = standardLimiter.check(request);
  if (blocked) return blocked;
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const parsed = await parseJsonBody(request, bugReportCreateSchema);
    if (parsed.error) return parsed.error;

    const { title, description, category_id, page_url, screenshot_paths } = parsed.data;
    const svc = createSupabaseServiceRoleClient();

    /* Insert report */
    const { data: report, error: insertErr } = await svc
      .from("bug_reports")
      .insert({
        title: title.trim(),
        description: description.trim(),
        category_id: category_id ?? null,
        page_url: page_url?.trim() || null,
        reporter_id: auth.userId,
      })
      .select("id, title, status, created_at")
      .single();

    if (insertErr || !report) {
      if (insertErr) captureApiError("POST /api/bugs", insertErr);
      return apiError("Failed to create bug report.", 500);
    }

    const reportId = report.id as string;

    /* Link uploaded screenshots to the report */
    if (screenshot_paths && screenshot_paths.length > 0) {
      const rows = screenshot_paths.map((path) => ({
        report_id: reportId,
        storage_path: path,
        file_name: path.split("/").pop() ?? "screenshot",
      }));
      const { error: ssErr } = await svc.from("bug_report_screenshots").insert(rows);
      if (ssErr) captureApiError("POST /api/bugs (screenshots)", ssErr);
    }

    /* ── Send email notification to admins who opted in ── */
    try {
      const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(".supabase.co", "") ?? "";
      const reportUrl = `${siteUrl}/bugs?report=${reportId}`;

      /* Get reporter name */
      const { data: reporterProfile } = await svc
        .from("profiles")
        .select("display_name, username, email")
        .eq("id", auth.userId)
        .maybeSingle();
      const reporterName =
        reporterProfile?.display_name ?? reporterProfile?.username ?? reporterProfile?.email ?? "Unknown";

      /* Get category name */
      let categoryName: string | null = null;
      if (category_id) {
        const { data: cat } = await svc
          .from("bug_report_categories")
          .select("name")
          .eq("id", category_id)
          .maybeSingle();
        categoryName = cat?.name ?? null;
      }

      /* Find admin/webmaster users who opted in to bug email notifications */
      const { data: adminRoles } = await svc.from("user_roles").select("user_id").in("role", ["owner", "admin"]);

      if (adminRoles && adminRoles.length > 0) {
        const adminIds = adminRoles.map((r) => r.user_id as string);
        const { data: optedIn } = await svc
          .from("user_notification_settings")
          .select("user_id")
          .in("user_id", adminIds)
          .eq("bugs_email_enabled", true);

        if (optedIn && optedIn.length > 0) {
          const optedInIds = optedIn.map((r) => r.user_id as string);
          const { data: profiles } = await svc.from("profiles").select("id, email").in("id", optedInIds);

          const emailData = {
            title: title.trim(),
            description: description.trim(),
            reporterName,
            categoryName,
            pageUrl: page_url?.trim() || null,
            reportUrl,
          };

          const html = buildBugReportEmail(emailData);

          for (const profile of profiles ?? []) {
            if (profile.email) {
              void sendEmail({
                to: profile.email,
                subject: `New Bug Report: ${title.trim()}`,
                html,
              });
            }
          }
        }
      }
    } catch (emailErr) {
      /* Email failures are non-critical — log but don't fail the request */
      captureApiError("POST /api/bugs (email notification)", emailErr);
    }

    return NextResponse.json({ data: report }, { status: 201 });
  } catch (err) {
    captureApiError("POST /api/bugs", err);
    return apiError("Internal server error.", 500);
  }
}
