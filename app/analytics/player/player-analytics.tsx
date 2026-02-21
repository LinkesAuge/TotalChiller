"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import PageShell from "@/app/components/page-shell";
import DataState from "@/app/components/data-state";
import useClanContext from "@/app/hooks/use-clan-context";
import AnalyticsSubnav from "../analytics-subnav";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
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

interface ChestTypeEntry {
  readonly name: string;
  readonly count: number;
}

interface ChartPoint {
  readonly date: string;
  readonly count: number;
}

interface EventHistoryEntry {
  readonly event_name: string;
  readonly event_points: number;
  readonly date: string;
}

interface PowerHistoryEntry {
  readonly date: string;
  readonly score: number;
}

interface PlayerData {
  readonly player_name: string;
  readonly chests: {
    readonly total: number;
    readonly type_distribution: ChestTypeEntry[];
    readonly source_distribution: ChestTypeEntry[];
    readonly trend: ChartPoint[];
    readonly weekly_trend: { readonly week: string; readonly count: number }[];
    readonly active_days: number;
    readonly avg_per_day: number;
    readonly avg_per_week: number;
    readonly best_day: { readonly date: string; readonly count: number } | null;
    readonly first_date: string | null;
    readonly last_date: string | null;
  };
  readonly events: {
    readonly total: number;
    readonly total_points: number;
    readonly avg_points: number;
    readonly median_points: number;
    readonly std_dev: number;
    readonly best_score: number;
    readonly best_event_name: string;
    readonly worst_score: number;
    readonly worst_event_name: string;
    readonly history: EventHistoryEntry[];
  };
  readonly power: {
    readonly current_score: number;
    readonly previous_score: number | null;
    readonly delta: number | null;
    readonly clan_rank: number | null;
    readonly clan_size: number | null;
    readonly max_score: number;
    readonly min_score: number;
    readonly growth_rate: number | null;
    readonly history: PowerHistoryEntry[];
  };
}

interface PlayerListEntry {
  readonly rank: number;
  readonly player_name: string;
  readonly game_account_id: string;
  readonly score: number;
  readonly delta: number | null;
}

/* ── Chart theme ── */

const CHART_GOLD = "#c9a34a";
const CHART_GRID = "rgba(240, 200, 60, 0.1)";
const CHART_AXIS = "#b8a888";
const PIE_COLORS = ["#c9a34a", "#4a6ea0", "#4a9960", "#c94a3a", "#8a6ea0", "#e4c778", "#6fd68c", "#8ab4e0"];

function tooltipStyle(): React.CSSProperties {
  return {
    backgroundColor: "rgba(10, 20, 32, 0.95)",
    border: "1px solid rgba(240, 200, 60, 0.3)",
    borderRadius: 6,
    color: "#e8dcc8",
    fontSize: "0.82rem",
    padding: "8px 12px",
  };
}

function rankClass(rank: number): string {
  if (rank === 1) return "rank-position top-1";
  if (rank === 2) return "rank-position top-2";
  if (rank === 3) return "rank-position top-3";
  return "rank-position";
}

/* ── Player picker (when no player selected) ── */

