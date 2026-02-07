import type { MetadataRoute } from "next";
import { headers } from "next/headers";

/** Generates robots.txt with dynamic sitemap reference that adapts to the request host. */
async function robots(): Promise<MetadataRoute.Robots> {
  let baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://totalchiller.vercel.app";

  try {
    const headersList = await headers();
    const host = headersList.get("host");
    if (host) {
      const protocol = headersList.get("x-forwarded-proto") ?? "http";
      baseUrl = `${protocol}://${host}`;
    }
  } catch {
    /* Use fallback base URL when headers are unavailable */
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/home", "/about", "/contact", "/privacy-policy", "/auth/login", "/auth/register", "/auth/forgot"],
        disallow: [
          "/admin",
          "/api",
          "/news",
          "/settings",
          "/profile",
          "/messages",
          "/charts",
          "/events",
          "/data-import",
          "/data-table",
          "/redesign",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

export default robots;
