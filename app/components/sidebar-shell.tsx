"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useSidebar } from "./sidebar-context";
import SidebarNav from "./sidebar-nav";
import LanguageSelector from "./language-selector";
import createSupabaseBrowserClient from "../../lib/supabase/browser-client";
import getIsAdminAccess from "../../lib/supabase/admin-access";

/* ── Rank hierarchy — lower index = higher rank ── */
const RANK_ORDER: readonly string[] = ["leader", "superior", "officer", "veteran", "soldier"];

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
  readonly isAdmin: boolean;
  readonly isOnline: boolean;
  readonly highestRank: string;
  readonly clanOptions: readonly ClanOption[];
  readonly selectedKey: string;
}

const CLAN_STORAGE_KEY = "tc.currentClanId";
const GAME_ACCOUNT_STORAGE_KEY = "tc.currentGameAccountId";

const DEFAULT_USER: SidebarUserData = {
  initials: "",
  displayLabel: "",
  isAdmin: false,
  isOnline: false,
  highestRank: "",
  clanOptions: [],
  selectedKey: "",
};

/**
 * Returns a capitalised label for a rank string.
 */
function formatRank(rank: string): string {
  return rank.charAt(0).toUpperCase() + rank.slice(1);
}

/**
 * Returns the highest rank from a list of clan options using RANK_ORDER.
 */
function resolveHighestRank(options: readonly ClanOption[]): string {
  let bestIndex = RANK_ORDER.length;
  for (const option of options) {
    if (!option.rank) continue;
    const index = RANK_ORDER.indexOf(option.rank);
    if (index !== -1 && index < bestIndex) {
      bestIndex = index;
    }
  }
  return bestIndex < RANK_ORDER.length ? RANK_ORDER[bestIndex] : "";
}

/**
 * The Sanctum sidebar shell — steel-textured, collapsible, with ornate dividers.
 * Renders the sidebar `<aside>` and main `<div>` wrapper that drives margin-left.
 */
