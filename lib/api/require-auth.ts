import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import createSupabaseServerClient from "../supabase/server-client";

/**
 * Result returned by `requireAuth()` on success.
 * Provides the authenticated user's ID and the server Supabase client.
 */
export interface AuthResult {
  readonly userId: string;
  readonly supabase: SupabaseClient;
}

type RequireAuthSuccess = AuthResult & { error?: undefined };
type RequireAuthFailure = { error: NextResponse; userId?: undefined; supabase?: undefined };

/**
 * Verifies the current request is from an authenticated user.
 *
 * Creates a server Supabase client, calls `auth.getUser()`, and returns
 * `{ userId, supabase }` on success or `{ error: NextResponse }` on failure.
 *
 * Usage in API routes:
 * ```ts
 * const auth = await requireAuth();
 * if (auth.error) return auth.error;
 * const { userId, supabase } = auth;
 * ```
 */
export async function requireAuth(): Promise<RequireAuthSuccess | RequireAuthFailure> {
  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { userId: authData.user.id, supabase };
}
