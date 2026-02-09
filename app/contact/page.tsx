import type { Metadata } from "next";
import ContactClient from "./contact-client";

export const metadata: Metadata = {
  title: "Contact [THC] Chiller & Killer",
  description:
    "Get in touch with [THC] Chiller & Killer clan. Reach out via Discord, email, or use our contact information for recruitment and general inquiries.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage(): JSX.Element {
  return <ContactClient />;
}
