import { NextResponse, type NextRequest } from "next/server";
import { captureApiError } from "@/lib/api/logger";
import { loadMessageProfilesByIds, mapRecipientsWithProfiles } from "@/lib/messages/profile-utils";
import { requireAuth } from "../../../../../lib/api/require-auth";
import { uuidSchema } from "../../../../../lib/api/validation";
import createSupabaseServiceRoleClient from "../../../../../lib/supabase/service-role-client";
import { standardLimiter } from "../../../../../lib/rate-limit";
import type { MessageThreadDeleteResponseDto, MessagesThreadResponseDto } from "@/lib/types/messages-api";

interface RouteContext {
  readonly params: Promise<{ readonly threadId: string }>;
}

/**
 * DELETE /api/messages/thread/[threadId]
 * Soft-deletes all messages in a thread for the authenticated user.
 * Sets `deleted_at` on every `message_recipients` row belonging to the user
 * for all messages in the thread. The messages remain visible to other recipients.
 */
export async function DELETE(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const blocked = standardLimiter.check(request);
  if (blocked) return blocked;
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { threadId } = await context.params;
    const parsed = uuidSchema.safeParse(threadId);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid thread ID format." }, { status: 400 });
    }
    const svc = createSupabaseServiceRoleClient();
    const tid = parsed.data;

    /* Find all message IDs in this thread (root + replies) */
    const { data: threadMsgs, error: msgErr } = await svc
      .from("messages")
      .select("id")
      .or(`thread_id.eq.${tid},id.eq.${tid}`);

    if (msgErr) {
      captureApiError("DELETE /api/messages/thread/[threadId]", msgErr);
      return NextResponse.json({ error: "Failed to delete thread." }, { status: 500 });
    }

    const messageIds = (threadMsgs ?? []).map((m) => m.id as string);
    if (messageIds.length === 0) {
      return NextResponse.json({ error: "Thread not found." }, { status: 404 });
    }

    /* Soft-delete all recipient entries for this user in the thread */
    const { error: deleteError } = await svc
      .from("message_recipients")
      .update({ deleted_at: new Date().toISOString() })
      .eq("recipient_id", auth.userId)
      .in("message_id", messageIds)
      .is("deleted_at", null);

    if (deleteError) {
      captureApiError("DELETE /api/messages/thread/[threadId]", deleteError);
      return NextResponse.json({ error: "Failed to delete thread." }, { status: 500 });
    }

    return NextResponse.json<MessageThreadDeleteResponseDto>({ data: { thread_id: tid, deleted: true } });
  } catch (err) {
    captureApiError("DELETE /api/messages/thread/[threadId]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

/**
 * GET /api/messages/thread/[threadId]
 * Returns all messages in a thread, ordered chronologically.
 * For standalone messages (no thread_id), returns the single message.
 * Auto-marks unread messages as read for the requesting user.
 * Includes recipient list for each message and sender profiles.
 */
export async function GET(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const blocked = standardLimiter.check(request);
  if (blocked) return blocked;
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const userId = auth.userId;

    const { threadId } = await context.params;
    const parsed = uuidSchema.safeParse(threadId);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid thread ID format." }, { status: 400 });
    }

    const svc = createSupabaseServiceRoleClient();
    const tid = parsed.data;

    /* Fetch all messages in this thread:
       - Messages where thread_id = tid (replies in the thread)
       - The root message itself (id = tid, thread_id IS NULL) */
    const { data: threadMsgs, error: msgErr } = await svc
      .from("messages")
      .select("id,sender_id,subject,content,message_type,thread_id,parent_id,created_at")
      .or(`thread_id.eq.${tid},id.eq.${tid}`)
      .order("created_at", { ascending: true });

    if (msgErr) {
      captureApiError("GET /api/messages/thread/[threadId]", msgErr);
      return NextResponse.json({ error: "Failed to load thread." }, { status: 500 });
    }

    const messages = (threadMsgs ?? []) as Array<{
      id: string;
      sender_id: string | null;
      subject: string | null;
      content: string;
      message_type: string;
      thread_id: string | null;
      parent_id: string | null;
      created_at: string;
    }>;

    if (messages.length === 0) {
      return NextResponse.json<MessagesThreadResponseDto>({ data: [], profiles: {} });
    }

    /* Verify user has access: must be sender or recipient of at least one message */
    const msgIds = messages.map((m) => m.id);
    const isSender = messages.some((m) => m.sender_id === userId);

    const { data: recipientEntries } = await svc
      .from("message_recipients")
      .select("id,message_id,is_read")
      .eq("recipient_id", userId)
      .is("deleted_at", null)
      .in("message_id", msgIds);

    const userRecipientEntries = recipientEntries ?? [];
    const isRecipient = userRecipientEntries.length > 0;

    if (!isSender && !isRecipient) {
      return NextResponse.json({ error: "Thread not found." }, { status: 404 });
    }

    /* Build read-state map and collect unread IDs to mark */
    const readByMsgId = new Map<string, boolean>();
    const entryIdByMsgId = new Map<string, string>();
    const unreadEntryIds: string[] = [];

    for (const entry of userRecipientEntries) {
      const mid = entry.message_id as string;
      const isRead = entry.is_read as boolean;
      readByMsgId.set(mid, isRead);
      entryIdByMsgId.set(mid, entry.id as string);
      if (!isRead) {
        unreadEntryIds.push(entry.id as string);
      }
    }

    /* Mark-read and fetch-all-recipients are independent — run in parallel */
    const [, { data: allRecipients }] = await Promise.all([
      unreadEntryIds.length > 0
        ? svc.from("message_recipients").update({ is_read: true }).in("id", unreadEntryIds)
        : Promise.resolve(),
      svc.from("message_recipients").select("message_id,recipient_id").in("message_id", msgIds),
    ]);

    const recipientsByMsgId = new Map<string, string[]>();
    const allRecipientIds = new Set<string>();
    for (const r of allRecipients ?? []) {
      const mid = r.message_id as string;
      const rid = r.recipient_id as string;
      const existing = recipientsByMsgId.get(mid) ?? [];
      existing.push(rid);
      recipientsByMsgId.set(mid, existing);
      if (rid !== userId) allRecipientIds.add(rid);
    }

    /* Fetch profiles for senders + recipients */
    const profileIds = new Set<string>();
    for (const m of messages) {
      if (m.sender_id && m.sender_id !== userId) profileIds.add(m.sender_id);
    }
    for (const id of allRecipientIds) profileIds.add(id);

    const profilesById = await loadMessageProfilesByIds(svc, Array.from(profileIds));

    /* Build response */
    const threadMessages = messages.map((msg) => {
      const recipientIds = recipientsByMsgId.get(msg.id) ?? [];
      const recipients = mapRecipientsWithProfiles(recipientIds, profilesById, "Unknown");
      return {
        ...msg,
        is_read: msg.sender_id === userId ? true : (readByMsgId.get(msg.id) ?? true),
        recipient_entry_id: entryIdByMsgId.get(msg.id) ?? null,
        recipients,
      };
    });

    return NextResponse.json<MessagesThreadResponseDto>({ data: threadMessages, profiles: profilesById });
  } catch (err) {
    captureApiError("GET /api/messages/thread/[threadId]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
