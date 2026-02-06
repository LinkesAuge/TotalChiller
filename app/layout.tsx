import type { ReactNode } from "react";
import "./globals.css";
import { SidebarProvider } from "./components/sidebar-context";
import SidebarShell from "./components/sidebar-shell";
import { ToastProvider } from "./components/toast-provider";
import ClanAccessGate from "./components/clan-access-gate";

interface RootLayoutProps {
  readonly children: ReactNode;
}

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
