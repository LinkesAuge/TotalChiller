import { NextResponse, type NextRequest } from "next/server";
import { captureApiError } from "@/lib/api/logger";
import { apiError, messageQuerySchema } from "@/lib/api/validation";
import { requireAuth } from "../../../../lib/api/require-auth";
import createSupabaseServiceRoleClient from "../../../../lib/supabase/service-role-client";
import { standardLimiter } from "../../../../lib/rate-limit";

const SENT_LIMIT = 200;

/**
 * GET /api/messages/sent
 * Returns sent messages for the authenticated user.
 * Each message includes its recipient list.
 * Supports ?type=all|private|broadcast|clan and ?search=term.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const blocked = standardLimiter.check(request);
  if (blocked) return blocked;
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const userId = auth.userId;
    const rawParams = Object.fromEntries(request.nextUrl.searchParams.entries());
    const parsed = messageQuerySchema.safeParse(rawParams);
    if (!parsed.success) {
      return apiError("Invalid query parameters.", 400);
    }
    const { type: typeFilter, search } = parsed.data;

    const svc = createSupabaseServiceRoleClient();

    /* Fetch sent messages */
    let msgQuery = svc
      .from("messages")
      .select("id,sender_id,subject,content,message_type,thread_id,parent_id,created_at")
      .eq("sender_id", userId)
      .order("created_at", { ascending: false })
      .limit(SENT_LIMIT);

    if (typeFilter === "broadcast") {
      msgQuery = msgQuery.in("message_type", ["broadcast", "system"]);
    } else if (typeFilter !== "all") {
      msgQuery = msgQuery.eq("message_type", typeFilter);
    }

    const { data: msgData, error: msgErr } = await msgQuery;
    if (msgErr) {
      captureApiError("GET /api/messages/sent", msgErr);
      return apiError("Failed to load sent messages.", 500);
    }

    let messages = (msgData ?? []) as Array<{
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
      messages = messages.filter(
        (m) => (m.subject ?? "").toLowerCase().includes(lowerSearch) || m.content.toLowerCase().includes(lowerSearch),
      );
    }

    if (messages.length === 0) {
      return NextResponse.json({ data: [], profiles: {} });
    }

    /* Fetch recipients for each message */
    const messageIds = messages.map((m) => m.id);
    const { data: recipientData } = await svc
      .from("message_recipients")
      .select("message_id,recipient_id")
      .in("message_id", messageIds);

    /* Group recipients by message_id */
    const recipientsByMsgId = new Map<string, string[]>();
    for (const r of recipientData ?? []) {
      const msgId = r.message_id as string;
      const existing = recipientsByMsgId.get(msgId) ?? [];
      existing.push(r.recipient_id as string);
      recipientsByMsgId.set(msgId, existing);
    }

    /* Collect all recipient user IDs for profile lookup */
    const allRecipientIds = new Set<string>();
    for (const ids of recipientsByMsgId.values()) {
      for (const id of ids) {
        if (id !== userId) allRecipientIds.add(id);
      }
    }

    /* Fetch profiles */
    let profilesById: Record<string, { email: string; username: string | null; display_name: string | null }> = {};
    if (allRecipientIds.size > 0) {
      const { data: profileData } = await svc
        .from("profiles")
        .select("id,email,username,display_name")
        .in("id", Array.from(allRecipientIds).slice(0, 200));
      for (const p of profileData ?? []) {
        profilesById[p.id as string] = {
          email: p.email as string,
          username: p.username as string | null,
          display_name: p.display_name as string | null,
        };
      }
    }

    /* Build response with recipient info */
    const sentMessages = messages.map((msg) => {
      const recipientIds = recipientsByMsgId.get(msg.id) ?? [];
      const recipients = recipientIds.map((id) => {
        const profile = profilesById[id];
        return {
          id,
          label: profile?.display_name ?? profile?.username ?? profile?.email ?? "Unknown",
        };
      });
      return {
        ...msg,
        recipient_count: recipientIds.length,
        recipients,
      };
    });

    return NextResponse.json({ data: sentMessages, profiles: profilesById });
  } catch (err) {
    captureApiError("GET /api/messages/sent", err);
    return apiError("Internal server error.", 500);
  }
}
