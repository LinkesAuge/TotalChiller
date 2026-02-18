import { NextResponse, type NextRequest } from "next/server";
import { captureApiError } from "@/lib/api/logger";
import { loadMessageProfilesByIds, mapRecipientsWithProfiles } from "@/lib/messages/profile-utils";
import { userMatchesBroadcastTargeting, canUserReplyToBroadcast } from "@/lib/messages/broadcast-targeting";
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

    /* Find all messages in this thread (root + replies) */
    const { data: threadMsgs, error: msgErr } = await svc
      .from("messages")
      .select("id,message_type")
      .or(`thread_id.eq.${tid},id.eq.${tid}`);

    if (msgErr) {
      captureApiError("DELETE /api/messages/thread/[threadId]", msgErr);
      return NextResponse.json({ error: "Failed to delete thread." }, { status: 500 });
    }

    const allMsgs = (threadMsgs ?? []) as { id: string; message_type: string }[];
    if (allMsgs.length === 0) {
      return NextResponse.json({ error: "Thread not found." }, { status: 404 });
    }

    const privateMsgIds = allMsgs.filter((m) => m.message_type === "private").map((m) => m.id);
    const broadcastMsgIds = allMsgs.filter((m) => ["broadcast", "clan"].includes(m.message_type)).map((m) => m.id);
    const now = new Date().toISOString();

    const ops: PromiseLike<unknown>[] = [];

    if (privateMsgIds.length > 0) {
      ops.push(
        svc
          .from("message_recipients")
          .update({ deleted_at: now })
          .eq("recipient_id", auth.userId)
          .in("message_id", privateMsgIds)
          .is("deleted_at", null),
      );
    }

    if (broadcastMsgIds.length > 0) {
      const dismissRows = broadcastMsgIds.map((mid) => ({
        message_id: mid,
        user_id: auth.userId,
        dismissed_at: now,
      }));
      ops.push(svc.from("message_dismissals").upsert(dismissRows, { onConflict: "message_id,user_id" }));
    }

    const results = await Promise.all(ops);
    const hasError = results.some((r) => (r as { error?: unknown })?.error);
    if (hasError) {
      captureApiError("DELETE /api/messages/thread/[threadId]", "batch delete error");
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

    const BROADCAST_TYPES = ["broadcast", "clan"];

    /* Fetch all messages in this thread */
    const { data: threadMsgs, error: msgErr } = await svc
      .from("messages")
      .select(
        "id,sender_id,subject,content,message_type,thread_id,parent_id,created_at,target_ranks,target_roles,target_clan_id",
      )
      .or(`thread_id.eq.${tid},id.eq.${tid}`)
      .order("created_at", { ascending: true });

    if (msgErr) {
      captureApiError("GET /api/messages/thread/[threadId]", msgErr);
      return NextResponse.json({ error: "Failed to load thread." }, { status: 500 });
    }

    type FullMsg = {
      id: string;
      sender_id: string | null;
      subject: string | null;
      content: string;
      message_type: string;
      thread_id: string | null;
      parent_id: string | null;
      created_at: string;
      target_ranks: string[] | null;
      target_roles: string[] | null;
      target_clan_id: string | null;
    };

    const messages = (threadMsgs ?? []) as FullMsg[];

    if (messages.length === 0) {
      return NextResponse.json<MessagesThreadResponseDto>({ data: [], profiles: {} });
    }

    const msgIds = messages.map((m) => m.id);
    const isSender = messages.some((m) => m.sender_id === userId);
    const hasBroadcast = messages.some((m) => BROADCAST_TYPES.includes(m.message_type));
    const hasPrivate = messages.some((m) => m.message_type === "private");

    /* ── Access check ── */
    let isPrivateRecipient = false;
    let isBroadcastRecipient = false;

    const { data: recipientEntries } = hasPrivate
      ? await svc
          .from("message_recipients")
          .select("id,message_id,is_read")
          .eq("recipient_id", userId)
          .is("deleted_at", null)
          .in("message_id", msgIds)
      : { data: [] };

    const userRecipientEntries = recipientEntries ?? [];
    isPrivateRecipient = userRecipientEntries.length > 0;

    if (hasBroadcast) {
      for (const msg of messages) {
        if (!BROADCAST_TYPES.includes(msg.message_type)) continue;
        const matches = await userMatchesBroadcastTargeting(svc, userId, msg);
        if (matches) {
          isBroadcastRecipient = true;
          break;
        }
      }
    }

    if (!isSender && !isPrivateRecipient && !isBroadcastRecipient) {
      return NextResponse.json({ error: "Thread not found." }, { status: 404 });
    }

    /* ── Read state (private) ── */
    const readByMsgId = new Map<string, boolean>();
    const entryIdByMsgId = new Map<string, string>();
    const unreadPrivateEntryIds: string[] = [];

    for (const entry of userRecipientEntries) {
      const mid = entry.message_id as string;
      readByMsgId.set(mid, entry.is_read as boolean);
      entryIdByMsgId.set(mid, entry.id as string);
      if (!(entry.is_read as boolean)) unreadPrivateEntryIds.push(entry.id as string);
    }

    /* ── Read state (broadcast) — from message_reads ── */
    const broadcastMsgIds = messages.filter((m) => BROADCAST_TYPES.includes(m.message_type)).map((m) => m.id);

    let readBroadcastIds = new Set<string>();
    if (broadcastMsgIds.length > 0) {
      const { data: readData } = await svc
        .from("message_reads")
        .select("message_id")
        .eq("user_id", userId)
        .in("message_id", broadcastMsgIds);
      readBroadcastIds = new Set((readData ?? []).map((r) => r.message_id as string));
    }

    for (const mid of broadcastMsgIds) {
      readByMsgId.set(mid, readBroadcastIds.has(mid));
    }

    /* ── Mark unread as read (parallel) ── */
    const markReadOps: PromiseLike<unknown>[] = [];

    if (unreadPrivateEntryIds.length > 0) {
      markReadOps.push(svc.from("message_recipients").update({ is_read: true }).in("id", unreadPrivateEntryIds));
    }

    const unreadBcIds = broadcastMsgIds.filter((mid) => !readBroadcastIds.has(mid));
    if (unreadBcIds.length > 0) {
      const readRows = unreadBcIds.map((mid) => ({ message_id: mid, user_id: userId }));
      markReadOps.push(svc.from("message_reads").upsert(readRows, { onConflict: "message_id,user_id" }));
    }

    /* Fetch private recipients in parallel with mark-read */
    const privateMsgIds = messages.filter((m) => m.message_type === "private").map((m) => m.id);
    const fetchRecipients =
      privateMsgIds.length > 0
        ? svc.from("message_recipients").select("message_id,recipient_id").in("message_id", privateMsgIds)
        : Promise.resolve({ data: [] as { message_id: string; recipient_id: string }[] });

    const [, recipientsResult] = await Promise.all([Promise.all(markReadOps), fetchRecipients]);

    const recipientsByMsgId = new Map<string, string[]>();
    const allRecipientIds = new Set<string>();
    for (const r of (recipientsResult as { data: { message_id: string; recipient_id: string }[] | null }).data ?? []) {
      const mid = r.message_id as string;
      const rid = r.recipient_id as string;
      const existing = recipientsByMsgId.get(mid) ?? [];
      existing.push(rid);
      recipientsByMsgId.set(mid, existing);
      if (rid !== userId) allRecipientIds.add(rid);
    }

    /* ── Profiles ── */
    const profileIds = new Set<string>();
    for (const m of messages) {
      if (m.sender_id && m.sender_id !== userId) profileIds.add(m.sender_id);
    }
    for (const id of allRecipientIds) profileIds.add(id);

    const profilesById = await loadMessageProfilesByIds(svc, Array.from(profileIds));

    /* ── Filter messages: only show broadcasts user can access ── */
    const visibleMessages: FullMsg[] = [];
    for (const msg of messages) {
      if (msg.sender_id === userId || msg.message_type === "private") {
        visibleMessages.push(msg);
      } else if (BROADCAST_TYPES.includes(msg.message_type)) {
        const canSee = await userMatchesBroadcastTargeting(svc, userId, msg);
        if (canSee) visibleMessages.push(msg);
      }
    }

    /* ── Determine can_reply and thread_targeting ── */
    const rootMsg = messages[0]!;
    const isBroadcastThread = BROADCAST_TYPES.includes(rootMsg.message_type);

    let canReply: boolean;
    let threadTargeting: {
      target_ranks: string[] | null;
      target_roles: string[] | null;
      target_clan_id: string | null;
    } | null = null;

    if (isBroadcastThread) {
      canReply = isSender || (await canUserReplyToBroadcast(svc, userId, rootMsg.target_clan_id));
      threadTargeting = {
        target_ranks: rootMsg.target_ranks,
        target_roles: rootMsg.target_roles,
        target_clan_id: rootMsg.target_clan_id,
      };
    } else {
      canReply = true;
    }

    /* ── Build response ── */
    const threadMessages = visibleMessages.map((msg) => {
      const recipientIds = recipientsByMsgId.get(msg.id) ?? [];
      const recipients = mapRecipientsWithProfiles(recipientIds, profilesById, "Unknown");
      return {
        id: msg.id,
        sender_id: msg.sender_id,
        subject: msg.subject,
        content: msg.content,
        message_type: msg.message_type,
        thread_id: msg.thread_id,
        parent_id: msg.parent_id,
        created_at: msg.created_at,
        is_read: msg.sender_id === userId ? true : (readByMsgId.get(msg.id) ?? true),
        recipient_entry_id: entryIdByMsgId.get(msg.id) ?? null,
        recipients,
      };
    });

    return NextResponse.json<MessagesThreadResponseDto>({
      data: threadMessages,
      profiles: profilesById,
      meta: { can_reply: canReply, thread_targeting: threadTargeting },
    });
  } catch (err) {
    captureApiError("GET /api/messages/thread/[threadId]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
