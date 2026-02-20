"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useSupabase } from "../hooks/use-supabase";
import { useAuth } from "@/app/hooks/use-auth";
import { ADMIN_SECTIONS } from "@/app/admin/admin-sections";
import { useSidebar } from "./sidebar-context";
import useClanContext from "../hooks/use-clan-context";

/** Lightweight forum category type for sidebar sub-items. */
import type { ForumCategory } from "@/lib/types/domain";

type ForumCategorySub = Pick<ForumCategory, "id" | "name" | "slug" | "sort_order">;

/** SVG icon path data for each navigation item. */
const ICONS: Record<string, string> = {
  home: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z",
  dashboard: "M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 0h7v7h-7z",
  news: "M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2",
  analytics: "M18 20V10M12 20V4M6 20v-6",
  events: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  forum:
    "M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a2 2 0 01-2-2v-1M13 6H7a2 2 0 00-2 2v6a2 2 0 002 2h2v4l4-4h2a2 2 0 002-2V8a2 2 0 00-2-2z",
  messages: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z",
  clanManagement:
    "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
  approvals: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  users: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
  auditLogs:
    "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
  admin: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z",
  profile: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
  settings:
    "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
  bugs: "M8 2l1.88 1.88M14.12 3.88L16 2M9 7.13v-1a3.003 3.003 0 116 0v1M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 014-4h4a4 4 0 014 4v3c0 3.3-2.7 6-6 6zM12 20v2M6 13H2M22 13h-4",
};

interface NavItem {
  readonly href: string;
  readonly labelKey: string;
  readonly iconKey: string;
  readonly tab?: "clans" | "users" | "logs" | "approvals" | "forum";
  readonly vipIcon?: string;
  /** Render icon at a larger size (for detailed multi-element icons). */
  readonly lgIcon?: boolean;
}

interface NavSection {
  readonly title: string;
  readonly groupLabel: string;
  readonly items: readonly NavItem[];
}

/** Maps ADMIN_SECTIONS labelKey to sidebar-specific display properties. */
const SIDEBAR_ADMIN_META: Record<string, { labelKey: string; iconKey: string; vipIcon: string; lgIcon?: boolean }> = {
  clans: {
    labelKey: "clanManagement",
    iconKey: "clanManagement",
    vipIcon: "/assets/game/icons/circle_mercenaries_01.png",
    lgIcon: true,
  },
  approvals: { labelKey: "approvals", iconKey: "approvals", vipIcon: "/assets/game/icons/icons_check_1.png" },
  users: { labelKey: "users", iconKey: "users", vipIcon: "/assets/game/icons/gold_72.png", lgIcon: true },
  logs: { labelKey: "auditLogs", iconKey: "auditLogs", vipIcon: "/assets/game/icons/icons_scroll_1.png" },
  forum: {
    labelKey: "forumAdmin",
    iconKey: "forum",
    vipIcon: "/assets/game/icons/icons_main_menu_storage_1.png",
    lgIcon: true,
  },
  designSystem: {
    labelKey: "designSystem",
    iconKey: "settings",
    vipIcon: "/assets/game/icons/clan_emblem_11.png",
    lgIcon: true,
  },
};

const HOME_NAV_ITEM: NavItem = {
  href: "/home",
  labelKey: "home",
  iconKey: "home",
  vipIcon: "/assets/game/icons/icons_card_house_1.png",
};

const NAV_SECTIONS: readonly NavSection[] = [
  {
    title: "Main",
    groupLabel: "main",
    items: [
      HOME_NAV_ITEM,
      {
        href: "/",
        labelKey: "dashboard",
        iconKey: "dashboard",
        vipIcon: "/assets/game/icons/icons_main_menu_workroom_1.png",
        lgIcon: true,
      },
      {
        href: "/news",
        labelKey: "announcements",
        iconKey: "news",
        vipIcon: "/assets/game/icons/icons_main_menu_daily_1.png",
        lgIcon: true,
      },
      {
        href: "/events",
        labelKey: "events",
        iconKey: "events",
        vipIcon: "/assets/game/icons/icons_main_menu_clan_1.png",
        lgIcon: true,
      },
      {
        href: "/analytics",
        labelKey: "analytics",
        iconKey: "analytics",
        vipIcon: "/assets/game/icons/icons_main_menu_rating_1.png",
        lgIcon: true,
      },
      {
        href: "/forum",
        labelKey: "forum",
        iconKey: "forum",
        vipIcon: "/assets/game/icons/icons_main_menu_technology_1.png",
        lgIcon: true,
      },
      {
        href: "/messages",
        labelKey: "messages",
        iconKey: "messages",
        vipIcon: "/assets/game/icons/widget_journal_spine.png",
        lgIcon: true,
      },
      {
        href: "/members",
        labelKey: "members",
        iconKey: "clanManagement",
        vipIcon: "/assets/game/icons/icons_main_menu_army_1.png",
        lgIcon: true,
      },
      {
        href: "/bugs",
        labelKey: "bugs",
        iconKey: "bugs",
        vipIcon: "/assets/game/icons/icons_spyglass_2.png",
        lgIcon: true,
      },
    ],
  },
  {
    title: "Admin",
    groupLabel: "administration",
    items: ADMIN_SECTIONS.map((section) => {
      const meta = SIDEBAR_ADMIN_META[section.labelKey];
      return {
        href: section.href,
        tab: section.tab,
        labelKey: meta?.labelKey ?? section.labelKey,
        iconKey: meta?.iconKey ?? "admin",
        vipIcon: meta?.vipIcon,
        lgIcon: meta?.lgIcon,
      };
    }),
  },
];

