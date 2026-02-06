import { NextResponse, type NextRequest } from "next/server";
import createSupabaseServerClient from "../../../../lib/supabase/server-client";
import createSupabaseServiceRoleClient from "../../../../lib/supabase/service-role-client";

interface BroadcastBody {
  readonly clan_id: string;
  readonly subject?: string;
  readonly content: string;
}

/**
 * POST /api/messages/broadcast
 * Sends a broadcast message to all active members of a clan.
 * Requires admin access.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data: isAdmin } = await supabase.rpc("is_any_admin");
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden: admin access required." }, { status: 403 });
  }
  let body: BroadcastBody;
  try {
    body = (await request.json()) as BroadcastBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!body.clan_id) {
    return NextResponse.json({ error: "clan_id is required." }, { status: 400 });
  }
  if (!body.content?.trim()) {
    return NextResponse.json({ error: "Message content is required." }, { status: 400 });
  }
  const senderId = authData.user.id;
  const serviceClient = createSupabaseServiceRoleClient();
  const { data: memberships, error: membershipError } = await serviceClient
    .from("game_account_clan_memberships")
    .select("game_accounts(user_id)")
    .eq("clan_id", body.clan_id)
    .eq("is_active", true);
  if (membershipError) {
    return NextResponse.json({ error: membershipError.message }, { status: 500 });
  }
  const recipientIds = Array.from(
    new Set(
      (memberships ?? [])
        .map((row) => {
          const gameAccount = row.game_accounts as unknown as { user_id: string } | null;
          return gameAccount?.user_id ?? null;
        })
        .filter((id): id is string => id !== null && id !== senderId),
    ),
  );
  if (recipientIds.length === 0) {
    return NextResponse.json({ error: "No active members in this clan." }, { status: 400 });
  }
  const messageRows = recipientIds.map((recipientId) => ({
    sender_id: senderId,
    recipient_id: recipientId,
    message_type: "broadcast",
    subject: body.subject?.trim() || null,
    content: body.content.trim(),
  }));
  const { error: insertError } = await serviceClient
    .from("messages")
    .insert(messageRows);
  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }
  const notificationRows = recipientIds.map((recipientId) => ({
    user_id: recipientId,
    type: "message" as const,
    title: body.subject?.trim() || "New broadcast message",
    body: body.content.trim().slice(0, 100),
    reference_id: body.clan_id,
  }));
  await serviceClient.from("notifications").insert(notificationRows);
  return NextResponse.json(
    { data: { recipients: recipientIds.length, clan_id: body.clan_id } },
    { status: 201 },
  );
}
