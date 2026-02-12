"use client";

import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import createSupabaseBrowserClient from "../../lib/supabase/browser-client";

/**
 * Returns a memoized Supabase browser client.
 *
 * Uses `useState` initializer to guarantee a stable instance across re-renders.
 * Prefer this hook over calling `createSupabaseBrowserClient()` directly
 * in component bodies, which would create a new client on every render.
 */
export function useSupabase(): SupabaseClient {
  const [supabase] = useState(() => createSupabaseBrowserClient());
  return supabase;
}
