import { NextResponse, type NextRequest } from "next/server";
import createSupabaseServerClient from "../../../lib/supabase/server-client";
import { notificationSettingsSchema } from "../../../lib/api/validation";

/**
 * GET /api/notification-settings
 * Returns the authenticated user's notification preferences.
 * Creates a default row if none exists.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = authData.user.id;
    const { data: existing } = await supabase
      .from("user_notification_settings")
      .select("messages_enabled,news_enabled,events_enabled,system_enabled")
      .eq("user_id", userId)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ data: existing });
    }
    const defaults = {
      user_id: userId,
      messages_enabled: true,
      news_enabled: true,
      events_enabled: true,
      system_enabled: true,
    };
    const { data: created, error: insertError } = await supabase
      .from("user_notification_settings")
      .upsert(defaults, { onConflict: "user_id" })
      .select("messages_enabled,news_enabled,events_enabled,system_enabled")
      .single();
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
    return NextResponse.json({ data: created });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

/**
 * PATCH /api/notification-settings
 * Updates the authenticated user's notification preferences.
 */
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }
    const parsed = notificationSettingsSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((issue) => issue.message).join(", ") },
        { status: 400 },
      );
    }
    const userId = authData.user.id;
    const updatePayload: Record<string, boolean> = {};
    const body = parsed.data;
    if (typeof body.messages_enabled === "boolean") {
      updatePayload.messages_enabled = body.messages_enabled;
    }
    if (typeof body.news_enabled === "boolean") {
      updatePayload.news_enabled = body.news_enabled;
    }
    if (typeof body.events_enabled === "boolean") {
      updatePayload.events_enabled = body.events_enabled;
    }
    if (typeof body.system_enabled === "boolean") {
      updatePayload.system_enabled = body.system_enabled;
    }
    const { data: updated, error: upsertError } = await supabase
      .from("user_notification_settings")
      .upsert({ user_id: userId, ...updatePayload }, { onConflict: "user_id" })
      .select("messages_enabled,news_enabled,events_enabled,system_enabled")
      .single();
    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }
    return NextResponse.json({ data: updated });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
