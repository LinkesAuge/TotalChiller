import { NextResponse, type NextRequest } from "next/server";
import createSupabaseServerClient from "../../../../lib/supabase/server-client";
import { uuidSchema } from "../../../../lib/api/validation";

interface RouteContext {
  readonly params: Promise<{ readonly id: string }>;
}

/**
 * PATCH /api/notifications/[id]
 * Marks a single notification as read. Only the owner can mark it.
 */
export async function PATCH(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await context.params;
    const parsed = uuidSchema.safeParse(id);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid notification ID format." }, { status: 400 });
    }
    const { error: updateError } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", parsed.data)
      .eq("user_id", authData.user.id);
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
    return NextResponse.json({ data: { id: parsed.data, is_read: true } });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