function isNavItemActive(pathname: string, activeTab: string | null, item: NavItem): boolean {
  if (item.tab) {
    return pathname === "/admin" && activeTab === item.tab;
  }
  if (item.href === "/" || item.href === "/home") {
    return pathname === item.href;
  }
  return pathname.startsWith(item.href);
}

/** Renders a game asset icon for a nav item, falling back to SVG. */
function NavItemIcon({ item }: { readonly item: NavItem }): JSX.Element {
  if (item.vipIcon) {
    const cls = item.lgIcon ? "nav-game-icon nav-game-icon--lg" : "nav-game-icon";
    const px = item.lgIcon ? 34 : 22;
    return <Image src={item.vipIcon} alt="" width={px} height={px} className={cls} />;
  }
  const iconPath = ICONS[item.iconKey] ?? ICONS.dashboard;
  return (
    <svg
      width="20"
      height="20"
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
  const supabase = useSupabase();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isOpen } = useSidebar();
  const t = useTranslations("nav");
  const clanContext = useClanContext();
  const { isAuthenticated, isLoading } = useAuth();
  const [forumCategories, setForumCategories] = useState<ForumCategorySub[]>([]);
  const [isCompactViewport, setIsCompactViewport] = useState(false);

  /* Keep behavior in sync with mobile collapsed-sidebar breakpoint. */
  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 900px)");
    const syncCompactState = (): void => setIsCompactViewport(mediaQuery.matches);
    syncCompactState();
    mediaQuery.addEventListener("change", syncCompactState);
    return () => mediaQuery.removeEventListener("change", syncCompactState);
  }, []);

  /* Load forum categories when on the forum page */
  const isOnForum = pathname.startsWith("/forum");
  useEffect(() => {
    if (!isOnForum || !clanContext) {
      setForumCategories([]);
      return;
    }
    let active = true;
    async function loadForumCategories(): Promise<void> {
      const { data, error } = await supabase
        .from("forum_categories")
        .select("id, name, slug, sort_order")
        .eq("clan_id", clanContext!.clanId)
        .order("name", { ascending: true });
      if (!active) return;
      if (error || !data) {
        setForumCategories([]);
      } else {
        setForumCategories(data as ForumCategorySub[]);
      }
    }
    void loadForumCategories();
    return () => {
      active = false;
    };
  }, [isOnForum, clanContext, supabase]);

  if (isLoading) {
    return <nav className="nav" />;
  }

  return (
    <nav className="nav">
      {!isAuthenticated ? (
        <div className="nav-group">
          <div className={`nav-group-title${isOpen ? "" : " collapsed"}`}>{t("main")}</div>
          <Link
            className={`${pathname === "/home" ? "active" : ""}${!isOpen ? " justify-center py-2" : ""}`.trim()}
            href="/home"
            data-tip={!isOpen ? t("home") : undefined}
            aria-label={t("home")}
          >
            <div className="nav-icon-glow" />
            <span className="nav-icon" style={{ color: pathname === "/home" ? "var(--color-gold-2)" : undefined }}>
              <NavItemIcon item={HOME_NAV_ITEM} />
            </span>
            <span className={`nav-label${isOpen ? "" : " collapsed"}`}>{t("home")}</span>
          </Link>
        </div>
      ) : (
        <>
          {/* Nav sections (no clan selector) */}
          {NAV_SECTIONS.map((section, sectionIndex) => {
            return (
              <div className="nav-group" key={section.title}>
                {sectionIndex > 0 && (
                  <div className="nav-group-divider">
                    {isOpen && (
                      <Image
                        src="/assets/game/decorations/components_title_1.png"
                        alt=""
                        width={150}
                        height={17}
                        className="nav-group-divider__ornament"
                      />
                    )}
                  </div>
                )}
                <div className={`nav-group-title${isOpen ? "" : " collapsed"}`}>{t(section.groupLabel)}</div>
                {section.items.map((item) => {
                  const isActive = isNavItemActive(pathname, searchParams.get("tab"), item);
                  const label = t(item.labelKey);
                  const activeCategory = searchParams.get("category") ?? "";
                  return (
                    <div key={item.href}>
                      <Link
                        href={item.href}
                        className={`${isActive ? "active" : ""}${!isOpen ? " collapsed justify-center py-2" : ""}`}
                        data-tip={!isOpen ? label : undefined}
                        aria-label={label}
                      >
                        {/* Arrow active background */}
                        {isActive && isOpen && (
                          <Image
                            src="/assets/vip/backs_31.png"
                            alt=""
                            className="nav-active-arrow"
                            width={30}
                            height={30}
                          />
                        )}
                        {/* Hover glow */}
                        <div className="nav-icon-glow" />
                        {/* Icon */}
                        <span className="nav-icon">
                          <NavItemIcon item={item} />
                        </span>
                        {/* Label */}
                        <span className={`nav-label${isOpen ? "" : " collapsed"}`}>{label}</span>
                      </Link>
                      {/* Forum category sub-items (expanded desktop sidebar only) */}
                      {item.href === "/forum" &&
                        isOnForum &&
                        isOpen &&
                        !isCompactViewport &&
                        forumCategories.length > 0 && (
                          <div className="nav-sub-items">
                            {forumCategories.map((cat) => {
                              const isCatActive = activeCategory === cat.slug;
                              return (
                                <Link
                                  key={cat.id}
                                  href={`/forum?category=${encodeURIComponent(cat.slug)}`}
                                  className={`nav-sub-item${isCatActive ? " active" : ""}`}
                                >
                                  <span className="nav-sub-dot" />
                                  <span className="nav-sub-label">{cat.name}</span>
                                </Link>
                              );
                            })}
                          </div>
                        )}
                    </div>
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
