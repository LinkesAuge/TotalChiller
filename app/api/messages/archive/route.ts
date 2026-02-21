import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { captureApiError } from "@/lib/api/logger";
import { loadMessageProfilesByIds, mapRecipientsWithProfiles } from "@/lib/messages/profile-utils";
import { apiError, parseJsonBody } from "@/lib/api/validation";
import { requireAuth } from "../../../../lib/api/require-auth";
import createSupabaseServiceRoleClient from "../../../../lib/supabase/service-role-client";
import { standardLimiter } from "../../../../lib/rate-limit";
import type { MessagesArchiveMutationResponseDto, MessagesArchiveResponseDto } from "@/lib/types/messages-api";

const BROADCAST_TYPES = ["broadcast", "clan"];

/* ── Schemas ── */

const ARCHIVE_BODY = z.object({
  type: z.enum(["thread", "sent"]),
  ids: z.array(z.string().uuid()).min(1).max(100),
  action: z.enum(["archive", "unarchive"]),
});

const ARCHIVE_LIMIT = 200;

/**
 * GET /api/messages/archive
 * Returns archived items for the authenticated user.
 * Combines archived inbox threads and archived sent messages into
 * a unified list sorted by archive date.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const blocked = standardLimiter.check(request);
  if (blocked) return blocked;
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const userId = auth.userId;
    const svc = createSupabaseServiceRoleClient();

    type MsgRow = {
      id: string;
      sender_id: string | null;
      subject: string | null;
      content: string;
      message_type: string;
      thread_id: string | null;
      parent_id: string | null;
      created_at: string;
    };

    /* ── Fetch archived inbox recipients, broadcast dismissals, and sent in parallel ── */
    const [recipientsResult, dismissalsResult, sentResult] = await Promise.all([
      svc
        .from("message_recipients")
        .select("message_id, archived_at")
        .eq("recipient_id", userId)
        .not("archived_at", "is", null)
        .is("deleted_at", null)
        .order("archived_at", { ascending: false })
        .limit(ARCHIVE_LIMIT),
      svc
        .from("message_dismissals")
        .select("message_id, archived_at")
        .eq("user_id", userId)
        .not("archived_at", "is", null)
        .is("dismissed_at", null)
        .order("archived_at", { ascending: false })
        .limit(ARCHIVE_LIMIT),
      svc
        .from("messages")
        .select("id,sender_id,subject,content,message_type,thread_id,parent_id,created_at,sender_archived_at")
        .eq("sender_id", userId)
        .not("sender_archived_at", "is", null)
        .is("sender_deleted_at", null)
        .order("sender_archived_at", { ascending: false })
        .limit(ARCHIVE_LIMIT),
    ]);

    if (recipientsResult.error) {
      captureApiError("GET /api/messages/archive", recipientsResult.error);
      return apiError("Failed to load archive.", 500);
    }
    if (dismissalsResult.error) {
      captureApiError("GET /api/messages/archive (dismissals)", dismissalsResult.error);
      return apiError("Failed to load archive.", 500);
    }
    if (sentResult.error) {
      captureApiError("GET /api/messages/archive", sentResult.error);
      return apiError("Failed to load archive.", 500);
    }

    /* Combine private archived entries + broadcast archived dismissals */
    const archivedAtByMsgId = new Map<string, string>();
    for (const e of recipientsResult.data ?? []) {
      archivedAtByMsgId.set(e.message_id as string, e.archived_at as string);
    }
    for (const d of dismissalsResult.data ?? []) {
      archivedAtByMsgId.set(d.message_id as string, d.archived_at as string);
    }
    const archivedMsgIds = Array.from(archivedAtByMsgId.keys());

    /* Fetch messages for archived inbox entries */
    let inboxMsgs: MsgRow[] = [];
    if (archivedMsgIds.length > 0) {
      const { data: msgData, error: msgErr } = await svc
        .from("messages")
        .select("id,sender_id,subject,content,message_type,thread_id,parent_id,created_at")
        .in("id", archivedMsgIds);
      if (msgErr) {
        captureApiError("GET /api/messages/archive", msgErr);
        return apiError("Failed to load archive.", 500);
      }
      inboxMsgs = (msgData ?? []) as MsgRow[];
    }

    /* Group inbox messages into threads (same logic as inbox) */
    const threadMap = new Map<string, { messages: MsgRow[]; latestArchivedAt: string }>();
    for (const msg of inboxMsgs) {
      const threadKey = msg.thread_id ?? msg.id;
      const msgArchivedAt = archivedAtByMsgId.get(msg.id) ?? msg.created_at;
      const existing = threadMap.get(threadKey);
      if (existing) {
        existing.messages.push(msg);
        if (msgArchivedAt > existing.latestArchivedAt) {
          existing.latestArchivedAt = msgArchivedAt;
        }
      } else {
        threadMap.set(threadKey, {
          messages: [msg],
          latestArchivedAt: msgArchivedAt,
        });
      }
    }

    /* Build inbox archive items */
    const inboxItems = Array.from(threadMap.entries()).map(([threadId, { messages: threadMsgs, latestArchivedAt }]) => {
      const sorted = threadMsgs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const latest = sorted[0]!;
      return {
        id: threadId,
        source: "inbox" as const,
        subject: latest.subject,
        content: latest.content,
        message_type: latest.message_type,
        created_at: latest.created_at,
        archived_at: latestArchivedAt,
        sender_id: latest.sender_id,
        message_count: sorted.length,
        recipient_count: 0,
        recipients: [] as { id: string; label: string }[],
      };
    });

    /* ── Process archived sent messages ── */
    const sentMsgs = (sentResult.data ?? []) as (MsgRow & { sender_archived_at: string })[];

    /* Fetch recipients for sent messages */
    const recipientsByMsgId = new Map<string, { id: string; label: string }[]>();
    if (sentMsgs.length > 0) {
      const sentIds = sentMsgs.map((m) => m.id);
      const { data: recipientData } = await svc
        .from("message_recipients")
        .select("message_id,recipient_id")
        .in("message_id", sentIds);

      const allRecipientIds = new Set<string>();
      const rawByMsg = new Map<string, string[]>();
      for (const r of recipientData ?? []) {
        const mid = r.message_id as string;
        const rid = r.recipient_id as string;
        const existing = rawByMsg.get(mid) ?? [];
        existing.push(rid);
        rawByMsg.set(mid, existing);
        if (rid !== userId) allRecipientIds.add(rid);
      }

      const profilesById = await loadMessageProfilesByIds(svc, Array.from(allRecipientIds));

      for (const [mid, rids] of rawByMsg) {
        recipientsByMsgId.set(mid, mapRecipientsWithProfiles(rids, profilesById, "Unknown"));
      }
    }

    const sentItems = sentMsgs.map((msg) => {
      const recipients = recipientsByMsgId.get(msg.id) ?? [];
      return {
        id: msg.id,
        source: "sent" as const,
        subject: msg.subject,
        content: msg.content,
        message_type: msg.message_type,
        created_at: msg.created_at,
        archived_at: msg.sender_archived_at,
        sender_id: msg.sender_id,
        message_count: 1,
        recipient_count: recipients.length,
        recipients,
      };
    });

    /* ── Combine and sort by archived_at DESC ── */
    const combined = [...inboxItems, ...sentItems].sort(
      (a, b) => new Date(b.archived_at).getTime() - new Date(a.archived_at).getTime(),
    );

    /* ── Fetch sender profiles for inbox items ── */
    const senderIds = Array.from(
      new Set(inboxItems.map((i) => i.sender_id).filter((id): id is string => id !== null && id !== userId)),
    );
    const profiles = await loadMessageProfilesByIds(svc, senderIds);

    return NextResponse.json<MessagesArchiveResponseDto>({ data: combined, profiles });
  } catch (err) {
    captureApiError("GET /api/messages/archive", err);
    return apiError("Internal server error.", 500);
  }
}

