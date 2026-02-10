"use client";

import { useEffect, useState } from "react";
import createSupabaseBrowserClient from "../../lib/supabase/browser-client";

interface UseAuthResult {
  /** The current user's ID, or null if not authenticated or still loading. */
  readonly userId: string | null;
  /** Whether a user is currently authenticated. */
  readonly isAuthenticated: boolean;
  /** True while the initial auth check is in progress. */
  readonly isLoading: boolean;
}

/**
 * Reactive hook that tracks the current Supabase auth state.
 *
 * Fetches the user on mount, subscribes to `onAuthStateChange`,
 * and cleans up on unmount. Uses the singleton browser client.
 */
export function useAuth(): UseAuthResult {
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    let isActive = true;

    async function loadAuth(): Promise<void> {
      const { data } = await supabase.auth.getUser();
      if (isActive) {
        setUserId(data.user?.id ?? null);
        setIsLoading(false);
      }
    }

    void loadAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      void loadAuth();
    });

    return () => {
      isActive = false;
      authListener.subscription.unsubscribe();
    };
  }, [supabase]);

  return { userId, isAuthenticated: userId !== null, isLoading };
}
