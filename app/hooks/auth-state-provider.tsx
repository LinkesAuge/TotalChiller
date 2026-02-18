"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toRole, type Role } from "@/lib/permissions";
import { AuthStateContext } from "@/lib/hooks/auth-state-context";
import { useSupabase } from "./use-supabase";

interface AuthStateProviderProps {
  readonly children: ReactNode;
}

/**
 * Shared auth/role provider.
 * Centralizes Supabase auth + role resolution so feature hooks
 * don't each trigger their own getUser()/role queries.
 */
export function AuthStateProvider({ children }: AuthStateProviderProps): JSX.Element {
  const supabase = useSupabase();
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [role, setRole] = useState<Role>("guest");
  const [isRoleLoading, setIsRoleLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;

    async function loadRole(nextUserId: string | null): Promise<void> {
      if (cancelled) return;
      if (!nextUserId) {
        setRole("guest");
        setIsRoleLoading(false);
        return;
      }

      setIsRoleLoading(true);
      const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", nextUserId).maybeSingle();
      if (cancelled) return;

      if (!error && data?.role) {
        setRole(toRole(data.role));
      } else {
        setRole("guest");
      }
      setIsRoleLoading(false);
    }

    async function initialize(): Promise<void> {
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;
      const nextUserId = data.user?.id ?? null;
      setUserId(nextUserId);
      setIsLoading(false);
      await loadRole(nextUserId);
    }

    void initialize();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUserId = session?.user?.id ?? null;
      setUserId(nextUserId);
      setIsLoading(false);
      void loadRole(nextUserId);
    });

    return () => {
      cancelled = true;
      authListener.subscription.unsubscribe();
    };
  }, [supabase]);

  const value = useMemo(
    () => ({
      userId,
      isAuthenticated: userId !== null,
      isLoading,
      role,
      isRoleLoading,
    }),
    [userId, isLoading, role, isRoleLoading],
  );

  return <AuthStateContext.Provider value={value}>{children}</AuthStateContext.Provider>;
}
