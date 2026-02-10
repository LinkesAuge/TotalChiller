import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseUrl, getSupabaseAnonKey } from "../../../lib/supabase/config";

/**
 * GET /auth/callback
 *
 * Handles the Supabase PKCE auth callback after email verification.
 * Exchanges the temporary code for a session, then redirects
 * to the path specified by the `next` query parameter.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const redirectUrl = `${origin}${next}`;
    const response = NextResponse.redirect(redirectUrl);
    const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
      cookies: {
        get(name: string): string | undefined {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: Record<string, unknown>): void {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: Record<string, unknown>): void {
          response.cookies.set({ name, value: "", ...options });
        },
      },
    });
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return response;
    }
  }

  return NextResponse.redirect(`${origin}/auth/login`);
}
