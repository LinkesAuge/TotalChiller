import { NextResponse, type NextRequest } from "next/server";
import { captureApiError } from "@/lib/api/logger";
import { requireAuth } from "../../../../../lib/api/require-auth";
import { uuidSchema } from "../../../../../lib/api/validation";
import createSupabaseServiceRoleClient from "../../../../../lib/supabase/service-role-client";
import { standardLimiter } from "../../../../../lib/rate-limit";

interface RouteContext {
  readonly params: Promise<{ readonly id: string }>;
}

/**
 * DELETE /api/messages/sent/[id]
 * Soft-deletes a sent message for the authenticated sender.
 * Sets `sender_deleted_at` on the message row.
 * The message remains visible to all recipients — only the sender's outbox is affected.
 */
export async function DELETE(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const blocked = standardLimiter.check(request);
  if (blocked) return blocked;
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { id } = await context.params;
    const parsed = uuidSchema.safeParse(id);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid message ID format." }, { status: 400 });
    }
    const svc = createSupabaseServiceRoleClient();

    /* Only the sender can soft-delete their own sent message */
    const { data: updated, error: updateError } = await svc
      .from("messages")
      .update({ sender_deleted_at: new Date().toISOString() })
      .eq("id", parsed.data)
      .eq("sender_id", auth.userId)
      .is("sender_deleted_at", null)
      .select("id")
      .maybeSingle();

    if (updateError) {
      captureApiError("DELETE /api/messages/sent/[id]", updateError);
      return NextResponse.json({ error: "Failed to delete message." }, { status: 500 });
    }

    if (!updated) {
      return NextResponse.json({ error: "Message not found." }, { status: 404 });
    }

    return NextResponse.json({ data: { id: parsed.data, deleted: true } });
  } catch (err) {
    captureApiError("DELETE /api/messages/sent/[id]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
