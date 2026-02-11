import { NextResponse, type NextRequest } from "next/server";
import createSupabaseServerClient from "../../../../lib/supabase/server-client";
import createSupabaseServiceRoleClient from "../../../../lib/supabase/service-role-client";
import { strictLimiter } from "../../../../lib/rate-limit";
import { uuidSchema } from "../../../../lib/api/validation";

interface FanOutBody {
  readonly type: "news" | "event";
  readonly reference_id: string;
  readonly clan_id: string;
  readonly title: string;
  readonly body?: string;
}

/**
 * POST /api/notifications/fan-out
 * Creates a notification for every active member of a clan.
 * Verifies the caller is the created_by of the referenced record.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const blocked = strictLimiter.check(request);
  if (blocked) return blocked;
  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: FanOutBody;
  try {
    body = (await request.json()) as FanOutBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!body.type || !body.reference_id || !body.clan_id || !body.title) {
    return NextResponse.json({ error: "type, reference_id, clan_id, and title are required." }, { status: 400 });
  }
  if (body.type !== "news" && body.type !== "event") {
    return NextResponse.json({ error: "type must be 'news' or 'event'." }, { status: 400 });
  }
  if (!uuidSchema.safeParse(body.reference_id).success || !uuidSchema.safeParse(body.clan_id).success) {
    return NextResponse.json({ error: "reference_id and clan_id must be valid UUIDs." }, { status: 400 });
  }
  const serviceClient = createSupabaseServiceRoleClient();
  const tableName = body.type === "news" ? "articles" : "events";
  const { data: record, error: recordError } = await serviceClient
    .from(tableName)
    .select("id,created_by")
    .eq("id", body.reference_id)
    .single();
  if (recordError || !record) {
    return NextResponse.json({ error: "Referenced record not found." }, { status: 404 });
  }
  if ((record.created_by as string) !== authData.user.id) {
    return NextResponse.json({ error: "You can only create notifications for content you authored." }, { status: 403 });
  }
  const senderId = authData.user.id;
  const { data: memberships, error: membershipError } = await serviceClient
    .from("game_account_clan_memberships")
    .select("game_accounts(user_id)")
    .eq("clan_id", body.clan_id)
    .eq("is_active", true);
  if (membershipError) {
    console.error("[notifications/fan-out]", membershipError.message);
    return NextResponse.json({ error: "Failed to load clan memberships." }, { status: 500 });
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
    return NextResponse.json({ data: { recipients: 0 } });
  }
  const notificationRows = recipientIds.map((userId) => ({
    user_id: userId,
    type: body.type,
    title: body.title,
    body: body.body?.trim() || null,
    reference_id: body.reference_id,
  }));
  const { error: insertError } = await serviceClient.from("notifications").insert(notificationRows);
  if (insertError) {
    console.error("[notifications/fan-out]", insertError.message);
    return NextResponse.json({ error: "Failed to create notifications." }, { status: 500 });
  }
  return NextResponse.json({ data: { recipients: recipientIds.length } }, { status: 201 });
}
