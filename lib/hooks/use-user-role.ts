"use client";

import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  type Role,
  toRole,
  hasPermission,
  canDo,
  isOwner as isOwnerCheck,
  isAdmin as isAdminCheck,
  isContentManager as isContentManagerCheck,
} from "@/lib/permissions";

interface UseUserRoleResult {
  /** The resolved role (defaults to "guest" while loading or on error). */
  readonly role: Role;
  /** True while the initial fetch is in flight. */
  readonly loading: boolean;
  /** Check a single permission. */
  readonly hasPermission: (permission: string) => boolean;
  /** Check if the user holds *any* of the listed permissions. */
  readonly canDo: (...permissions: string[]) => boolean;
  /** Shortcut — owner (webmaster). */
  readonly isOwner: boolean;
  /** Shortcut — owner or admin. */
  readonly isAdmin: boolean;
  /** Shortcut — owner, admin, moderator, or editor. */
  readonly isContentManager: boolean;
}

/**
 * React hook that fetches the current user's role from `user_roles` once
 * and exposes permission helpers bound to that role.
 *
 * Usage:
 *   const { role, isAdmin, canDo, loading } = useUserRole(supabase);
 *   if (canDo("article:create")) { ... }
 */
export function useUserRole(supabase: SupabaseClient): UseUserRoleResult {
  const [role, setRole] = useState<Role>("guest");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchRole(): Promise<void> {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (cancelled || !user) return;

        const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle();

        if (cancelled) return;
        if (!error && data) {
          setRole(toRole(data.role));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchRole();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const boundHasPermission = useCallback((permission: string) => hasPermission(role, permission), [role]);

  const boundCanDo = useCallback((...permissions: string[]) => canDo(role, ...permissions), [role]);

  return {
    role,
    loading,
    hasPermission: boundHasPermission,
    canDo: boundCanDo,
    isOwner: isOwnerCheck(role),
    isAdmin: isAdminCheck(role),
    isContentManager: isContentManagerCheck(role),
  };
}
