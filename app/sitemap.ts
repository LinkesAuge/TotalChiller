import type { MetadataRoute } from "next";

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://totalchiller.vercel.app";

/** Generates a static sitemap for public routes. */
function sitemap(): MetadataRoute.Sitemap {
  const publicRoutes = [
    "/home",
    "/auth/login",
    "/auth/register",
    "/auth/forgot",
    "/news",
  ];

  return publicRoutes.map((route) => ({
    url: `${BASE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "/news" ? "daily" : "weekly",
    priority: route === "/home" ? 1.0 : 0.7,
  }));
}

export default sitemap;
