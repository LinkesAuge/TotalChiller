import { NextResponse, after, type NextRequest } from "next/server";
import { z } from "zod";
import { captureApiError } from "@/lib/api/logger";
import { loadMessageProfilesByIds, resolveMessageProfileLabel } from "@/lib/messages/profile-utils";
import {
  resolveBroadcastRecipients,
  userMatchesBroadcastTargetingSync,
  loadUserBroadcastContext,
  canUserReplyToBroadcast,
} from "@/lib/messages/broadcast-targeting";
import { requireAuth } from "../../../lib/api/require-auth";
import createSupabaseServiceRoleClient from "../../../lib/supabase/service-role-client";
import getIsContentManager from "../../../lib/supabase/role-access";
import { standardLimiter } from "../../../lib/rate-limit";
import { messageQuerySchema } from "../../../lib/api/validation";
import type { MessageRow } from "@/lib/types/domain";
import type { MessageSendResponseDto, MessagesInboxResponseDto } from "@/lib/types/messages-api";

/* ── Schemas ── */

const SEND_SCHEMA = z.object({
  recipient_ids: z.array(z.string().uuid()).min(1).max(500),
  subject: z.string().max(200).optional(),
  content: z.string().min(1).max(10_000),
  message_type: z.enum(["private", "broadcast", "clan"]).default("private"),
  parent_id: z.string().uuid().optional(),
  /** For clan broadcasts — the clan to send to */
  clan_id: z.string().uuid().optional(),
  /** Rank-based targeting for broadcasts (null/undefined = all ranks) */
  target_ranks: z.array(z.string()).nullable().optional(),
  /** Role-based targeting for broadcasts (e.g., ["owner"] for Webmaster) */
  target_roles: z.array(z.string()).nullable().optional(),
});

const INBOX_LIMIT = 200;

