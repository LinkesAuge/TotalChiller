import { NextResponse } from "next/server";
import createSupabaseServerClient from "../supabase/server-client";

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

/**
 * Verifies the current user is authenticated and has admin privileges.
 *
 * Returns `{ userId }` on success or `{ error: NextResponse }` on failure.
 * Used by all admin API routes for consistent auth guards.
 */
export async function requireAdmin(
  supabase: SupabaseServerClient,
): Promise<{ userId: string; error?: undefined } | { error: NextResponse; userId?: undefined }> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const { data: isAdmin } = await supabase.rpc("is_any_admin");
  if (!isAdmin) {
    return { error: NextResponse.json({ error: "Forbidden: admin access required." }, { status: 403 }) };
  }
  return { userId: authData.user.id };
}
