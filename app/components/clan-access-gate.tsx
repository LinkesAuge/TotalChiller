"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import createSupabaseBrowserClient from "../../lib/supabase/browser-client";
import { LOCALE_COOKIE } from "../../i18n/routing";
import type { Locale } from "../../i18n/routing";
import { routing } from "../../i18n/routing";

interface ClanAccessGateProps {
  readonly children: React.ReactNode;
}

function isPublicPath(pathname: string): boolean {
  return (
    pathname.startsWith("/home") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/about") ||
    pathname.startsWith("/contact") ||
    pathname.startsWith("/privacy-policy") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/not-authorized") ||
    pathname.startsWith("/redesign")
  );
}

/**
 * Hides clan-scoped content until a user belongs to a non-unassigned clan.
 */
function ClanAccessGate({ children }: ClanAccessGateProps): JSX.Element {
  const pathname = usePathname();
  const supabase = createSupabaseBrowserClient();
  const t = useTranslations("clanAccessGate");
  const [hasAccess, setHasAccess] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isActive = true;
    async function loadAccess(): Promise<void> {
      if (isPublicPath(pathname)) {
        if (isActive) {
          setHasAccess(true);
          setIsLoading(false);
        }
        return;
      }
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        if (isActive) {
          setHasAccess(false);
          setIsLoading(false);
        }
        return;
      }
      const { data, error } = await supabase
        .from("game_account_clan_memberships")
        .select("id,clans(is_unassigned)")
        .eq("is_active", true)
        .eq("clans.is_unassigned", false)
        .limit(1);
      if (!isActive) {
        return;
      }
      if (error) {
        setHasAccess(false);
        setIsLoading(false);
        return;
      }
      setHasAccess(Boolean(data && data.length > 0));
      setIsLoading(false);
    }
    void loadAccess();
    /* Sync locale from Supabase user_metadata on login */
    async function syncLocaleFromProfile(): Promise<void> {
      const { data: userData } = await supabase.auth.getUser();
      const storedLang = userData.user?.user_metadata?.language as string | undefined;
      if (storedLang && routing.locales.includes(storedLang as Locale)) {
        const currentCookie = document.cookie
          .split("; ")
          .find((row) => row.startsWith(`${LOCALE_COOKIE}=`))
          ?.split("=")[1];
        if (currentCookie !== storedLang) {
          document.cookie = `${LOCALE_COOKIE}=${storedLang}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
          window.location.reload();
        }
      }
    }
    void syncLocaleFromProfile();
    return () => {
      isActive = false;
    };
  }, [pathname, supabase]);

  if (isPublicPath(pathname)) {
    return <>{children}</>;
  }

  if (isLoading) {
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

  if (!hasAccess) {
    return (
      <div className="content-inner">
        <div className="grid">
          <div className="alert warn col-span-full">{t("noAccessMessage")}</div>
          <div className="col-span-full">
            <a className="button primary" href="/home">
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
