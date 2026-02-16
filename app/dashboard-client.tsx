"use client";

import { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useDashboardData } from "./hooks/use-dashboard-data";
import { formatRelativeTime, toDateString } from "../lib/dashboard-utils";
import useClanContext from "./hooks/use-clan-context";
import DataState from "./components/data-state";

/* ── Constants ── */

const EVENT_DOT_COLORS: readonly string[] = ["#c94a3a", "#4a6ea0", "#4a9960", "#c9a34a", "#8a6ea0"];

/** Chat bubble icon for "go to thread" buttons. */
function ChatIcon(): JSX.Element {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

/* ── Helpers (defined outside component to avoid re-creation) ── */

/** Returns a countdown string for an event start time. */
function formatCountdown(startsAt: string, tDashboard: ReturnType<typeof useTranslations>): string {
  const now = new Date();
  const start = new Date(startsAt);
  const diffMs = start.getTime() - now.getTime();
  if (diffMs < 0) return tDashboard("today");
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffHours < 1) {
    const diffMins = Math.max(1, Math.floor(diffMs / (1000 * 60)));
    return `${diffMins}m`;
  }
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays === 1) return tDashboard("tomorrow");
  return tDashboard("inDays", { count: diffDays });
}

/** Trend color palette shared between tag colors and event dot colors. */
const CATEGORY_COLORS: Record<string, string> = {
  Priority: "#c94a3a",
  Priorität: "#c94a3a",
  Info: "#4a6ea0",
  New: "#4a9960",
  Neu: "#4a9960",
  Update: "#c9a34a",
};
const DEFAULT_TAG_COLOR = "#4a6ea0";

/* ── Component ── */

/**
 * Dashboard client — announcements, events, and placeholder sections for stats.
 */
