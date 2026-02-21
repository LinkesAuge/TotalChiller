import { NextResponse, type NextRequest } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import createSupabaseServerClient from "../supabase/server-client";
import { getSupabaseUrl, getSupabaseAnonKey } from "../supabase/config";

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

/**
 * Like `requireAuth()`, but also accepts `Authorization: Bearer <token>` headers
 * for desktop/API clients that cannot use cookies.
 *
 * Check order:
 * 1. If an `Authorization: Bearer` header is present, create a Supabase client
 *    with that token and verify the user.
 * 2. Otherwise, fall back to the standard cookie-based `requireAuth()`.
 *
 * Usage in import API routes:
 * ```ts
 * const auth = await requireAuthWithBearer(request);
 * if (auth.error) return auth.error;
 * const { userId, supabase } = auth;
 * ```
 */
export async function requireAuthWithBearer(request: NextRequest): Promise<RequireAuthSuccess | RequireAuthFailure> {
  const authHeader = request.headers.get("Authorization");

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    if (!token) {
      return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
    }

    const supabase = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
    }
    return { userId: authData.user.id, supabase };
  }

  return requireAuth();
}
