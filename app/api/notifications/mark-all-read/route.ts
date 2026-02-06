import { NextResponse } from "next/server";
import createSupabaseServerClient from "../../../../lib/supabase/server-client";

/**
 * POST /api/notifications/mark-all-read
 * Marks all of the authenticated user's notifications as read.
 */
export async function POST(): Promise<NextResponse> {
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
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }
  return NextResponse.json({ data: { success: true } });
}
