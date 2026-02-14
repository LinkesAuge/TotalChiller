"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useSupabase } from "../hooks/use-supabase";
import { LOCALE_COOKIE } from "../../i18n/routing";
import type { Locale } from "../../i18n/routing";
import { routing } from "../../i18n/routing";
import { isPublicPath } from "@/lib/public-paths";

/** Admin paths bypass clan checks — access is enforced by the proxy's admin-role gate instead. */
function isClanExemptPath(pathname: string): boolean {
  return isPublicPath(pathname) || pathname.startsWith("/admin");
}

interface ClanAccessGateProps {
  readonly children: React.ReactNode;
}

type AccessState = "loading" | "granted" | "unassigned" | "denied";

/**
 * Hides clan-scoped content until a user belongs to a non-unassigned clan.
 * Distinguishes between "no memberships" and "only in the unassigned holding clan"
 * so the user gets a clear message about what needs to happen.
 */
function ClanAccessGate({ children }: ClanAccessGateProps): JSX.Element {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useSupabase();
  const t = useTranslations("clanAccessGate");
  const [accessState, setAccessState] = useState<AccessState>("loading");
  const localeSynced = useRef(false);

  useEffect(() => {
    let isActive = true;
    async function loadAccess(): Promise<void> {
      if (isClanExemptPath(pathname)) {
        if (isActive) setAccessState("granted");
        return;
      }
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        if (isActive) setAccessState("denied");
        return;
      }
      const userId = userData.user.id;
      const { data, error } = await supabase
        .from("game_account_clan_memberships")
        .select("id,clans(is_unassigned),game_accounts!inner(user_id)")
        .eq("is_active", true)
        .eq("game_accounts.user_id", userId);
      if (!isActive) return;
      if (error || !data) {
        setAccessState("denied");
        return;
      }
      if (data.length === 0) {
        setAccessState("denied");
        return;
      }
      const hasRealClan = data.some((row) => {
        const clan = row.clans as unknown as { is_unassigned: boolean } | null;
        return clan?.is_unassigned === false;
      });
      setAccessState(hasRealClan ? "granted" : "unassigned");
    }
    void loadAccess();
    /* Sync locale from Supabase user_metadata on login (once per session) */
    async function syncLocaleFromProfile(): Promise<void> {
      if (localeSynced.current) return;
      const { data: userData } = await supabase.auth.getUser();
      const storedLang = userData.user?.user_metadata?.language as string | undefined;
      if (storedLang && routing.locales.includes(storedLang as Locale)) {
        const currentCookie = document.cookie
          .split("; ")
          .find((row) => row.startsWith(`${LOCALE_COOKIE}=`))
          ?.split("=")[1];
        if (currentCookie !== storedLang) {
          document.cookie = `${LOCALE_COOKIE}=${storedLang}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
          localeSynced.current = true;
          router.refresh();
          return;
        }
      }
      localeSynced.current = true;
    }
    void syncLocaleFromProfile();
    return () => {
      isActive = false;
    };
  }, [pathname, router, supabase]);

  if (isClanExemptPath(pathname)) {
    return <>{children}</>;
  }

  if (accessState === "loading") {
    return (
      <div className="content-inner">
        <div className="grid">
          <div className="card col-span-full">
            <div className="card-header">
              <h3 className="card-title">{t("loadingTitle")}</h3>
            </div>
            <div className="card-body">
              <div className="text-muted">{t("loadingMessage")}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (accessState === "unassigned") {
    return (
      <div className="content-inner">
        <div className="grid">
          <div className="alert info col-span-full">{t("unassignedMessage")}</div>
          <div className="col-span-full flex gap-3">
            <a className="button primary" href="/profile">
              {t("goProfile")}
            </a>
            <a className="button" href="/home">
              {t("goHome")}
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (accessState === "denied") {
    return (
      <div className="content-inner">
        <div className="grid">
          <div className="alert warn col-span-full">{t("noAccessMessage")}</div>
          <div className="col-span-full flex gap-3">
            <a className="button primary" href="/profile">
              {t("goProfile")}
            </a>
            <a className="button" href="/home">
              {t("goHome")}
            </a>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default ClanAccessGate;
