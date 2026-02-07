import type { MetadataRoute } from "next";
import { headers } from "next/headers";

interface PublicRoute {
  readonly path: string;
  readonly changeFrequency: "daily" | "weekly" | "monthly";
  readonly priority: number;
}

const PUBLIC_ROUTES: readonly PublicRoute[] = [
  { path: "/home", changeFrequency: "weekly", priority: 1.0 },
  { path: "/about", changeFrequency: "monthly", priority: 0.8 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.7 },
  { path: "/privacy-policy", changeFrequency: "monthly", priority: 0.5 },
  { path: "/auth/login", changeFrequency: "weekly", priority: 0.7 },
  { path: "/auth/register", changeFrequency: "weekly", priority: 0.7 },
  { path: "/auth/forgot", changeFrequency: "monthly", priority: 0.3 },
  /* /news requires authentication and redirects unauthenticated users */
];

/** Generates a dynamic sitemap that adapts to the current request host. */
async function sitemap(): Promise<MetadataRoute.Sitemap> {
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

  return PUBLIC_ROUTES.map((route) => ({
    url: `${baseUrl}${route.path}`,
    lastModified: new Date(),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}

export default sitemap;
