import { NextResponse, type NextRequest } from "next/server";
import { captureApiError } from "@/lib/api/logger";
import { requireAuth } from "@/lib/api/require-auth";
import { uuidSchema, bugCommentCreateSchema, apiError, parseJsonBody } from "@/lib/api/validation";
import createSupabaseServiceRoleClient from "@/lib/supabase/service-role-client";
import { standardLimiter } from "@/lib/rate-limit";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/bugs/[id]/comments — List comments for a bug report.
 * Includes author profile for each comment.
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

    const { data: comments, error: commentsErr } = await svc
      .from("bug_report_comments")
      .select("*, profiles!bug_report_comments_author_id_fkey(username, display_name)")
      .eq("report_id", id)
      .order("created_at", { ascending: true });

    if (commentsErr) {
      captureApiError("GET /api/bugs/[id]/comments", commentsErr);
      return apiError("Failed to load comments.", 500);
    }

    type RawComment = Record<string, unknown> & {
      profiles: { username: string | null; display_name: string | null } | null;
    };

    const items = (comments ?? []).map((raw) => {
      const c = raw as RawComment;
      return {
        ...c,
        author: c.profiles ?? null,
        profiles: undefined,
      };
    });

    return NextResponse.json({ data: items });
  } catch (err) {
    captureApiError("GET /api/bugs/[id]/comments", err);
    return apiError("Internal server error.", 500);
  }
}

/**
 * POST /api/bugs/[id]/comments — Add a comment to a bug report.
 */
export async function POST(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const blocked = standardLimiter.check(request);
  if (blocked) return blocked;
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { id } = await context.params;
    const idParsed = uuidSchema.safeParse(id);
    if (!idParsed.success) return apiError("Invalid report ID.", 400);

    const parsed = await parseJsonBody(request, bugCommentCreateSchema);
    if (parsed.error) return parsed.error;

    const svc = createSupabaseServiceRoleClient();

    /* Verify report exists */
    const { data: report } = await svc.from("bug_reports").select("id, reporter_id").eq("id", id).maybeSingle();
    if (!report) return apiError("Report not found.", 404);

    const { data: comment, error: insertErr } = await svc
      .from("bug_report_comments")
      .insert({
        report_id: id,
        author_id: auth.userId,
        content: parsed.data.content.trim(),
      })
      .select("id, report_id, author_id, content, created_at")
      .single();

    if (insertErr || !comment) {
      if (insertErr) captureApiError("POST /api/bugs/[id]/comments", insertErr);
      return apiError("Failed to add comment.", 500);
    }

    /* Send notification to the reporter (if comment is from someone else) */
    const reporterId = report.reporter_id as string;
    if (reporterId !== auth.userId) {
      const { data: authorProfile } = await svc
        .from("profiles")
        .select("display_name, username, email")
        .eq("id", auth.userId)
        .maybeSingle();
      const authorLabel = authorProfile?.display_name ?? authorProfile?.username ?? authorProfile?.email ?? "Someone";

      await svc.from("notifications").insert({
        user_id: reporterId,
        type: "bug_comment",
        title: `New comment on your bug report`,
        body: `${authorLabel} commented on your report.`,
        reference_id: id,
      });
    }

    return NextResponse.json({ data: comment }, { status: 201 });
  } catch (err) {
    captureApiError("POST /api/bugs/[id]/comments", err);
    return apiError("Internal server error.", 500);
  }
}
