"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import PageShell from "@/app/components/page-shell";
import DataState from "@/app/components/data-state";
import PaginationBar from "@/app/components/pagination-bar";
import useClanContext from "@/app/hooks/use-clan-context";
import { usePagination } from "@/lib/hooks/use-pagination";
import AnalyticsSubnav from "../analytics-subnav";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

/* ── Types ── */

interface EventListItem {
  readonly linked_event_id: string;
  readonly event_name: string;
  readonly event_date: string;
  readonly participant_count: number;
  readonly total_points: number;
}

interface EventMeta {
  readonly id: string;
  readonly title: string;
  readonly description: string | null;
  readonly starts_at: string;
  readonly ends_at: string;
}

interface RankingEntry {
  readonly rank: number;
  readonly player_name: string;
  readonly event_points: number;
  readonly game_account_id: string;
}

interface EventListResponse {
  readonly events: EventListItem[];
  readonly total: number;
  readonly page: number;
  readonly page_size: number;
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
      <div style={{ color: CHART_BAR_COLOR }}>{payload[0].value.toLocaleString()} pts</div>
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
  const listPagination = usePagination(listData?.total ?? 0, 25);

  /* ── Detail state ── */
  const [detailData, setDetailData] = useState<EventDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const detailPagination = usePagination(detailData?.total ?? 0, 50);

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
        const url = `/api/analytics/events?clan_id=${encodeURIComponent(clanId!)}&page=${listPagination.page}&page_size=${listPagination.pageSize}`;
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
  }, [clanId, selectedEventId, listPagination.page, listPagination.pageSize]);

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
        const url = `/api/analytics/events?clan_id=${encodeURIComponent(clanId!)}&event_id=${encodeURIComponent(selectedEventId!)}&page=${detailPagination.page}&page_size=${detailPagination.pageSize}`;
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
  }, [clanId, selectedEventId, detailPagination.page, detailPagination.pageSize]);

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

  /* ── Format date ── */
  function formatDate(iso: string): string {
    try {
      return new Date(iso).toLocaleDateString(locale === "de" ? "de-DE" : "en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return iso;
    }
  }

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

              {/* Bar chart */}
              {chartData.length > 0 && (
                <div className="analytics-chart-wrapper">
                  <h4>{t("chartEventPoints")}</h4>
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
              <section className="table event-ranking">
                <header>
                  <span>{t("rankColumn")}</span>
                  <span>{t("playerColumn")}</span>
                  <span>{t("pointsColumn")}</span>
                </header>
                {detailData.rankings.map((entry) => (
                  <div className="row" key={entry.game_account_id}>
                    <span>
                      <span className={rankClass(entry.rank)}>{entry.rank}</span>
                    </span>
                    <span>{entry.player_name}</span>
                    <span>{entry.event_points.toLocaleString()}</span>
                  </div>
                ))}
              </section>

              <PaginationBar pagination={detailPagination} idPrefix="eventDetail" />
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
                    style={{ cursor: "pointer" }}
                    onClick={() => handleSelectEvent(event.linked_event_id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleSelectEvent(event.linked_event_id);
                      }
                    }}
                  >
                    <span>{event.event_name}</span>
                    <span>{formatDate(event.event_date)}</span>
                    <span>{event.participant_count}</span>
                    <span>{event.total_points.toLocaleString()}</span>
                  </div>
                ))}
              </section>

              <PaginationBar pagination={listPagination} idPrefix="eventList" />
            </>
          )}
        </DataState>
      )}
    </PageShell>
  );
}
