"use client";

import { Suspense, useEffect, useRef, useState, useCallback, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useSidebar } from "./sidebar-context";
import SidebarNav from "./sidebar-nav";
import LanguageSelector from "./language-selector";
import RadixSelect, { type SelectOption } from "./ui/radix-select";
import { useSupabase } from "../hooks/use-supabase";
import { useUserRole } from "@/lib/hooks/use-user-role";
import { formatRank, formatRole, rankOptions } from "@/app/admin/admin-types";

interface ClanOption {
  readonly clanId: string;
  readonly gameAccountId: string;
  readonly clanName: string;
  readonly gameLabel: string;
  readonly rank: string | null;
}

interface SidebarUserData {
  readonly initials: string;
  readonly displayLabel: string;
  readonly email: string;
  readonly isAdmin: boolean;
  readonly highestRank: string;
  readonly clanOptions: readonly ClanOption[];
  readonly selectedKey: string;
}

const CLAN_STORAGE_KEY = "tc.currentClanId";
const GAME_ACCOUNT_STORAGE_KEY = "tc.currentGameAccountId";

const DEFAULT_USER: SidebarUserData = {
  initials: "",
  displayLabel: "",
  email: "",
  isAdmin: false,
  highestRank: "",
  clanOptions: [],
  selectedKey: "",
};

/**
 * Returns the highest rank from a list of clan options using rankOptions order.
 */
function resolveHighestRank(options: readonly ClanOption[]): string {
  let bestIndex = rankOptions.length;
  for (const option of options) {
    if (!option.rank) continue;
    const index = rankOptions.indexOf(option.rank);
    if (index !== -1 && index < bestIndex) {
      bestIndex = index;
    }
  }
  return bestIndex < rankOptions.length ? (rankOptions[bestIndex] ?? "") : "";
}

/**
 * The Sanctum sidebar shell — steel-textured, collapsible, with ornate dividers.
 * Renders the sidebar `<aside>` and main `<div>` wrapper that drives margin-left.
 */
