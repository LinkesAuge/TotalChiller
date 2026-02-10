import type { SupabaseClient } from "@supabase/supabase-js";
import { isContentManager } from "@/lib/permissions";
import { resolveUserRole } from "./check-role";

interface RoleAccessOptions {
  readonly supabase: SupabaseClient;
}

/**
 * Returns true when the current user has a content-manager role
 * (owner, admin, moderator, or editor).
 *
 * Delegates role resolution to the shared `resolveUserRole` helper,
 * then checks via the permissions map.
 */
async function getIsContentManager({ supabase }: RoleAccessOptions): Promise<boolean> {
  const role = await resolveUserRole(supabase);
  if (!role) return false;
  return isContentManager(role);
}

export default getIsContentManager;
