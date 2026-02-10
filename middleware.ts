import { NextResponse, type NextRequest } from "next/server";

const AUTH_CALLBACK_PATH = "/auth/callback";
const AUTH_CODE_REDIRECT_COOKIE = "auth_redirect_next";

/**
 * Next.js middleware that catches Supabase PKCE auth codes landing on
 * the wrong route (e.g. when Supabase ignores the redirectTo and falls
 * back to the site URL) and redirects them to the auth callback handler.
 *
 * Also reads a cookie set by the forgot-password route to determine
 * where to send the user after code exchange.
 */
export function middleware(request: NextRequest): NextResponse | undefined {
  const { searchParams, pathname } = request.nextUrl;
  const code = searchParams.get("code");
  if (!code || pathname === AUTH_CALLBACK_PATH) {
    return undefined;
  }
  const url = request.nextUrl.clone();
  url.pathname = AUTH_CALLBACK_PATH;
  /* Preserve the `next` param if already present; otherwise read from cookie */
  if (!searchParams.has("next")) {
    const cookieNext = request.cookies.get(AUTH_CODE_REDIRECT_COOKIE)?.value;
    if (cookieNext) {
      url.searchParams.set("next", cookieNext);
    }
  }
  const response = NextResponse.redirect(url);
  /* Clean up the cookie after using it */
  response.cookies.set(AUTH_CODE_REDIRECT_COOKIE, "", { maxAge: 0, path: "/" });
  return response;
}

export const config = {
  matcher: [
    /*
     * Run on all routes except:
     * - _next/static, _next/image (Next.js internals)
     * - favicon.ico, robots.txt, sitemap.xml (static files)
     * - /auth/callback (already the correct destination)
     * - /api/* (API routes)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|auth/callback|api/).*)",
  ],
};
