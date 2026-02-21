/**
 * Public paths that bypass authentication or clan access checks.
 * Union of paths used by proxy (middleware) and clan-access-gate.
 */
export function isPublicPath(pathname: string): boolean {
  return (
    pathname.startsWith("/home") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/about") ||
    pathname.startsWith("/contact") ||
    pathname.startsWith("/privacy-policy") ||
    pathname.startsWith("/profile") /* bypasses clan-access gate; auth is enforced by the page itself */ ||
    pathname.startsWith("/settings") /* bypasses clan-access gate; auth is enforced by the page itself */ ||
    pathname.startsWith("/not-authorized") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/sitemap") ||
    pathname.startsWith("/robots") ||
    pathname.startsWith("/assets") ||
    pathname.endsWith(".xml") ||
    pathname.endsWith(".txt") ||
    pathname.endsWith(".json") ||
    pathname.endsWith(".ico") ||
    pathname.endsWith(".mp3")
  );
}
