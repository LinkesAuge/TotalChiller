"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import PageShell from "@/app/components/page-shell";
import DataState from "@/app/components/data-state";
import DatePicker from "@/app/components/date-picker";
import useClanContext from "@/app/hooks/use-clan-context";
import AnalyticsSubnav from "../analytics-subnav";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

/* ─── Types ─── */

interface Standing {
  readonly rank: number;
  readonly player_name: string;
  readonly game_account_id: string;
  readonly score: number;
  readonly previous_score: number | null;
  readonly delta: number | null;
}

interface HistoryEntry {
  readonly date: string;
  readonly player_name: string;
  readonly score: number;
}

interface ClanTotalHistoryEntry {
  readonly date: string;
  readonly total_power: number;
  readonly player_count: number;
}

interface PowerDistributionEntry {
  readonly range: string;
  readonly count: number;
}

interface PowerResponse {
  readonly standings: Standing[];
  readonly history: HistoryEntry[];
  readonly clan_total: number;
  readonly clan_total_history: ClanTotalHistoryEntry[];
  readonly power_distribution: PowerDistributionEntry[];
  readonly total: number;
  readonly page: number;
  readonly page_size: number;
}

/* ─── Constants ─── */

const LINE_COLORS = [
  "#c9a34a",
  "#4a6ea0",
  "#4a9960",
  "#c94a3a",
  "#8a6ea0",
  "#e4c778",
  "#6fd68c",
  "#8ab4e0",
  "#f5a090",
  "#b0c4de",
];

const DEBOUNCE_MS = 300;

/* ─── Helpers ─── */

function DeltaIndicator({ delta }: { delta: number | null }) {
  if (delta === null) return <span className="delta neutral">—</span>;
  if (delta > 0) return <span className="delta positive">▲ +{delta.toLocaleString()}</span>;
  if (delta < 0) return <span className="delta negative">▼ {delta.toLocaleString()}</span>;
  return <span className="delta neutral">0</span>;
}

function rankClass(rank: number): string {
  if (rank === 1) return "rank-position top-1";
  if (rank === 2) return "rank-position top-2";
  if (rank === 3) return "rank-position top-3";
  return "rank-position";
}

function buildChartData(history: HistoryEntry[]): { data: Record<string, string | number>[]; players: string[] } {
  const dateMap = new Map<string, Record<string, string | number>>();
  const playerSet = new Set<string>();

  for (const entry of history) {
    playerSet.add(entry.player_name);
    let row = dateMap.get(entry.date);
    if (!row) {
      row = { date: entry.date };
      dateMap.set(entry.date, row);
    }
    row[entry.player_name] = entry.score;
  }

  const dates = [...dateMap.keys()].sort();
  const data = dates.map((d) => dateMap.get(d)!);
  const players = [...playerSet];

  return { data, players };
}

/* ─── Custom tooltip ─── */

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { color: string; name: string; value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "rgba(10, 20, 32, 0.95)",
        border: "1px solid rgba(240, 200, 60, 0.3)",
        borderRadius: 6,
        padding: "8px 12px",
        fontSize: "0.78rem",
      }}
    >
      <div style={{ color: "#b8a888", marginBottom: 4, fontWeight: 600 }}>{label}</div>
      {payload.map((entry) => (
        <div key={entry.name} style={{ color: entry.color, padding: "1px 0" }}>
          {entry.name}: {entry.value.toLocaleString()}
        </div>
      ))}
    </div>
  );
}

/* ─── Main component ─── */

