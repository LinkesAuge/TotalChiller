import type { MetadataRoute } from "next";

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://totalchiller.vercel.app";

/** Generates a static sitemap for public routes. */
function sitemap(): MetadataRoute.Sitemap {
  const publicRoutes: Array<{
    path: string;
    changeFrequency: "daily" | "weekly" | "monthly";
    priority: number;
  }> = [
    { path: "/home", changeFrequency: "weekly", priority: 1.0 },
    { path: "/about", changeFrequency: "monthly", priority: 0.8 },
    { path: "/contact", changeFrequency: "monthly", priority: 0.7 },
    { path: "/privacy-policy", changeFrequency: "monthly", priority: 0.5 },
    { path: "/auth/login", changeFrequency: "weekly", priority: 0.7 },
    { path: "/auth/register", changeFrequency: "weekly", priority: 0.7 },
    { path: "/auth/forgot", changeFrequency: "monthly", priority: 0.3 },
    { path: "/news", changeFrequency: "daily", priority: 0.8 },
  ];

  return publicRoutes.map((route) => ({
    url: `${BASE_URL}${route.path}`,
    lastModified: new Date(),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}

export default sitemap;
