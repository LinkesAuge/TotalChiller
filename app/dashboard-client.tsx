"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useSupabase } from "./hooks/use-supabase";
import {
  toDateString,
  getMonday,
  calculateTrend,
  formatCompactNumber,
  formatRelativeTime,
  extractAuthorName,
} from "../lib/dashboard-utils";
import useClanContext from "./components/use-clan-context";
import DataState from "./components/data-state";
import type { ChartSummary } from "./charts/chart-types";

interface ArticleRow {
  readonly id: string;
  readonly title: string;
  readonly content: string;
  readonly type: string;
  readonly is_pinned: boolean;
  readonly status: string;
  readonly tags: readonly string[];
  readonly created_at: string;
  readonly author_name: string | null;
}

interface EventRow {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly location: string | null;
  readonly starts_at: string;
  readonly ends_at: string;
  readonly author_name: string | null;
}

interface DashboardStats {
  readonly personalScore: number;
  readonly clanScore: number;
  readonly totalChests: number;
  readonly activeMembers: number;
  readonly personalTrend: number;
  readonly clanTrend: number;
  readonly chestTrend: number;
  readonly topPlayerName: string;
  readonly topPlayerScore: number;
  readonly topChestType: string;
}

interface ChartsApiResponse {
  readonly summary: ChartSummary;
  readonly personalScore: readonly { readonly totalScore: number }[];
  readonly topPlayers: readonly { readonly player: string; readonly totalScore: number }[];
}

/* ── Constants ── */

