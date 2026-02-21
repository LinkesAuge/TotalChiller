"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import PageShell from "@/app/components/page-shell";
import DataState from "@/app/components/data-state";
import useClanContext from "@/app/hooks/use-clan-context";
import AnalyticsSubnav from "../analytics-subnav";
import { TIMEZONE } from "@/lib/timezone";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

/* ── Types ── */

interface EventListItem {
  readonly linked_event_id: string;
  readonly event_name: string;
  readonly event_date: string;
  readonly starts_at: string | null;
  readonly ends_at: string | null;
  readonly participant_count: number;
  readonly total_points: number;
}

interface EventMeta {
  readonly id: string;
  readonly title: string;
  readonly description: string | null;
  readonly starts_at: string | null;
  readonly ends_at: string | null;
}

interface RankingEntry {
  readonly rank: number;
  readonly player_name: string;
  readonly event_points: number;
  readonly game_account_id: string;
}

interface ParticipationTrendEntry {
  readonly event_name: string;
  readonly date: string;
  readonly participants: number;
  readonly avg_points: number;
}

interface BestPerformer {
  readonly player_name: string;
  readonly game_account_id: string | null;
  readonly avg_points: number;
  readonly event_count: number;
  readonly total_points: number;
}

interface HighestSingleScore {
  readonly player_name: string;
  readonly event_name: string;
  readonly event_points: number;
}

interface EventListResponse {
  readonly events: EventListItem[];
  readonly participation_trend: ParticipationTrendEntry[];
  readonly total: number;
  readonly page: number;
  readonly page_size: number;
  readonly latest_event_ranking: RankingEntry[];
  readonly latest_event_name: string;
  readonly latest_event_date: string;
  readonly latest_event_starts_at: string;
  readonly latest_event_ends_at: string;
  readonly best_performers: BestPerformer[];
  readonly highest_single_score: HighestSingleScore;
}

interface EventDetailResponse {
  readonly event_meta: EventMeta | null;
  readonly event_name: string;
  readonly rankings: RankingEntry[];
  readonly total: number;
  readonly page: number;
  readonly page_size: number;
}

/* ── Chart theme ── */

const CHART_BAR_COLOR = "#c9a34a";
const CHART_GRID_COLOR = "rgba(240, 200, 60, 0.1)";
const CHART_AXIS_COLOR = "#b8a888";
const CHART_TOOLTIP_BG = "rgba(10, 20, 32, 0.95)";
const CHART_TOOLTIP_BORDER = "rgba(240, 200, 60, 0.3)";
const CHART_TOP_N = 20;

/* ── Custom tooltip ── */

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}): JSX.Element | null {
  if (!active || !payload?.length) return null;
  const first = payload[0];
  if (!first) return null;
  return (
    <div
      style={{
        background: CHART_TOOLTIP_BG,
        border: `1px solid ${CHART_TOOLTIP_BORDER}`,
        borderRadius: 6,
        padding: "8px 12px",
        fontSize: "0.82rem",
        color: "#e8dcc8",
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 2 }}>{label}</div>
      <div style={{ color: CHART_BAR_COLOR }}>{first.value.toLocaleString()} pts</div>
    </div>
  );
}

/* ── Main component ── */