function SidebarShell({ children }: { readonly children: React.ReactNode }): JSX.Element {
  const { isOpen, toggle, width } = useSidebar();
  const t = useTranslations("sidebar");
  const locale = useLocale();
  const [userData, setUserData] = useState<SidebarUserData>(DEFAULT_USER);
  const [isCompactViewport, setIsCompactViewport] = useState(false);
  const supabase = useSupabase();
  const { role: userRole, isAdmin } = useUserRole(supabase);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 900px)");
    const syncCompactState = (): void => setIsCompactViewport(mediaQuery.matches);
    syncCompactState();
    mediaQuery.addEventListener("change", syncCompactState);
    return () => mediaQuery.removeEventListener("change", syncCompactState);
  }, []);

  const loadUserData = useCallback(async (): Promise<void> => {
    const { data } = await supabase.auth.getUser();
    const userId = data.user?.id;
    if (!userId) {
      setUserData(DEFAULT_USER);
      return;
    }

    /* Fetch profile and clan memberships in parallel */
    const [{ data: profile }, { data: memberships }] = await Promise.all([
      supabase
        .from("profiles")
        .select("user_db,username,display_name,default_game_account_id")
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("game_account_clan_memberships")
        .select(
          "clan_id,game_account_id,rank,clans(name,is_unassigned),game_accounts!inner(game_username,approval_status)",
        )
        .eq("is_active", true)
        .eq("clans.is_unassigned", false)
        .eq("game_accounts.user_id", userId),
    ]);

    const options: ClanOption[] = (memberships ?? [])
      .filter((row) => {
        const ga = row.game_accounts as unknown as { game_username: string; approval_status: string } | null;
        return ga?.approval_status === "approved";
      })
      .map((row) => ({
        clanId: row.clan_id as string,
        gameAccountId: row.game_account_id as string,
        clanName: (row.clans as unknown as { name: string } | null)?.name ?? "Clan",
        gameLabel: (row.game_accounts as unknown as { game_username: string } | null)?.game_username ?? "Account",
        rank: (row.rank as string) ?? null,
      }));

    /* Restore previous selection: 1) DB default, 2) localStorage, 3) first option */
    const dbDefaultGameAccountId = (profile?.default_game_account_id as string | null) ?? null;
    const dbDefaultOption = dbDefaultGameAccountId
      ? options.find((o) => o.gameAccountId === dbDefaultGameAccountId)
      : null;

    const storedClanId = window.localStorage.getItem(CLAN_STORAGE_KEY) ?? "";
    const storedGameAccountId = window.localStorage.getItem(GAME_ACCOUNT_STORAGE_KEY) ?? "";
    const storedKey = storedClanId && storedGameAccountId ? `${storedClanId}:${storedGameAccountId}` : "";
    const hasStored = options.some((o) => `${o.clanId}:${o.gameAccountId}` === storedKey);

    let selectedKey = "";
    if (dbDefaultOption) {
      selectedKey = `${dbDefaultOption.clanId}:${dbDefaultOption.gameAccountId}`;
      window.localStorage.setItem(CLAN_STORAGE_KEY, dbDefaultOption.clanId);
      window.localStorage.setItem(GAME_ACCOUNT_STORAGE_KEY, dbDefaultOption.gameAccountId);
    } else if (hasStored) {
      selectedKey = storedKey;
    } else if (options.length > 0) {
      const first = options[0];
      if (first) {
        selectedKey = `${first.clanId}:${first.gameAccountId}`;
        window.localStorage.setItem(CLAN_STORAGE_KEY, first.clanId);
        window.localStorage.setItem(GAME_ACCOUNT_STORAGE_KEY, first.gameAccountId);
      }
    }

    const name = profile?.display_name || profile?.username || profile?.user_db || data.user?.email || "";
    const initials = name ? name.slice(0, 2).toUpperCase() : "U";

    setUserData({
      initials,
      displayLabel: name,
      email: data.user?.email ?? "",
      isAdmin: false, // Will be overridden by hook-driven value
      highestRank: resolveHighestRank(options),
      clanOptions: options,
      selectedKey,
    });
  }, [supabase]);

  useEffect(() => {
    void loadUserData();
    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      void loadUserData();
    });
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [loadUserData, supabase.auth]);

  function handleClanChange(value: string): void {
    const [clanId, gameAccountId] = value.split(":");
    if (clanId && gameAccountId) {
      window.localStorage.setItem(CLAN_STORAGE_KEY, clanId);
      window.localStorage.setItem(GAME_ACCOUNT_STORAGE_KEY, gameAccountId);
      window.dispatchEvent(new Event("clan-context-change"));
      setUserData((prev) => ({ ...prev, selectedKey: value }));
    }
  }

  const clanSelectOptions: readonly SelectOption[] = useMemo(
    () =>
      userData.clanOptions.map((option) => ({
        value: `${option.clanId}:${option.gameAccountId}`,
        label: `${option.clanName} — ${option.gameLabel}${option.rank ? ` (${formatRank(option.rank, locale)})` : ""}`,
      })),
    [userData.clanOptions, locale],
  );

  const roleLabel = formatRole(userRole, locale);
  const rankLabel = userData.highestRank ? formatRank(userData.highestRank, locale) : null;
  /* Show rank + role, e.g. "Officer • Webmaster" or just "Mitglied" */
  const statusLine = rankLabel ? `${rankLabel} \u2022 ${roleLabel}` : roleLabel;

  return (
    <>
      <aside className="sidebar" style={{ width }}>
        {/* Steel panel texture */}
        <Image
          src="/assets/vip/back_left.png"
          alt="Sidebar steel panel texture"
          className="sidebar-texture"
          width={280}
          height={900}
          sizes="280px"
          priority
        />

        {/* Header — clan identity with logo */}
        <div
          className={`sidebar-header${isOpen ? " pt-4 px-3 pb-3" : " collapsed"}`}
          style={{
            flexDirection: "column",
            alignItems: "center",
            gap: isOpen ? 8 : 4,
          }}
        >
          <picture>
            <source srcSet="/assets/ui/chillerkiller_logo.webp" type="image/webp" />
            <img
              src="/assets/ui/chillerkiller_logo.png"
              alt="Chillers & Killers logo"
              width={480}
              height={484}
              style={{ objectFit: "contain", width: isOpen ? 160 : 36, height: isOpen ? 160 : 36, flexShrink: 0 }}
              loading="eager"
            />
          </picture>
          <div className={`sidebar-header-text${isOpen ? "" : " collapsed"}`}>
            <div className="sidebar-title" style={{ fontSize: "1.3rem" }}>
              {t("title")}
            </div>
            <div className="sidebar-subtitle" style={{ fontSize: "0.8rem" }}>
              {t("subtitle")}
            </div>
          </div>
        </div>

        {/* Collapse toggle — at the top, right below the header */}
        <button
          onClick={toggle}
          className="sidebar-toggle"
          style={{ justifyContent: isOpen ? "flex-start" : "center" }}
          aria-label={isOpen ? t("collapse") : t("expand")}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            {isOpen ? <path d="M15 18l-6-6 6-6" /> : <path d="M9 18l6-6-6-6" />}
          </svg>
          <span className={`sidebar-toggle-label${isOpen ? "" : " collapsed"}`} style={{ fontSize: "0.7rem" }}>
            {t("collapse")}
          </span>
        </button>

        {/* Gold scepter divider */}
        <div className="sidebar-divider">
          <Image
            src="/assets/vip/components_decor_7.png"
            alt="Gold scepter divider"
            width={200}
            height={12}
            priority
            style={{ width: isOpen ? "85%" : 38 }}
          />
        </div>

        {/* Navigation */}
        <Suspense fallback={<nav className="nav" />}>
          <SidebarNav />
        </Suspense>

        {/* Bottom: user card + clan selector */}
        <div className="sidebar-bottom">
          <div className="sidebar-bottom-divider mx-auto" style={{ width: isOpen ? "85%" : "60%" }} />

          {/* Clan selector */}
          {clanSelectOptions.length > 0 ? (
            <div className={`sidebar-clan-fade${isOpen ? "" : " collapsed"}`}>
              <div className="sidebar-clan-select">
                <RadixSelect
                  ariaLabel={t("selectClan")}
                  value={userData.selectedKey}
                  onValueChange={handleClanChange}
                  options={clanSelectOptions}
                  triggerClassName="select-trigger sidebar-clan-trigger"
                  contentClassName="select-content sidebar-clan-dropdown"
                />
              </div>
            </div>
          ) : null}

          {/* Language selector (desktop/tablet); compact viewport uses account flyout */}
          {!isCompactViewport ? (
            <div className={`sidebar-lang-slot flex justify-center ${isOpen ? "px-1.5" : "p-0"}`}>
              <LanguageSelector compact={!isOpen} />
            </div>
          ) : null}

          {/* User identity + settings + quick menu */}
          {userData.displayLabel ? (
            <SidebarUserRow
              isOpen={isOpen}
              isCompactViewport={isCompactViewport}
              initials={userData.initials}
              displayLabel={userData.displayLabel}
              email={userData.email}
              statusLine={statusLine}
              isAdmin={isAdmin}
            />
          ) : null}
        </div>
      </aside>

      <main className="content" style={{ marginLeft: width }}>
        {children}
      </main>
    </>
  );
}