export default function PowerAnalytics(): JSX.Element {
  const t = useTranslations("analytics");
  const clanContext = useClanContext();
  const clanId = clanContext?.clanId;

  type CompareMode = "week" | "month" | "all_time" | "custom";

  const [data, setData] = useState<PowerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [playerFilter, setPlayerFilter] = useState("");
  const [debouncedFilter, setDebouncedFilter] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [compareMode, setCompareMode] = useState<CompareMode>("week");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  /* Debounce player search input */
  function handleFilterChange(value: string) {
    setPlayerFilter(value);
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedFilter(value);
    }, DEBOUNCE_MS);
  }

  useEffect(() => {
    return () => clearTimeout(debounceTimer.current);
  }, []);

  /* Fetch data */
  useEffect(() => {
    if (!clanId) {
      setData(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    async function load(): Promise<void> {
      const params = new URLSearchParams({
        clan_id: clanId!,
        page: "1",
        page_size: "500",
        compare: compareMode,
      });
      if (debouncedFilter) params.set("player", debouncedFilter);
      if (compareMode === "custom" && customFrom) params.set("from", customFrom);
      if (compareMode === "custom" && customTo) params.set("to", customTo);

      try {
        const res = await fetch(`/api/data/machtpunkte?${params}`);
        if (!res.ok) throw new Error(`${res.status}`);
        const json = await res.json();
        if (!cancelled) setData(json.data);
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
  }, [clanId, debouncedFilter, retryCount, compareMode, customFrom, customTo]);

  const standings = data?.standings ?? [];
  const isEmpty = !loading && !error && standings.length === 0;
  const { data: chartData, players: chartPlayers } = data?.history?.length
    ? buildChartData(data.history)
    : { data: [], players: [] };

  /* Computed stats */
  const avgScore = standings.length > 0 ? Math.round(standings.reduce((s, r) => s + r.score, 0) / standings.length) : 0;
  const topPlayer = standings[0];
  const growingPlayers = standings.filter((s) => s.delta !== null && s.delta > 0).length;
  const medianScore = standings.length > 0 ? (standings[Math.floor(standings.length / 2)]?.score ?? 0) : 0;

  return (
    <PageShell
      breadcrumb={t("breadcrumb")}
      title={t("powerTitle")}
      heroTitle={t("heroTitle")}
      heroSubtitle={t("heroSubtitle")}
      bannerSrc="/assets/banners/banner_gold_dragon.png"
    >
      <AnalyticsSubnav />

      <DataState
        isLoading={loading && !data}
        error={error}
        isEmpty={isEmpty}
        emptyMessage={t("noPowerData")}
        onRetry={() => setRetryCount((c) => c + 1)}
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
                  <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="analytics-summary-card__label">{t("clanTotal")}</span>
              <span className="analytics-summary-card__value">{data.clan_total.toLocaleString()}</span>
              <span className="analytics-summary-card__detail">{t("powerTitle")}</span>
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
              <span className="analytics-summary-card__label">{t("averageScore")}</span>
              <span className="analytics-summary-card__value">{avgScore.toLocaleString()}</span>
              <span className="analytics-summary-card__detail">{t("perPlayer")}</span>
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
                <span className="analytics-summary-card__label">{t("strongestPlayer")}</span>
                <span className="analytics-summary-card__value">{topPlayer.player_name}</span>
                <span className="analytics-summary-card__detail">
                  {topPlayer.score.toLocaleString()} {t("powerPoints")}
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
                  <path d="M12 20V10" />
                  <path d="M18 20V4" />
                  <path d="M6 20v-4" />
                </svg>
              </div>
              <span className="analytics-summary-card__label">{t("medianScore")}</span>
              <span className="analytics-summary-card__value">{medianScore.toLocaleString()}</span>
              <span className="analytics-summary-card__detail">{t("medianDetail")}</span>
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
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                  <polyline points="17 6 23 6 23 12" />
                </svg>
              </div>
              <span className="analytics-summary-card__label">{t("growingPlayers")}</span>
              <span className="analytics-summary-card__value">{growingPlayers}</span>
              <span className="analytics-summary-card__detail">{t("withPositiveDelta")}</span>
            </div>
          </div>
        )}

        {/* ── Compare mode + player search ── */}
        <div className="analytics-filters">
          <div className="date-presets">
            {(["week", "month", "all_time", "custom"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                className={compareMode === mode ? "active" : ""}
                onClick={() => setCompareMode(mode)}
              >
                {t(`compareMode_${mode}`)}
              </button>
            ))}
          </div>
          {compareMode === "custom" && (
            <div className="filter-group">
              <DatePicker value={customFrom} onChange={setCustomFrom} />
              <span className="filter-label">&ndash;</span>
              <DatePicker value={customTo} onChange={setCustomTo} />
            </div>
          )}
          <div className="filter-group">
            <input
              id="power-player-filter"
              type="text"
              value={playerFilter}
              onChange={(e) => handleFilterChange(e.target.value)}
              placeholder={t("filterPlayer")}
              className="date-picker-input"
            />
          </div>
        </div>

        {/* ── Standings table + Top Gainers side by side ── */}
        {standings.length > 0 &&
          (() => {
            const withDelta = standings.filter((s) => s.delta !== null && s.delta !== 0);
            const sorted = [...withDelta].sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0));
            const topGainers = sorted
              .filter((s) => (s.delta ?? 0) > 0)
              .slice(0, 10)
              .map((s) => ({ name: s.player_name, delta: s.delta ?? 0 }));
            const topLosers = sorted
              .filter((s) => (s.delta ?? 0) < 0)
              .slice(-5)
              .map((s) => ({ name: s.player_name, delta: s.delta ?? 0 }));
            const deltaChartData = [...topGainers, ...topLosers].sort((a, b) => b.delta - a.delta);
            const hasDeltaChart = deltaChartData.length > 0 && deltaChartData.some((d) => d.delta !== 0);

            return (
              <div className={hasDeltaChart ? "analytics-split-layout" : ""}>
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
                      {data?.total.toLocaleString()} {t("playerColumn")}
                    </span>
                  </div>

                  <div className="table power-ranking">
                    <header>
                      <span>{t("rankColumn")}</span>
                      <span>{t("playerColumn")}</span>
                      <span>{t("scoreColumn")}</span>
                      <span>{t("previousColumn")}</span>
                      <span>{t("deltaColumn")}</span>
                    </header>
                    {standings.map((s) => (
                      <div key={s.game_account_id} className="row">
                        <span>
                          <span className={rankClass(s.rank)}>{s.rank}</span>
                        </span>
                        <span>
                          <Link
                            href={`/auswertungen/player?name=${encodeURIComponent(s.player_name)}${s.game_account_id ? `&ga=${encodeURIComponent(s.game_account_id)}` : ""}`}
                            className="player-link"
                          >
                            {s.player_name}
                          </Link>
                        </span>
                        <span>{s.score.toLocaleString()}</span>
                        <span>{s.previous_score !== null ? s.previous_score.toLocaleString() : "—"}</span>
                        <span>
                          <DeltaIndicator delta={s.delta} />
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {hasDeltaChart && (
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
                        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                        <polyline points="17 6 23 6 23 12" />
                      </svg>
                      {t("chartTopGainers")}
                    </h4>
                    <ResponsiveContainer width="100%" height={Math.max(300, deltaChartData.length * 28)}>
                      <BarChart
                        data={deltaChartData}
                        layout="vertical"
                        margin={{ top: 4, right: 20, bottom: 4, left: 10 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(240, 200, 60, 0.1)" horizontal={false} />
                        <XAxis
                          type="number"
                          tick={{ fill: "#b8a888", fontSize: 11 }}
                          axisLine={{ stroke: "rgba(240, 200, 60, 0.1)" }}
                          tickLine={false}
                          tickFormatter={(v: number) => v.toLocaleString()}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={100}
                          tick={{ fill: "#b8a888", fontSize: 10 }}
                          axisLine={false}
                          tickLine={false}
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
                        <Bar dataKey="delta" radius={[0, 4, 4, 0]} barSize={16} name={t("deltaColumn")}>
                          {deltaChartData.map((entry, i) => (
                            <Cell key={i} fill={entry.delta >= 0 ? "#4a9960" : "#c94a3a"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            );
          })()}

        {/* ── Charts: Power History (full width) ── */}
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
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              {t("chartPowerHistory")}
            </h4>
            <ResponsiveContainer width="100%" height={340}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(240, 200, 60, 0.1)" />
                <XAxis dataKey="date" tick={{ fill: "#b8a888", fontSize: 12 }} stroke="rgba(240, 200, 60, 0.1)" />
                <YAxis
                  tick={{ fill: "#b8a888", fontSize: 12 }}
                  stroke="rgba(240, 200, 60, 0.1)"
                  tickFormatter={(v: number) => v.toLocaleString()}
                  width={80}
                />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: "0.78rem", color: "#b8a888" }} />
                {chartPlayers.map((player, i) => (
                  <Line
                    key={player}
                    type="monotone"
                    dataKey={player}
                    stroke={LINE_COLORS[i % LINE_COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {data && (
          <div className="analytics-charts-row">
            {data.clan_total_history.length > 1 && (
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
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                    <polyline points="17 6 23 6 23 12" />
                  </svg>
                  {t("chartClanPowerTrend")}
                </h4>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={data.clan_total_history} margin={{ top: 4, right: 12, bottom: 4, left: 0 }}>
                    <defs>
                      <linearGradient id="clanPowerGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#4a9960" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#4a9960" stopOpacity={0.02} />
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
                      tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                      width={60}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="total_power"
                      stroke="#4a9960"
                      strokeWidth={2}
                      fill="url(#clanPowerGrad)"
                      name={t("clanTotal")}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
            {data.power_distribution.length > 1 && (
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
                  {t("chartPowerDistribution")}
                </h4>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data.power_distribution} margin={{ top: 4, right: 12, bottom: 4, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(240, 200, 60, 0.1)" />
                    <XAxis
                      dataKey="range"
                      tick={{ fill: "#b8a888", fontSize: 10 }}
                      axisLine={{ stroke: "rgba(240, 200, 60, 0.1)" }}
                      tickLine={false}
                      interval={0}
                      angle={-25}
                      textAnchor="end"
                      height={50}
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
                    <Bar dataKey="count" fill="#8a6ea0" radius={[4, 4, 0, 0]} maxBarSize={36} name={t("players")} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
      </DataState>
    </PageShell>
  );
}
