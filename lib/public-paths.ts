/**
 * Public paths that bypass authentication or clan access checks.
 * Union of paths used by proxy (middleware) and clan-access-gate.
 */
export function isPublicPath(pathname: string): boolean {
  return (
    pathname === "/home" ||
    pathname.startsWith("/home/") ||
    pathname === "/auth" ||
    pathname.startsWith("/auth/") ||
    pathname === "/about" ||
    pathname.startsWith("/about/") ||
    pathname === "/contact" ||
    pathname.startsWith("/contact/") ||
    pathname === "/privacy-policy" ||
    pathname.startsWith("/privacy-policy/") ||
    pathname === "/profile" ||
    pathname.startsWith("/profile/") /* bypasses clan-access gate; auth is enforced by the page itself */ ||
    pathname === "/settings" ||
    pathname.startsWith("/settings/") /* bypasses clan-access gate; auth is enforced by the page itself */ ||
    pathname === "/not-authorized" ||
    pathname.startsWith("/not-authorized/") ||
    pathname.startsWith("/_next") ||
    pathname === "/sitemap" ||
    pathname.startsWith("/sitemap/") ||
    pathname === "/robots" ||
    pathname.startsWith("/robots/") ||
    pathname === "/assets" ||
    pathname.startsWith("/assets/") ||
    pathname.endsWith(".xml") ||
    pathname.endsWith(".txt") ||
    pathname.endsWith(".json") ||
    pathname.endsWith(".ico") ||
    pathname.endsWith(".mp3")
  );
}
