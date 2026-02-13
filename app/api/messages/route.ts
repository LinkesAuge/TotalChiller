import { NextResponse, after, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "../../../lib/api/require-auth";
import createSupabaseServiceRoleClient from "../../../lib/supabase/service-role-client";
import getIsContentManager from "../../../lib/supabase/role-access";
import { standardLimiter } from "../../../lib/rate-limit";

/* ── Schemas ── */

const SEND_SCHEMA = z.object({
  recipient_ids: z.array(z.string().uuid()).min(1).max(500),
  subject: z.string().max(200).optional(),
  content: z.string().min(1).max(10_000),
  message_type: z.enum(["private", "broadcast", "clan"]).default("private"),
  parent_id: z.string().uuid().optional(),
  /** For clan broadcasts — the clan to send to */
  clan_id: z.string().uuid().optional(),
});

const INBOX_LIMIT = 200;

/* ── Helpers ── */

function buildProfileMap(
  profiles: readonly { id: string; email: string; username: string | null; display_name: string | null }[],
): Record<string, { email: string; username: string | null; display_name: string | null }> {
  const map: Record<string, { email: string; username: string | null; display_name: string | null }> = {};
  for (const p of profiles) {
    map[p.id] = { email: p.email, username: p.username, display_name: p.display_name };
  }
  return map;
}

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
    const typeFilter = request.nextUrl.searchParams.get("type") ?? "all";
    const search = request.nextUrl.searchParams.get("search")?.trim() ?? "";

    const svc = createSupabaseServiceRoleClient();

    /* Fetch recipient entries for this user (non-deleted) */
    const { data: recipientEntries, error: recErr } = await svc
      .from("message_recipients")
      .select("message_id, is_read")
      .eq("recipient_id", userId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(INBOX_LIMIT);

    if (recErr) {
      return NextResponse.json({ error: recErr.message }, { status: 500 });
    }

    const entries = recipientEntries ?? [];
    if (entries.length === 0) {
      return NextResponse.json({ data: [], profiles: {} });
    }

    const messageIds = entries.map((e) => e.message_id as string);
    const readMap = new Map<string, boolean>();
    for (const e of entries) {
      readMap.set(e.message_id as string, e.is_read as boolean);
    }

    /* Fetch the actual messages */
    let msgQuery = svc
      .from("messages")
      .select("id,sender_id,subject,content,message_type,thread_id,parent_id,created_at")
      .in("id", messageIds)
      .order("created_at", { ascending: false });

    if (typeFilter === "broadcast") {
      msgQuery = msgQuery.in("message_type", ["broadcast", "system"]);
    } else if (typeFilter !== "all") {
      msgQuery = msgQuery.eq("message_type", typeFilter);
    }

    const { data: msgData, error: msgErr } = await msgQuery;
    if (msgErr) {
      return NextResponse.json({ error: msgErr.message }, { status: 500 });
    }

    let filteredMessages = (msgData ?? []) as Array<{
      id: string;
      sender_id: string | null;
      subject: string | null;
      content: string;
      message_type: string;
      thread_id: string | null;
      parent_id: string | null;
      created_at: string;
    }>;

    /* Apply search filter */
    if (search) {
      const lowerSearch = search.toLowerCase();
      filteredMessages = filteredMessages.filter(
        (m) => (m.subject ?? "").toLowerCase().includes(lowerSearch) || m.content.toLowerCase().includes(lowerSearch),
      );
    }

    /* Group into threads */
    const threadMap = new Map<
      string,
      {
        messages: typeof filteredMessages;
        unreadCount: number;
      }
    >();

    for (const msg of filteredMessages) {
      const threadKey = msg.thread_id ?? msg.id;
      const existing = threadMap.get(threadKey);
      const isUnread = !readMap.get(msg.id);

      if (existing) {
        existing.messages.push(msg);
        if (isUnread) existing.unreadCount++;
      } else {
        threadMap.set(threadKey, {
          messages: [msg],
          unreadCount: isUnread ? 1 : 0,
        });
      }
    }

    /* Build thread summaries */
    const threads = Array.from(threadMap.entries()).map(([threadId, { messages: threadMsgs, unreadCount }]) => {
      const sorted = threadMsgs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const latest = sorted[0]!;
      return {
        thread_id: threadId,
        latest_message: latest,
        message_count: sorted.length,
        unread_count: unreadCount,
        message_type: latest.message_type,
        sender_id: latest.sender_id,
      };
    });

    /* Sort by latest activity */
    threads.sort(
      (a, b) => new Date(b.latest_message.created_at).getTime() - new Date(a.latest_message.created_at).getTime(),
    );

    /* Fetch profiles for all referenced senders */
    const senderIds = Array.from(
      new Set(filteredMessages.map((m) => m.sender_id).filter((id): id is string => id !== null && id !== userId)),
    );
    let profilesById: Record<string, { email: string; username: string | null; display_name: string | null }> = {};
    if (senderIds.length > 0) {
      const { data: profileData } = await svc
        .from("profiles")
        .select("id,email,username,display_name")
        .in("id", senderIds);
      profilesById = buildProfileMap(
        (profileData ?? []) as { id: string; email: string; username: string | null; display_name: string | null }[],
      );
    }

    return NextResponse.json({ data: threads, profiles: profilesById });
  } catch {
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

    /* ── Resolve recipients for broadcast/clan ── */
    let resolvedRecipientIds: string[];

    if (body.message_type === "broadcast") {
      /* Requires content manager */
      const isCM = await getIsContentManager({ supabase: auth.supabase });
      if (!isCM) {
        return NextResponse.json({ error: "Forbidden: content manager access required." }, { status: 403 });
      }
      /* Global broadcast: all users except sender */
      const { data: allProfiles, error: profileError } = await svc.from("profiles").select("id").neq("id", senderId);
      if (profileError) {
        return NextResponse.json({ error: profileError.message }, { status: 500 });
      }
      resolvedRecipientIds = (allProfiles ?? []).map((p) => p.id as string);
    } else if (body.message_type === "clan") {
      /* Requires content manager + clan_id */
      const isCM = await getIsContentManager({ supabase: auth.supabase });
      if (!isCM) {
        return NextResponse.json({ error: "Forbidden: content manager access required." }, { status: 403 });
      }
      if (!body.clan_id) {
        return NextResponse.json({ error: "clan_id is required for clan messages." }, { status: 400 });
      }
      const { data: memberships, error: membershipError } = await svc
        .from("game_account_clan_memberships")
        .select("game_accounts(user_id)")
        .eq("clan_id", body.clan_id)
        .eq("is_active", true)
        .eq("is_shadow", false);
      if (membershipError) {
        return NextResponse.json({ error: membershipError.message }, { status: 500 });
      }
      resolvedRecipientIds = Array.from(
        new Set(
          (memberships ?? [])
            .map((row) => {
              const ga = row.game_accounts as unknown as { user_id: string } | null;
              return ga?.user_id ?? null;
            })
            .filter((id): id is string => id !== null && id !== senderId),
        ),
      );
    } else {
      /* Private: use provided recipient_ids */
      resolvedRecipientIds = body.recipient_ids.filter((id) => id !== senderId);
    }

    if (resolvedRecipientIds.length === 0) {
      return NextResponse.json({ error: "No recipients found." }, { status: 400 });
    }

    /* Validate recipients exist (for private messages) */
    if (body.message_type === "private" && resolvedRecipientIds.length <= 50) {
      const { data: validProfiles } = await svc.from("profiles").select("id").in("id", resolvedRecipientIds);
      const validIds = new Set((validProfiles ?? []).map((p) => p.id as string));
      const invalidIds = resolvedRecipientIds.filter((id) => !validIds.has(id));
      if (invalidIds.length > 0) {
        return NextResponse.json({ error: `Recipient(s) not found: ${invalidIds.join(", ")}` }, { status: 404 });
      }
    }

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
    const { data: insertedMsg, error: insertError } = await svc
      .from("messages")
      .insert({
        sender_id: senderId,
        subject: body.subject?.trim() || null,
        content: body.content.trim(),
        message_type: body.message_type,
        thread_id: threadId,
        parent_id: body.parent_id ?? null,
      })
      .select("id,sender_id,subject,content,message_type,thread_id,parent_id,created_at")
      .single();

    if (insertError || !insertedMsg) {
      return NextResponse.json({ error: insertError?.message ?? "Failed to create message." }, { status: 500 });
    }

    const messageId = insertedMsg.id as string;

    /* ── Insert recipients (batch in chunks of 500) ── */
    const recipientRows = resolvedRecipientIds.map((recipientId) => ({
      message_id: messageId,
      recipient_id: recipientId,
    }));

    const BATCH_SIZE = 500;
    for (let i = 0; i < recipientRows.length; i += BATCH_SIZE) {
      const batch = recipientRows.slice(i, i + BATCH_SIZE);
      const { error: batchError } = await svc.from("message_recipients").insert(batch);
      if (batchError) {
        return NextResponse.json({ error: batchError.message }, { status: 500 });
      }
    }

    /* ── Notifications (async) ── */
    const senderProfile = await svc
      .from("profiles")
      .select("display_name,username,email")
      .eq("id", senderId)
      .maybeSingle();
    const senderLabel =
      senderProfile.data?.display_name ?? senderProfile.data?.username ?? senderProfile.data?.email ?? "Someone";

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
      /* Batch notifications too */
      for (let i = 0; i < notifRows.length; i += BATCH_SIZE) {
        await svc.from("notifications").insert(notifRows.slice(i, i + BATCH_SIZE));
      }
    });

    return NextResponse.json({ data: insertedMsg, recipient_count: resolvedRecipientIds.length }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
