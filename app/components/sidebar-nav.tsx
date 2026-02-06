"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import createSupabaseBrowserClient from "../../lib/supabase/browser-client";
import getIsAdminAccess from "../../lib/supabase/admin-access";
import { useSidebar } from "./sidebar-context";

/** SVG icon path data for each navigation item. */
const ICONS: Record<string, string> = {
  home: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z",
  dashboard: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z",
  news: "M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2",
  charts: "M18 20V10M12 20V4M6 20v-6",
  events: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  messages: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z",
  clanManagement: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
  approvals: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  users: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
  validation: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
  corrections: "M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z",
  auditLogs: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
  dataImport: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12",
  admin: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z",
  profile: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
  settings: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
};

interface NavItem {
  readonly href: string;
  readonly label: string;
  readonly iconKey: string;
  readonly tab?: "clans" | "users" | "validation" | "corrections" | "logs" | "approvals";
  readonly vipIcon?: string;
}

interface NavSection {
  readonly title: string;
  readonly groupLabel: string;
  readonly items: readonly NavItem[];
  readonly adminOnly?: boolean;
}

const NAV_SECTIONS: readonly NavSection[] = [
  {
    title: "Main",
    groupLabel: "Navigation",
    items: [
      { href: "/home", label: "Home", iconKey: "home" },
      { href: "/", label: "Dashboard", iconKey: "dashboard" },
      { href: "/news", label: "News", iconKey: "news" },
      { href: "/charts", label: "Charts", iconKey: "charts" },
      { href: "/events", label: "Events", iconKey: "events" },
      { href: "/messages", label: "Messages", iconKey: "messages" },
    ],
  },
  {
    title: "Admin",
    groupLabel: "Command",
    adminOnly: true,
    items: [
      { href: "/admin?tab=clans", label: "Clan Management", iconKey: "clanManagement", tab: "clans" },
      { href: "/admin?tab=approvals", label: "Approvals", iconKey: "approvals", tab: "approvals" },
      { href: "/admin?tab=users", label: "Users", iconKey: "users", tab: "users" },
      { href: "/admin?tab=validation", label: "Validation", iconKey: "validation", tab: "validation" },
      { href: "/admin?tab=corrections", label: "Corrections", iconKey: "corrections", tab: "corrections" },
      { href: "/admin?tab=logs", label: "Audit Logs", iconKey: "auditLogs", tab: "logs" },
      { href: "/admin/data-import", label: "Data Import", iconKey: "dataImport" },
      { href: "/admin/data-table", label: "Chest DB", iconKey: "admin", vipIcon: "/assets/vip/icons_chest_1.png" },
    ],
  },
];

function isNavItemActive(pathname: string, activeTab: string | null, item: NavItem): boolean {
  if (item.tab) {
    const normalizedTab = activeTab === "rules" ? "validation" : activeTab;
    return pathname === "/admin" && normalizedTab === item.tab;
  }
  if (item.href.startsWith("/admin/data-")) {
    return pathname.startsWith(item.href);
  }
  if (item.href === "/" || item.href === "/home") {
    return pathname === item.href;
  }
  return pathname.startsWith(item.href);
}

/** Renders an SVG icon for a nav item, or a VIP image icon. */
function NavItemIcon({ item }: { readonly item: NavItem }): JSX.Element {
  if (item.vipIcon) {
    return (
      <img
        src={item.vipIcon}
        alt=""
        style={{ width: 16, height: 16, objectFit: "contain" }}
      />
    );
  }
  const iconPath = ICONS[item.iconKey] ?? ICONS.dashboard;
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={iconPath} />
    </svg>
  );
}

/**
 * Sanctum sidebar navigation with SVG icons, collapsible groups,
 * hover glow, tooltips, and arrow active state.
 */
function SidebarNav(): JSX.Element {
  const supabase = createSupabaseBrowserClient();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isOpen } = useSidebar();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isActive = true;
    async function loadAdminStatus(): Promise<void> {
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id;
      if (!userId) {
        if (isActive) {
          setIsAuthenticated(false);
          setIsAdmin(false);
          setIsLoading(false);
        }
        return;
      }
      if (isActive) {
        setIsAuthenticated(true);
      }
      if (isActive) {
        setIsAdmin(await getIsAdminAccess({ supabase }));
        setIsLoading(false);
      }
    }
    void loadAdminStatus();
    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      void loadAdminStatus();
    });
    return () => {
      isActive = false;
      authListener.subscription.unsubscribe();
    };
  }, [supabase]);

  if (isLoading) {
    return <nav className="nav" />;
  }

  return (
    <nav className="nav">
      {!isAuthenticated ? (
        <div className="nav-group">
          {isOpen && <div className="nav-group-title">Navigation</div>}
          <Link
            className={pathname === "/home" ? "active" : ""}
            href="/home"
            data-tip={!isOpen ? "Home" : undefined}
            style={!isOpen ? { justifyContent: "center", padding: "8px 0" } : undefined}
          >
            <div className="nav-icon-glow" />
            <span className="nav-icon" style={{ color: pathname === "/home" ? "var(--color-gold-2)" : undefined }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={ICONS.home} /></svg>
            </span>
            {isOpen && <span className="nav-label">Home</span>}
          </Link>
        </div>
      ) : (
        <>
          {/* Nav sections (no clan selector) */}
          {NAV_SECTIONS.map((section, sectionIndex) => {
            if (section.adminOnly && !isAdmin) {
              return null;
            }
            return (
              <div className="nav-group" key={section.title}>
                {sectionIndex > 0 && <div className="nav-group-divider" />}
                {isOpen && <div className="nav-group-title">{section.groupLabel}</div>}
                {section.items.map((item) => {
                  const isActive = isNavItemActive(pathname, searchParams.get("tab"), item);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`${isActive ? "active" : ""}${!isOpen ? " collapsed" : ""}`}
                      data-tip={!isOpen ? item.label : undefined}
                      style={!isOpen ? { justifyContent: "center", padding: "8px 0" } : undefined}
                    >
                      {/* Arrow active background */}
                      {isActive && isOpen && (
                        <img
                          src="/assets/vip/backs_31.png"
                          alt=""
                          className="nav-active-arrow"
                        />
                      )}
                      {/* Hover glow */}
                      <div className="nav-icon-glow" />
                      {/* Icon */}
                      <span className="nav-icon">
                        <NavItemIcon item={item} />
                      </span>
                      {/* Label */}
                      {isOpen && (
                        <span className="nav-label">
                          {item.label}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </>
      )}
    </nav>
  );
}

export default SidebarNav;
