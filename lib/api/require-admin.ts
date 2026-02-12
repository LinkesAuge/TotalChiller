import { NextResponse } from "next/server";
import { requireAuth, type AuthResult } from "./require-auth";

type RequireAdminSuccess = AuthResult & { error?: undefined };
type RequireAdminFailure = { error: NextResponse; userId?: undefined; supabase?: undefined };

/**
 * Verifies the current user is authenticated and has admin privileges.
 *
 * Returns `{ userId, supabase }` on success or `{ error: NextResponse }` on failure.
 * Used by all admin API routes for consistent auth guards.
 */
export async function requireAdmin(): Promise<RequireAdminSuccess | RequireAdminFailure> {
  const auth = await requireAuth();
  if (auth.error) return auth;
  const { data: isAdmin } = await auth.supabase.rpc("is_any_admin");
  if (!isAdmin) {
    return { error: NextResponse.json({ error: "Forbidden: admin access required." }, { status: 403 }) };
  }
  return { userId: auth.userId, supabase: auth.supabase };
}
