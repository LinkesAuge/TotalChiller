import { NextResponse } from "next/server";
import { z } from "zod";
import { captureApiError } from "@/lib/api/logger";
import createSupabaseServiceRoleClient from "../../../../lib/supabase/service-role-client";
import { strictLimiter } from "../../../../lib/rate-limit";
import { requireAdmin } from "../../../../lib/api/require-admin";
import { toRole, canChangeRoleOf } from "@/lib/permissions";

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

    const targetUserId = parsed.data.userId;

    if (targetUserId === auth.userId) {
      return NextResponse.json({ error: "Cannot delete your own account." }, { status: 403 });
    }

    const serviceClient = createSupabaseServiceRoleClient();

    const { data: targetRoleRow, error: targetRoleError } = await serviceClient
      .from("user_roles")
      .select("role")
      .eq("user_id", targetUserId)
      .maybeSingle();

    if (targetRoleError) {
      captureApiError("POST /api/admin/delete-user (target role)", targetRoleError);
      return NextResponse.json({ error: "Failed to verify target user role." }, { status: 500 });
    }

    const targetRole = toRole(targetRoleRow?.role);

    const { data: actorRoleRow, error: actorRoleError } = await serviceClient
      .from("user_roles")
      .select("role")
      .eq("user_id", auth.userId)
      .maybeSingle();

    if (actorRoleError) {
      captureApiError("POST /api/admin/delete-user (actor role)", actorRoleError);
      return NextResponse.json({ error: "Failed to verify your role." }, { status: 500 });
    }

    const actorRole = toRole(actorRoleRow?.role ?? "admin");

    if (!canChangeRoleOf(actorRole, targetRole)) {
      return NextResponse.json({ error: "Insufficient privileges to delete this user." }, { status: 403 });
    }

    const { error } = await serviceClient.auth.admin.deleteUser(targetUserId);
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
