import { NextResponse } from "next/server";
import { z } from "zod";
import createSupabaseServiceRoleClient from "../../../../lib/supabase/service-role-client";
import { strictLimiter } from "../../../../lib/rate-limit";
import { requireAdmin } from "../../../../lib/api/require-admin";

const DELETE_USER_SCHEMA = z.object({
  userId: z.string().uuid(),
});

/**
 * Deletes a user and cascades related profile data.
 */
export async function POST(request: Request): Promise<Response> {
  const blocked = strictLimiter.check(request);
  if (blocked) return blocked;

  try {
    const parsed = DELETE_USER_SCHEMA.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input." }, { status: 400 });
    }
    const auth = await requireAdmin();
    if (auth.error) return auth.error;
    const serviceClient = createSupabaseServiceRoleClient();
    const { error } = await serviceClient.auth.admin.deleteUser(parsed.data.userId);
    if (error) {
      console.error("[delete-user] Failed:", error.message);
      return NextResponse.json({ error: "Failed to delete user." }, { status: 500 });
    }
    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    console.error("[delete-user POST] Unexpected:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
