import { NextResponse, type NextRequest } from "next/server";
import { captureApiError } from "@/lib/api/logger";
import { requireAuth } from "../../../../lib/api/require-auth";
import { uuidSchema } from "../../../../lib/api/validation";
import createSupabaseServiceRoleClient from "../../../../lib/supabase/service-role-client";
import { standardLimiter } from "../../../../lib/rate-limit";
import type { MessageDeleteMutationResponseDto, MessageReadMutationResponseDto } from "@/lib/types/messages-api";

const BROADCAST_TYPES = ["broadcast", "clan"];

interface RouteContext {
  readonly params: Promise<{ readonly id: string }>;
}

/**
 * PATCH /api/messages/[id]
 * Marks a message as read for the authenticated user.
 * Private: updates `message_recipients.is_read`.
 * Broadcast: upserts into `message_reads`.
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
    const msgId = parsed.data;

    const { data: msg } = await svc.from("messages").select("message_type").eq("id", msgId).maybeSingle();

    if (msg && BROADCAST_TYPES.includes(msg.message_type as string)) {
      const { error } = await svc
        .from("message_reads")
        .upsert({ message_id: msgId, user_id: auth.userId }, { onConflict: "message_id,user_id" });
      if (error) {
        captureApiError("PATCH /api/messages/[id]", error);
        return NextResponse.json({ error: "Failed to update message." }, { status: 500 });
      }
    } else {
      const { error } = await svc
        .from("message_recipients")
        .update({ is_read: true })
        .eq("message_id", msgId)
        .eq("recipient_id", auth.userId)
        .is("deleted_at", null);
      if (error) {
        captureApiError("PATCH /api/messages/[id]", error);
        return NextResponse.json({ error: "Failed to update message." }, { status: 500 });
      }
    }

    return NextResponse.json<MessageReadMutationResponseDto>({ data: { id: msgId, is_read: true } });
  } catch (err) {
    captureApiError("PATCH /api/messages/[id]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

/**
 * DELETE /api/messages/[id]
 * Soft-deletes a message for the authenticated user.
 * Private: sets `deleted_at` on `message_recipients`.
 * Broadcast: upserts into `message_dismissals` with `dismissed_at`.
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
    const msgId = parsed.data;

    const { data: msg } = await svc.from("messages").select("message_type").eq("id", msgId).maybeSingle();

    if (msg && BROADCAST_TYPES.includes(msg.message_type as string)) {
      const { error } = await svc
        .from("message_dismissals")
        .upsert(
          { message_id: msgId, user_id: auth.userId, dismissed_at: new Date().toISOString() },
          { onConflict: "message_id,user_id" },
        );
      if (error) {
        captureApiError("DELETE /api/messages/[id]", error);
        return NextResponse.json({ error: "Failed to delete message." }, { status: 500 });
      }
    } else {
      const { data: affected, error } = await svc
        .from("message_recipients")
        .update({ deleted_at: new Date().toISOString() })
        .eq("message_id", msgId)
        .eq("recipient_id", auth.userId)
        .select("id");
      if (error) {
        captureApiError("DELETE /api/messages/[id]", error);
        return NextResponse.json({ error: "Failed to delete message." }, { status: 500 });
      }
      if (!affected || affected.length === 0) {
        return NextResponse.json({ error: "Message not found." }, { status: 404 });
      }
    }

    return NextResponse.json<MessageDeleteMutationResponseDto>({ data: { id: msgId, deleted: true } });
  } catch (err) {
    captureApiError("DELETE /api/messages/[id]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