/**
 * GET /api/messages — Inbox
 * Returns threads for the authenticated user (grouped by thread_id).
 * Each thread: latest message, unread count, message count.
 * Supports ?type=all|private|broadcast|clan and ?search=term.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const blocked = standardLimiter.check(request);
  if (blocked) return blocked;
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const userId = auth.userId;
    const queryParams = messageQuerySchema.safeParse({
      type: request.nextUrl.searchParams.get("type") ?? undefined,
      search: request.nextUrl.searchParams.get("search") ?? undefined,
    });
    if (!queryParams.success) {
      return NextResponse.json({ error: "Invalid query parameters." }, { status: 400 });
    }
    const typeFilter = queryParams.data.type;
    const search = queryParams.data.search;

    const svc = createSupabaseServiceRoleClient();

    type InboxMsg = {
      id: string;
      sender_id: string | null;
      subject: string | null;
      content: string;
      message_type: string;
      thread_id: string | null;
      parent_id: string | null;
      created_at: string;
    };

    const readMap = new Map<string, boolean>();
    let allMessages: InboxMsg[] = [];

    /* ── Part A: Private messages via message_recipients (unchanged) ── */
    if (typeFilter === "all" || typeFilter === "private") {
      const { data: recipientEntries, error: recErr } = await svc
        .from("message_recipients")
        .select("message_id, is_read")
        .eq("recipient_id", userId)
        .is("deleted_at", null)
        .is("archived_at", null)
        .order("created_at", { ascending: false })
        .limit(INBOX_LIMIT);

      if (recErr) {
        captureApiError("GET /api/messages", recErr);
        return NextResponse.json({ error: "Failed to load inbox." }, { status: 500 });
      }

      const entries = recipientEntries ?? [];
      for (const e of entries) {
        readMap.set(e.message_id as string, e.is_read as boolean);
      }

      if (entries.length > 0) {
        const messageIds = entries.map((e) => e.message_id as string);
        const privateQuery = svc
          .from("messages")
          .select("id,sender_id,subject,content,message_type,thread_id,parent_id,created_at")
          .in("id", messageIds)
          .in("message_type", ["private", "system"])
          .order("created_at", { ascending: false });

        const { data: privateMsgs, error: pmErr } = await privateQuery;
        if (pmErr) {
          captureApiError("GET /api/messages (private)", pmErr);
          return NextResponse.json({ error: "Failed to load messages." }, { status: 500 });
        }
        allMessages = (privateMsgs ?? []) as InboxMsg[];
      }
    }

    /* ── Part B: Broadcast messages via rank matching ── */
    if (typeFilter === "all" || typeFilter === "broadcast" || typeFilter === "clan") {
      const broadcastTypes =
        typeFilter === "clan" ? ["clan"] : typeFilter === "broadcast" ? ["broadcast"] : ["broadcast", "clan"];

      const { data: broadcastMsgs, error: bcErr } = await svc
        .from("messages")
        .select(
          "id,sender_id,subject,content,message_type,thread_id,parent_id,created_at,target_ranks,target_roles,target_clan_id",
        )
        .in("message_type", broadcastTypes)
        .order("created_at", { ascending: false })
        .limit(INBOX_LIMIT);

      if (bcErr) {
        captureApiError("GET /api/messages (broadcast)", bcErr);
        return NextResponse.json({ error: "Failed to load messages." }, { status: 500 });
      }

      /* Filter broadcasts: check targeting + dismissals */
      const candidateMsgs = (broadcastMsgs ?? []) as (InboxMsg & {
        target_ranks: string[] | null;
        target_roles: string[] | null;
        target_clan_id: string | null;
      })[];

      if (candidateMsgs.length > 0) {
        const bcIds = candidateMsgs.map((m) => m.id);
        const [dismissalResult, readsResult, userCtx] = await Promise.all([
          svc
            .from("message_dismissals")
            .select("message_id,dismissed_at,archived_at")
            .eq("user_id", userId)
            .in("message_id", bcIds),
          svc.from("message_reads").select("message_id").eq("user_id", userId).in("message_id", bcIds),
          loadUserBroadcastContext(svc, userId),
        ]);

        const dismissedIds = new Set<string>();
        const archivedBcIds = new Set<string>();
        for (const d of dismissalResult.data ?? []) {
          if (d.dismissed_at) dismissedIds.add(d.message_id as string);
          if (d.archived_at) archivedBcIds.add(d.message_id as string);
        }
        const readBcIds = new Set((readsResult.data ?? []).map((r) => r.message_id as string));

        for (const msg of candidateMsgs) {
          if (dismissedIds.has(msg.id) || archivedBcIds.has(msg.id)) continue;
          if (msg.sender_id === userId) continue;

          if (!userMatchesBroadcastTargetingSync(userCtx, msg)) continue;

          readMap.set(msg.id, readBcIds.has(msg.id));
          allMessages.push(msg);
        }
      }
    }

    if (allMessages.length === 0) {
      return NextResponse.json<MessagesInboxResponseDto>({ data: [], profiles: {} });
    }

    /* ── Apply search filter ── */
    let filteredMessages = allMessages;
    if (search) {
      const lowerSearch = search.toLowerCase();
      filteredMessages = filteredMessages.filter(
        (m) => (m.subject ?? "").toLowerCase().includes(lowerSearch) || m.content.toLowerCase().includes(lowerSearch),
      );
    }

    /* ── Group into threads ── */
    const threadMap = new Map<string, { messages: InboxMsg[]; unreadCount: number }>();

    for (const msg of filteredMessages) {
      const threadKey = msg.thread_id ?? msg.id;
      const existing = threadMap.get(threadKey);
      const isUnread = !readMap.get(msg.id);

      if (existing) {
        existing.messages.push(msg);
        if (isUnread) existing.unreadCount++;
      } else {
        threadMap.set(threadKey, { messages: [msg], unreadCount: isUnread ? 1 : 0 });
      }
    }

    /* ── Build thread summaries ── */
    const rawThreads = Array.from(threadMap.entries()).map(([tid, { messages: threadMsgs, unreadCount }]) => {
      const sorted = threadMsgs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const latest = sorted[0]!;
      const localSubject = latest.subject ?? sorted[sorted.length - 1]!.subject;
      return {
        thread_id: tid,
        latest_message: { ...latest, subject: localSubject },
        message_count: sorted.length,
        unread_count: unreadCount,
        message_type: latest.message_type,
        sender_id: latest.sender_id,
      };
    });

    /* Fill in missing subjects from root messages not in the inbox */
    const missingSubjectIds = rawThreads.filter((t) => !t.latest_message.subject).map((t) => t.thread_id);

    if (missingSubjectIds.length > 0) {
      const { data: rootMsgs } = await svc.from("messages").select("id,subject").in("id", missingSubjectIds);

      const rootSubjectMap = new Map<string, string | null>();
      for (const rm of rootMsgs ?? []) {
        rootSubjectMap.set(rm.id as string, rm.subject as string | null);
      }
      for (const t of rawThreads) {
        if (!t.latest_message.subject) {
          const rootSub = rootSubjectMap.get(t.thread_id);
          if (rootSub) t.latest_message.subject = rootSub;
        }
      }
    }

    const threads = rawThreads;
    threads.sort(
      (a, b) => new Date(b.latest_message.created_at).getTime() - new Date(a.latest_message.created_at).getTime(),
    );

    const senderIds = Array.from(
      new Set(filteredMessages.map((m) => m.sender_id).filter((id): id is string => id !== null && id !== userId)),
    );
    const profilesById = await loadMessageProfilesByIds(svc, senderIds);

    return NextResponse.json<MessagesInboxResponseDto>({ data: threads, profiles: profilesById });
  } catch (err) {
    captureApiError("GET /api/messages", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

/**
 * POST /api/messages — Unified send
 * Creates one message + N message_recipients.
 * Handles private, broadcast, and clan messages.
 * For broadcast/clan the server resolves actual recipients from message_type;
 * the client sends a placeholder UUID in recipient_ids to satisfy validation.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const blocked = standardLimiter.check(request);
  if (blocked) return blocked;
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const senderId = auth.userId;

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const parsed = SEND_SCHEMA.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input.", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const body = parsed.data;
    const svc = createSupabaseServiceRoleClient();

    const isBroadcast = body.message_type === "broadcast" || body.message_type === "clan";

    /* ── Authorization for broadcasts ── */
    if (isBroadcast) {
      if (body.message_type === "clan" && !body.clan_id) {
        return NextResponse.json({ error: "clan_id is required for clan messages." }, { status: 400 });
      }

      const isCM = await getIsContentManager({ supabase: auth.supabase });

      if (!isCM) {
        if (body.message_type === "broadcast") {
          return NextResponse.json(
            { error: "Forbidden: only content managers can send global broadcasts." },
            { status: 403 },
          );
        }
        const canBroadcast = await canUserReplyToBroadcast(svc, senderId, body.clan_id!);
        if (!canBroadcast) {
          return NextResponse.json(
            { error: "Forbidden: leader or superior rank required for clan broadcasts." },
            { status: 403 },
          );
        }
      }
    }

    /* ── Resolve recipients for private messages (unchanged) ── */
    let resolvedRecipientIds: string[] = [];

    if (!isBroadcast) {
      resolvedRecipientIds = body.recipient_ids.filter((id) => id !== senderId);
      if (resolvedRecipientIds.length === 0) {
        return NextResponse.json({ error: "No recipients found." }, { status: 400 });
      }
      if (resolvedRecipientIds.length <= 50) {
        const { data: validProfiles } = await svc.from("profiles").select("id").in("id", resolvedRecipientIds);
        const validIds = new Set((validProfiles ?? []).map((p) => p.id as string));
        const invalidIds = resolvedRecipientIds.filter((id) => !validIds.has(id));
        if (invalidIds.length > 0) {
          return NextResponse.json({ error: `Recipient(s) not found: ${invalidIds.join(", ")}` }, { status: 404 });
        }
      }
    }

    /* ── Normalize targeting (all ranks selected = null = no filter) ── */
    const ALL_RANKS = ["leader", "superior", "officer", "veteran", "soldier", "guest"];
    const rawRanks = body.target_ranks;
    const effectiveTargetRanks =
      isBroadcast && rawRanks && rawRanks.length > 0 && rawRanks.length < ALL_RANKS.length ? rawRanks : null;
    const effectiveTargetRoles =
      isBroadcast && body.target_roles && body.target_roles.length > 0 ? body.target_roles : null;
    const effectiveTargetClanId = body.message_type === "clan" ? (body.clan_id ?? null) : null;

    /* ── Resolve threading ── */
    let threadId: string | null = null;
    if (body.parent_id) {
      const { data: parentMsg } = await svc
        .from("messages")
        .select("id,thread_id")
        .eq("id", body.parent_id)
        .maybeSingle();
      if (parentMsg) {
        threadId = (parentMsg.thread_id as string | null) ?? (parentMsg.id as string);
      }
    }

    /* ── Insert message ── */
    const insertPayload: Record<string, unknown> = {
      sender_id: senderId,
      subject: body.subject?.trim() || null,
      content: body.content.trim(),
      message_type: body.message_type,
      thread_id: threadId,
      parent_id: body.parent_id ?? null,
    };
    if (isBroadcast) {
      insertPayload.target_ranks = effectiveTargetRanks;
      insertPayload.target_roles = effectiveTargetRoles;
      insertPayload.target_clan_id = effectiveTargetClanId;
    }

    const { data: insertedMsg, error: insertError } = await svc
      .from("messages")
      .insert(insertPayload)
      .select(
        "id,sender_id,subject,content,message_type,thread_id,parent_id,created_at,target_ranks,target_roles,target_clan_id",
      )
      .single();

    if (insertError || !insertedMsg) {
      if (insertError) captureApiError("POST /api/messages", insertError);
      return NextResponse.json({ error: "Failed to create message." }, { status: 500 });
    }

    const messageId = insertedMsg.id as string;
    const BATCH_SIZE = 500;

    if (isBroadcast) {
      /* ── Broadcasts: resolve recipients for notifications only ── */
      try {
        resolvedRecipientIds = await resolveBroadcastRecipients(svc, {
          senderId,
          messageType: body.message_type as "broadcast" | "clan",
          clanId: effectiveTargetClanId,
          targetRanks: effectiveTargetRanks,
          targetRoles: effectiveTargetRoles,
        });
      } catch (err) {
        captureApiError("POST /api/messages (resolve recipients)", err);
        return NextResponse.json({ error: "Failed to resolve recipients." }, { status: 500 });
      }
    } else {
      /* ── Private: insert message_recipients (unchanged) ── */
      const recipientRows = resolvedRecipientIds.map((recipientId) => ({
        message_id: messageId,
        recipient_id: recipientId,
      }));
      for (let i = 0; i < recipientRows.length; i += BATCH_SIZE) {
        const batch = recipientRows.slice(i, i + BATCH_SIZE);
        const { error: batchError } = await svc.from("message_recipients").insert(batch);
        if (batchError) {
          captureApiError("POST /api/messages", batchError);
          return NextResponse.json({ error: "Failed to deliver message." }, { status: 500 });
        }
      }
    }

    /* ── Notifications (async) ── */
    const senderProfile = await svc.from("profiles").select("display_name,username").eq("id", senderId).maybeSingle();
    const senderLabel = resolveMessageProfileLabel(
      senderProfile.data
        ? {
            display_name: senderProfile.data.display_name as string | null,
            username: senderProfile.data.username as string | null,
          }
        : null,
      "Someone",
    );

    after(async () => {
      const notifRows = resolvedRecipientIds.map((recipientId) => ({
        user_id: recipientId,
        type: "message" as const,
        title:
          body.message_type === "private"
            ? `New message from ${senderLabel}`
            : body.message_type === "clan"
              ? `New clan message from ${senderLabel}`
              : `New broadcast from ${senderLabel}`,
        body: body.subject?.trim() || body.content.trim().slice(0, 100),
        reference_id: messageId,
      }));
      for (let i = 0; i < notifRows.length; i += BATCH_SIZE) {
        await svc.from("notifications").insert(notifRows.slice(i, i + BATCH_SIZE));
      }
    });

    return NextResponse.json<MessageSendResponseDto>(
      { data: insertedMsg as MessageRow, recipient_count: resolvedRecipientIds.length },
      { status: 201 },
    );
  } catch (err) {
    captureApiError("POST /api/messages", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
