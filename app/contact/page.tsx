import type { Metadata } from "next";
import ContactClient from "./contact-client";

export const metadata: Metadata = {
  title: "Contact [THC] Chiller & Killer",
  description:
    "Get in touch with [THC] Chiller & Killer clan. Reach out via Discord, email, or use our contact information for recruitment and general inquiries.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact [THC] Chiller & Killer",
    description:
      "Get in touch with [THC] Chiller & Killer clan. Reach out via Discord, email, or use our contact information for recruitment and general inquiries.",
    images: [{ url: "/assets/banners/banner_gold_dragon.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact [THC] Chiller & Killer",
    description:
      "Get in touch with [THC] Chiller & Killer clan. Reach out via Discord, email, or use our contact information for recruitment and general inquiries.",
    images: ["/assets/banners/banner_gold_dragon.png"],
  },
};

export default function ContactPage(): JSX.Element {
  return <ContactClient />;
}