/**
 * POST /api/messages/archive
 * Archives or unarchives messages for the authenticated user.
 * Supports batch operations for both inbox threads and sent messages.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const blocked = standardLimiter.check(request);
  if (blocked) return blocked;
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const userId = auth.userId;

    const parsed = await parseJsonBody(request, ARCHIVE_BODY);
    if (parsed.error) return parsed.error;
    const { type, ids, action } = parsed.data;

    const svc = createSupabaseServiceRoleClient();
    const timestamp = action === "archive" ? new Date().toISOString() : null;

    if (type === "thread") {
      /* Find all messages for the given threads */
      const threadConditions = ids.map((tid) => `thread_id.eq.${tid},id.eq.${tid}`).join(",");
      const { data: threadMsgs, error: msgErr } = await svc
        .from("messages")
        .select("id,message_type")
        .or(threadConditions);

      if (msgErr) {
        captureApiError("POST /api/messages/archive", msgErr);
        return apiError("Failed to process archive.", 500);
      }

      const allMsgs = (threadMsgs ?? []) as { id: string; message_type: string }[];
      if (allMsgs.length === 0) {
        return apiError("No messages found.", 404);
      }

      const privateMsgIds = allMsgs.filter((m) => !BROADCAST_TYPES.includes(m.message_type)).map((m) => m.id);
      const broadcastMsgIds = allMsgs.filter((m) => BROADCAST_TYPES.includes(m.message_type)).map((m) => m.id);

      const ops: PromiseLike<unknown>[] = [];

      if (privateMsgIds.length > 0) {
        ops.push(
          svc
            .from("message_recipients")
            .update({ archived_at: timestamp })
            .eq("recipient_id", userId)
            .in("message_id", privateMsgIds)
            .is("deleted_at", null),
        );
      }

      if (broadcastMsgIds.length > 0) {
        if (action === "archive") {
          const dismissRows = broadcastMsgIds.map((mid) => ({
            message_id: mid,
            user_id: userId,
            archived_at: timestamp,
          }));
          ops.push(svc.from("message_dismissals").upsert(dismissRows, { onConflict: "message_id,user_id" }));
        } else {
          ops.push(
            svc
              .from("message_dismissals")
              .update({ archived_at: null })
              .eq("user_id", userId)
              .in("message_id", broadcastMsgIds),
          );
        }
      }

      const results = await Promise.all(ops);
      const hasError = results.some((r) => (r as { error?: unknown })?.error);
      if (hasError) {
        captureApiError("POST /api/messages/archive", "batch archive error");
        return apiError("Failed to archive messages.", 500);
      }
    } else {
      /* Sent: update sender_archived_at on the message rows */
      const { error: updateErr } = await svc
        .from("messages")
        .update({ sender_archived_at: timestamp })
        .eq("sender_id", userId)
        .in("id", ids)
        .is("sender_deleted_at", null);

      if (updateErr) {
        captureApiError("POST /api/messages/archive", updateErr);
        return apiError("Failed to archive messages.", 500);
      }
    }

    return NextResponse.json<MessagesArchiveMutationResponseDto>({ data: { type, ids, action } });
  } catch (err) {
    captureApiError("POST /api/messages/archive", err);
    return apiError("Internal server error.", 500);
  }
}
