import { NextResponse, type NextRequest } from "next/server";
import { captureApiError } from "@/lib/api/logger";
import { requireAuth } from "../../../lib/api/require-auth";
import { relaxedLimiter } from "../../../lib/rate-limit";

/**
 * GET /api/notifications
 * Returns recent notifications for the authenticated user, filtered by user preferences.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const blocked = relaxedLimiter.check(request);
  if (blocked) return blocked;
  try {
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
      enabledTypes.push("approval", "bug_comment");
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
      captureApiError("GET /api/notifications", fetchError);
      return NextResponse.json({ error: "Failed to load notifications." }, { status: 500 });
    }
    const rows = notifications ?? [];
    const { count: totalUnread } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false)
      .in("type", enabledTypes);
    const unreadCount = totalUnread ?? rows.filter((notification) => !notification.is_read).length;
    return NextResponse.json({ data: rows, unread_count: unreadCount });
  } catch (err) {
    captureApiError("GET /api/notifications", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
