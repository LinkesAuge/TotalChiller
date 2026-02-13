import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseUrl, getSupabaseServiceRoleKey } from "./config";

/**
 * Module-level singleton — the service role client is stateless (no cookies,
 * no session persistence) so a single instance can be reused across requests.
 */
let cached: SupabaseClient | null = null;

/**
 * Returns a cached Supabase client with service role privileges.
 * The singleton is created on first call and reused thereafter.
 */
function createSupabaseServiceRoleClient(): SupabaseClient {
  if (!cached) {
    cached = createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}

export default createSupabaseServiceRoleClient;