function SidebarShell({ children }: { readonly children: React.ReactNode }): JSX.Element {
  const { isOpen, toggle, width } = useSidebar();
  const t = useTranslations("sidebar");
  const [userData, setUserData] = useState<SidebarUserData>(DEFAULT_USER);

  const loadUserData = useCallback(async (): Promise<void> => {
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.auth.getUser();
    const userId = data.user?.id;
    if (!userId) {
      setUserData(DEFAULT_USER);
      return;
    }

    /* Profile + admin status */
    const [{ data: profile }, isAdmin] = await Promise.all([
      supabase.from("profiles").select("user_db,username,display_name").eq("id", userId).maybeSingle(),
      getIsAdminAccess({ supabase }),
    ]);

    /* Clan memberships with rank */
    const { data: memberships } = await supabase
      .from("game_account_clan_memberships")
      .select("clan_id,game_account_id,rank,clans(name,is_unassigned),game_accounts(game_username,approval_status)")
      .eq("is_active", true)
      .eq("clans.is_unassigned", false);

    const options: ClanOption[] =
      (memberships ?? [])
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

    /* Restore previous selection or pick first */
    const storedClanId = window.localStorage.getItem(CLAN_STORAGE_KEY) ?? "";
    const storedGameAccountId = window.localStorage.getItem(GAME_ACCOUNT_STORAGE_KEY) ?? "";
    const storedKey = storedClanId && storedGameAccountId ? `${storedClanId}:${storedGameAccountId}` : "";
    const hasStored = options.some((o) => `${o.clanId}:${o.gameAccountId}` === storedKey);

    let selectedKey = "";
    if (hasStored) {
      selectedKey = storedKey;
    } else if (options.length > 0) {
      const first = options[0];
      selectedKey = `${first.clanId}:${first.gameAccountId}`;
      window.localStorage.setItem(CLAN_STORAGE_KEY, first.clanId);
      window.localStorage.setItem(GAME_ACCOUNT_STORAGE_KEY, first.gameAccountId);
    }

    const name = profile?.display_name || profile?.username || profile?.user_db || data.user?.email || "";
    const initials = name ? name.slice(0, 2).toUpperCase() : "U";

    setUserData({
      initials,
      displayLabel: name,
      isAdmin,
      isOnline: true,
      highestRank: resolveHighestRank(options),
      clanOptions: options,
      selectedKey,
    });
  }, []);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    void loadUserData();
    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      void loadUserData();
    });
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [loadUserData]);

  function handleClanChange(event: React.ChangeEvent<HTMLSelectElement>): void {
    const value = event.target.value;
    const [clanId, gameAccountId] = value.split(":");
    if (clanId && gameAccountId) {
      window.localStorage.setItem(CLAN_STORAGE_KEY, clanId);
      window.localStorage.setItem(GAME_ACCOUNT_STORAGE_KEY, gameAccountId);
      window.dispatchEvent(new Event("clan-context-change"));
      setUserData((prev) => ({ ...prev, selectedKey: value }));
    }
  }

  const roleLabel = userData.isAdmin ? t("admin") : t("member");
  const rankLabel = userData.highestRank ? formatRank(userData.highestRank) : null;
  /* Show rank + role, e.g. "Officer • Admin" or just "Member" */
  const statusLine = rankLabel ? `${rankLabel} \u2022 ${roleLabel}` : roleLabel;

  return (
    <>
      <aside className="sidebar" style={{ width }}>
        {/* Steel panel texture */}
        <img
          src="/assets/vip/back_left.png"
          alt="Sidebar steel panel texture"
          className="sidebar-texture"
          width={236}
          height={900}
          loading="eager"
        />

        {/* Header — clan identity */}
        <div className={`sidebar-header${isOpen ? "" : " collapsed"}`}>
          <img
            src="/assets/ui/components_shield_4.png"
            alt="The Chillers clan shield"
            className="sidebar-logo"
            width={40}
            height={40}
            loading="eager"
          />
          {isOpen && (
            <div style={{ overflow: "hidden" }}>
              <div className="sidebar-title">{t("title")}</div>
              <div className="sidebar-subtitle">{t("subtitle")}</div>
            </div>
          )}
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
            {isOpen ? (
              <path d="M15 18l-6-6 6-6" />
            ) : (
              <path d="M9 18l6-6-6-6" />
            )}
          </svg>
          {isOpen && <span style={{ fontSize: "0.7rem" }}>{t("collapse")}</span>}
        </button>

        {/* Gold scepter divider */}
        <div className="sidebar-divider">
          <img
            src="/assets/vip/components_decor_7.png"
            alt="Gold scepter divider"
            width={200}
            height={12}
            style={{ width: isOpen ? "85%" : 38 }}
          />
        </div>

        {/* Navigation */}
        <Suspense fallback={<nav className="nav" />}>
          <SidebarNav />
        </Suspense>

        {/* Bottom: user card + clan selector */}
        <div className="sidebar-bottom">
          <div
            className="sidebar-bottom-divider"
            style={{ width: isOpen ? "85%" : "60%", margin: "0 auto" }}
          />

          {/* Clan selector */}
          {userData.clanOptions.length > 0 && isOpen ? (
            <div className="sidebar-clan-select">
              <select
                value={userData.selectedKey}
                onChange={handleClanChange}
                aria-label={t("selectClan")}
              >
                {userData.clanOptions.map((option) => (
                  <option
                    key={`${option.clanId}:${option.gameAccountId}`}
                    value={`${option.clanId}:${option.gameAccountId}`}
                  >
                    {option.clanName} — {option.gameLabel}
                    {option.rank ? ` (${formatRank(option.rank)})` : ""}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {/* Language selector */}
          <div style={{ padding: isOpen ? "0 6px" : "0", display: "flex", justifyContent: "center" }}>
            <LanguageSelector compact={!isOpen} />
          </div>

          {/* User identity */}
          {userData.displayLabel ? (
            <div className={`sidebar-user${isOpen ? "" : " collapsed"}`}>
              <div className="sidebar-avatar-wrap">
                <div className="sidebar-avatar">{userData.initials}</div>
                {userData.isOnline && <span className="online-dot" />}
              </div>
              {isOpen && (
                <div style={{ overflow: "hidden", flex: 1, minWidth: 0 }}>
                  <div className="sidebar-user-name">
                    {userData.displayLabel}
                    {userData.isAdmin && (
                      <img
                        src="/assets/vip/button_vip_crown_22x33.png"
                        alt="Admin"
                        style={{ width: 10, height: "auto" }}
                      />
                    )}
                  </div>
                  <div className="sidebar-user-status">
                    <span className="sidebar-online-indicator" />
                    {t("online")} &bull; {statusLine}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </aside>

      <main className="content" style={{ marginLeft: width }}>
        {children}
      </main>
    </>
  );
}

export default SidebarShell;