/* ── Sidebar user row with settings icon + quick menu ── */

interface SidebarUserRowProps {
  readonly isOpen: boolean;
  readonly isCompactViewport: boolean;
  readonly initials: string;
  readonly displayLabel: string;
  readonly email: string;
  readonly statusLine: string;
  readonly isAdmin: boolean;
}

/** User identity row with settings gear and a clickable popup menu. */
function SidebarUserRow({
  isOpen,
  isCompactViewport,
  initials,
  displayLabel,
  email,
  statusLine,
  isAdmin,
}: SidebarUserRowProps): JSX.Element {
  const pathname = usePathname();
  const tNav = useTranslations("nav");
  const tMenu = useTranslations("userMenu");
  const supabase = useSupabase();
  const [menuOpen, setMenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isSettingsActive = pathname === "/settings";

  /* Close on click outside */
  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(e: MouseEvent): void {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  async function handleSignOut(): Promise<void> {
    await supabase.auth.signOut();
    window.location.href = "/home";
  }

  return (
    <div
      className={`sidebar-user-row${isOpen ? "" : " collapsed"}${isCompactViewport ? " compact-viewport" : ""}`}
      ref={containerRef}
    >
      {/* Clickable user card */}
      <button
        type="button"
        className={`sidebar-user sidebar-user--clickable${isOpen ? "" : " collapsed"}${menuOpen ? " sidebar-user--active" : ""}${isCompactViewport ? " sidebar-user--compact-trigger" : ""}`}
        onClick={() => setMenuOpen((prev) => !prev)}
        aria-expanded={menuOpen}
      >
        <div className="sidebar-avatar-wrap">
          <div className="sidebar-avatar">{initials}</div>
        </div>
        <div className={`sidebar-user-info${isOpen ? "" : " collapsed"}`}>
          <div className="sidebar-user-name">
            {displayLabel}
            {isAdmin && <Image src="/assets/vip/button_vip_crown_22x33.png" alt="Admin" width={12} height={18} />}
          </div>
          <div className="sidebar-user-status">{statusLine}</div>
        </div>
      </button>

      {/* Profile + Settings icon buttons (desktop only) */}
      {!isCompactViewport ? (
        <div className="sidebar-action-btns">
          <Link
            href="/profile"
            className={`sidebar-action-btn${pathname === "/profile" ? " active" : ""}`}
            data-tip={!isOpen ? tMenu("profile") : undefined}
            aria-label={tMenu("profile")}
          >
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
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </Link>
          <Link
            href="/settings"
            className={`sidebar-action-btn${isSettingsActive ? " active" : ""}`}
            data-tip={!isOpen ? tNav("settings") : undefined}
            aria-label={tNav("settings")}
          >
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
              <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </Link>
        </div>
      ) : null}

      {/* Popup menu (opens upward) */}
      {menuOpen && (
        <div className={`sidebar-user-menu${isCompactViewport ? " compact" : ""}`}>
          {displayLabel ? <span className="sidebar-user-menu__label">{displayLabel}</span> : null}
          {email ? <span className="sidebar-user-menu__label">{email}</span> : null}
          {statusLine ? <span className="sidebar-user-menu__label">{statusLine}</span> : null}
          <div className="sidebar-user-menu__divider" />
          <a className="sidebar-user-menu__link" href="/profile" onClick={() => setMenuOpen(false)}>
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="M2.5 14C2.5 11 5 9 8 9C11 9 13.5 11 13.5 14"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            {tMenu("profile")}
          </a>
          <a className="sidebar-user-menu__link" href="/messages" onClick={() => setMenuOpen(false)}>
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" fill="none">
              <rect x="1.5" y="3" width="13" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
              <path d="M1.5 5.5L8 9L14.5 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            {tMenu("messages")}
          </a>
          <a className="sidebar-user-menu__link" href="/settings" onClick={() => setMenuOpen(false)}>
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="M8 1.5V3M8 13V14.5M1.5 8H3M13 8H14.5M3.05 3.05L4.1 4.1M11.9 11.9L12.95 12.95M12.95 3.05L11.9 4.1M4.1 11.9L3.05 12.95"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
              />
            </svg>
            {tMenu("settings")}
          </a>
          {isCompactViewport ? (
            <>
              <div className="sidebar-user-menu__divider" />
              <div className="sidebar-user-menu__lang">
                <LanguageSelector />
              </div>
            </>
          ) : null}
          <div className="sidebar-user-menu__divider" />
          <button className="button" type="button" onClick={handleSignOut}>
            {tMenu("signOut")}
          </button>
        </div>
      )}
    </div>
  );
}

export default SidebarShell;
