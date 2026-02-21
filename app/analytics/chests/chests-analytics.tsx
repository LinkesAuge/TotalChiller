"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import PageShell from "@/app/components/page-shell";
import DataState from "@/app/components/data-state";
import RadixSelect from "@/app/components/ui/radix-select";
import type { SelectOption } from "@/app/components/ui/radix-select";
import DatePicker from "@/app/components/date-picker";
import useClanContext from "@/app/hooks/use-clan-context";
import AnalyticsSubnav from "../analytics-subnav";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

/* ── Types ── */

interface RankingEntry {
  readonly rank: number;
  readonly player_name: string;
  readonly game_account_id: string;
  readonly count: number;
}

interface ChartPoint {
  readonly date: string;
  readonly count: number;
}

interface ChestsFilters {
  readonly chest_names: string[];
  readonly sources: string[];
}

interface ChestTypeEntry {
  readonly name: string;
  readonly count: number;
}

interface ChestsPayload {
  readonly rankings: RankingEntry[];
  readonly chart_data: ChartPoint[];
  readonly chest_type_distribution: ChestTypeEntry[];
  readonly filters: ChestsFilters;
  readonly total: number;
  readonly page: number;
  readonly page_size: number;
}

type DatePreset = "today" | "week" | "month" | "custom";

/* ── Helpers ── */

function fmtLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getWeekBounds(): { from: string; to: string } {
  const now = new Date();
  const dow = now.getDay();
  const diff = dow === 0 ? 6 : dow - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { from: fmtLocal(monday), to: fmtLocal(sunday) };
}

function getTodayBounds(): { from: string; to: string } {
  const today = fmtLocal(new Date());
  return { from: today, to: today };
}

function getMonthBounds(): { from: string; to: string } {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { from: fmtLocal(first), to: fmtLocal(last) };
}

function rankClass(rank: number): string {
  if (rank === 1) return "rank-position top-1";
  if (rank === 2) return "rank-position top-2";
  if (rank === 3) return "rank-position top-3";
  return "rank-position";
}

/* ── Recharts theme ── */

const CHART_GOLD = "#c9a34a";
const CHART_GRID = "rgba(240, 200, 60, 0.1)";
const CHART_AXIS = "#b8a888";
const PIE_COLORS = ["#c9a34a", "#4a6ea0", "#4a9960", "#c94a3a", "#8a6ea0", "#e4c778", "#6fd68c", "#8ab4e0"];

function ChartTooltipStyle(): React.CSSProperties {
  return {
    backgroundColor: "rgba(10, 20, 32, 0.95)",
    border: "1px solid rgba(240, 200, 60, 0.3)",
    borderRadius: 6,
    color: "#e8dcc8",
    fontSize: "0.82rem",
    padding: "8px 12px",
  };
}

/* ── Skeleton ── */

function ChestsSkeleton(): JSX.Element {
  return (
    <>
      <div className="analytics-summary-grid">
        {[1, 2, 3].map((i) => (
          <div key={i} className="analytics-summary-card" style={{ minHeight: 100 }}>
            <div className="skeleton-line" style={{ width: "40%", height: 12 }} />
            <div className="skeleton-line" style={{ width: "50%", height: 24, marginTop: 8 }} />
            <div className="skeleton-line" style={{ width: "60%", height: 12, marginTop: 6 }} />
          </div>
        ))}
      </div>
      <div className="analytics-chart-wrapper">
        <div className="skeleton-line" style={{ width: "30%", height: 14, marginBottom: 12 }} />
        <div className="skeleton-line" style={{ width: "100%", height: 220 }} />
      </div>
    </>
  );
}

/* ── Main component ── */

