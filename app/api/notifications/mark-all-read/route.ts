import { NextResponse, type NextRequest } from "next/server";
import createSupabaseServerClient from "../../../../lib/supabase/server-client";
import { standardLimiter } from "../../../../lib/rate-limit";

/**
 * POST /api/notifications/mark-all-read
 * Marks all of the authenticated user's notifications as read.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const blocked = standardLimiter.check(request);
  if (blocked) return blocked;
  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { error: updateError } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", authData.user.id)
    .eq("is_read", false);
  if (updateError) {
    console.error("[notifications/mark-all-read]", updateError.message);
    return NextResponse.json({ error: "Failed to mark notifications as read." }, { status: 500 });
  }
  return NextResponse.json({ data: { success: true } });
}
