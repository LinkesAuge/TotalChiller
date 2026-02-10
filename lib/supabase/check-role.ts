import type { SupabaseClient } from "@supabase/supabase-js";
import { toRole, type Role } from "@/lib/permissions";

/**
 * Resolves the current user's role via RPC fast-path + user_roles fallback.
 *
 * Shared by admin-access.ts and role-access.ts to eliminate duplicated
 * auth-fetch + role-query logic.
 *
 * Returns the user's Role (or "member" if no explicit role is found).
 * Returns `null` when the user is not authenticated.
 */
export async function resolveUserRole(supabase: SupabaseClient): Promise<Role | null> {
  /* 1. Auth check */
  const { data: authData, error: authError } = await supabase.auth.getUser();
  const userId = authData?.user?.id ?? "";
  if (authError || !userId) {
    return null;
  }

  /* 2. Fast path — RPC admin check (returns true for owner / admin) */
  const { data: adminFlag, error: adminFlagError } = await supabase.rpc("is_any_admin");
  if (!adminFlagError && Boolean(adminFlag)) {
    return "admin"; // RPC only fires for owner/admin — "admin" satisfies both checks
  }

  /* 3. Fallback — fetch explicit role from user_roles */
  const { data: roleData, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (!roleError && roleData) {
    return toRole(roleData.role);
  }

  return "member";
}
