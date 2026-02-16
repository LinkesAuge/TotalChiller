import { NextResponse, type NextRequest } from "next/server";
import { captureApiError } from "@/lib/api/logger";
import { requireAuth } from "../../../../lib/api/require-auth";
import { standardLimiter } from "../../../../lib/rate-limit";

/**
 * POST /api/notifications/mark-all-read
 * Marks all of the authenticated user's notifications as read.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const blocked = standardLimiter.check(request);
  if (blocked) return blocked;

  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { error: updateError } = await auth.supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", auth.userId)
      .eq("is_read", false);
    if (updateError) {
      captureApiError("POST /api/notifications/mark-all-read", updateError);
      return NextResponse.json({ error: "Failed to mark notifications as read." }, { status: 500 });
    }
    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    captureApiError("POST /api/notifications/mark-all-read", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