export default function ChestsAnalytics(): JSX.Element {
  const t = useTranslations("analytics");
  const clanContext = useClanContext();
  const clanId = clanContext?.clanId;

  const defaultRange = getWeekBounds();
  const [dateFrom, setDateFrom] = useState(defaultRange.from);
  const [dateTo, setDateTo] = useState(defaultRange.to);
  const [activePreset, setActivePreset] = useState<DatePreset>("week");
  const [playerSearch, setPlayerSearch] = useState("");
  const [selectedChestName, setSelectedChestName] = useState("");
  const [selectedSource, setSelectedSource] = useState("");

  const [data, setData] = useState<ChestsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedPlayer, setDebouncedPlayer] = useState("");

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedPlayer(playerSearch);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [playerSearch]);

  const fetchData = useCallback(async () => {
    if (!clanId) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      clan_id: clanId,
      from: dateFrom,
      to: dateTo,
      page: "1",
      page_size: "10000",
    });
    if (debouncedPlayer) params.set("player", debouncedPlayer);
    if (selectedChestName) params.set("chest_name", selectedChestName);
    if (selectedSource) params.set("source", selectedSource);

    try {
      const res = await fetch(`/api/analytics/chests?${params.toString()}`);
      if (!res.ok) throw new Error(`${res.status}`);
      const json = await res.json();
      setData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [clanId, dateFrom, dateTo, debouncedPlayer, selectedChestName, selectedSource]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!cancelled) await fetchData();
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchData]);

  /* ── Preset handlers ── */

  function applyPreset(preset: DatePreset): void {
    setActivePreset(preset);
    let range: { from: string; to: string };
    switch (preset) {
      case "today":
        range = getTodayBounds();
        break;
      case "week":
        range = getWeekBounds();
        break;
      case "month":
        range = getMonthBounds();
        break;
      default:
        return;
    }
    setDateFrom(range.from);
    setDateTo(range.to);
  }

  function handleCustomFrom(value: string): void {
    setActivePreset("custom");
    setDateFrom(value);
  }

  function handleCustomTo(value: string): void {
    setActivePreset("custom");
    setDateTo(value);
  }

  /* ── Filter options ── */

  const chestNameOptions: SelectOption[] = [
    { value: "", label: t("filterAll") },
    ...(data?.filters.chest_names ?? []).map((name) => ({ value: name, label: name })),
  ];

  const sourceOptions: SelectOption[] = [
    { value: "", label: t("filterAll") },
    ...(data?.filters.sources ?? []).map((src) => ({ value: src, label: src })),
  ];

  const barChartData = (data?.rankings ?? []).slice(0, 15).map((r) => ({
    name: r.player_name,
    count: r.count,
  }));

  /* ── Computed stats ── */
  const totalChests = data?.rankings.reduce((sum, r) => sum + r.count, 0) ?? 0;
  const uniquePlayers = data?.total ?? 0;
  const topPlayer = data?.rankings[0];

  return (
    <PageShell
      breadcrumb={t("breadcrumb")}
      title={t("chestsTitle")}
      heroTitle={t("heroTitle")}
      heroSubtitle={t("heroSubtitle")}
      bannerSrc="/assets/banners/banner_gold_dragon.png"
    >
      <AnalyticsSubnav />

      <DataState
        isLoading={loading && !data}
        error={error}
        isEmpty={!loading && !error && (data?.rankings.length ?? 0) === 0}
        loadingNode={<ChestsSkeleton />}
        emptyMessage={t("noChestData")}
        onRetry={fetchData}
      >
        {/* ── Summary stat cards ── */}
        {data && (
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
                  <path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" />
                  <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
                </svg>
              </div>
              <span className="analytics-summary-card__label">{t("totalChests")}</span>
              <span className="analytics-summary-card__value">{totalChests.toLocaleString()}</span>
              <span className="analytics-summary-card__detail">{t("inSelectedPeriod")}</span>
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
              <span className="analytics-summary-card__label">{t("uniquePlayers")}</span>
              <span className="analytics-summary-card__value">{uniquePlayers.toLocaleString()}</span>
              <span className="analytics-summary-card__detail">{t("activeCollectors")}</span>
            </div>

            {topPlayer && (
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
                <span className="analytics-summary-card__label">{t("topCollector")}</span>
                <span className="analytics-summary-card__value">{topPlayer.player_name}</span>
                <span className="analytics-summary-card__detail">
                  {topPlayer.count.toLocaleString()} {t("chests")}
                </span>
              </div>
            )}
          </div>
        )}

        {/* ── Filters ── */}
        <div className="analytics-filters">
          <div className="date-presets">
            <button
              type="button"
              className={activePreset === "today" ? "active" : ""}
              onClick={() => applyPreset("today")}
            >
              {t("datePresetToday")}
            </button>
            <button
              type="button"
              className={activePreset === "week" ? "active" : ""}
              onClick={() => applyPreset("week")}
            >
              {t("datePresetWeek")}
            </button>
            <button
              type="button"
              className={activePreset === "month" ? "active" : ""}
              onClick={() => applyPreset("month")}
            >
              {t("datePresetMonth")}
            </button>
            <button
              type="button"
              className={activePreset === "custom" ? "active" : ""}
              onClick={() => setActivePreset("custom")}
            >
              {t("datePresetCustom")}
            </button>
          </div>

          {activePreset === "custom" && (
            <div className="filter-group">
              <DatePicker value={dateFrom} onChange={handleCustomFrom} />
              <span className="filter-label">&ndash;</span>
              <DatePicker value={dateTo} onChange={handleCustomTo} />
            </div>
          )}

          <div className="filter-group">
            <input
              type="text"
              className="date-picker-input"
              placeholder={t("filterPlayer")}
              value={playerSearch}
              onChange={(e) => setPlayerSearch(e.target.value)}
            />
          </div>

          <div className="filter-group">
            <RadixSelect
              ariaLabel={t("filterChestType")}
              placeholder={t("filterChestType")}
              value={selectedChestName}
              onValueChange={setSelectedChestName}
              options={chestNameOptions}
            />
          </div>

          <div className="filter-group">
            <RadixSelect
              ariaLabel={t("filterSource")}
              placeholder={t("filterSource")}
              value={selectedSource}
              onValueChange={setSelectedSource}
              options={sourceOptions}
            />
          </div>
        </div>

        {/* ── Charts ── */}
        {(() => {
          const hasBarData = barChartData.length > 0;
          const hasTrendData = (data?.chart_data?.length ?? 0) > 0;
          const useSideBySide = hasBarData && hasTrendData;

          const barChart = hasBarData && (
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
                {t("chartChestsPerPlayer")}
              </h4>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={barChartData} margin={{ top: 4, right: 12, bottom: 4, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: CHART_AXIS, fontSize: 11 }}
                    axisLine={{ stroke: CHART_GRID }}
                    tickLine={false}
                    interval={0}
                    angle={-35}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    tick={{ fill: CHART_AXIS, fontSize: 11 }}
                    axisLine={{ stroke: CHART_GRID }}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip contentStyle={ChartTooltipStyle()} cursor={{ fill: "rgba(240, 200, 60, 0.06)" }} />
                  <Bar dataKey="count" fill={CHART_GOLD} radius={[4, 4, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          );

          const trendChart = hasTrendData && (
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
                {t("chartChestsTrend")}
              </h4>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={data!.chart_data} margin={{ top: 4, right: 12, bottom: 4, left: 0 }}>
                  <defs>
                    <linearGradient id="chestAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_GOLD} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={CHART_GOLD} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: CHART_AXIS, fontSize: 11 }}
                    axisLine={{ stroke: CHART_GRID }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: CHART_AXIS, fontSize: 11 }}
                    axisLine={{ stroke: CHART_GRID }}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip contentStyle={ChartTooltipStyle()} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke={CHART_GOLD}
                    strokeWidth={2}
                    fill="url(#chestAreaGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          );

          if (useSideBySide) {
            return (
              <div className="analytics-charts-row">
                {barChart}
                {trendChart}
              </div>
            );
          }

          return (
            <>
              {barChart}
              {trendChart}
            </>
          );
        })()}

        {/* ── Chest type distribution ── */}
        {data && data.chest_type_distribution && data.chest_type_distribution.length > 1 && (
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
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a10 10 0 0 1 0 20" />
                <path d="M12 2v20" />
              </svg>
              {t("chartChestTypeDistribution")}
            </h4>
            <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
              <ResponsiveContainer width={280} height={280}>
                <PieChart>
                  <Pie
                    data={data.chest_type_distribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={110}
                    dataKey="count"
                    nameKey="name"
                    paddingAngle={2}
                    stroke="rgba(10, 20, 32, 0.8)"
                    strokeWidth={2}
                  >
                    {data.chest_type_distribution.map((_entry, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
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
                </PieChart>
              </ResponsiveContainer>
              <div className="pie-legend">
                {data.chest_type_distribution.map((entry, i) => (
                  <div key={entry.name} className="pie-legend-item">
                    <span className="pie-legend-dot" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="pie-legend-name">{entry.name}</span>
                    <span className="pie-legend-count">{entry.count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Ranking table ── */}
        {data && data.rankings.length > 0 && (
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
                {data.total.toLocaleString()} {t("playerColumn")}
              </span>
            </div>

            <div className="table chest-ranking">
              <header>
                <span>{t("rankColumn")}</span>
                <span>{t("playerColumn")}</span>
                <span>{t("countColumn")}</span>
              </header>
              {data.rankings.map((entry, idx) => (
                <div key={entry.game_account_id ?? `unknown-${idx}`} className="row">
                  <span>
                    <span className={rankClass(entry.rank)}>{entry.rank}</span>
                  </span>
                  <span>{entry.player_name}</span>
                  <span>{entry.count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </DataState>
    </PageShell>
  );
}
