"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import PageShell from "@/app/components/page-shell";
import DataState from "@/app/components/data-state";
import PaginationBar from "@/app/components/pagination-bar";
import RadixSelect from "@/app/components/ui/radix-select";
import type { SelectOption } from "@/app/components/ui/radix-select";
import DatePicker from "@/app/components/date-picker";
import useClanContext from "@/app/hooks/use-clan-context";
import { usePagination } from "@/lib/hooks/use-pagination";
import AnalyticsSubnav from "../analytics-subnav";
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

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

interface ChestsPayload {
  readonly rankings: RankingEntry[];
  readonly chart_data: ChartPoint[];
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
      <div className="analytics-filters">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton-line" style={{ width: 100, height: 32 }} />
        ))}
      </div>
      <div className="analytics-chart-wrapper">
        <div className="skeleton-line" style={{ width: "30%", height: 14, marginBottom: 12 }} />
        <div className="skeleton-line" style={{ width: "100%", height: 200 }} />
      </div>
      <div className="table chest-ranking">
        <header>
          <span />
          <span />
          <span />
          <span />
        </header>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="row">
            <div className="skeleton-line" style={{ width: 28, height: 28, borderRadius: "50%" }} />
            <div className="skeleton-line" style={{ width: "60%", height: 14 }} />
            <div className="skeleton-line" style={{ width: "40%", height: 14 }} />
            <span />
          </div>
        ))}
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

  const pagination = usePagination(data?.total ?? 0, 25);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedPlayer, setDebouncedPlayer] = useState("");

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedPlayer(playerSearch);
      pagination.setPage(1);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [playerSearch, pagination.setPage]);

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
      page: String(pagination.page),
      page_size: String(pagination.pageSize),
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
  }, [
    clanId,
    dateFrom,
    dateTo,
    debouncedPlayer,
    selectedChestName,
    selectedSource,
    pagination.page,
    pagination.pageSize,
  ]);

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
        {/* ── Date presets + custom range ── */}
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

          {/* ── Search + dropdowns ── */}
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

        {/* ── Bar chart: chests per player ── */}
        {barChartData.length > 0 && (
          <div className="analytics-chart-wrapper">
            <h4>{t("chartChestsPerPlayer")}</h4>
            <ResponsiveContainer width="100%" height={250}>
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
                <Bar dataKey="count" fill={CHART_GOLD} radius={[3, 3, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ── Area chart: daily trend ── */}
        {(data?.chart_data?.length ?? 0) > 0 && (
          <div className="analytics-chart-wrapper">
            <h4>{t("chartChestsTrend")}</h4>
            <ResponsiveContainer width="100%" height={250}>
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
                <Area type="monotone" dataKey="count" stroke={CHART_GOLD} strokeWidth={2} fill="url(#chestAreaGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ── Ranking table ── */}
        {data && data.rankings.length > 0 && (
          <>
            <div className="table chest-ranking">
              <header>
                <span>{t("rankColumn")}</span>
                <span>{t("playerColumn")}</span>
                <span>{t("countColumn")}</span>
                <span />
              </header>
              {data.rankings.map((entry) => (
                <div key={entry.game_account_id} className="row">
                  <span className={rankClass(entry.rank)}>{entry.rank}</span>
                  <span>{entry.player_name}</span>
                  <span>{entry.count.toLocaleString()}</span>
                  <span />
                </div>
              ))}
            </div>

            <PaginationBar pagination={pagination} idPrefix="chests" />
          </>
        )}
      </DataState>
    </PageShell>
  );
}
