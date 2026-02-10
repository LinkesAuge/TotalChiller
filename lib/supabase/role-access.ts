import type { SupabaseClient } from "@supabase/supabase-js";
import { toRole, isContentManager } from "@/lib/permissions";

interface RoleAccessOptions {
  readonly supabase: SupabaseClient;
}

/**
 * Returns true when the current user has a content-manager role
 * (owner, admin, moderator, or editor).
 *
 * Checks:
 *   1. `is_any_admin` RPC (fast path for owner/admin).
 *   2. Fetches `user_roles.role` and checks via the permissions map.
 */
async function getIsContentManager({ supabase }: RoleAccessOptions): Promise<boolean> {
  /* Fast path — RPC admin check */
  const { data: adminFlag, error: adminFlagError } = await supabase.rpc("is_any_admin");
  if (!adminFlagError && Boolean(adminFlag)) {
    return true;
  }

  const { data: authData, error: authError } = await supabase.auth.getUser();
  const userId = authData?.user?.id ?? "";
  if (authError || !userId) {
    return false;
  }

  /* Role-based check via permissions map */
  const { data: roleData, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (!roleError && roleData) {
    return isContentManager(toRole(roleData.role));
  }

  return false;
}

export default getIsContentManager;
