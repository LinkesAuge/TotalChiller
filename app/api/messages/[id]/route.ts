import { NextResponse, type NextRequest } from "next/server";
import createSupabaseServerClient from "../../../../lib/supabase/server-client";

interface RouteContext {
  readonly params: Promise<{ readonly id: string }>;
}

/**
 * PATCH /api/messages/[id]
 * Marks a message as read. Only the recipient can mark it.
 */
export async function PATCH(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Message ID is required." }, { status: 400 });
  }
  const { error: updateError } = await supabase
    .from("messages")
    .update({ is_read: true })
    .eq("id", id)
    .eq("recipient_id", authData.user.id);
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }
  return NextResponse.json({ data: { id, is_read: true } });
}

/**
 * DELETE /api/messages/[id]
 * Deletes a message. Only the recipient can delete it.
 */
export async function DELETE(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Message ID is required." }, { status: 400 });
  }
  const { error: deleteError } = await supabase
    .from("messages")
    .delete()
    .eq("id", id)
    .eq("recipient_id", authData.user.id);
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }
  return NextResponse.json({ data: { id, deleted: true } });
}
