"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import PageShell from "@/app/components/page-shell";
import DataState from "@/app/components/data-state";
import useClanContext from "@/app/hooks/use-clan-context";
import AnalyticsSubnav from "./analytics-subnav";
import { AreaChart, Area, ResponsiveContainer } from "recharts";

interface OverviewStats {
  readonly members_count: number;
  readonly total_power: number;
  readonly avg_power: number;
  readonly chests_this_week: number;
  readonly chests_last_week: number;
  readonly events_with_results: number;
  readonly top_collector_name: string;
  readonly top_collector_count: number;
  readonly last_event_participation_rate: number;
  readonly chests_daily: readonly { readonly date: string; readonly count: number }[];
  readonly strongest_player_name: string;
  readonly strongest_player_score: number;
  readonly newest_member_name: string;
  readonly newest_member_date: string;
  readonly total_chests_all_time: number;
  readonly power_delta_week: number;
  readonly avg_chests_per_player: number;
  readonly most_active_player_name: string;
  readonly most_active_player_events: number;
}

export default function AnalyticsOverview(): JSX.Element {
  const t = useTranslations("analytics");
  const clanContext = useClanContext();
  const clanId = clanContext?.clanId;
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clanId) {
      setStats(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    async function load(): Promise<void> {
      try {
        const res = await fetch(`/api/analytics/stats?clan_id=${encodeURIComponent(clanId!)}`);
        if (!res.ok) throw new Error(`${res.status}`);
        const json = await res.json();
        if (!cancelled) setStats(json.data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [clanId]);

  const chestsWeekDelta = useMemo(() => {
    if (!stats || stats.chests_last_week === 0) return 0;
    return Math.round(((stats.chests_this_week - stats.chests_last_week) / stats.chests_last_week) * 100);
  }, [stats]);

  return (
    <PageShell
      breadcrumb={t("breadcrumb")}
      title={t("title")}
      heroTitle={t("heroTitle")}
      heroSubtitle={t("heroSubtitle")}
      bannerSrc="/assets/banners/banner_gold_dragon.png"
    >
      <AnalyticsSubnav />

      <DataState
        isLoading={loading}
        error={error}
        isEmpty={!stats}
        loadingNode={<OverviewSkeleton />}
        emptyNode={<div className="py-8 text-sm text-text-muted text-center">{t("noData")}</div>}
      >
        {stats && (
          <>
            {/* Primary stat cards */}
            <div className="analytics-summary-grid">
              <Link href="/analytics/chests" className="analytics-summary-card">
                <div className="analytics-summary-card__icon">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" />
                    <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
                  </svg>
                </div>
                <span className="analytics-summary-card__label">{t("chestsThisWeek")}</span>
                <span className="analytics-summary-card__value">{stats.chests_this_week.toLocaleString()}</span>
                <span className="analytics-summary-card__detail">{t("chestsDetail")}</span>
              </Link>

              <Link href="/analytics/events" className="analytics-summary-card">
                <div className="analytics-summary-card__icon">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className="analytics-summary-card__label">{t("eventsTracked")}</span>
                <span className="analytics-summary-card__value">{stats.events_with_results.toLocaleString()}</span>
                <span className="analytics-summary-card__detail">{t("eventsDetail")}</span>
              </Link>

              <Link href="/analytics/machtpunkte" className="analytics-summary-card">
                <div className="analytics-summary-card__icon">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <span className="analytics-summary-card__label">{t("clanPower")}</span>
                <span className="analytics-summary-card__value">{stats.total_power.toLocaleString()}</span>
                <span className="analytics-summary-card__detail">
                  {t("membersCount", { count: stats.members_count })}
                </span>
              </Link>
            </div>

            {/* Secondary insights row */}
            <div className="analytics-summary-grid">
              <div className="analytics-summary-card">
                <div className="analytics-summary-card__icon">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <span className="analytics-summary-card__label">{t("overviewAvgPower")}</span>
                <span className="analytics-summary-card__value">{stats.avg_power.toLocaleString()}</span>
                <span className="analytics-summary-card__detail">{t("overviewPerPlayer")}</span>
              </div>

              {stats.top_collector_name && (
                <div className="analytics-summary-card">
                  <div className="analytics-summary-card__icon">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </div>
                  <span className="analytics-summary-card__label">{t("overviewTopCollector")}</span>
                  <span className="analytics-summary-card__value">{stats.top_collector_name}</span>
                  <span className="analytics-summary-card__detail">
                    {stats.top_collector_count.toLocaleString()} {t("chests")}
                  </span>
                </div>
              )}

              {stats.last_event_participation_rate > 0 && (
                <div className="analytics-summary-card">
                  <div className="analytics-summary-card__icon">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  </div>
                  <span className="analytics-summary-card__label">{t("overviewParticipation")}</span>
                  <span className="analytics-summary-card__value">{stats.last_event_participation_rate}%</span>
                  <span className="analytics-summary-card__detail">{t("ofMembers")}</span>
                </div>
              )}

              {stats.chests_last_week > 0 && (
                <div className="analytics-summary-card">
                  <div className="analytics-summary-card__icon">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" />
                      <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
                    </svg>
                  </div>
                  <span className="analytics-summary-card__label">{t("overviewChestsWeekCompare")}</span>
                  <span
                    className="analytics-summary-card__value"
                    style={{ color: chestsWeekDelta >= 0 ? "var(--color-accent-green)" : "var(--color-accent-red)" }}
                  >
                    {chestsWeekDelta >= 0 ? "+" : ""}
                    {chestsWeekDelta}%
                  </span>
                  <span className="analytics-summary-card__detail">{t("overviewSinceLastWeek")}</span>
                </div>
              )}
            </div>

            {/* Clan & member insights row */}
            <div className="analytics-summary-grid">
              {stats.strongest_player_name && (
                <div className="analytics-summary-card">
                  <div className="analytics-summary-card__icon">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <span className="analytics-summary-card__label">{t("overviewStrongestPlayer")}</span>
                  <span className="analytics-summary-card__value">{stats.strongest_player_name}</span>
                  <span className="analytics-summary-card__detail">
                    {stats.strongest_player_score.toLocaleString()} {t("powerPoints")}
                  </span>
                </div>
              )}

              <div className="analytics-summary-card">
                <div className="analytics-summary-card__icon">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" />
                    <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
                  </svg>
                </div>
                <span className="analytics-summary-card__label">{t("overviewTotalChestsAllTime")}</span>
                <span className="analytics-summary-card__value">{stats.total_chests_all_time.toLocaleString()}</span>
                <span className="analytics-summary-card__detail">{t("overviewAllTime")}</span>
              </div>

              {stats.power_delta_week !== 0 && (
                <div className="analytics-summary-card">
                  <div className="analytics-summary-card__icon">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                      <polyline points="17 6 23 6 23 12" />
                    </svg>
                  </div>
                  <span className="analytics-summary-card__label">{t("overviewPowerDelta")}</span>
                  <span
                    className="analytics-summary-card__value"
                    style={{
                      color: stats.power_delta_week >= 0 ? "var(--color-accent-green)" : "var(--color-accent-red)",
                    }}
                  >
                    {stats.power_delta_week >= 0 ? "+" : ""}
                    {stats.power_delta_week.toLocaleString()}
                  </span>
                  <span className="analytics-summary-card__detail">{t("overviewSinceLastWeek")}</span>
                </div>
              )}

              {stats.avg_chests_per_player > 0 && (
                <div className="analytics-summary-card">
                  <div className="analytics-summary-card__icon">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 20V10" />
                      <path d="M18 20V4" />
                      <path d="M6 20v-4" />
                    </svg>
                  </div>
                  <span className="analytics-summary-card__label">{t("overviewAvgChestsPerPlayer")}</span>
                  <span className="analytics-summary-card__value">{stats.avg_chests_per_player.toLocaleString()}</span>
                  <span className="analytics-summary-card__detail">{t("overviewThisWeek")}</span>
                </div>
              )}

              {stats.most_active_player_name && (
                <div className="analytics-summary-card">
                  <div className="analytics-summary-card__icon">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <span className="analytics-summary-card__label">{t("overviewMostActivePlayer")}</span>
                  <span className="analytics-summary-card__value">{stats.most_active_player_name}</span>
                  <span className="analytics-summary-card__detail">
                    {stats.most_active_player_events} {t("overviewEventsParticipated")}
                  </span>
                </div>
              )}

              {stats.newest_member_name && (
                <div className="analytics-summary-card">
                  <div className="analytics-summary-card__icon">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                      <circle cx="8.5" cy="7" r="4" />
                      <line x1="20" y1="8" x2="20" y2="14" />
                      <line x1="23" y1="11" x2="17" y2="11" />
                    </svg>
                  </div>
                  <span className="analytics-summary-card__label">{t("overviewNewestMember")}</span>
                  <span className="analytics-summary-card__value">{stats.newest_member_name}</span>
                  <span className="analytics-summary-card__detail">{t("overviewJustJoined")}</span>
                </div>
              )}
            </div>

            {/* Weekly chest activity sparkline */}
            {stats.chests_daily && stats.chests_daily.length > 0 && (
              <div className="analytics-chart-wrapper">
                <h4>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                  </svg>
                  {t("overviewChestsDaily")}
                </h4>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart
                    data={stats.chests_daily as { date: string; count: number }[]}
                    margin={{ top: 4, right: 12, bottom: 4, left: 0 }}
                  >
                    <defs>
                      <linearGradient id="overviewChestGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#c9a34a" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#c9a34a" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#c9a34a"
                      strokeWidth={2}
                      fill="url(#overviewChestGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}
      </DataState>
    </PageShell>
  );
}

function OverviewSkeleton(): JSX.Element {
  return (
    <div className="analytics-summary-grid">
      {[0, 1, 2].map((i) => (
        <div key={i} className="analytics-summary-card" style={{ minHeight: 130 }}>
          <div className="skeleton-line" style={{ width: 36, height: 36, borderRadius: 8 }} />
          <div className="skeleton-line" style={{ width: "40%", height: 12, marginTop: 6 }} />
          <div className="skeleton-line" style={{ width: "60%", height: 28, marginTop: 6 }} />
          <div className="skeleton-line" style={{ width: "70%", height: 12, marginTop: 6 }} />
        </div>
      ))}
    </div>
  );
}
