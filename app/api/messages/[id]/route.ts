import { NextResponse, type NextRequest } from "next/server";
import { captureApiError } from "@/lib/api/logger";
import { requireAuth } from "../../../../lib/api/require-auth";
import { uuidSchema } from "../../../../lib/api/validation";
import createSupabaseServiceRoleClient from "../../../../lib/supabase/service-role-client";
import { standardLimiter } from "../../../../lib/rate-limit";

interface RouteContext {
  readonly params: Promise<{ readonly id: string }>;
}

/**
 * PATCH /api/messages/[id]
 * Marks a message as read for the authenticated user.
 * Updates the `is_read` flag on the corresponding `message_recipients` row.
 */
export async function PATCH(request: NextRequest, context: RouteContext): Promise<NextResponse> {
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
    const { error: updateError } = await svc
      .from("message_recipients")
      .update({ is_read: true })
      .eq("message_id", parsed.data)
      .eq("recipient_id", auth.userId)
      .is("deleted_at", null);
    if (updateError) {
      captureApiError("PATCH /api/messages/[id]", updateError);
      return NextResponse.json({ error: "Failed to update message." }, { status: 500 });
    }
    return NextResponse.json({ data: { id: parsed.data, is_read: true } });
  } catch (err) {
    captureApiError("PATCH /api/messages/[id]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

/**
 * DELETE /api/messages/[id]
 * Soft-deletes a message for the authenticated user.
 * Sets `deleted_at` on the corresponding `message_recipients` row.
 * The message remains visible to the sender and other recipients.
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
    const { error: deleteError } = await svc
      .from("message_recipients")
      .update({ deleted_at: new Date().toISOString() })
      .eq("message_id", parsed.data)
      .eq("recipient_id", auth.userId);
    if (deleteError) {
      captureApiError("DELETE /api/messages/[id]", deleteError);
      return NextResponse.json({ error: "Failed to delete message." }, { status: 500 });
    }
    return NextResponse.json({ data: { id: parsed.data, deleted: true } });
  } catch (err) {
    captureApiError("DELETE /api/messages/[id]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
