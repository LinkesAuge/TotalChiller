import type { Metadata } from "next";
import AboutClient from "./about-client";

export const metadata: Metadata = {
  title: "About [THC] Chiller & Killer",
  description:
    "Learn about [THC] Chiller & Killer — a competitive Total Battle clan focused on teamwork, data-driven strategy, and community building.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About [THC] Chiller & Killer",
    description:
      "Learn about [THC] Chiller & Killer — a competitive Total Battle clan focused on teamwork, data-driven strategy, and community building.",
    images: [{ url: "/assets/banners/banner_gold_dragon.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "About [THC] Chiller & Killer",
    description:
      "Learn about [THC] Chiller & Killer — a competitive Total Battle clan focused on teamwork, data-driven strategy, and community building.",
    images: ["/assets/banners/banner_gold_dragon.png"],
  },
};

export default function AboutPage(): JSX.Element {
  return <AboutClient />;
}
