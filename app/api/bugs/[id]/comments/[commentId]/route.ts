import { NextResponse, type NextRequest } from "next/server";
import { captureApiError } from "@/lib/api/logger";
import { requireAuth } from "@/lib/api/require-auth";
import { uuidSchema, bugCommentCreateSchema, apiError, parseJsonBody } from "@/lib/api/validation";
import createSupabaseServiceRoleClient from "@/lib/supabase/service-role-client";
import getIsContentManager from "@/lib/supabase/role-access";
import { standardLimiter, strictLimiter } from "@/lib/rate-limit";

interface RouteContext {
  params: Promise<{ id: string; commentId: string }>;
}

/**
 * PATCH /api/bugs/[id]/comments/[commentId] — Edit a comment.
 * Author or admin can edit.
 */
export async function PATCH(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const blocked = standardLimiter.check(request);
  if (blocked) return blocked;
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { id, commentId } = await context.params;
    if (!uuidSchema.safeParse(id).success || !uuidSchema.safeParse(commentId).success) {
      return apiError("Invalid ID.", 400);
    }

    const parsed = await parseJsonBody(request, bugCommentCreateSchema);
    if (parsed.error) return parsed.error;

    const svc = createSupabaseServiceRoleClient();

    const { data: existing } = await svc
      .from("bug_report_comments")
      .select("author_id")
      .eq("id", commentId)
      .eq("report_id", id)
      .maybeSingle();
    if (!existing) return apiError("Comment not found.", 404);

    const isAuthor = (existing.author_id as string) === auth.userId;
    const isCM = await getIsContentManager({ supabase: auth.supabase });
    if (!isAuthor && !isCM) return apiError("Forbidden.", 403);

    const { data: updated, error: updateErr } = await svc
      .from("bug_report_comments")
      .update({ content: parsed.data.content.trim(), updated_at: new Date().toISOString() })
      .eq("id", commentId)
      .select("id, content, updated_at")
      .single();

    if (updateErr) {
      captureApiError("PATCH /api/bugs/[id]/comments/[commentId]", updateErr);
      return apiError("Failed to update comment.", 500);
    }

    return NextResponse.json({ data: updated });
  } catch (err) {
    captureApiError("PATCH /api/bugs/[id]/comments/[commentId]", err);
    return apiError("Internal server error.", 500);
  }
}

/**
 * DELETE /api/bugs/[id]/comments/[commentId] — Delete a comment.
 * Author or admin can delete.
 */
export async function DELETE(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const blocked = strictLimiter.check(request);
  if (blocked) return blocked;
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { id, commentId } = await context.params;
    if (!uuidSchema.safeParse(id).success || !uuidSchema.safeParse(commentId).success) {
      return apiError("Invalid ID.", 400);
    }

    const svc = createSupabaseServiceRoleClient();

    const { data: existing } = await svc
      .from("bug_report_comments")
      .select("author_id")
      .eq("id", commentId)
      .eq("report_id", id)
      .maybeSingle();
    if (!existing) return apiError("Comment not found.", 404);

    const isAuthor = (existing.author_id as string) === auth.userId;
    const isCM = await getIsContentManager({ supabase: auth.supabase });
    if (!isAuthor && !isCM) return apiError("Forbidden.", 403);

    const { data: deleted, error: deleteErr } = await svc
      .from("bug_report_comments")
      .delete()
      .eq("id", commentId)
      .select("id");
    if (deleteErr || !deleted?.length) {
      if (deleteErr) captureApiError("DELETE /api/bugs/[id]/comments/[commentId]", deleteErr);
      return apiError("Failed to delete comment.", 500);
    }

    return NextResponse.json({ data: { id: commentId } });
  } catch (err) {
    captureApiError("DELETE /api/bugs/[id]/comments/[commentId]", err);
    return apiError("Internal server error.", 500);
  }
}
