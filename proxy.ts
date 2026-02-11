import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import getIsAdminAccess from "./lib/supabase/admin-access";
import { routing, LOCALE_COOKIE } from "./i18n/routing";
import { getSupabaseUrl, getSupabaseAnonKey } from "./lib/supabase/config";

function isPublicPath(pathname: string): boolean {
  return (
    pathname.startsWith("/home") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/about") ||
    pathname.startsWith("/contact") ||
    pathname.startsWith("/privacy-policy") ||
    pathname.startsWith("/not-authorized") ||
    pathname.startsWith("/redesign") ||
    pathname.startsWith("/api/site-content") ||
    pathname.startsWith("/api/site-list-items") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/sitemap") ||
    pathname.startsWith("/robots") ||
    pathname.startsWith("/assets") ||
    pathname.endsWith(".xml") ||
    pathname.endsWith(".txt") ||
    pathname.endsWith(".json") ||
    pathname.endsWith(".ico")
  );
}

function isAdminPath(pathname: string): boolean {
  return pathname.startsWith("/admin") || pathname.startsWith("/data-import") || pathname.startsWith("/data-table");
}

async function isUserAdmin(supabase: ReturnType<typeof createServerClient>): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_any_admin");
  if (!error && Boolean(data)) {
    return true;
  }
  return getIsAdminAccess({ supabase });
}

const AUTH_CALLBACK_PATH = "/auth/callback";
const AUTH_CODE_REDIRECT_COOKIE = "auth_redirect_next";

/**
 * Ensures protected routes require an authenticated session
 * and handles locale detection via the NEXT_LOCALE cookie.
 *
 * Also catches Supabase PKCE auth codes that land on the wrong route
 * (e.g. when Supabase ignores redirectTo and falls back to the site URL)
 * and redirects them to the auth callback handler.
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  /* --- Auth code catch-all: redirect stray PKCE codes to /auth/callback --- */
  const code = request.nextUrl.searchParams.get("code");
  if (code && request.nextUrl.pathname !== AUTH_CALLBACK_PATH) {
    const url = request.nextUrl.clone();
    url.pathname = AUTH_CALLBACK_PATH;
    if (!url.searchParams.has("next")) {
      const cookieNext = request.cookies.get(AUTH_CODE_REDIRECT_COOKIE)?.value;
      if (cookieNext) {
        url.searchParams.set("next", cookieNext);
      }
    }
    const redirectResponse = NextResponse.redirect(url);
    redirectResponse.cookies.set(AUTH_CODE_REDIRECT_COOKIE, "", { maxAge: 0, path: "/" });
    return redirectResponse;
  }

  const response = NextResponse.next();
  const existingLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  if (!existingLocale || !routing.locales.includes(existingLocale as (typeof routing.locales)[number])) {
    response.cookies.set(LOCALE_COOKIE, routing.defaultLocale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && request.nextUrl.pathname === "/") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/home";
    return NextResponse.redirect(redirectUrl);
  }

  if (!user && !isPublicPath(request.nextUrl.pathname) && !request.nextUrl.pathname.startsWith("/api/")) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/home";
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isAdminPath(request.nextUrl.pathname)) {
    const isAdmin = await isUserAdmin(supabase);
    if (!isAdmin) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/not-authorized";
      redirectUrl.searchParams.set("reason", "admin");
      return NextResponse.redirect(redirectUrl);
    }
    if (request.nextUrl.pathname === "/data-import") {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/admin/data-import";
      return NextResponse.redirect(redirectUrl);
    }
    if (request.nextUrl.pathname === "/data-table") {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/admin/data-table";
      return NextResponse.redirect(redirectUrl);
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
