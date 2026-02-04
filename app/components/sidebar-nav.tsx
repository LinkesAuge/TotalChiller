"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import createSupabaseBrowserClient from "../../lib/supabase/browser-client";

interface NavItem {
  readonly href: string;
  readonly label: string;
  readonly tab?: "clans" | "rules" | "logs";
  readonly isSubItem?: boolean;
}

interface NavSection {
  readonly title: string;
  readonly items: readonly NavItem[];
  readonly adminOnly?: boolean;
}

const navSections: readonly NavSection[] = [
  {
    title: "Main",
    items: [
      { href: "/home", label: "Home" },
      { href: "/", label: "Dashboard" },
      { href: "/news", label: "News" },
      { href: "/charts", label: "Charts" },
      { href: "/events", label: "Events" },
      { href: "/messages", label: "Messages" },
    ],
  },
  {
    title: "Admin",
    adminOnly: true,
    items: [
      { href: "/admin?tab=clans", label: "Clans & Members", tab: "clans", isSubItem: true },
      { href: "/admin?tab=rules", label: "Rules", tab: "rules", isSubItem: true },
      { href: "/admin?tab=logs", label: "Audit Logs", tab: "logs", isSubItem: true },
      { href: "/admin/data-import", label: "Data Import", isSubItem: true },
      { href: "/admin/data-table", label: "Data Table", isSubItem: true },
    ],
  },
];

function isNavItemActive(pathname: string, activeTab: string | null, item: NavItem): boolean {
  if (item.tab) {
    return pathname === "/admin" && activeTab === item.tab;
  }
  if (item.href.startsWith("/admin/data-")) {
    return pathname.startsWith(item.href);
  }
  if (item.href === "/" || item.href === "/home") {
    return pathname === item.href;
  }
  return pathname.startsWith(item.href);
}

function SidebarNav(): JSX.Element {
  const supabase = createSupabaseBrowserClient();
  const pathname = usePathname();
  const searchParams = useSearchParams();
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
      const { data: adminRows } = await supabase
        .from("clan_memberships")
        .select("id")
        .eq("user_id", userId)
        .eq("is_active", true)
        .in("role", ["owner", "admin"])
        .limit(1);
      if (isActive) {
        setIsAdmin(Boolean(adminRows && adminRows.length > 0));
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
          <div className="nav-group-title">Main</div>
          <Link className={pathname === "/home" ? "active" : ""} href="/home">
            Home
          </Link>
        </div>
      ) : (
        <>
          {navSections.map((section) => {
            if (section.adminOnly && !isAdmin) {
              return null;
            }
            return (
              <div className="nav-group" key={section.title}>
                <div className="nav-group-title">{section.title}</div>
                {section.items.map((item) => {
                  const isActive = isNavItemActive(pathname, searchParams.get("tab"), item);
                  return (
                    <Link
                      key={item.href}
                      className={`${item.isSubItem ? "sub" : ""} ${isActive ? "active" : ""}`.trim()}
                      href={item.href}
                    >
                      {item.label}
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
