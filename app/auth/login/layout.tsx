import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Sign In to Your Account",
  description:
    "Sign in to your TotalChiller account to access [THC] Chiller & Killer community hub. View clan stats, coordinate events, and stay connected.",
  alternates: { canonical: "/auth/login" },
  openGraph: {
    title: "Sign In to Your Account",
    description:
      "Sign in to your TotalChiller account to access [THC] Chiller & Killer community hub. View clan stats, coordinate events, and stay connected.",
    images: [{ url: "/assets/banners/banner_gold_dragon.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sign In to Your Account",
    description:
      "Sign in to your TotalChiller account to access [THC] Chiller & Killer community hub. View clan stats, coordinate events, and stay connected.",
    images: ["/assets/banners/banner_gold_dragon.png"],
  },
};

/** Layout wrapper providing metadata for the login page. */
function LoginLayout({ children }: { readonly children: ReactNode }): JSX.Element {
  return <>{children}</>;
}

export default LoginLayout;
