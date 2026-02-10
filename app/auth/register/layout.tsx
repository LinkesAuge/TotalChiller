import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Create Your Account",
  description:
    "Create a TotalChiller account to join [THC] Chiller & Killer Total Battle clan. Access chest tracking, event coordination, and analytics charts.",
  alternates: { canonical: "/auth/register" },
  openGraph: {
    title: "Create Your Account",
    description:
      "Create a TotalChiller account to join [THC] Chiller & Killer Total Battle clan. Access chest tracking, event coordination, and analytics charts.",
    images: [{ url: "/assets/banners/banner_gold_dragon.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Create Your Account",
    description:
      "Create a TotalChiller account to join [THC] Chiller & Killer Total Battle clan. Access chest tracking, event coordination, and analytics charts.",
    images: ["/assets/banners/banner_gold_dragon.png"],
  },
};

/** Layout wrapper providing metadata for the registration page. */
function RegisterLayout({ children }: { readonly children: ReactNode }): JSX.Element {
  return <>{children}</>;
}

export default RegisterLayout;
