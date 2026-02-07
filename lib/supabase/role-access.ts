import type { SupabaseClient } from "@supabase/supabase-js";

interface RoleAccessOptions {
  readonly supabase: SupabaseClient;
}

interface ProfileAdminRow {
  readonly is_admin: boolean | null;
}

/** Roles allowed to manage announcements and events. */
const CONTENT_MANAGER_ROLES: readonly string[] = ["owner", "admin", "moderator", "editor"];

/**
 * Returns true when the current user has a content-manager role
 * (owner, admin, moderator, or editor).
 * Used to gate announcement and event creation / editing / deletion.
 */
async function getIsContentManager({ supabase }: RoleAccessOptions): Promise<boolean> {
  /* Fast path — RPC admin check */
  const { data: adminFlag, error: adminFlagError } = await supabase.rpc("is_any_admin");
  if (!adminFlagError && Boolean(adminFlag)) {
    return true;
  }
  const { data: authData, error: authError } = await supabase.auth.getUser();
  const userId = authData.user?.id ?? "";
  if (authError || !userId) {
    return false;
  }
  /* Profile-level admin flag */
  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .maybeSingle();
  if (!profileError && Boolean((profileData as ProfileAdminRow | null)?.is_admin)) {
    return true;
  }
  /* Role-based check — owner, admin, moderator, or editor */
  const { data: roleData, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();
  if (!roleError) {
    const role = String(roleData?.role ?? "").toLowerCase();
    if (CONTENT_MANAGER_ROLES.includes(role)) {
      return true;
    }
  }
  return false;
}

export default getIsContentManager;
