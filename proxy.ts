import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import getIsAdminAccess from "./lib/supabase/admin-access";

function getSupabaseUrl(): string {
  const supabaseUrl: string | undefined = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL.");
  }
  return supabaseUrl;
}

function getSupabaseAnonKey(): string {
  const supabaseAnonKey: string | undefined = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseAnonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }
  return supabaseAnonKey;
}

function isPublicPath(pathname: string): boolean {
  return (
    pathname.startsWith("/home") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/not-authorized") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico")
  );
}

function isAdminPath(pathname: string): boolean {
  return (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/data-import") ||
    pathname.startsWith("/data-table")
  );
}

async function isUserAdmin(
  supabase: ReturnType<typeof createServerClient>,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_any_admin");
  if (!error && Boolean(data)) {
    return true;
  }
  return getIsAdminAccess({ supabase });
}

/**
 * Ensures protected routes require an authenticated session.
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const response = NextResponse.next();
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

  if (!user && !isPublicPath(request.nextUrl.pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/home";
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isAdminPath(request.nextUrl.pathname)) {
    const isAdmin = await isUserAdmin(supabase);
    if (!isAdmin) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/not-authorized";
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
