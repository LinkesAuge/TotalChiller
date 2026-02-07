import type { Metadata } from "next";
import type { ReactNode } from "react";
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
 * Provides collapsible sidebar, ornate footer, and clan access gating.
 */
function RootLayout({ children }: RootLayoutProps): JSX.Element {
  return (
    <html lang="en">
      <body>
        <ToastProvider>
          <SidebarProvider>
            <div className="layout">
              <SidebarShell>
                <ClanAccessGate>{children}</ClanAccessGate>
                <footer className="app-footer">
                  <img
                    src="/assets/vip/components_decor_5.png"
                    alt=""
                    className="app-footer-divider"
                    width={800}
                    height={16}
                    loading="lazy"
                  />
                  <span className="app-footer-text">
                    The Chillers &bull; Community Hub &bull; Total Battle Clan
                    Platform
                  </span>
                  <div className="app-footer-sub">
                    Built with care for the community
                  </div>
                </footer>
              </SidebarShell>
            </div>
          </SidebarProvider>
        </ToastProvider>
      </body>
    </html>
  );
}

export default RootLayout;
