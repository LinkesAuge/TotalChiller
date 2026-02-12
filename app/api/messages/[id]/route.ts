import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "../../../../lib/api/require-auth";
import { uuidSchema } from "../../../../lib/api/validation";
import { standardLimiter } from "../../../../lib/rate-limit";

interface RouteContext {
  readonly params: Promise<{ readonly id: string }>;
}

/**
 * PATCH /api/messages/[id]
 * Marks a message as read. Only the recipient can mark it.
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
    const { error: updateError } = await auth.supabase
      .from("messages")
      .update({ is_read: true })
      .eq("id", parsed.data)
      .eq("recipient_id", auth.userId);
    if (updateError) {
      console.error("[messages/[id] PATCH]", updateError.message);
      return NextResponse.json({ error: "Failed to update message." }, { status: 500 });
    }
    return NextResponse.json({ data: { id: parsed.data, is_read: true } });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

/**
 * DELETE /api/messages/[id]
 * Deletes a message. Only the recipient can delete it.
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
    const { error: deleteError } = await auth.supabase
      .from("messages")
      .delete()
      .eq("id", parsed.data)
      .eq("recipient_id", auth.userId);
    if (deleteError) {
      console.error("[messages/[id] DELETE]", deleteError.message);
      return NextResponse.json({ error: "Failed to delete message." }, { status: 500 });
    }
    return NextResponse.json({ data: { id: parsed.data, deleted: true } });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
