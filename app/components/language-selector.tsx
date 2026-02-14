"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { routing, LOCALE_COOKIE } from "../../i18n/routing";
import type { Locale } from "../../i18n/routing";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useSupabase } from "../hooks/use-supabase";

interface LanguageSelectorProps {
  /** When true, only show a single compact button (collapsed sidebar). */
  readonly compact?: boolean;
}

/**
 * Reads the current locale from the NEXT_LOCALE cookie.
 */
function readCurrentLocale(): Locale {
  const match = document.cookie.split("; ").find((row) => row.startsWith(`${LOCALE_COOKIE}=`));
  const raw = match?.split("=")[1];
  return raw && routing.locales.includes(raw as Locale) ? (raw as Locale) : routing.defaultLocale;
}

/**
 * Sets the NEXT_LOCALE cookie and optionally syncs to Supabase user_metadata.
 */
async function setLocale(locale: Locale, supabase: SupabaseClient): Promise<void> {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
  const { data } = await supabase.auth.getUser();
  if (data.user) {
    await supabase.auth.updateUser({ data: { language: locale } });
  }
}

/**
 * DE/EN language toggle for the sidebar.
 * Sets the NEXT_LOCALE cookie and syncs to Supabase user_metadata if authenticated.
 */
function LanguageSelector({ compact = false }: LanguageSelectorProps): JSX.Element {
  const t = useTranslations("languageSelector");
  const router = useRouter();
  const supabase = useSupabase();
  const currentLocale = typeof document !== "undefined" ? readCurrentLocale() : routing.defaultLocale;

  async function handleSwitch(locale: Locale): Promise<void> {
    if (locale === currentLocale) return;
    await setLocale(locale, supabase);
    router.refresh();
  }

  if (compact) {
    return (
      <button
        type="button"
        className="sidebar-lang-compact"
        aria-label={t("label")}
        onClick={() => handleSwitch(currentLocale === "de" ? "en" : "de")}
      >
        {currentLocale.toUpperCase()}
      </button>
    );
  }

  return (
    <div className="lang-toggle" role="radiogroup" aria-label={t("label")}>
      {routing.locales.map((locale) => (
        <button
          key={locale}
          type="button"
          role="radio"
          aria-checked={locale === currentLocale}
          aria-label={t(locale === "de" ? "german" : "english")}
          className={`lang-toggle-btn${locale === currentLocale ? " active" : ""}`}
          onClick={() => handleSwitch(locale)}
        >
          {locale.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

export default LanguageSelector;
