import { NextResponse, after, type NextRequest } from "next/server";
import { z } from "zod";
import createSupabaseServerClient from "../../../lib/supabase/server-client";
import createSupabaseServiceRoleClient from "../../../lib/supabase/service-role-client";
import { standardLimiter } from "../../../lib/rate-limit";

const SEND_MESSAGE_SCHEMA = z.object({
  recipient_id: z.string().uuid().optional(),
  recipient_ids: z.array(z.string().uuid()).max(50).optional(),
  subject: z.string().max(200).optional(),
  content: z.string().min(1).max(10_000),
});

const MESSAGE_SELECT_COLUMNS =
  "id,sender_id,recipient_id,message_type,subject,content,is_read,created_at,broadcast_group_id,recipient_count";

const INCOMING_LIMIT = 200;
const OUTGOING_LIMIT = 2000;

/**
 * Deduplicates outgoing messages by broadcast_group_id.
 * Messages without a broadcast_group_id are kept as-is.
 * For messages sharing a broadcast_group_id, only the first (most recent) is kept.
 */
function deduplicateOutgoing<T extends { broadcast_group_id: string | null }>(rows: readonly T[]): T[] {
  const seenGroups = new Set<string>();
  const result: T[] = [];
  for (const row of rows) {
    if (row.broadcast_group_id) {
      if (seenGroups.has(row.broadcast_group_id)) continue;
      seenGroups.add(row.broadcast_group_id);
    }
    result.push(row);
  }
  return result;
}

/**
 * GET /api/messages
 * Returns the inbox for the authenticated user.
 * Fetches incoming (recipient) and outgoing (sender) messages separately.
 * Outgoing broadcast/multi-recipient messages are deduplicated by broadcast_group_id.
 * Supports ?type=all|private|broadcast|system filtering.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const blocked = standardLimiter.check(request);
  if (blocked) return blocked;
  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = authData.user.id;
  const typeFilter = request.nextUrl.searchParams.get("type") ?? "all";
  const serviceClient = createSupabaseServiceRoleClient();

  /* Incoming: messages where user is recipient */
  let incomingQuery = serviceClient
    .from("messages")
    .select(MESSAGE_SELECT_COLUMNS)
    .eq("recipient_id", userId)
    .order("created_at", { ascending: false })
    .limit(INCOMING_LIMIT);
  if (typeFilter !== "all") {
    incomingQuery = incomingQuery.eq("message_type", typeFilter);
  }

  /* Outgoing: messages where user is sender (higher limit for broadcast dedup) */
  let outgoingQuery = serviceClient
    .from("messages")
    .select(MESSAGE_SELECT_COLUMNS)
    .eq("sender_id", userId)
    .order("created_at", { ascending: false })
    .limit(OUTGOING_LIMIT);
  if (typeFilter !== "all") {
    outgoingQuery = outgoingQuery.eq("message_type", typeFilter);
  }

  const [incomingResult, outgoingResult] = await Promise.all([incomingQuery, outgoingQuery]);

  if (incomingResult.error) {
    return NextResponse.json({ error: incomingResult.error.message }, { status: 500 });
  }
  if (outgoingResult.error) {
    return NextResponse.json({ error: outgoingResult.error.message }, { status: 500 });
  }

  const incomingRows = incomingResult.data ?? [];
  const outgoingRows = outgoingResult.data ?? [];
  const deduplicatedOutgoing = deduplicateOutgoing(outgoingRows);

  /* Combine: no overlap since a row can't have sender_id = recipient_id = userId */
  const allRows = [...incomingRows, ...deduplicatedOutgoing];

  /* Fetch profiles for all referenced users */
  const userIds = Array.from(
    new Set(
      allRows
        .flatMap((message) => [message.sender_id as string | null, message.recipient_id as string])
        .filter((id): id is string => id !== null && id !== userId),
    ),
  );
  let profilesById: Record<string, { email: string; username: string | null; display_name: string | null }> = {};
  if (userIds.length > 0) {
    const { data: profileData } = await serviceClient
      .from("profiles")
      .select("id,email,username,display_name")
      .in("id", userIds);
    profilesById = (profileData ?? []).reduce<typeof profilesById>((acc, profile) => {
      acc[profile.id as string] = {
        email: profile.email as string,
        username: profile.username as string | null,
        display_name: profile.display_name as string | null,
      };
      return acc;
    }, {});
  }
  return NextResponse.json({ data: allRows, profiles: profilesById });
}

