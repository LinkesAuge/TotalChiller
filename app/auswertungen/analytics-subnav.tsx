"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

const SUBNAV_ITEMS = [
  {
    href: "/auswertungen",
    labelKey: "navOverview" as const,
    icon: "M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 0h7v7h-7z",
    exact: true,
  },
  {
    href: "/auswertungen/chests",
    labelKey: "navChests" as const,
    icon: "M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2",
    exact: false,
  },
  {
    href: "/auswertungen/events",
    labelKey: "navEvents" as const,
    icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
    exact: false,
  },
  {
    href: "/auswertungen/machtpunkte",
    labelKey: "navPower" as const,
    icon: "M13 10V3L4 14h7v7l9-11h-7z",
    exact: false,
  },
  {
    href: "/auswertungen/player",
    labelKey: "navPlayer" as const,
    icon: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
    exact: false,
  },
  {
    href: "/auswertungen/daten",
    labelKey: "navData" as const,
    icon: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8",
    exact: false,
  },
] as const;

export default function AnalyticsSubnav(): JSX.Element {
  const pathname = usePathname();
  const t = useTranslations("analytics");

  return (
    <nav className="analytics-subnav" aria-label={t("subnavLabel")}>
      {SUBNAV_ITEMS.map((item) => {
        const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link key={item.href} href={item.href} className={isActive ? "active" : ""}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d={item.icon} />
            </svg>
            <span className="subnav-label">{t(item.labelKey)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
