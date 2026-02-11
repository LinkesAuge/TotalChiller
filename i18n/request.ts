import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { routing, LOCALE_COOKIE } from "./routing";
import type { Locale } from "./routing";

/** Resolves the active locale from the NEXT_LOCALE cookie. */
export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const raw = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale: Locale = raw && routing.locales.includes(raw as Locale) ? (raw as Locale) : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
