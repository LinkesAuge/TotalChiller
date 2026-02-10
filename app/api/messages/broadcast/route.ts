import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import createSupabaseServerClient from "../../../../lib/supabase/server-client";
import createSupabaseServiceRoleClient from "../../../../lib/supabase/service-role-client";
import getIsContentManager from "../../../../lib/supabase/role-access";
import { strictLimiter } from "../../../../lib/rate-limit";

const BROADCAST_SCHEMA = z.object({
  clan_id: z.string().min(1).max(128),
  subject: z.string().max(200).optional(),
  content: z.string().min(1).max(10_000),
});

/**
 * POST /api/messages/broadcast
 * Sends a broadcast message to all active members of a clan or globally.
 * Requires content-manager role (owner, admin, moderator, or editor).
 * Use clan_id: "all" to broadcast to all users globally.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const blocked = strictLimiter.check(request);
  if (blocked) return blocked;
  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const isContentManager = await getIsContentManager({ supabase });
  if (!isContentManager) {
    return NextResponse.json({ error: "Forbidden: content manager access required." }, { status: 403 });
  }
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const parsed = BROADCAST_SCHEMA.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input.", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const body = parsed.data;
  const senderId = authData.user.id;
  const serviceClient = createSupabaseServiceRoleClient();

  let recipientIds: string[];

  if (body.clan_id === "all") {
    /* Global broadcast: send to all users */
    const { data: allProfiles, error: profileError } = await serviceClient
      .from("profiles")
      .select("id")
      .neq("id", senderId);
    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }
    recipientIds = (allProfiles ?? []).map((p) => p.id as string);
  } else {
    /* Clan-specific broadcast */
    const { data: memberships, error: membershipError } = await serviceClient
      .from("game_account_clan_memberships")
      .select("game_accounts(user_id)")
      .eq("clan_id", body.clan_id)
      .eq("is_active", true);
    if (membershipError) {
      return NextResponse.json({ error: membershipError.message }, { status: 500 });
    }
    recipientIds = Array.from(
      new Set(
        (memberships ?? [])
          .map((row) => {
            const gameAccount = row.game_accounts as unknown as { user_id: string } | null;
            return gameAccount?.user_id ?? null;
          })
          .filter((id): id is string => id !== null && id !== senderId),
      ),
    );
  }

  if (recipientIds.length === 0) {
    return NextResponse.json({ error: "No recipients found." }, { status: 400 });
  }
  const messageRows = recipientIds.map((recipientId) => ({
    sender_id: senderId,
    recipient_id: recipientId,
    message_type: "broadcast",
    subject: body.subject?.trim() || null,
    content: body.content.trim(),
  }));
  const { error: insertError } = await serviceClient.from("messages").insert(messageRows);
  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }
  const notificationRows = recipientIds.map((recipientId) => ({
    user_id: recipientId,
    type: "message" as const,
    title: body.subject?.trim() || "New broadcast message",
    body: body.content.trim().slice(0, 100),
    reference_id: body.clan_id === "all" ? "global" : body.clan_id,
  }));
  await serviceClient.from("notifications").insert(notificationRows);
  return NextResponse.json({ data: { recipients: recipientIds.length, clan_id: body.clan_id } }, { status: 201 });
}
