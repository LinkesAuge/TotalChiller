"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import PageShell from "@/app/components/page-shell";
import DataState from "@/app/components/data-state";
import RadixSelect from "@/app/components/ui/radix-select";
import type { SelectOption } from "@/app/components/ui/radix-select";
import DatePicker from "@/app/components/date-picker";
import TableScroll from "@/app/components/table-scroll";
import useClanContext from "@/app/hooks/use-clan-context";
import { berlinToday, berlinWeekBounds, berlinMonthBounds } from "@/lib/timezone";
import AnalyticsSubnav from "../analytics-subnav";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
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
  readonly chest_breakdown: Record<string, number>;
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

function getTodayBounds(): { from: string; to: string } {
  const today = berlinToday();
  return { from: today, to: today };
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
  const [retryCount, setRetryCount] = useState(0);

  const defaultRange = berlinWeekBounds();
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

  useEffect(() => {
    if (!clanId) {
      setData(null);
      setLoading(false);
      return;
    }

    const ac = new AbortController();
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      clan_id: clanId,
      from: dateFrom,
      to: dateTo,
      page: "1",
      page_size: "500",
    });
    if (debouncedPlayer) params.set("player", debouncedPlayer);
    if (selectedChestName) params.set("chest_name", selectedChestName);
    if (selectedSource) params.set("source", selectedSource);

    (async () => {
      try {
        const res = await fetch(`/api/data/chests?${params.toString()}`, { signal: ac.signal });
        if (!res.ok) throw new Error(`${res.status}`);
        const json = await res.json();
        if (!ac.signal.aborted) setData(json.data);
      } catch (err) {
        if (ac.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();

    return () => ac.abort();
  }, [clanId, dateFrom, dateTo, debouncedPlayer, selectedChestName, selectedSource, retryCount]);

  const handleRetry = useCallback(() => setRetryCount((c) => c + 1), []);

  /* ── Preset handlers ── */

  function applyPreset(preset: DatePreset): void {
    setActivePreset(preset);
    let range: { from: string; to: string };
    switch (preset) {
      case "today":
        range = getTodayBounds();
        break;
      case "week":
        range = berlinWeekBounds();
        break;
      case "month":
        range = berlinMonthBounds();
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

  /* ── Filter options (cached from unfiltered responses so they don't disappear) ── */

  const [allChestNames, setAllChestNames] = useState<string[]>([]);
  const [allSources, setAllSources] = useState<string[]>([]);

  useEffect(() => {
    if (!data?.filters) return;
    if (!selectedChestName && !selectedSource && !debouncedPlayer) {
      setAllChestNames(data.filters.chest_names);
      setAllSources(data.filters.sources);
    }
  }, [data?.filters, selectedChestName, selectedSource, debouncedPlayer]);

  const chestNameOptions: SelectOption[] = [
    { value: "", label: t("filterAll") },
    ...(allChestNames.length > 0 ? allChestNames : (data?.filters.chest_names ?? [])).map((name) => ({
      value: name,
      label: name,
    })),
  ];

  const sourceOptions: SelectOption[] = [
    { value: "", label: t("filterAll") },
    ...(allSources.length > 0 ? allSources : (data?.filters.sources ?? [])).map((src) => ({
      value: src,
      label: src,
    })),
  ];

  const barChartData = (data?.rankings ?? []).slice(0, 15).map((r) => ({
    name: r.player_name,
    count: r.count,
  }));

  /* ── Computed stats ── */
  const totalChests = data?.rankings.reduce((sum, r) => sum + r.count, 0) ?? 0;
  const uniquePlayers = data?.total ?? 0;
  const topPlayer = data?.rankings[0];

  /* ── Collect all unique chest types across all players for table columns ── */
  const chestTypeColumns = useMemo(() => {
    if (!data?.rankings) return [];
    const typeCounts = new Map<string, number>();
    for (const r of data.rankings) {
      if (!r.chest_breakdown) continue;
      for (const [name, count] of Object.entries(r.chest_breakdown)) {
        typeCounts.set(name, (typeCounts.get(name) ?? 0) + count);
      }
    }
    return [...typeCounts.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name);
  }, [data?.rankings]);

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
        onRetry={handleRetry}
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

        {/* ── Ranking table (star element) ── */}
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

            <TableScroll>
              <div className="table chest-ranking chest-ranking--expanded">
                <header>
                  <span>{t("rankColumn")}</span>
                  <span>{t("playerColumn")}</span>
                  <span>{t("countColumn")}</span>
                  {chestTypeColumns.map((ct) => (
                    <span key={ct} className="chest-type-col" title={ct}>
                      {ct}
                    </span>
                  ))}
                </header>
                {data.rankings.map((entry, idx) => (
                  <div key={`${entry.game_account_id ?? "u"}-${idx}`} className="row">
                    <span>
                      <span className={rankClass(entry.rank)}>{entry.rank}</span>
                    </span>
                    <span>
                      <Link
                        href={`/auswertungen/player?name=${encodeURIComponent(entry.player_name)}${entry.game_account_id ? `&ga=${encodeURIComponent(entry.game_account_id)}` : ""}`}
                        className="player-link"
                      >
                        {entry.player_name}
                      </Link>
                    </span>
                    <span>{entry.count.toLocaleString()}</span>
                    {chestTypeColumns.map((ct) => (
                      <span key={ct} className="chest-type-col">
                        {entry.chest_breakdown?.[ct] ?? 0}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </TableScroll>
          </div>
        )}

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

        {/* ── Chest type distribution + source overview ── */}
        {data &&
          data.chest_type_distribution &&
          data.chest_type_distribution.length > 1 &&
          (() => {
            const maxCount = Math.max(1, ...data.chest_type_distribution.map((e) => e.count));
            const topTypes = data.chest_type_distribution.slice(0, 10);
            return (
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
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 2a10 10 0 0 1 0 20" />
                      <path d="M12 2v20" />
                    </svg>
                    {t("chartChestTypeDistribution")}
                  </h4>
                  <div className="compact-distribution">
                    {topTypes.map((entry, i) => (
                      <div key={entry.name} className="compact-distribution-item">
                        <span className="compact-distribution-item__name" title={entry.name}>
                          {entry.name}
                        </span>
                        <span
                          className="compact-distribution-item__bar"
                          style={{
                            width: `${Math.max(20, (entry.count / maxCount) * 120)}px`,
                            background: PIE_COLORS[i % PIE_COLORS.length],
                          }}
                        />
                        <span className="compact-distribution-item__count">{entry.count.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
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
                    {t("chartChestTypeBar")}
                  </h4>
                  <ResponsiveContainer width="100%" height={Math.max(200, topTypes.length * 28)}>
                    <BarChart data={topTypes} layout="vertical" margin={{ top: 4, right: 20, bottom: 4, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} horizontal={false} />
                      <XAxis
                        type="number"
                        tick={{ fill: CHART_AXIS, fontSize: 11 }}
                        axisLine={{ stroke: CHART_GRID }}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={120}
                        tick={{ fill: CHART_AXIS, fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip contentStyle={ChartTooltipStyle()} cursor={{ fill: "rgba(240, 200, 60, 0.06)" }} />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={16}>
                        {topTypes.map((_e, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            );
          })()}
      </DataState>
    </PageShell>
  );
}
