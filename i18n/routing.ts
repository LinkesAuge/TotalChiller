import { defineRouting } from "next-intl/routing";

/** Supported locales with German as default. */
export const routing = defineRouting({
  locales: ["de", "en"],
  defaultLocale: "de",
  localePrefix: "never",
});

export type Locale = (typeof routing.locales)[number];

export const LOCALE_COOKIE = "NEXT_LOCALE";
