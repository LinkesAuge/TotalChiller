import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseUrl, getSupabaseAnonKey } from "./config";

/**
 * Creates a server Supabase client bound to Next.js cookies.
 */
async function createSupabaseServerClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();
  return createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      get(name: string): string | undefined {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: Record<string, unknown>): void {
        cookieStore.set({ name, value, ...options });
      },
      remove(name: string, options: Record<string, unknown>): void {
        cookieStore.set({ name, value: "", ...options });
      },
    },
  });
}

export default createSupabaseServerClient;
