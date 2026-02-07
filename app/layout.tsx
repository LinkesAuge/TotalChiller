import type { Metadata } from "next";
import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";
import { SidebarProvider } from "./components/sidebar-context";
import SidebarShell from "./components/sidebar-shell";
import { ToastProvider } from "./components/toast-provider";
import ClanAccessGate from "./components/clan-access-gate";

interface RootLayoutProps {
  readonly children: ReactNode;
}

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://totalchiller.vercel.app",
  ),
  title: {
    default: "TotalChiller - The Chillers Community Hub",
    template: "%s | TotalChiller",
  },
  description:
    "Community hub for The Chillers Total Battle clan. Coordinate events, track chest scores, manage data imports, and stay connected with your clan.",
  icons: {
    icon: "/assets/vip/icons_chest_1.png",
  },
  openGraph: {
    type: "website",
    siteName: "TotalChiller",
    title: "TotalChiller - The Chillers Community Hub",
    description:
      "Community hub for The Chillers Total Battle clan. Coordinate events, track chest scores, manage data imports, and stay connected.",
    images: [{ url: "/assets/banners/banner_gold_dragon.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "TotalChiller - The Chillers Community Hub",
    description:
      "Community hub for The Chillers Total Battle clan. Coordinate events, track scores, and stay connected.",
    images: ["/assets/banners/banner_gold_dragon.png"],
  },
};

/**
 * Root layout with the Sanctum design system.
 * Provides collapsible sidebar, ornate footer, clan access gating, and i18n.
 */
async function RootLayout({ children }: RootLayoutProps): Promise<JSX.Element> {
  const locale = await getLocale();
  const messages = await getMessages();
  const t = (ns: string, key: string): string => {
    const section = (messages as Record<string, Record<string, string>>)[ns];
    return section?.[key] ?? key;
  };

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />
        <link rel="preload" href="/assets/vip/back_left.png" as="image" />
        <link rel="preload" href="/assets/ui/components_shield_4.png" as="image" />
        <link rel="preload" href="/assets/vip/components_decor_7.png" as="image" />
      </head>
      <body suppressHydrationWarning>
        <NextIntlClientProvider messages={messages} locale={locale}>
          <ToastProvider>
            <SidebarProvider>
              <div className="layout">
                <SidebarShell>
                  <ClanAccessGate>{children}</ClanAccessGate>
                  <footer className="app-footer">
                    <img
                      src="/assets/vip/components_decor_5.png"
                      alt="Ornamental footer divider"
                      className="app-footer-divider"
                      width={800}
                      height={16}
                      loading="lazy"
                    />
                    <span className="app-footer-text">
                      {t("footer", "tagline")}
                    </span>
                    <div className="app-footer-links">
                      <a href="/home">{t("footer", "home")}</a>
                      <span>&bull;</span>
                      <a href="/about">{t("footer", "about")}</a>
                      <span>&bull;</span>
                      <a href="/contact">{t("footer", "contact")}</a>
                      <span>&bull;</span>
                      <a href="/privacy-policy">{t("footer", "privacy")}</a>
                    </div>
                    <div className="app-footer-sub">
                      {t("footer", "builtWith")}
                    </div>
                  </footer>
                </SidebarShell>
              </div>
            </SidebarProvider>
          </ToastProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

export default RootLayout;
