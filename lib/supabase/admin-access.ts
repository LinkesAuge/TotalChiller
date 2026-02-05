import type { SupabaseClient } from "@supabase/supabase-js";

interface AdminAccessOptions {
  readonly supabase: SupabaseClient;
}

interface ProfileAdminRow {
  readonly is_admin: boolean | null;
}

const ADMIN_ROLES: readonly string[] = ["owner", "admin"];

/**
 * Resolves admin access based on active clan memberships.
 */
async function getIsAdminAccess({ supabase }: AdminAccessOptions): Promise<boolean> {
  const { data: adminFlag, error: adminFlagError } = await supabase.rpc("is_any_admin");
  if (!adminFlagError && Boolean(adminFlag)) {
    return true;
  }
  const { data: authData, error: authError } = await supabase.auth.getUser();
  const userId = authData.user?.id ?? "";
  if (!authError && userId) {
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", userId)
      .maybeSingle();
    if (!profileError && Boolean((profileData as ProfileAdminRow | null)?.is_admin)) {
      return true;
    }
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();
    if (!roleError) {
      const role = String(roleData?.role ?? "").toLowerCase();
      if (ADMIN_ROLES.includes(role)) {
        return true;
      }
    }
  }
  return false;
}

export default getIsAdminAccess;