const EVENT_COLORS: readonly string[] = ["#c94a3a", "#4a6ea0", "#4a9960", "#c9a34a", "#8a6ea0"];
const EMPTY_STATS: DashboardStats = {
  personalScore: 0,
  clanScore: 0,
  totalChests: 0,
  activeMembers: 0,
  personalTrend: 0,
  clanTrend: 0,
  chestTrend: 0,
  topPlayerName: "—",
  topPlayerScore: 0,
  topChestType: "—",
};

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
  const supabase = useSupabase();
  const clanContext = useClanContext();

  /* ── Announcements state ── */
  const [announcements, setAnnouncements] = useState<readonly ArticleRow[]>([]);
  const [isLoadingAnnouncements, setIsLoadingAnnouncements] = useState<boolean>(true);

  /* ── Events state ── */
  const [events, setEvents] = useState<readonly EventRow[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState<boolean>(true);

  /* ── Stats state ── */
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [isLoadingStats, setIsLoadingStats] = useState<boolean>(true);

  /* ── Date ranges ── */
  const { thisWeekStart, lastWeekStart, lastWeekEnd, todayStr } = useMemo(() => {
    const now = new Date();
    const monday = getMonday(now);
    const prevMonday = new Date(monday);
    prevMonday.setDate(prevMonday.getDate() - 7);
    return {
      thisWeekStart: toDateString(monday),
      lastWeekStart: toDateString(prevMonday),
      lastWeekEnd: toDateString(new Date(monday.getTime() - 86400000)),
      todayStr: toDateString(now),
    };
  }, []);

  /* ── Load announcements (with FK join) ── */
  useEffect(() => {
    async function loadAnnouncements(): Promise<void> {
      if (!clanContext?.clanId) {
        setAnnouncements([]);
        setIsLoadingAnnouncements(false);
        return;
      }
      setIsLoadingAnnouncements(true);
      const { data, error } = await supabase
        .from("articles")
        .select(
          "id,title,content,type,is_pinned,status,tags,created_at,created_by," +
            "author:profiles!articles_created_by_profiles_fkey(display_name,username)",
        )
        .eq("clan_id", clanContext.clanId)
        .eq("status", "published")
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(5);
      setIsLoadingAnnouncements(false);
      if (error) return;
      setAnnouncements(
        ((data ?? []) as unknown as Array<Record<string, unknown>>).map((row) => ({
          ...row,
          author_name: extractAuthorName(row.author as { display_name: string | null; username: string | null } | null),
        })) as ArticleRow[],
      );
    }
    void loadAnnouncements();
  }, [clanContext?.clanId, supabase]);

  /* ── Load events (with FK join) ── */
  useEffect(() => {
    async function loadEvents(): Promise<void> {
      if (!clanContext?.clanId) {
        setEvents([]);
        setIsLoadingEvents(false);
        return;
      }
      setIsLoadingEvents(true);
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("events")
        .select(
          "id,title,description,location,starts_at,ends_at,created_by," +
            "author:profiles!events_created_by_profiles_fkey(display_name,username)",
        )
        .eq("clan_id", clanContext.clanId)
        .gte("ends_at", now)
        .order("starts_at", { ascending: true })
        .limit(5);
      setIsLoadingEvents(false);
      if (error) return;
      setEvents(
        ((data ?? []) as unknown as Array<Record<string, unknown>>).map((row) => ({
          ...row,
          author_name: extractAuthorName(row.author as { display_name: string | null; username: string | null } | null),
        })) as EventRow[],
      );
    }
    void loadEvents();
  }, [clanContext?.clanId, supabase]);

  /* ── Load stats from charts API ── */
  const activeClanId = clanContext?.clanId;

  useEffect(() => {
    async function loadStats(): Promise<void> {
      if (!activeClanId) {
        setStats(EMPTY_STATS);
        setIsLoadingStats(false);
        return;
      }
      setIsLoadingStats(true);
      const fetchCharts = async (dateFrom: string, dateTo: string): Promise<ChartsApiResponse | null> => {
        const params = new URLSearchParams({ clanId: activeClanId, dateFrom, dateTo });
        const res = await fetch(`/api/charts?${params.toString()}`);
        if (!res.ok) return null;
        return (await res.json()) as ChartsApiResponse;
      };
      const [thisWeek, lastWeek, memberResult] = await Promise.all([
        fetchCharts(thisWeekStart, todayStr),
        fetchCharts(lastWeekStart, lastWeekEnd),
        supabase
          .from("game_account_clan_memberships")
          .select("id", { count: "exact", head: true })
          .eq("clan_id", activeClanId)
          .eq("is_active", true),
      ]);
      const tw = thisWeek?.summary ?? {
        totalChests: 0,
        totalScore: 0,
        avgScore: 0,
        topChestType: "—",
        uniquePlayers: 0,
      };
      const lw = lastWeek?.summary ?? {
        totalChests: 0,
        totalScore: 0,
        avgScore: 0,
        topChestType: "—",
        uniquePlayers: 0,
      };
      const personalTotal = (thisWeek?.personalScore ?? []).reduce((sum, p) => sum + p.totalScore, 0);
      const prevPersonalTotal = (lastWeek?.personalScore ?? []).reduce((sum, p) => sum + p.totalScore, 0);
      const topPlayer = thisWeek?.topPlayers?.[0];
      setStats({
        personalScore: personalTotal,
        clanScore: tw.totalScore,
        totalChests: tw.totalChests,
        activeMembers: memberResult.count ?? 0,
        personalTrend: calculateTrend(personalTotal, prevPersonalTotal),
        clanTrend: calculateTrend(tw.totalScore, lw.totalScore),
        chestTrend: calculateTrend(tw.totalChests, lw.totalChests),
        topPlayerName: topPlayer?.player ?? "—",
        topPlayerScore: topPlayer?.totalScore ?? 0,
        topChestType: tw.topChestType,
      });
      setIsLoadingStats(false);
    }
    void loadStats();
  }, [activeClanId, thisWeekStart, todayStr, lastWeekStart, lastWeekEnd, supabase]);

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
                      <div className="flex-1 min-w-0">
                        <div className="text-[0.88rem]">{article.title}</div>
                        <div className="text-[0.68rem] text-text-muted mt-0.5">
                          {formatRelativeTime(article.created_at)}
                          {article.type === "announcement" ? " • " + article.type : ""}
                          {article.author_name && ` • ${article.author_name}`}
                        </div>
                      </div>
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
                return (
                  <div key={event.id} className="flex items-center gap-2 py-1.5 text-sm">
                    <div style={{ background: color, flexShrink: 0 }} className="w-1.5 h-1.5 rounded-full" />
                    <span className="flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
                      {event.title}
                      {event.author_name && (
                        <span className="text-[0.7rem] text-text-muted ml-1">{event.author_name}</span>
                      )}
                    </span>
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
