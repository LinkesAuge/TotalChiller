import type { Metadata } from "next";
import NewsClient from "./news-client";

export const metadata: Metadata = {
  title: "News",
  description: "Latest news and announcements from The Chillers clan.",
};

/**
 * Renders the news and announcements page.
 */
function NewsPage(): JSX.Element {
  return <NewsClient />;
}

export default NewsPage;