export default function EventsAnalytics(): JSX.Element {
  const t = useTranslations("analytics");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const clanContext = useClanContext();
  const clanId = clanContext?.clanId;

  const selectedEventId = searchParams.get("event");

  /* ── List state ── */
  const [listData, setListData] = useState<EventListResponse | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  /* ── Detail state ── */
  const [detailData, setDetailData] = useState<EventDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  /* ── Fetch event list ── */
  useEffect(() => {
    if (!clanId || selectedEventId) {
      if (!selectedEventId) setListLoading(false);
      return;
    }
    let cancelled = false;
    setListLoading(true);
    setListError(null);

    async function load(): Promise<void> {
      try {
        const url = `/api/analytics/events?clan_id=${encodeURIComponent(clanId!)}&page=1&page_size=10000`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`${res.status}`);
        const json = await res.json();
        if (!cancelled) setListData(json.data as EventListResponse);
      } catch (err) {
        if (!cancelled) setListError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        if (!cancelled) setListLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [clanId, selectedEventId]);

  /* ── Fetch event detail ── */
  useEffect(() => {
    if (!clanId || !selectedEventId) {
      setDetailData(null);
      setDetailLoading(false);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    setDetailError(null);

    async function load(): Promise<void> {
      try {
        const url = `/api/analytics/events?clan_id=${encodeURIComponent(clanId!)}&event_id=${encodeURIComponent(selectedEventId!)}&page=1&page_size=10000`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`${res.status}`);
        const json = await res.json();
        if (!cancelled) setDetailData(json.data as EventDetailResponse);
      } catch (err) {
        if (!cancelled) setDetailError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [clanId, selectedEventId]);

  /* ── Navigation ── */

  const handleSelectEvent = useCallback(
    (eventId: string) => {
      router.push(`/analytics/events?event=${encodeURIComponent(eventId)}`);
    },
    [router],
  );

  const handleBackToList = useCallback(() => {
    router.push("/analytics/events");
  }, [router]);

  /* ── Rank badge class ── */
  function rankClass(rank: number): string {
    if (rank === 1) return "rank-position top-1";
    if (rank === 2) return "rank-position top-2";
    if (rank === 3) return "rank-position top-3";
    return "rank-position";
  }

  /* ── Chart data (top N from first page) ── */
  const chartData =
    detailData?.rankings.slice(0, CHART_TOP_N).map((r) => ({
      name: r.player_name,
      points: r.event_points,
    })) ?? [];

  /* ── Format date / date range ── */
  const localeTag = locale === "de" ? "de-DE" : "en-GB";

  function formatDate(iso: string): string {
    try {
      return new Date(iso).toLocaleDateString(localeTag, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: TIMEZONE,
      });
    } catch {
      return iso;
    }
  }

  function formatDateRangeShort(startsAt: string | null, endsAt: string | null, fallbackDate?: string): string {
    const start = startsAt || fallbackDate;
    if (!start) return "—";
    const startStr = formatDate(start);
    if (!endsAt) return startStr;
    const endStr = formatDate(endsAt);
    if (startStr === endStr) return startStr;
    return `${startStr} – ${endStr}`;
  }

  /* ── Computed stats ── */
  const totalParticipants = detailData?.total ?? 0;
  const totalPoints = detailData?.rankings.reduce((sum, r) => sum + r.event_points, 0) ?? 0;
  const topScorer = detailData?.rankings[0];

  /* ── List summary stats ── */
  const listTotalEvents = listData?.total ?? 0;
  const listTotalParticipants = listData?.events.reduce((sum, e) => sum + e.participant_count, 0) ?? 0;
  const listTotalPoints = listData?.events.reduce((sum, e) => sum + e.total_points, 0) ?? 0;
  const avgParticipants = listTotalEvents > 0 ? Math.round(listTotalParticipants / listTotalEvents) : 0;
  const avgPointsPerEvent = listTotalEvents > 0 ? Math.round(listTotalPoints / listTotalEvents) : 0;

  /* ── Render ── */

  return (
    <PageShell
      breadcrumb={t("breadcrumb")}
      title={t("eventsTitle")}
      heroTitle={t("heroTitle")}
      heroSubtitle={t("heroSubtitle")}
      bannerSrc="/assets/banners/banner_gold_dragon.png"
    >
      <AnalyticsSubnav />

      {selectedEventId ? (
        /* ────────── Event Detail View ────────── */
        <DataState
          isLoading={detailLoading}
          error={detailError}
          isEmpty={!detailData || detailData.rankings.length === 0}
          emptyMessage={t("noEventResults")}
        >
          {detailData && (
            <>
              {/* Header */}
              <div className="event-detail-header">
                <button type="button" className="back-link" onClick={handleBackToList}>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                  </svg>
                  {t("backToList")}
                </button>
                <h3>{detailData.event_name}</h3>
              </div>

              {/* Meta stats */}
              <div className="event-detail-meta">
                <div className="event-detail-stat">
                  <span className="event-detail-stat__label">{t("participantsColumn")}</span>
                  <span className="event-detail-stat__value">{totalParticipants.toLocaleString()}</span>
                </div>
                <div className="event-detail-stat">
                  <span className="event-detail-stat__label">{t("totalPointsColumn")}</span>
                  <span className="event-detail-stat__value">{totalPoints.toLocaleString()}</span>
                </div>
                {topScorer && (
                  <div className="event-detail-stat">
                    <span className="event-detail-stat__label">{t("topScorer")}</span>
                    <span className="event-detail-stat__value">{topScorer.player_name}</span>
                  </div>
                )}
                {detailData.event_meta?.starts_at && (
                  <div className="event-detail-stat">
                    <span className="event-detail-stat__label">{t("eventDateColumn")}</span>
                    <span className="event-detail-stat__value">
                      {formatDateRangeShort(detailData.event_meta.starts_at, detailData.event_meta.ends_at)}
                    </span>
                  </div>
                )}
              </div>

              {/* Bar chart */}
              {chartData.length > 0 && (
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
                      <rect x="3" y="12" width="4" height="9" rx="1" />
                      <rect x="10" y="7" width="4" height="14" rx="1" />
                      <rect x="17" y="3" width="4" height="18" rx="1" />
                    </svg>
                    {t("chartEventPoints")}
                  </h4>
                  <ResponsiveContainer width="100%" height={Math.max(300, chartData.length * 36)}>
                    <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 30, bottom: 4, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR} horizontal={false} />
                      <XAxis
                        type="number"
                        tick={{ fill: CHART_AXIS_COLOR, fontSize: 12 }}
                        axisLine={{ stroke: CHART_GRID_COLOR }}
                        tickLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={120}
                        tick={{ fill: CHART_AXIS_COLOR, fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(240, 200, 60, 0.06)" }} />
                      <Bar dataKey="points" fill={CHART_BAR_COLOR} radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Ranking table */}
              <div className="analytics-table-section">
                <div className="analytics-table-section__header">
                  <h4 className="analytics-table-section__title">
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
                    {t("rankingTitle")}
                  </h4>
                  <span className="analytics-table-section__count">
                    {detailData.total.toLocaleString()} {t("participantsColumn")}
                  </span>
                </div>

                <section className="table event-ranking">
                  <header>
                    <span>{t("rankColumn")}</span>
                    <span>{t("playerColumn")}</span>
                    <span>{t("pointsColumn")}</span>
                  </header>
                  {detailData.rankings.map((entry, idx) => (
                    <div className="row" key={entry.game_account_id ?? `unknown-${idx}`}>
                      <span>
                        <span className={rankClass(entry.rank)}>{entry.rank}</span>
                      </span>
                      <span>
                        <Link
                          href={`/analytics/player?name=${encodeURIComponent(entry.player_name)}${entry.game_account_id ? `&ga=${encodeURIComponent(entry.game_account_id)}` : ""}`}
                          className="player-link"
                        >
                          {entry.player_name}
                        </Link>
                      </span>
                      <span>{entry.event_points.toLocaleString()}</span>
                    </div>
                  ))}
                </section>
              </div>
            </>
          )}
        </DataState>
      ) : (
        /* ────────── Event List View ────────── */
        <DataState
          isLoading={listLoading}
          error={listError}
          isEmpty={!listData || listData.events.length === 0}
          emptyMessage={t("noEventData")}
        >
          {listData && (
            <>
              {/* Summary stats */}
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
                      <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <span className="analytics-summary-card__label">{t("totalEvents")}</span>
                  <span className="analytics-summary-card__value">{listTotalEvents.toLocaleString()}</span>
                  <span className="analytics-summary-card__detail">{t("eventsWithResults")}</span>
                </div>

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
                  <span className="analytics-summary-card__label">{t("totalParticipants")}</span>
                  <span className="analytics-summary-card__value">{listTotalParticipants.toLocaleString()}</span>
                  <span className="analytics-summary-card__detail">{t("acrossAllEvents")}</span>
                </div>

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
                  <span className="analytics-summary-card__label">{t("totalPointsColumn")}</span>
                  <span className="analytics-summary-card__value">{listTotalPoints.toLocaleString()}</span>
                  <span className="analytics-summary-card__detail">{t("pointsEarned")}</span>
                </div>

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
                  <span className="analytics-summary-card__label">{t("avgParticipants")}</span>
                  <span className="analytics-summary-card__value">{avgParticipants.toLocaleString()}</span>
                  <span className="analytics-summary-card__detail">{t("perEvent")}</span>
                </div>

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
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                    </svg>
                  </div>
                  <span className="analytics-summary-card__label">{t("avgPointsPerEvent")}</span>
                  <span className="analytics-summary-card__value">{avgPointsPerEvent.toLocaleString()}</span>
                  <span className="analytics-summary-card__detail">{t("perEvent")}</span>
                </div>
              </div>

              {/* ── Latest event: ranking + bar chart side by side ── */}
              {listData.latest_event_ranking &&
                listData.latest_event_ranking.length > 0 &&
                (() => {
                  const latestBarData = listData.latest_event_ranking.slice(0, 15).map((r) => ({
                    name: r.player_name,
                    points: r.event_points,
                  }));
                  return (
                    <div className="analytics-split-layout">
                      <div className="analytics-table-section">
                        <div className="analytics-table-section__header">
                          <h4 className="analytics-table-section__title">
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
                            {t("latestEventRanking")} — {listData.latest_event_name}
                          </h4>
                          <span className="analytics-table-section__count">
                            {formatDateRangeShort(
                              listData.latest_event_starts_at,
                              listData.latest_event_ends_at,
                              listData.latest_event_date,
                            )}
                          </span>
                        </div>

                        <section className="table event-ranking">
                          <header>
                            <span>{t("rankColumn")}</span>
                            <span>{t("playerColumn")}</span>
                            <span>{t("pointsColumn")}</span>
                          </header>
                          {listData.latest_event_ranking.map((entry, idx) => (
                            <div className="row" key={entry.game_account_id ?? `lr-${idx}`}>
                              <span>
                                <span className={rankClass(entry.rank)}>{entry.rank}</span>
                              </span>
                              <span>
                                <Link
                                  href={`/analytics/player?name=${encodeURIComponent(entry.player_name)}${entry.game_account_id ? `&ga=${encodeURIComponent(entry.game_account_id)}` : ""}`}
                                  className="player-link"
                                >
                                  {entry.player_name}
                                </Link>
                              </span>
                              <span>{entry.event_points.toLocaleString()}</span>
                            </div>
                          ))}
                        </section>
                      </div>

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
                            <rect x="3" y="12" width="4" height="9" rx="1" />
                            <rect x="10" y="7" width="4" height="14" rx="1" />
                            <rect x="17" y="3" width="4" height="18" rx="1" />
                          </svg>
                          {t("chartLatestEventPoints")}
                        </h4>
                        <ResponsiveContainer width="100%" height={Math.max(280, latestBarData.length * 28)}>
                          <BarChart
                            data={latestBarData}
                            layout="vertical"
                            margin={{ top: 4, right: 20, bottom: 4, left: 10 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR} horizontal={false} />
                            <XAxis
                              type="number"
                              tick={{ fill: CHART_AXIS_COLOR, fontSize: 11 }}
                              axisLine={{ stroke: CHART_GRID_COLOR }}
                              tickLine={false}
                            />
                            <YAxis
                              type="category"
                              dataKey="name"
                              width={100}
                              tick={{ fill: CHART_AXIS_COLOR, fontSize: 10 }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(240, 200, 60, 0.06)" }} />
                            <Bar dataKey="points" fill={CHART_BAR_COLOR} radius={[0, 4, 4, 0]} barSize={18} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  );
                })()}

              {/* ── Best performers: table + total points bar chart ── */}
              {listData.best_performers &&
                listData.best_performers.length > 0 &&
                (() => {
                  const perfBarData = listData.best_performers.slice(0, 10).map((p) => ({
                    name: p.player_name,
                    avg: p.avg_points,
                  }));
                  return (
                    <div className="analytics-split-layout">
                      <div className="analytics-table-section">
                        <div className="analytics-table-section__header">
                          <h4 className="analytics-table-section__title">
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
                            {t("bestPerformers")}
                          </h4>
                          {listData.highest_single_score && listData.highest_single_score.event_points > 0 && (
                            <span className="analytics-table-section__count">
                              {t("highestSingleScore")}: {listData.highest_single_score.player_name} (
                              {listData.highest_single_score.event_points.toLocaleString()} —{" "}
                              {listData.highest_single_score.event_name})
                            </span>
                          )}
                        </div>

                        <section className="table best-performers">
                          <header>
                            <span>{t("playerColumn")}</span>
                            <span>{t("avgPointsPerEvent")}</span>
                            <span>{t("totalEvents")}</span>
                            <span>{t("totalPointsColumn")}</span>
                          </header>
                          {listData.best_performers.map((p, idx) => (
                            <div className="row" key={p.game_account_id ?? `bp-${idx}`}>
                              <span>
                                <Link
                                  href={`/analytics/player?name=${encodeURIComponent(p.player_name)}${p.game_account_id ? `&ga=${encodeURIComponent(p.game_account_id)}` : ""}`}
                                  className="player-link"
                                >
                                  {p.player_name}
                                </Link>
                              </span>
                              <span>{p.avg_points.toLocaleString()}</span>
                              <span>{p.event_count}</span>
                              <span>{p.total_points.toLocaleString()}</span>
                            </div>
                          ))}
                        </section>
                      </div>

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
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                          </svg>
                          {t("chartTopPerformers")}
                        </h4>
                        <ResponsiveContainer width="100%" height={Math.max(280, perfBarData.length * 32)}>
                          <BarChart
                            data={perfBarData}
                            layout="vertical"
                            margin={{ top: 4, right: 20, bottom: 4, left: 10 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR} horizontal={false} />
                            <XAxis
                              type="number"
                              tick={{ fill: CHART_AXIS_COLOR, fontSize: 11 }}
                              axisLine={{ stroke: CHART_GRID_COLOR }}
                              tickLine={false}
                            />
                            <YAxis
                              type="category"
                              dataKey="name"
                              width={100}
                              tick={{ fill: CHART_AXIS_COLOR, fontSize: 10 }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: CHART_TOOLTIP_BG,
                                border: `1px solid ${CHART_TOOLTIP_BORDER}`,
                                borderRadius: 6,
                                color: "#e8dcc8",
                                fontSize: "0.82rem",
                                padding: "8px 12px",
                              }}
                            />
                            <Bar
                              dataKey="avg"
                              fill={CHART_BAR_COLOR}
                              radius={[0, 4, 4, 0]}
                              barSize={18}
                              name={t("avgPointsPerEvent")}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  );
                })()}

              {/* ── Participation trend + Avg points charts ── */}
              {listData.participation_trend && listData.participation_trend.length > 1 && (
                <div className="analytics-charts-row">
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
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                      </svg>
                      {t("chartParticipationTrend")}
                    </h4>
                    <ResponsiveContainer width="100%" height={260}>
                      <AreaChart data={listData.participation_trend} margin={{ top: 4, right: 12, bottom: 4, left: 0 }}>
                        <defs>
                          <linearGradient id="partGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#4a6ea0" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#4a6ea0" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(240, 200, 60, 0.1)" />
                        <XAxis
                          dataKey="date"
                          tick={{ fill: "#b8a888", fontSize: 11 }}
                          axisLine={{ stroke: "rgba(240, 200, 60, 0.1)" }}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fill: "#b8a888", fontSize: 11 }}
                          axisLine={{ stroke: "rgba(240, 200, 60, 0.1)" }}
                          tickLine={false}
                          allowDecimals={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "rgba(10, 20, 32, 0.95)",
                            border: "1px solid rgba(240, 200, 60, 0.3)",
                            borderRadius: 6,
                            color: "#e8dcc8",
                            fontSize: "0.82rem",
                            padding: "8px 12px",
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="participants"
                          stroke="#4a6ea0"
                          strokeWidth={2}
                          fill="url(#partGrad)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
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
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                      {t("avgPointsPerEvent")}
                    </h4>
                    <ResponsiveContainer width="100%" height={260}>
                      <AreaChart data={listData.participation_trend} margin={{ top: 4, right: 12, bottom: 4, left: 0 }}>
                        <defs>
                          <linearGradient id="avgPtsGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#c9a34a" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#c9a34a" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(240, 200, 60, 0.1)" />
                        <XAxis
                          dataKey="date"
                          tick={{ fill: "#b8a888", fontSize: 11 }}
                          axisLine={{ stroke: "rgba(240, 200, 60, 0.1)" }}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fill: "#b8a888", fontSize: 11 }}
                          axisLine={{ stroke: "rgba(240, 200, 60, 0.1)" }}
                          tickLine={false}
                          tickFormatter={(v: number) => v.toLocaleString()}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "rgba(10, 20, 32, 0.95)",
                            border: "1px solid rgba(240, 200, 60, 0.3)",
                            borderRadius: 6,
                            color: "#e8dcc8",
                            fontSize: "0.82rem",
                            padding: "8px 12px",
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="avg_points"
                          stroke="#c9a34a"
                          strokeWidth={2}
                          fill="url(#avgPtsGrad)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* ── Event size comparison chart ── */}
              {listData.events &&
                listData.events.length > 1 &&
                (() => {
                  const eventSizeData = listData.events.slice(0, 15).map((e) => ({
                    name: e.event_name.length > 16 ? e.event_name.slice(0, 16) + "…" : e.event_name,
                    participants: e.participant_count,
                    points: e.total_points,
                  }));
                  return (
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
                          <path d="M12 20V10" />
                          <path d="M18 20V4" />
                          <path d="M6 20v-4" />
                        </svg>
                        {t("chartEventComparison")}
                      </h4>
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={eventSizeData} margin={{ top: 4, right: 12, bottom: 4, left: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(240, 200, 60, 0.1)" />
                          <XAxis
                            dataKey="name"
                            tick={{ fill: "#b8a888", fontSize: 10 }}
                            axisLine={{ stroke: "rgba(240, 200, 60, 0.1)" }}
                            tickLine={false}
                            interval={0}
                            angle={-30}
                            textAnchor="end"
                            height={60}
                          />
                          <YAxis
                            yAxisId="left"
                            tick={{ fill: "#b8a888", fontSize: 11 }}
                            axisLine={{ stroke: "rgba(240, 200, 60, 0.1)" }}
                            tickLine={false}
                            allowDecimals={false}
                          />
                          <YAxis
                            yAxisId="right"
                            orientation="right"
                            tick={{ fill: "#b8a888", fontSize: 11 }}
                            axisLine={{ stroke: "rgba(240, 200, 60, 0.1)" }}
                            tickLine={false}
                            tickFormatter={(v: number) => v.toLocaleString()}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "rgba(10, 20, 32, 0.95)",
                              border: "1px solid rgba(240, 200, 60, 0.3)",
                              borderRadius: 6,
                              color: "#e8dcc8",
                              fontSize: "0.82rem",
                              padding: "8px 12px",
                            }}
                          />
                          <Legend wrapperStyle={{ fontSize: "0.78rem", color: "#b8a888" }} />
                          <Bar
                            yAxisId="left"
                            dataKey="participants"
                            fill="#4a6ea0"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={24}
                            name={t("participantsColumn")}
                          />
                          <Bar
                            yAxisId="right"
                            dataKey="points"
                            fill={CHART_BAR_COLOR}
                            radius={[4, 4, 0, 0]}
                            maxBarSize={24}
                            name={t("totalPointsColumn")}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  );
                })()}

              {/* Event list table */}
              <div className="analytics-table-section">
                <div className="analytics-table-section__header">
                  <h4 className="analytics-table-section__title">
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
                    {t("eventListTitle")}
                  </h4>
                  <span className="analytics-table-section__count">
                    {listData.total.toLocaleString()} {t("eventsTracked")}
                  </span>
                </div>

                <section className="table event-list">
                  <header>
                    <span>{t("eventNameColumn")}</span>
                    <span>{t("eventDateColumn")}</span>
                    <span>{t("participantsColumn")}</span>
                    <span>{t("totalPointsColumn")}</span>
                  </header>
                  {listData.events.map((event) => (
                    <div
                      className="row"
                      key={event.linked_event_id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSelectEvent(event.linked_event_id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleSelectEvent(event.linked_event_id);
                        }
                      }}
                    >
                      <span>{event.event_name}</span>
                      <span>{formatDateRangeShort(event.starts_at, event.ends_at, event.event_date)}</span>
                      <span>{event.participant_count}</span>
                      <span>{event.total_points.toLocaleString()}</span>
                    </div>
                  ))}
                </section>
              </div>
            </>
          )}
        </DataState>
      )}
    </PageShell>
  );
}
