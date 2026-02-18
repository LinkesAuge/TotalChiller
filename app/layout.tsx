import type { Metadata } from "next";
import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Cinzel, Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { SidebarProvider } from "./components/sidebar-context";
import SidebarShell from "./components/sidebar-shell";
import { ToastProvider } from "./components/toast-provider";
import ClanAccessGate from "./components/clan-access-gate";
import BugReportWidgetLoader from "./components/bug-report-widget-loader";
import { AuthStateProvider } from "./hooks/auth-state-provider";

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["500", "700"],
  display: "swap",
  variable: "--font-heading",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-body",
});

interface RootLayoutProps {
  readonly children: ReactNode;
}

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://totalchiller.de"),
  title: {
    default: "[THC] Chiller & Killer Community Hub",
    template: "%s | [THC] Chiller & Killer",
  },
  description:
    "Community hub for [THC] Chiller & Killer Total Battle clan. Coordinate events, manage your clan, and stay connected.",
  icons: {
    icon: "/assets/vip/icons_chest_1.png",
  },
  openGraph: {
    type: "website",
    siteName: "[THC] Chiller & Killer",
    title: "[THC] Chiller & Killer Community Hub",
    description:
      "Community hub for [THC] Chiller & Killer Total Battle clan. Coordinate events, manage your clan, and stay connected.",
    images: [{ url: "/assets/banners/banner_gold_dragon.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "[THC] Chiller & Killer Community Hub",
    description:
      "Community hub for [THC] Chiller & Killer Total Battle clan. Coordinate events, track scores, and stay connected.",
    images: ["/assets/banners/banner_gold_dragon.png"],
  },
};

/**
 * Root layout with the Sanctum design system.
 * Provides collapsible sidebar, ornate footer, clan access gating, and i18n.
 */
async function RootLayout({ children }: RootLayoutProps): Promise<JSX.Element> {
  const [locale, messages] = await Promise.all([getLocale(), getMessages()]);
  const t = (ns: string, key: string): string => {
    const section = (messages as Record<string, Record<string, string>>)[ns];
    return section?.[key] ?? key;
  };

  return (
    <html lang={locale} className={`${cinzel.variable} ${inter.variable}`} suppressHydrationWarning>
      <head>
        <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />
        {/* Only preload the logo — it uses a raw <picture> element without next/image.
            Other key images (back_left, components_decor_7, header_3) use next/image
            with priority, which automatically emits the correct preload for the
            optimized /_next/image URL. Manual preloads for those would cause
            double downloads (raw asset + optimized version). */}
        <link rel="preload" href="/assets/ui/chillerkiller_logo.webp" as="image" type="image/webp" />
        {/* JSON-LD structured data — WebSite + Organization */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "WebSite",
                  name: "[THC] Chiller & Killer",
                  alternateName: "[THC] Chiller & Killer Community Hub",
                  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://totalchiller.de",
                  description:
                    "Community hub for [THC] Chiller & Killer Total Battle clan. Coordinate events, manage your clan, and stay connected.",
                },
                {
                  "@type": "Organization",
                  name: "[THC] Chiller & Killer",
                  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://totalchiller.de",
                  logo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://totalchiller.de"}/assets/vip/icons_chest_1.png`,
                  description:
                    "Competitive Total Battle clan focused on teamwork, data-driven strategy, and community building.",
                },
              ],
            }),
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <NextIntlClientProvider messages={messages} locale={locale}>
          <AuthStateProvider>
            <ToastProvider>
              <SidebarProvider>
                <div className="layout">
                  <SidebarShell>
                    <ClanAccessGate>{children}</ClanAccessGate>
                    <BugReportWidgetLoader />
                    <footer className="app-footer">
                      <Image
                        src="/assets/vip/components_decor_5.png"
                        alt="Ornamental footer divider"
                        className="app-footer-divider"
                        width={800}
                        height={16}
                        sizes="(max-width: 800px) 100vw, 800px"
                        loading="lazy"
                      />
                      <span className="app-footer-text">{t("footer", "tagline")}</span>
                      <div className="app-footer-links">
                        <Link href="/home">{t("footer", "home")}</Link>
                        <span>&bull;</span>
                        <Link href="/about">{t("footer", "about")}</Link>
                        <span>&bull;</span>
                        <Link href="/contact">{t("footer", "contact")}</Link>
                        <span>&bull;</span>
                        <Link href="/privacy-policy">{t("footer", "privacy")}</Link>
                      </div>
                      <div className="app-footer-sub">
                        © {new Date().getFullYear()} [THC] Chiller &amp; Killer &bull; {t("footer", "builtWith")}
                      </div>
                    </footer>
                  </SidebarShell>
                </div>
              </SidebarProvider>
            </ToastProvider>
          </AuthStateProvider>
        </NextIntlClientProvider>
        <Analytics />
      </body>
    </html>
  );
}

export default RootLayout;