function PlayerPicker({
  clanId,
  t,
}: {
  clanId: string;
  t: ReturnType<typeof useTranslations<"analytics">>;
}): JSX.Element {
  const [players, setPlayers] = useState<PlayerListEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const fetchPlayers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/analytics/machtpunkte?clan_id=${encodeURIComponent(clanId)}&page=1&page_size=10000&compare=week`,
      );
      if (!res.ok) throw new Error(`${res.status}`);
      const json = await res.json();
      setPlayers(json.data?.standings ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [clanId]);

  useEffect(() => {
    void fetchPlayers();
  }, [fetchPlayers]);

  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  const filtered = debouncedSearch
    ? players.filter((p) => p.player_name.toLowerCase().includes(debouncedSearch.toLowerCase()))
    : players;

  return (
    <DataState
      isLoading={loading}
      error={error}
      isEmpty={players.length === 0}
      emptyMessage={t("playerNoData")}
      onRetry={fetchPlayers}
    >
      <div className="player-search-section">
        <div className="analytics-filters" style={{ marginBottom: 20 }}>
          <div className="filter-group">
            <input
              type="text"
              className="date-picker-input"
              placeholder={t("filterPlayer")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ minWidth: 280 }}
            />
          </div>
          <span style={{ fontSize: "0.78rem", color: "var(--color-text-muted)" }}>
            {filtered.length} {t("players")}
          </span>
        </div>

        <div className="player-grid">
          {filtered.length === 0 && debouncedSearch && (
            <p
              style={{
                gridColumn: "1 / -1",
                textAlign: "center",
                color: "var(--color-text-muted)",
                padding: "24px 0",
                fontSize: "0.85rem",
              }}
            >
              {t("playerNoSearchResults")}
            </p>
          )}
          {filtered.map((p) => (
            <Link
              key={p.game_account_id ?? p.player_name}
              href={`/analytics/player?name=${encodeURIComponent(p.player_name)}${p.game_account_id ? `&ga=${encodeURIComponent(p.game_account_id)}` : ""}`}
              className="player-grid-card"
            >
              <span className="player-grid-card__rank">
                <span className={rankClass(p.rank)}>{p.rank}</span>
              </span>
              <span className="player-grid-card__info">
                <span className="player-grid-card__name">{p.player_name}</span>
                <span className="player-grid-card__stats">
                  <span className="player-grid-card__stat">
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
                    {p.score.toLocaleString()}
                  </span>
                  {p.delta !== null && (
                    <span
                      className="player-grid-card__stat"
                      style={{ color: p.delta >= 0 ? "var(--color-accent-green)" : "var(--color-accent-red)" }}
                    >
                      {p.delta >= 0 ? "▲" : "▼"} {Math.abs(p.delta).toLocaleString()}
                    </span>
                  )}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </DataState>
  );
}

/* ── Component ── */

export default function PlayerAnalytics(): JSX.Element {
  const t = useTranslations("analytics");
  const router = useRouter();
  const searchParams = useSearchParams();
  const clanContext = useClanContext();
  const clanId = clanContext?.clanId;

  const playerName = searchParams.get("name") ?? "";
  const gameAccountId = searchParams.get("ga") ?? "";

  const [data, setData] = useState<PlayerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clanId || !playerName) {
      setData(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    async function load(): Promise<void> {
      const params = new URLSearchParams({ clan_id: clanId!, name: playerName });
      if (gameAccountId) params.set("ga", gameAccountId);
      try {
        const res = await fetch(`/api/analytics/player?${params}`);
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
  }, [clanId, playerName, gameAccountId]);

  const eventChartData = (data?.events.history ?? []).slice(-20).map((e) => ({
    name: e.event_name.length > 16 ? e.event_name.slice(0, 16) + "…" : e.event_name,
    fullName: e.event_name,
    points: e.event_points,
  }));

  /* ── No player selected → show picker ── */
  if (!playerName) {
    return (
      <PageShell
        breadcrumb={t("breadcrumb")}
        title={t("playerTitle")}
        heroTitle={t("heroTitle")}
        heroSubtitle={t("heroSubtitle")}
        bannerSrc="/assets/banners/banner_gold_dragon.png"
      >
        <AnalyticsSubnav />
        {clanId ? (
          <PlayerPicker clanId={clanId} t={t} />
        ) : (
          <DataState isLoading={false} error={null} isEmpty emptyMessage={t("playerNoData")}>
            {null}
          </DataState>
        )}
      </PageShell>
    );
  }

  return (
    <PageShell
      breadcrumb={t("breadcrumb")}
      title={playerName || t("playerTitle")}
      heroTitle={t("heroTitle")}
      heroSubtitle={t("heroSubtitle")}
      bannerSrc="/assets/banners/banner_gold_dragon.png"
    >
      <AnalyticsSubnav />

      <div className="event-detail-header" style={{ marginBottom: 16 }}>
        <button type="button" className="back-link" onClick={() => router.push("/analytics/player")}>
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
          {t("backToPlayerList")}
        </button>
        <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "1.15rem", color: "var(--color-gold-2)" }}>
          {playerName}
        </h3>
      </div>

      <DataState isLoading={loading} error={error} isEmpty={!data} emptyMessage={t("playerNoData")}>
        {data && (
          <>
            {/* ══════════ POWER SECTION ══════════ */}
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
                <span className="analytics-summary-card__label">{t("playerCurrentPower")}</span>
                <span className="analytics-summary-card__value">{data.power.current_score.toLocaleString()}</span>
                <span className="analytics-summary-card__detail">
                  {data.power.clan_rank !== null
                    ? `${t("rankColumn")} #${data.power.clan_rank}${data.power.clan_size ? ` / ${data.power.clan_size}` : ""}`
                    : "—"}
                  {data.power.delta !== null && (
                    <span
                      style={{
                        marginLeft: 8,
                        color: data.power.delta >= 0 ? "var(--color-accent-green)" : "var(--color-accent-red)",
                      }}
                    >
                      {data.power.delta >= 0 ? "▲" : "▼"} {Math.abs(data.power.delta).toLocaleString()}
                    </span>
                  )}
                </span>
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
                <span className="analytics-summary-card__label">{t("playerPowerMax")}</span>
                <span className="analytics-summary-card__value">{data.power.max_score.toLocaleString()}</span>
                <span className="analytics-summary-card__detail">
                  {t("playerPowerMin")}: {data.power.min_score.toLocaleString()}
                </span>
              </div>

              {data.power.growth_rate !== null && (
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
                  <span className="analytics-summary-card__label">{t("playerGrowthRate")}</span>
                  <span
                    className="analytics-summary-card__value"
                    style={{
                      color: data.power.growth_rate >= 0 ? "var(--color-accent-green)" : "var(--color-accent-red)",
                    }}
                  >
                    {data.power.growth_rate >= 0 ? "+" : ""}
                    {data.power.growth_rate}%
                  </span>
                  <span className="analytics-summary-card__detail">{t("playerSinceFirstRecord")}</span>
                </div>
              )}
            </div>

            {data.power.history.length > 1 && (
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
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={data.power.history} margin={{ top: 4, right: 12, bottom: 4, left: 0 }}>
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
                      tickFormatter={(v: number) => v.toLocaleString()}
                      width={70}
                    />
                    <Tooltip contentStyle={tooltipStyle()} />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke={CHART_GOLD}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* ══════════ CHESTS SECTION ══════════ */}
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
                <span className="analytics-summary-card__value">{data.chests.total.toLocaleString()}</span>
                <span className="analytics-summary-card__detail">
                  {t("playerActiveDays")}: {data.chests.active_days}
                </span>
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
                <span className="analytics-summary-card__label">{t("playerAvgPerWeek")}</span>
                <span className="analytics-summary-card__value">{data.chests.avg_per_week}</span>
                <span className="analytics-summary-card__detail">
                  {t("playerAvgPerDay")}: {data.chests.avg_per_day}
                </span>
              </div>

              {data.chests.best_day && (
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
                  <span className="analytics-summary-card__label">{t("playerBestDay")}</span>
                  <span className="analytics-summary-card__value">
                    {data.chests.best_day.count} {t("chests")}
                  </span>
                  <span className="analytics-summary-card__detail">{data.chests.best_day.date}</span>
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
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                </div>
                <span className="analytics-summary-card__label">{t("playerChestPeriod")}</span>
                <span className="analytics-summary-card__value">{data.chests.first_date ?? "—"}</span>
                <span className="analytics-summary-card__detail">
                  {data.chests.last_date ? `${t("playerUntil")} ${data.chests.last_date}` : "—"}
                </span>
              </div>
            </div>

            <div className="analytics-charts-row">
              {data.chests.weekly_trend.length > 1 && (
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
                    {t("chartChestsWeekly")}
                  </h4>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={data.chests.weekly_trend} margin={{ top: 4, right: 12, bottom: 4, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                      <XAxis
                        dataKey="week"
                        tick={{ fill: CHART_AXIS, fontSize: 10 }}
                        axisLine={{ stroke: CHART_GRID }}
                        tickLine={false}
                        angle={-30}
                        textAnchor="end"
                        height={50}
                      />
                      <YAxis
                        tick={{ fill: CHART_AXIS, fontSize: 11 }}
                        axisLine={{ stroke: CHART_GRID }}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip contentStyle={tooltipStyle()} />
                      <Bar dataKey="count" fill={CHART_GOLD} radius={[4, 4, 0, 0]} maxBarSize={28} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {data.chests.trend.length > 1 && (
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
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={data.chests.trend} margin={{ top: 4, right: 12, bottom: 4, left: 0 }}>
                      <defs>
                        <linearGradient id="playerChestGrad" x1="0" y1="0" x2="0" y2="1">
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
                      <Tooltip contentStyle={tooltipStyle()} />
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke={CHART_GOLD}
                        strokeWidth={2}
                        fill="url(#playerChestGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Chest type + source distribution */}
            <div className="analytics-charts-row">
              {data.chests.type_distribution.length > 1 && (
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
                  <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                    <ResponsiveContainer width={180} height={180}>
                      <PieChart>
                        <Pie
                          data={data.chests.type_distribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={75}
                          dataKey="count"
                          nameKey="name"
                          paddingAngle={2}
                          stroke="rgba(10, 20, 32, 0.8)"
                          strokeWidth={2}
                        >
                          {data.chests.type_distribution.map((_e, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle()} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pie-legend">
                      {data.chests.type_distribution.map((entry, i) => (
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

              {data.chests.source_distribution.length > 1 && (
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
                    {t("chartChestSources")}
                  </h4>
                  <ResponsiveContainer width="100%" height={Math.max(180, data.chests.source_distribution.length * 28)}>
                    <BarChart
                      data={data.chests.source_distribution}
                      layout="vertical"
                      margin={{ top: 4, right: 20, bottom: 4, left: 10 }}
                    >
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
                      <Tooltip contentStyle={tooltipStyle()} cursor={{ fill: "rgba(240, 200, 60, 0.06)" }} />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={16}>
                        {data.chests.source_distribution.map((_e, i) => (
                          <Cell key={i} fill={PIE_COLORS[(i + 2) % PIE_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* ══════════ EVENTS SECTION ══════════ */}
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
                <span className="analytics-summary-card__label">{t("playerEventsCount")}</span>
                <span className="analytics-summary-card__value">{data.events.total.toLocaleString()}</span>
                <span className="analytics-summary-card__detail">
                  {t("playerTotalEventPoints")}: {data.events.total_points.toLocaleString()}
                </span>
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
                <span className="analytics-summary-card__label">{t("playerAvgPoints")}</span>
                <span className="analytics-summary-card__value">{data.events.avg_points.toLocaleString()}</span>
                <span className="analytics-summary-card__detail">
                  {t("playerMedianPoints")}: {data.events.median_points.toLocaleString()}
                </span>
              </div>

              {data.events.best_score > 0 && (
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
                  <span className="analytics-summary-card__label">{t("playerBestEvent")}</span>
                  <span className="analytics-summary-card__value">{data.events.best_score.toLocaleString()}</span>
                  <span className="analytics-summary-card__detail">{data.events.best_event_name}</span>
                </div>
              )}

              {data.events.total > 1 && (
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
                      <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="analytics-summary-card__label">{t("playerWorstEvent")}</span>
                  <span className="analytics-summary-card__value">{data.events.worst_score.toLocaleString()}</span>
                  <span className="analytics-summary-card__detail">{data.events.worst_event_name}</span>
                </div>
              )}

              {data.events.std_dev > 0 && (
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
                  <span className="analytics-summary-card__label">{t("playerConsistency")}</span>
                  <span className="analytics-summary-card__value">±{data.events.std_dev.toLocaleString()}</span>
                  <span className="analytics-summary-card__detail">{t("playerStdDev")}</span>
                </div>
              )}
            </div>

            {/* Event points bar chart + Event history table */}
            {eventChartData.length > 0 && (
              <div className="analytics-split-layout">
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
                  <ResponsiveContainer width="100%" height={Math.max(260, eventChartData.length * 30)}>
                    <BarChart
                      data={eventChartData}
                      layout="vertical"
                      margin={{ top: 4, right: 20, bottom: 4, left: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} horizontal={false} />
                      <XAxis
                        type="number"
                        tick={{ fill: CHART_AXIS, fontSize: 11 }}
                        axisLine={{ stroke: CHART_GRID }}
                        tickLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={130}
                        tick={{ fill: CHART_AXIS, fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip contentStyle={tooltipStyle()} cursor={{ fill: "rgba(240, 200, 60, 0.06)" }} />
                      <Bar dataKey="points" fill={CHART_GOLD} radius={[0, 4, 4, 0]} barSize={18} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

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
                      {t("playerEventHistory")}
                    </h4>
                  </div>
                  <section className="table player-event-history">
                    <header>
                      <span>{t("eventNameColumn")}</span>
                      <span>{t("eventDateColumn")}</span>
                      <span>{t("pointsColumn")}</span>
                    </header>
                    {(data.events.history ?? [])
                      .slice(-20)
                      .reverse()
                      .map((e, i) => (
                        <div className="row" key={`${e.date}-${i}`}>
                          <span title={e.event_name}>
                            {e.event_name.length > 24 ? e.event_name.slice(0, 24) + "…" : e.event_name}
                          </span>
                          <span>{e.date}</span>
                          <span>{e.event_points.toLocaleString()}</span>
                        </div>
                      ))}
                  </section>
                </div>
              </div>
            )}
          </>
        )}
      </DataState>
    </PageShell>
  );
}
