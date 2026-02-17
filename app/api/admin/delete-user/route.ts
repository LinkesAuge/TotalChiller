import { NextResponse } from "next/server";
import { z } from "zod";
import { captureApiError } from "@/lib/api/logger";
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
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const rawBody = await request.json().catch(() => null);
    const parsed = DELETE_USER_SCHEMA.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input." }, { status: 400 });
    }

    const serviceClient = createSupabaseServiceRoleClient();
    const { error } = await serviceClient.auth.admin.deleteUser(parsed.data.userId);
    if (error) {
      captureApiError("POST /api/admin/delete-user", error);
      return NextResponse.json({ error: "Failed to delete user." }, { status: 500 });
    }
    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    captureApiError("POST /api/admin/delete-user", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
