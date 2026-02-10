import type { Metadata } from "next";
import ForumClient from "./forum-client";

export const metadata: Metadata = {
  title: "Forum",
  description: "Community discussion forum for [THC] Chiller & Killer clan.",
  alternates: { canonical: "/forum" },
  openGraph: {
    title: "Forum",
    description: "Community discussion forum for [THC] Chiller & Killer clan.",
    images: [{ url: "/assets/banners/banner_gold_dragon.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Forum",
    description: "Community discussion forum for [THC] Chiller & Killer clan.",
    images: ["/assets/banners/banner_gold_dragon.png"],
  },
};

/**
 * Renders the clan forum page.
 */
function ForumPage(): JSX.Element {
  return <ForumClient />;
}

export default ForumPage;
