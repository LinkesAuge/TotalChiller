import type { Metadata } from "next";
import NewsClient from "./news-client";

export const metadata: Metadata = {
  title: "Announcements",
  description: "Clan announcements, updates, and important notices from [THC] Chiller & Killer.",
  alternates: { canonical: "/news" },
  openGraph: {
    title: "Announcements",
    description: "Clan announcements, updates, and important notices from [THC] Chiller & Killer.",
    images: [{ url: "/assets/banners/banner_gold_dragon.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Announcements",
    description: "Clan announcements, updates, and important notices from [THC] Chiller & Killer.",
    images: ["/assets/banners/banner_gold_dragon.png"],
  },
};

/**
 * Renders the announcements page (formerly news).
 */
function NewsPage(): JSX.Element {
  return <NewsClient />;
}

export default NewsPage;
