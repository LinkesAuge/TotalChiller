import type { SupabaseClient } from "@supabase/supabase-js";
import { isAdmin } from "@/lib/permissions";
import { resolveUserRole } from "./check-role";

interface AdminAccessOptions {
  readonly supabase: SupabaseClient;
}

/**
 * Returns true when the current user is an owner or admin.
 *
 * Delegates role resolution to the shared `resolveUserRole` helper,
 * then checks via the permissions map.
 */
async function getIsAdminAccess({ supabase }: AdminAccessOptions): Promise<boolean> {
  const role = await resolveUserRole(supabase);
  if (!role) return false;
  return isAdmin(role);
}

export default getIsAdminAccess;
