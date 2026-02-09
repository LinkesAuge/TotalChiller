import type { Metadata } from "next";
import PrivacyClient from "./privacy-client";

export const metadata: Metadata = {
  title: "Privacy Policy & Data Protection",
  description:
    "TotalChiller privacy policy — learn how we collect, use, and protect your personal data within [THC] Chiller & Killer Total Battle community platform.",
  alternates: { canonical: "/privacy-policy" },
};

export default function PrivacyPolicyPage(): JSX.Element {
  return <PrivacyClient />;
}
