import type { MetadataRoute } from "next";

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://totalchiller.vercel.app";

/** Generates robots.txt with sitemap reference. */
function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/home", "/auth/login", "/auth/register", "/auth/forgot", "/news"],
        disallow: [
          "/admin",
          "/api",
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
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}

export default robots;
