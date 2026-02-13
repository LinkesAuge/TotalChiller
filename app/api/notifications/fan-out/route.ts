import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "../../../../lib/api/require-auth";
import createSupabaseServiceRoleClient from "../../../../lib/supabase/service-role-client";
import { strictLimiter } from "../../../../lib/rate-limit";

const FAN_OUT_SCHEMA = z.object({
  type: z.enum(["news", "event"]),
  reference_id: z.string().uuid(),
  clan_id: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  body: z.string().max(2000).optional(),
});

/**
 * POST /api/notifications/fan-out
 * Creates a notification for every active member of a clan.
 * Verifies the caller is the created_by of the referenced record.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const blocked = strictLimiter.check(request);
  if (blocked) return blocked;

  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const parsed = FAN_OUT_SCHEMA.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input.", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }
    const body = parsed.data;
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
    if ((record.created_by as string) !== auth.userId) {
      return NextResponse.json(
        { error: "You can only create notifications for content you authored." },
        { status: 403 },
      );
    }
    const senderId = auth.userId;
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
  } catch (err) {
    console.error("[notifications/fan-out POST] Unexpected:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