/**
 * POST /api/messages
 * Send a private message to one or multiple users.
 * Accepts `recipient_id` (single) or `recipient_ids` (array) for multi-recipient.
 * Multi-recipient messages share a broadcast_group_id for grouped display.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const blocked = standardLimiter.check(request);
  if (blocked) return blocked;
  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const senderId = authData.user.id;
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const parsed = SEND_MESSAGE_SCHEMA.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input.", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const body = parsed.data;

  /* Resolve recipient list: support both single and multi */
  const recipientIds: string[] = [];
  if (body.recipient_ids && body.recipient_ids.length > 0) {
    for (const id of body.recipient_ids) {
      if (id && id !== senderId && !recipientIds.includes(id)) {
        recipientIds.push(id);
      }
    }
  } else if (body.recipient_id && body.recipient_id !== senderId) {
    recipientIds.push(body.recipient_id);
  }

  if (recipientIds.length === 0) {
    return NextResponse.json({ error: "At least one recipient is required." }, { status: 400 });
  }
  if (!body.content?.trim()) {
    return NextResponse.json({ error: "Message content is required." }, { status: 400 });
  }

  const serviceClient = createSupabaseServiceRoleClient();

  /* Validate all recipients exist */
  const { data: validProfiles } = await serviceClient.from("profiles").select("id").in("id", recipientIds);
  const validIds = new Set((validProfiles ?? []).map((p) => p.id as string));
  const invalidIds = recipientIds.filter((id) => !validIds.has(id));
  if (invalidIds.length > 0) {
    return NextResponse.json({ error: `Recipient(s) not found: ${invalidIds.join(", ")}` }, { status: 404 });
  }

  /* Group multi-recipient sends so the sender's outbox isn't spammed */
  const isMultiRecipient = recipientIds.length > 1;
  const broadcastGroupId = isMultiRecipient ? crypto.randomUUID() : null;

  /* Build message rows */
  const messageRows = recipientIds.map((recipientId) => ({
    sender_id: senderId,
    recipient_id: recipientId,
    message_type: "private" as const,
    subject: body.subject?.trim() || null,
    content: body.content.trim(),
    broadcast_group_id: broadcastGroupId,
    recipient_count: recipientIds.length,
  }));

  /* Insert messages and fetch sender profile in parallel */
  const [insertResult, senderProfile] = await Promise.all([
    serviceClient.from("messages").insert(messageRows).select(MESSAGE_SELECT_COLUMNS),
    serviceClient.from("profiles").select("display_name,username,email").eq("id", senderId).maybeSingle(),
  ]);
  const { data: inserted, error: insertError } = insertResult;
  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }
  const senderLabel =
    senderProfile.data?.display_name ?? senderProfile.data?.username ?? senderProfile.data?.email ?? "Someone";

  const notificationRows = recipientIds.map((recipientId) => {
    const msg = (inserted ?? []).find((m) => (m.recipient_id as string) === recipientId);
    return {
      user_id: recipientId,
      type: "message" as const,
      title: `New message from ${senderLabel}`,
      body: body.subject?.trim() || body.content.trim().slice(0, 100),
      reference_id: (msg?.id as string) ?? null,
    };
  });
  after(async () => {
    await serviceClient.from("notifications").insert(notificationRows);
  });

  return NextResponse.json({ data: inserted, count: recipientIds.length }, { status: 201 });
}
