import type { Metadata } from "next";
import PrivacyClient from "./privacy-client";

export const metadata: Metadata = {
  title: "Privacy Policy & Data Protection",
  description:
    "TotalChiller privacy policy — learn how we collect, use, and protect your personal data within [THC] Chiller & Killer Total Battle community platform.",
  alternates: { canonical: "/privacy-policy" },
  openGraph: {
    title: "Privacy Policy & Data Protection",
    description:
      "TotalChiller privacy policy — learn how we collect, use, and protect your personal data within [THC] Chiller & Killer Total Battle community platform.",
    images: [{ url: "/assets/banners/banner_gold_dragon.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Privacy Policy & Data Protection",
    description:
      "TotalChiller privacy policy — learn how we collect, use, and protect your personal data within [THC] Chiller & Killer Total Battle community platform.",
    images: ["/assets/banners/banner_gold_dragon.png"],
  },
};

export default function PrivacyPolicyPage(): JSX.Element {
  return <PrivacyClient />;
}
