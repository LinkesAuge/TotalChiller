import { NextResponse, type NextRequest } from "next/server";
import { captureApiError } from "@/lib/api/logger";
import { requireAuth } from "../../../lib/api/require-auth";
import { relaxedLimiter } from "../../../lib/rate-limit";

/**
 * GET /api/notifications
 * Returns recent notifications for the authenticated user, filtered by user preferences.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const blocked = relaxedLimiter.check(request);
    if (blocked) return blocked;
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { userId, supabase } = auth;
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
  } catch (err) {
    captureApiError("GET /api/notifications", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
