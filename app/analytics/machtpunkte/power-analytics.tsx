"use client";

import { useEffect, useState, useRef } from "react";
import { useTranslations } from "next-intl";
import PageShell from "@/app/components/page-shell";
import DataState from "@/app/components/data-state";
import PaginationBar from "@/app/components/pagination-bar";
import useClanContext from "@/app/hooks/use-clan-context";
import { usePagination } from "@/lib/hooks/use-pagination";
import AnalyticsSubnav from "../analytics-subnav";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";

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

interface PowerResponse {
  readonly standings: Standing[];
  readonly history: HistoryEntry[];
  readonly clan_total: number;
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
  if (delta > 0) return <span className="delta positive">+{delta.toLocaleString()}</span>;
  if (delta < 0) return <span className="delta negative">{delta.toLocaleString()}</span>;
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

  const [data, setData] = useState<PowerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [playerFilter, setPlayerFilter] = useState("");
  const [debouncedFilter, setDebouncedFilter] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>();

  const pagination = usePagination(data?.total ?? 0, 50);
  const { page, pageSize, setPage } = pagination;

  /* Debounce player search input */
  function handleFilterChange(value: string) {
    setPlayerFilter(value);
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedFilter(value);
      setPage(1);
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
        page: String(page),
        page_size: String(pageSize),
      });
      if (debouncedFilter) {
        params.set("player", debouncedFilter);
      }

      try {
        const res = await fetch(`/api/analytics/machtpunkte?${params}`);
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
  }, [clanId, page, pageSize, debouncedFilter, retryCount]);

  const standings = data?.standings ?? [];
  const isEmpty = !loading && !error && standings.length === 0;
  const { data: chartData, players: chartPlayers } = data?.history?.length
    ? buildChartData(data.history)
    : { data: [], players: [] };

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
        {/* ── Clan total card ── */}
        {data && (
          <div className="analytics-summary-grid" style={{ marginBottom: 24 }}>
            <div className="analytics-summary-card">
              <span className="analytics-summary-card__label">{t("clanTotal")}</span>
              <span className="analytics-summary-card__value">{data.clan_total.toLocaleString()}</span>
              <span className="analytics-summary-card__detail">{t("powerTitle")}</span>
            </div>
          </div>
        )}

        {/* ── Line chart ── */}
        {chartData.length > 0 && (
          <div className="analytics-chart-wrapper">
            <h4>{t("chartPowerHistory")}</h4>
            <ResponsiveContainer width="100%" height={320}>
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

        {/* ── Player search ── */}
        <div className="analytics-filters">
          <div className="filter-group">
            <label className="filter-label" htmlFor="power-player-filter">
              {t("filterPlayer")}
            </label>
            <input
              id="power-player-filter"
              type="text"
              value={playerFilter}
              onChange={(e) => handleFilterChange(e.target.value)}
              placeholder={t("filterPlayer")}
              className="input"
            />
          </div>
        </div>

        {/* ── Standings table ── */}
        {standings.length > 0 && (
          <>
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
                  <span>{s.player_name}</span>
                  <span>{s.score.toLocaleString()}</span>
                  <span>{s.previous_score !== null ? s.previous_score.toLocaleString() : "—"}</span>
                  <span>
                    <DeltaIndicator delta={s.delta} />
                  </span>
                </div>
              ))}
            </div>

            <PaginationBar pagination={pagination} idPrefix="power" />
          </>
        )}
      </DataState>
    </PageShell>
  );
}
