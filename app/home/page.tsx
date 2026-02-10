import type { Metadata } from "next";
import HomeClient from "./home-client";

export const metadata: Metadata = {
  title: "[THC] Chiller & Killer Community Hub",
  description:
    "Welcome to [THC] Chiller & Killer — a focused Total Battle clan built around teamwork, planning, and data-driven play. Join our community hub.",
  alternates: { canonical: "/home" },
  openGraph: {
    title: "[THC] Chiller & Killer Community Hub",
    description:
      "Welcome to [THC] Chiller & Killer — a focused Total Battle clan built around teamwork, planning, and data-driven play. Join our community hub.",
    images: [{ url: "/assets/banners/banner_gold_dragon.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "[THC] Chiller & Killer Community Hub",
    description:
      "Welcome to [THC] Chiller & Killer — a focused Total Battle clan built around teamwork, planning, and data-driven play. Join our community hub.",
    images: ["/assets/banners/banner_gold_dragon.png"],
  },
};

/**
 * Thin server-component wrapper that delegates to the client-rendered
 * HomeClient component (needed for CMS inline editing).
 */
async function HomePage(): Promise<JSX.Element> {
  return <HomeClient />;
}

export default HomePage;