function DashboardClient(): JSX.Element {
  const t = useTranslations("dashboard");
  const clanContext = useClanContext();

  const { announcements, events, isLoadingAnnouncements, isLoadingEvents, announcementsError, eventsError } =
    useDashboardData({ clanId: clanContext?.clanId });

  /* ── Tag color helper ── */
  const tagColorMap = useMemo(() => {
    const map = new Map<string, string>();
    announcements.forEach((a) => {
      a.tags.forEach((tag) => {
        if (!map.has(tag)) {
          map.set(tag, CATEGORY_COLORS[tag] ?? DEFAULT_TAG_COLOR);
        }
      });
    });
    return map;
  }, [announcements]);

  return (
    <div className="content-inner">
      <div className="grid">
        {/* ── Announcements (real data with FK join) ── */}
        <section className="card col-span-2">
          <div className="tooltip-head">
            <Image src="/assets/vip/back_tooltip_2.png" alt="" className="tooltip-head-bg" width={400} height={44} />
            <div className="tooltip-head-inner">
              <Image src="/assets/vip/batler_icons_stat_damage.png" alt="Announcements" width={18} height={18} />
              <h3 className="card-title">{t("announcementsTitle")}</h3>
              <Link href="/news" className="ml-auto text-[0.65rem] text-gold no-underline">
                {t("viewAll")} →
              </Link>
            </div>
          </div>
          <div className="card-body">
            <DataState
              isLoading={isLoadingAnnouncements}
              isEmpty={announcements.length === 0}
              loadingNode={<div className="py-4 text-sm text-text-muted">{t("loading")}</div>}
              emptyNode={
                announcementsError ? (
                  <div className="py-4 text-sm text-red-500">{announcementsError}</div>
                ) : (
                  <div className="py-4 text-sm text-text-muted">{t("noAnnouncements")}</div>
                )
              }
            >
              {announcements.map((article, i) => {
                const firstTag = article.tags.length > 0 ? article.tags[0] : null;
                const tagColor = firstTag ? (tagColorMap.get(firstTag) ?? DEFAULT_TAG_COLOR) : DEFAULT_TAG_COLOR;
                return (
                  <div key={article.id}>
                    {i > 0 && <div className="gold-divider" />}
                    <div className="flex items-start gap-2.5 py-2.5">
                      <Image
                        src={
                          article.is_pinned
                            ? "/assets/vip/batler_icons_star_5.png"
                            : "/assets/vip/batler_icons_star_4.png"
                        }
                        alt={article.is_pinned ? t("pinnedLabel") : ""}
                        width={14}
                        height={14}
                        sizes="14px"
                        className="mt-0.5"
                      />
                      <Link href={`/news?article=${article.id}`} className="flex-1 min-w-0 dashboard-item-link">
                        <div className="text-[0.88rem]">{article.title}</div>
                        <div className="text-[0.68rem] text-text-muted mt-0.5">
                          {formatRelativeTime(article.created_at)}
                          {article.author_name && ` • ${article.author_name}`}
                        </div>
                      </Link>
                      {article.forum_post_id && (
                        <Link
                          href={`/forum?post=${article.forum_post_id}`}
                          className="dashboard-thread-btn shrink-0"
                          title={t("goToThread")}
                          aria-label={t("goToThread")}
                        >
                          <ChatIcon />
                        </Link>
                      )}
                      {firstTag && (
                        <span
                          className="badge py-0.5 px-2 shrink-0"
                          style={{
                            background: `linear-gradient(180deg, ${tagColor}, ${tagColor}cc)`,
                            borderColor: tagColor,
                            color: "#fff",
                          }}
                        >
                          {firstTag}
                        </span>
                      )}
                      {article.is_pinned && !firstTag && <span className="pin-badge">{t("pinnedLabel")}</span>}
                    </div>
                  </div>
                );
              })}
            </DataState>
          </div>
        </section>

        {/* ── Quick Stats — placeholder ── */}
        <section className="card col-span-2">
          <div className="tooltip-head">
            <Image src="/assets/vip/back_tooltip_2.png" alt="" className="tooltip-head-bg" width={400} height={44} />
            <div className="tooltip-head-inner">
              <Image src="/assets/vip/batler_icons_stat_armor.png" alt="Stats" width={18} height={18} />
              <h3 className="card-title">{t("quickStatsTitle")}</h3>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center gap-2 py-10 px-4">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-text-muted)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18 20V10M12 20V4M6 20v-6" />
            </svg>
            <p className="text-sm text-text-muted text-center m-0">{t("statsComingSoon")}</p>
          </div>
        </section>

        {/* ── Events (real data with FK join) ── */}
        <section className="card">
          <Image
            src="/assets/banners/banner_ragnarok_clan_event_708x123.png"
            alt="Upcoming clan events banner"
            width={708}
            height={123}
            className="w-full h-14 object-cover opacity-70"
          />
          <div className="py-2.5 px-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="card-title m-0">{t("eventsTitle")}</h3>
              <Link href="/events" className="text-[0.65rem] text-gold no-underline">
                {t("viewAll")} →
              </Link>
            </div>
            <DataState
              isLoading={isLoadingEvents}
              isEmpty={events.length === 0}
              loadingNode={<div className="py-2 text-sm text-text-muted">{t("loading")}</div>}
              emptyNode={
                eventsError ? (
                  <div className="py-2 text-sm text-red-500">{eventsError}</div>
                ) : (
                  <div className="py-2 text-sm text-text-muted">{t("noEventsScheduled")}</div>
                )
              }
            >
              {events.map((event, i) => {
                const color = EVENT_DOT_COLORS[i % EVENT_DOT_COLORS.length];
                const dateKey = toDateString(new Date(event.starts_at));
                return (
                  <div key={event.id} className="flex items-center gap-2 py-1.5 text-sm">
                    <div style={{ background: color, flexShrink: 0 }} className="w-1.5 h-1.5 rounded-full" />
                    <Link
                      href={`/events?date=${dateKey}&event=${event.id}`}
                      className="flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap dashboard-item-link"
                    >
                      {event.title}
                      {event.author_name && (
                        <span className="text-[0.7rem] text-text-muted ml-1">{event.author_name}</span>
                      )}
                    </Link>
                    {event.forum_post_id && (
                      <Link
                        href={`/forum?post=${event.forum_post_id}`}
                        className="dashboard-thread-btn shrink-0"
                        title={t("goToThread")}
                        aria-label={t("goToThread")}
                      >
                        <ChatIcon />
                      </Link>
                    )}
                    <span
                      className="countdown-badge"
                      style={{
                        background: `${color}22`,
                        border: `1px solid ${color}44`,
                        color,
                        flexShrink: 0,
                      }}
                    >
                      {formatCountdown(event.starts_at, t)}
                    </span>
                  </div>
                );
              })}
            </DataState>
          </div>
        </section>

        {/* ── Week Highlights — placeholder ── */}
        <section className="card">
          <div className="card-header" style={{ alignItems: "center" }}>
            <h3 className="card-title">{t("weekHighlightsTitle")}</h3>
          </div>
          <div className="flex flex-col items-center justify-center gap-2 py-10 px-4">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-text-muted)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2z" />
            </svg>
            <p className="text-sm text-text-muted text-center m-0">{t("statsComingSoon")}</p>
          </div>
        </section>
      </div>
    </div>
  );
}

export default DashboardClient;
