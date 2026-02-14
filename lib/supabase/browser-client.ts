import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseUrl, getSupabaseAnonKey } from "./config";

let cached: SupabaseClient | null = null;

/**
 * Returns a singleton browser Supabase client.
 *
 * `@supabase/ssr` already deduplicates internally, but the explicit
 * module-level cache makes the singleton contract visible and matches
 * the pattern used by the service-role client.
 */
function createSupabaseBrowserClient(): SupabaseClient {
  if (!cached) {
    cached = createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey());
  }
  return cached;
}

export default createSupabaseBrowserClient;
