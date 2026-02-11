import { NextResponse, type NextRequest } from "next/server";
import createSupabaseServerClient from "../../../lib/supabase/server-client";
import { relaxedLimiter } from "../../../lib/rate-limit";

/**
 * GET /api/notifications
 * Returns recent notifications for the authenticated user, filtered by user preferences.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const blocked = relaxedLimiter.check(request);
    if (blocked) return blocked;
    const supabase = await createSupabaseServerClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = authData.user.id;
    const { data: settings } = await supabase
      .from("user_notification_settings")
      .select("messages_enabled,news_enabled,events_enabled,system_enabled")
      .eq("user_id", userId)
      .maybeSingle();
    const prefs = settings ?? {
      messages_enabled: true,
      news_enabled: true,
      events_enabled: true,
      system_enabled: true,
    };
    const enabledTypes: string[] = [];
    if (prefs.messages_enabled) {
      enabledTypes.push("message");
    }
    if (prefs.news_enabled) {
      enabledTypes.push("news");
    }
    if (prefs.events_enabled) {
      enabledTypes.push("event");
    }
    if (prefs.system_enabled) {
      enabledTypes.push("approval");
    }
    if (enabledTypes.length === 0) {
      return NextResponse.json({ data: [], unread_count: 0 });
    }
    const { data: notifications, error: fetchError } = await supabase
      .from("notifications")
      .select("id,type,title,body,reference_id,is_read,created_at")
      .eq("user_id", userId)
      .in("type", enabledTypes)
      .order("created_at", { ascending: false })
      .limit(30);
    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }
    const rows = notifications ?? [];
    const unreadCount = rows.filter((notification) => !notification.is_read).length;
    return NextResponse.json({ data: rows, unread_count: unreadCount });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
