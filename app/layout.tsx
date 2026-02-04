import type { ReactNode } from "react";
import "./globals.css";
import SidebarNav from "./components/sidebar-nav";
import { ToastProvider } from "./components/toast-provider";

interface RootLayoutProps {
  readonly children: ReactNode;
}

/**
 * Provides the root application shell and theme styles.
 */
function RootLayout({ children }: RootLayoutProps): JSX.Element {
  return (
    <html lang="en">
      <body>
        <ToastProvider>
          <div className="layout">
            <aside className="sidebar">
              <h2>The Chillers</h2>
              <SidebarNav />
            </aside>
            <main className="content">
              {children}
              <footer className="app-footer">
                <span className="text-muted">The Chillers • Community Hub</span>
                <span className="text-muted">Total Battle Clan Platform</span>
              </footer>
            </main>
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}

export default RootLayout;
