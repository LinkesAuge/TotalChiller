import { NextResponse } from "next/server";
import { z } from "zod";
import createSupabaseServerClient from "../../../../lib/supabase/server-client";
import createSupabaseServiceRoleClient from "../../../../lib/supabase/service-role-client";
import { strictLimiter } from "../../../../lib/rate-limit";

const DELETE_USER_SCHEMA = z.object({
  userId: z.string().uuid(),
});

/**
 * Deletes a user and cascades related profile data.
 */
export async function POST(request: Request): Promise<Response> {
  const blocked = strictLimiter.check(request);
  if (blocked) return blocked;
  const parsed = DELETE_USER_SCHEMA.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const { data: isAdmin, error: adminError } = await supabase.rpc("is_any_admin");
  if (adminError || !isAdmin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  const serviceClient = createSupabaseServiceRoleClient();
  const { error } = await serviceClient.auth.admin.deleteUser(parsed.data.userId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
