"use client";

import { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useDashboardData } from "./hooks/use-dashboard-data";
import { formatCompactNumber, formatRelativeTime, toDateString } from "../lib/dashboard-utils";
import useClanContext from "./hooks/use-clan-context";
import DataState from "./components/data-state";

/* ── Constants ── */

const EVENT_COLORS: readonly string[] = ["#c94a3a", "#4a6ea0", "#4a9960", "#c9a34a", "#8a6ea0"];

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

/* ── Helpers ── */

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

/* ── Component ── */

/**
 * Dashboard client — announcements, live stats, events, week highlights.
 */
function DashboardClient(): JSX.Element {
  const t = useTranslations("dashboard");
  const clanContext = useClanContext();

  const { announcements, events, stats, isLoadingAnnouncements, isLoadingEvents, isLoadingStats } = useDashboardData({
    clanId: clanContext?.clanId,
  });

  /* ── Tag color helper ── */
  const tagColorMap = useMemo(() => {
    const map = new Map<string, string>();
    const colors: Record<string, string> = {
      Priority: "#c94a3a",
      Priorität: "#c94a3a",
      Info: "#4a6ea0",
      New: "#4a9960",
      Neu: "#4a9960",
      Update: "#c9a34a",
    };
    announcements.forEach((a) => {
      a.tags.forEach((tag) => {
        if (!map.has(tag)) {
          map.set(tag, colors[tag] ?? "#4a6ea0");
        }
      });
    });
    return map;
  }, [announcements]);

  /** Render a trend indicator arrow + percentage. */
  function renderTrend(trend: number): JSX.Element {
    const isUp = trend > 0;
    const isDown = trend < 0;
    const color = isUp ? "var(--color-accent-green)" : isDown ? "var(--color-accent-red)" : "var(--color-text-muted)";
    const arrow = isUp ? "↑" : isDown ? "↓" : "–";
    return (
      <span className="text-[0.65rem] font-medium" style={{ color }}>
        {arrow} {Math.abs(trend)}%
      </span>
    );
  }

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
              emptyNode={<div className="py-4 text-sm text-text-muted">{t("noAnnouncements")}</div>}
            >
              {announcements.map((article, i) => {
                const firstTag = article.tags.length > 0 ? article.tags[0] : null;
                const tagColor = firstTag ? (tagColorMap.get(firstTag) ?? "#4a6ea0") : "#4a6ea0";
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

        {/* ── Quick Stats (live data) ── */}
        <section className="card col-span-2">
          <div className="tooltip-head">
            <Image src="/assets/vip/back_tooltip_2.png" alt="" className="tooltip-head-bg" width={400} height={44} />
            <div className="tooltip-head-inner">
              <Image src="/assets/vip/batler_icons_stat_armor.png" alt="Stats" width={18} height={18} />
              <h3 className="card-title">{t("quickStatsTitle")}</h3>
              <span className="ml-auto" style={{ fontSize: "0.6rem", color: "var(--color-text-muted)" }}>
                {t("quickStatsPeriod")}
              </span>
            </div>
          </div>
          <div className="stat-grid">
            {[
              {
                value: isLoadingStats ? "…" : formatCompactNumber(stats.personalScore),
                label: t("personalScore"),
                icon: "/assets/vip/batler_icons_stat_damage.png",
                trend: stats.personalTrend,
              },
              {
                value: isLoadingStats ? "…" : formatCompactNumber(stats.clanScore),
                label: t("clanScore"),
                icon: "/assets/vip/batler_icons_stat_armor.png",
                trend: stats.clanTrend,
              },
              {
                value: isLoadingStats ? "…" : formatCompactNumber(stats.totalChests),
                label: t("chests"),
                icon: "/assets/vip/icons_chest_2.png",
                trend: stats.chestTrend,
              },
              {
                value: isLoadingStats ? "…" : String(stats.activeMembers),
                label: t("activeMembers"),
                icon: "/assets/vip/batler_icons_stat_heal.png",
                trend: null,
              },
            ].map((stat, i) => (
              <div key={i} className="stat-cell">
                <Image
                  src={stat.icon}
                  alt={stat.label}
                  width={20}
                  height={20}
                  className="my-0 mx-auto mb-1 block object-contain"
                />
                <div className="stat-value">{stat.value}</div>
                <div className="stat-label">{stat.label}</div>
                {stat.trend !== null && <div className="mt-0.5">{renderTrend(stat.trend)}</div>}
              </div>
            ))}
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
              emptyNode={<div className="py-2 text-sm text-text-muted">{t("noEventsScheduled")}</div>}
            >
              {events.map((event, i) => {
                const color = EVENT_COLORS[i % EVENT_COLORS.length];
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

        {/* ── Week Highlights ── */}
        <section className="card">
          <div className="card-header" style={{ alignItems: "center" }}>
            <h3 className="card-title">{t("weekHighlightsTitle")}</h3>
          </div>
          <div className="flex flex-col gap-3.5 p-3.5 px-4">
            {isLoadingStats ? (
              <div className="py-2 text-sm text-text-muted">{t("loading")}</div>
            ) : (
              <>
                {/* Top player */}
                <div>
                  <div className="flex justify-between text-[0.82rem] text-text-2 mb-1">
                    <span>{t("topPlayer")}</span>
                    <span className="font-bold" style={{ color: "#c9a34a" }}>
                      {stats.topPlayerName !== "—"
                        ? `${stats.topPlayerName} (${formatCompactNumber(stats.topPlayerScore)})`
                        : t("noData")}
                    </span>
                  </div>
                  <div className="game-progress">
                    <Image
                      src="/assets/vip/battler_stage_bar_empty.png"
                      alt=""
                      className="game-progress-bg"
                      width={400}
                      height={20}
                    />
                    <div className="game-progress-fill" style={{ width: `${stats.topPlayerScore > 0 ? 100 : 0}%` }}>
                      <Image
                        src="/assets/vip/battler_stage_bar_full.png"
                        alt=""
                        className="game-progress-bg"
                        width={400}
                        height={20}
                      />
                    </div>
                  </div>
                </div>

                {/* Score change vs last week */}
                <div>
                  <div className="flex justify-between text-[0.82rem] text-text-2 mb-1">
                    <span>{t("scoreChange")}</span>
                    <span className="font-bold" style={{ color: stats.clanTrend >= 0 ? "#4a9960" : "#c94a3a" }}>
                      {stats.clanTrend > 0 ? "+" : ""}
                      {stats.clanTrend}% {t("vsLastWeek")}
                    </span>
                  </div>
                  <div className="game-progress">
                    <Image
                      src="/assets/vip/battler_stage_bar_empty.png"
                      alt=""
                      className="game-progress-bg"
                      width={400}
                      height={20}
                    />
                    <div
                      className="game-progress-fill"
                      style={{ width: `${Math.min(100, Math.max(0, 50 + stats.clanTrend / 2))}%` }}
                    >
                      <Image
                        src="/assets/vip/battler_stage_bar_full.png"
                        alt=""
                        className="game-progress-bg"
                        width={400}
                        height={20}
                      />
                    </div>
                  </div>
                </div>

                {/* Top chest type */}
                <div>
                  <div className="flex justify-between text-[0.82rem] text-text-2 mb-1">
                    <span>{t("topChestType")}</span>
                    <span className="font-bold" style={{ color: "#4a6ea0" }}>
                      {stats.topChestType}
                    </span>
                  </div>
                  <div className="game-progress">
                    <Image
                      src="/assets/vip/battler_stage_bar_empty.png"
                      alt=""
                      className="game-progress-bg"
                      width={400}
                      height={20}
                    />
                    <div className="game-progress-fill" style={{ width: `${stats.topChestType !== "—" ? 100 : 0}%` }}>
                      <Image
                        src="/assets/vip/battler_stage_bar_full.png"
                        alt=""
                        className="game-progress-bg"
                        width={400}
                        height={20}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default DashboardClient;
