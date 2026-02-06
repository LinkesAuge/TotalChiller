import { NextResponse, type NextRequest } from "next/server";
import createSupabaseServerClient from "../../../lib/supabase/server-client";
import createSupabaseServiceRoleClient from "../../../lib/supabase/service-role-client";

interface SendMessageBody {
  readonly recipient_id: string;
  readonly subject?: string;
  readonly content: string;
}

/**
 * GET /api/messages
 * Returns the inbox for the authenticated user.
 * Supports ?type=all|private|broadcast|system filtering.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
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
 * Send a private message to another user.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const senderId = authData.user.id;
  let body: SendMessageBody;
  try {
    body = (await request.json()) as SendMessageBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!body.recipient_id) {
    return NextResponse.json({ error: "recipient_id is required." }, { status: 400 });
  }
  if (!body.content?.trim()) {
    return NextResponse.json({ error: "Message content is required." }, { status: 400 });
  }
  if (body.recipient_id === senderId) {
    return NextResponse.json({ error: "Cannot send a message to yourself." }, { status: 400 });
  }
  const serviceClient = createSupabaseServiceRoleClient();
  const { data: recipientProfile } = await serviceClient
    .from("profiles")
    .select("id")
    .eq("id", body.recipient_id)
    .maybeSingle();
  if (!recipientProfile) {
    return NextResponse.json({ error: "Recipient not found." }, { status: 404 });
  }
  const { data: inserted, error: insertError } = await supabase
    .from("messages")
    .insert({
      sender_id: senderId,
      recipient_id: body.recipient_id,
      message_type: "private",
      subject: body.subject?.trim() || null,
      content: body.content.trim(),
    })
    .select("id,sender_id,recipient_id,message_type,subject,content,is_read,created_at")
    .single();
  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }
  const senderProfile = await serviceClient
    .from("profiles")
    .select("display_name,username,email")
    .eq("id", senderId)
    .maybeSingle();
  const senderLabel =
    senderProfile.data?.display_name ?? senderProfile.data?.username ?? senderProfile.data?.email ?? "Someone";
  await serviceClient.from("notifications").insert({
    user_id: body.recipient_id,
    type: "message",
    title: `New message from ${senderLabel}`,
    body: body.subject?.trim() || body.content.trim().slice(0, 100),
    reference_id: inserted.id as string,
  });
  return NextResponse.json({ data: inserted }, { status: 201 });
}
