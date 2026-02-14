import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseUrl, getSupabaseAnonKey } from "../../../lib/supabase/config";

const AUTH_CODE_REDIRECT_COOKIE = "auth_redirect_next";

/**
 * Validates that a redirect path is safe (relative, no protocol-relative URLs).
 * Blocks open redirect attacks via `//evil.com` or `https://evil.com`.
 * Rejects path traversal (e.g. `/..` or `/foo/../etc/passwd`).
 */
function isSafeRedirectPath(path: string): boolean {
  if (!path.startsWith("/") || path.startsWith("//") || path.includes(":")) return false;
  try {
    const normalized = new URL(path, "http://x").pathname;
    if (normalized !== path) return false;
  } catch {
    return false;
  }
  return true;
}

/**
 * Resolves the post-callback destination from the `next` query parameter,
 * falling back to the `auth_redirect_next` cookie (set by forgot-password),
 * and finally to `/`.
 *
 * All values are validated to prevent open redirect attacks.
 */
function resolveNextPath(request: NextRequest): string {
  const queryNext = new URL(request.url).searchParams.get("next");
  if (queryNext && isSafeRedirectPath(queryNext)) return queryNext;
  const cookieNext = request.cookies.get(AUTH_CODE_REDIRECT_COOKIE)?.value;
  if (cookieNext && isSafeRedirectPath(cookieNext)) return cookieNext;
  return "/";
}

/**
 * GET /auth/callback
 *
 * Handles the Supabase PKCE auth callback after email verification.
 * Exchanges the temporary code for a session, then redirects
 * to the path specified by the `next` query parameter or the
 * `auth_redirect_next` cookie.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = resolveNextPath(request);

  if (code) {
    const redirectUrl = `${origin}${next}`;
    const response = NextResponse.redirect(redirectUrl);
    /* Clean up the redirect cookie */
    response.cookies.set(AUTH_CODE_REDIRECT_COOKIE, "", { maxAge: 0, path: "/" });
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
