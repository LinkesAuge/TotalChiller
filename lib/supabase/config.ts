/**
 * Shared Supabase environment-variable accessors.
 *
 * Single source of truth — imported by browser-client, server-client,
 * service-role-client, and proxy.ts.  Pure env reads with no Node.js
 * dependencies so they work in Browser, Server, and Edge runtimes.
 */

export function getSupabaseUrl(): string {
  const supabaseUrl: string | undefined = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL.");
  }
  return supabaseUrl;
}

export function getSupabaseAnonKey(): string {
  const supabaseAnonKey: string | undefined = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseAnonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }
  return supabaseAnonKey;
}

export function getSupabaseServiceRoleKey(): string {
  const supabaseKey: string | undefined = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY.");
  }
  return supabaseKey;
}
