"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { routing, LOCALE_COOKIE } from "../../i18n/routing";
import type { Locale } from "../../i18n/routing";
import createSupabaseBrowserClient from "../../lib/supabase/browser-client";

interface LanguageSelectorProps {
  /** When true, only show the short locale code (collapsed sidebar). */
  readonly compact?: boolean;
}

const LOCALE_FLAGS: Record<Locale, string> = {
  de: "DE",
  en: "EN",
};

const LOCALE_LABELS: Record<Locale, string> = {
  de: "Deutsch",
  en: "English",
};

/**
 * Reads the current locale from the NEXT_LOCALE cookie.
 */
function readCurrentLocale(): Locale {
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${LOCALE_COOKIE}=`));
  const raw = match?.split("=")[1];
  return raw && routing.locales.includes(raw as Locale)
    ? (raw as Locale)
    : routing.defaultLocale;
}

/**
 * Sets the NEXT_LOCALE cookie and optionally syncs to Supabase user_metadata.
 */
async function setLocale(locale: Locale): Promise<void> {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
  const supabase = createSupabaseBrowserClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) {
    await supabase.auth.updateUser({ data: { language: locale } });
  }
}

/**
 * Language selector dropdown for switching between DE and EN.
 * Sets the NEXT_LOCALE cookie and syncs to Supabase user_metadata if authenticated.
 */
function LanguageSelector({ compact = false }: LanguageSelectorProps): JSX.Element {
  const t = useTranslations("languageSelector");
  const router = useRouter();
  const currentLocale = typeof document !== "undefined" ? readCurrentLocale() : routing.defaultLocale;

  async function handleChange(event: React.ChangeEvent<HTMLSelectElement>): Promise<void> {
    const nextLocale = event.target.value as Locale;
    if (nextLocale === currentLocale) {
      return;
    }
    await setLocale(nextLocale);
    router.refresh();
  }

  if (compact) {
    return (
      <button
        type="button"
        className="sidebar-lang-compact"
        aria-label={t("label")}
        onClick={async () => {
          const nextLocale = currentLocale === "de" ? "en" : "de";
          await setLocale(nextLocale);
          router.refresh();
        }}
      >
        {LOCALE_FLAGS[currentLocale]}
      </button>
    );
  }

  return (
    <div className="language-selector">
      <label htmlFor="language-select" className="sidebar-label" style={{ fontSize: "0.7rem", marginBottom: 2 }}>
        {t("label")}
      </label>
      <select
        id="language-select"
        value={currentLocale}
        onChange={handleChange}
        className="language-selector__select"
      >
        {routing.locales.map((locale) => (
          <option key={locale} value={locale}>
            {LOCALE_LABELS[locale]}
          </option>
        ))}
      </select>
    </div>
  );
}

export default LanguageSelector;
