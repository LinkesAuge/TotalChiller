import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseUrl, getSupabaseAnonKey } from "./config";

/**
 * Creates a browser Supabase client using public environment variables.
 */
function createSupabaseBrowserClient(): SupabaseClient {
  return createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey());
}

export default createSupabaseBrowserClient;
