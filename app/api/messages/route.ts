import { NextResponse, type NextRequest } from "next/server";
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

/**
 * GET /api/messages
 * Returns the inbox for the authenticated user.
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
  let query = serviceClient
    .from("messages")
    .select("id,sender_id,recipient_id,message_type,subject,content,is_read,created_at")
    .or(`recipient_id.eq.${userId},sender_id.eq.${userId}`)
    .order("created_at", { ascending: false })
    .limit(200);
  if (typeFilter !== "all") {
    query = query.eq("message_type", typeFilter);
  }
  const { data: messages, error: fetchError } = await query;
  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }
  const rows = messages ?? [];
  const userIds = Array.from(
    new Set(
      rows
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
  return NextResponse.json({ data: rows, profiles: profilesById });
}

/**
 * POST /api/messages
 * Send a private message to one or multiple users.
 * Accepts `recipient_id` (single) or `recipient_ids` (array) for multi-recipient.
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

  /* Build message rows */
  const messageRows = recipientIds.map((recipientId) => ({
    sender_id: senderId,
    recipient_id: recipientId,
    message_type: "private" as const,
    subject: body.subject?.trim() || null,
    content: body.content.trim(),
  }));

  const { data: inserted, error: insertError } = await serviceClient
    .from("messages")
    .insert(messageRows)
    .select("id,sender_id,recipient_id,message_type,subject,content,is_read,created_at");
  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  /* Create notifications for all recipients */
  const senderProfile = await serviceClient
    .from("profiles")
    .select("display_name,username,email")
    .eq("id", senderId)
    .maybeSingle();
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
  await serviceClient.from("notifications").insert(notificationRows);

  return NextResponse.json({ data: inserted, count: recipientIds.length }, { status: 201 });
}
