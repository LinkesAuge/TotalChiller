"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import createSupabaseBrowserClient from "../../lib/supabase/browser-client";
import getIsAdminAccess from "../../lib/supabase/admin-access";
import RadixSelect from "./ui/radix-select";

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

interface ClanContextOption {
  readonly clanId: string;
  readonly gameAccountId: string;
  readonly clanName: string;
  readonly gameLabel: string;
}

const CLAN_STORAGE_KEY: string = "tc.currentClanId";
const GAME_ACCOUNT_STORAGE_KEY: string = "tc.currentGameAccountId";

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
      { href: "/admin?tab=clans", label: "Clan Management", tab: "clans", isSubItem: true },
      { href: "/admin?tab=users", label: "Users", tab: "users", isSubItem: true },
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
  const [clanOptions, setClanOptions] = useState<readonly ClanContextOption[]>([]);
  const [selectedClanKey, setSelectedClanKey] = useState<string>("");

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

  useEffect(() => {
    let isActive = true;
    async function loadClanOptions(): Promise<void> {
      if (!isAuthenticated) {
        return;
      }
      const { data, error } = await supabase
        .from("game_account_clan_memberships")
        .select("clan_id,game_account_id,clans(name,is_unassigned),game_accounts(game_username)")
        .eq("is_active", true)
        .eq("clans.is_unassigned", false);
      if (!isActive || error) {
        return;
      }
      const options =
        data?.map((row) => ({
          clanId: row.clan_id as string,
          gameAccountId: row.game_account_id as string,
          clanName: (row.clans as { name: string } | null)?.name ?? "Clan",
          gameLabel:
            (row.game_accounts as { game_username: string } | null)?.game_username ?? "Game account",
        })) ?? [];
      setClanOptions(options);
      const storedClanId = window.localStorage.getItem(CLAN_STORAGE_KEY) ?? "";
      const storedGameAccountId = window.localStorage.getItem(GAME_ACCOUNT_STORAGE_KEY) ?? "";
      const storedKey =
        storedClanId && storedGameAccountId ? `${storedClanId}:${storedGameAccountId}` : "";
      const hasStored = options.some(
        (option) => `${option.clanId}:${option.gameAccountId}` === storedKey,
      );
      if (hasStored) {
        setSelectedClanKey(storedKey);
        return;
      }
      const first = options[0];
      if (first) {
        const nextKey = `${first.clanId}:${first.gameAccountId}`;
        window.localStorage.setItem(CLAN_STORAGE_KEY, first.clanId);
        window.localStorage.setItem(GAME_ACCOUNT_STORAGE_KEY, first.gameAccountId);
        setSelectedClanKey(nextKey);
      }
    }
    void loadClanOptions();
    return () => {
      isActive = false;
    };
  }, [isAuthenticated, supabase]);

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
          <div className="nav-group">
            <div className="nav-group-title">Current Clan</div>
            {clanOptions.length === 0 ? (
              <span className="text-muted">No clan access yet</span>
            ) : (
              <RadixSelect
                ariaLabel="Current clan"
                value={selectedClanKey}
                onValueChange={(value) => {
                  setSelectedClanKey(value);
                  const [clanId, gameAccountId] = value.split(":");
                  if (clanId && gameAccountId) {
                    window.localStorage.setItem(CLAN_STORAGE_KEY, clanId);
                    window.localStorage.setItem(GAME_ACCOUNT_STORAGE_KEY, gameAccountId);
                    window.dispatchEvent(new Event("clan-context-change"));
                  }
                }}
                options={clanOptions.map((option) => ({
                  value: `${option.clanId}:${option.gameAccountId}`,
                  label: `${option.clanName} • ${option.gameLabel}`,
                }))}
              />
            )}
          </div>
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
