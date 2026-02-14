import { NextResponse, type NextRequest } from "next/server";
import { captureApiError } from "@/lib/api/logger";
import { requireAuth } from "../../../../lib/api/require-auth";
import { standardLimiter } from "../../../../lib/rate-limit";

/**
 * POST /api/notifications/delete-all
 * Deletes all of the authenticated user's notifications.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const blocked = standardLimiter.check(request);
  if (blocked) return blocked;

  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { error: deleteError } = await auth.supabase.from("notifications").delete().eq("user_id", auth.userId);
    if (deleteError) {
      captureApiError("POST /api/notifications/delete-all", deleteError);
      return NextResponse.json({ error: "Failed to delete notifications." }, { status: 500 });
    }
    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    captureApiError("POST /api/notifications/delete-all", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
