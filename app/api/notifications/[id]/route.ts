import { NextResponse, type NextRequest } from "next/server";
import { captureApiError } from "@/lib/api/logger";
import { requireAuth } from "../../../../lib/api/require-auth";
import { uuidSchema } from "../../../../lib/api/validation";
import { standardLimiter } from "../../../../lib/rate-limit";

interface RouteContext {
  readonly params: Promise<{ readonly id: string }>;
}

/**
 * PATCH /api/notifications/[id]
 * Marks a single notification as read. Only the owner can mark it.
 */
export async function PATCH(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const blocked = standardLimiter.check(request);
  if (blocked) return blocked;
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { id } = await context.params;
    const parsed = uuidSchema.safeParse(id);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid notification ID format." }, { status: 400 });
    }
    const { error: updateError } = await auth.supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", parsed.data)
      .eq("user_id", auth.userId);
    if (updateError) {
      captureApiError("PATCH /api/notifications/[id]", updateError);
      return NextResponse.json({ error: "Failed to update notification." }, { status: 500 });
    }
    return NextResponse.json({ data: { id: parsed.data, is_read: true } });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
