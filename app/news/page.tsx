import type { Metadata } from "next";
import NewsClient from "./news-client";

export const metadata: Metadata = {
  title: "Announcements",
  description: "Clan announcements, updates, and important notices from The Chillers.",
};

/**
 * Renders the announcements page (formerly news).
 */
function NewsPage(): JSX.Element {
  return <NewsClient />;
}

export default NewsPage;
