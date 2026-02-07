"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import useClanContext from "../components/use-clan-context";
import DatePicker from "../components/date-picker";
import AuthActions from "../components/auth-actions";
import SectionHero from "../components/section-hero";
import {
  ScoreLineChart,
  TopPlayersBar,
  ChestTypePie,
  PersonalScoreChart,
  SummaryPanel,
} from "./chart-components";
import type { ChartsApiResponse, ChartSummary } from "./chart-types";

/** Empty summary used as default before data loads. */
const EMPTY_SUMMARY: ChartSummary = {
  totalChests: 0,
  totalScore: 0,
  avgScore: 0,
  topChestType: "—",
  uniquePlayers: 0,
};

/** Empty chart data used as default. */
const EMPTY_DATA: ChartsApiResponse = {
  scoreOverTime: [],
  topPlayers: [],
  chestTypes: [],
  personalScore: [],
  summary: EMPTY_SUMMARY,
};

/**
 * Main charts page client component.
 * Fetches aggregated chart data from /api/charts and renders visualizations.
 */
function ChartsClient(): JSX.Element {
  const t = useTranslations("charts");
  const clanContext = useClanContext();
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [playerFilter, setPlayerFilter] = useState<string>("");
  const [sourceFilter, setSourceFilter] = useState<string>("");
  const [chartData, setChartData] = useState<ChartsApiResponse>(EMPTY_DATA);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async (): Promise<void> => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setIsLoading(true);
    setErrorMessage("");
    const params = new URLSearchParams();
    if (clanContext?.clanId) {
      params.set("clanId", clanContext.clanId);
    }
    if (clanContext?.gameAccountId) {
      params.set("gameAccountId", clanContext.gameAccountId);
    }
    if (dateFrom) {
      params.set("dateFrom", dateFrom);
    }
    if (dateTo) {
      params.set("dateTo", dateTo);
    }
    if (playerFilter.trim()) {
      params.set("player", playerFilter.trim());
    }
    if (sourceFilter.trim()) {
      params.set("source", sourceFilter.trim());
    }
    try {
      const response = await fetch(`/api/charts?${params.toString()}`, {
        signal: controller.signal,
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `HTTP ${response.status}`);
      }
      const data = (await response.json()) as ChartsApiResponse;
      if (!controller.signal.aborted) {
        setChartData(data);
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      const message = err instanceof Error ? err.message : t("loadError");
      if (!controller.signal.aborted) {
        setErrorMessage(message);
        setChartData(EMPTY_DATA);
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [clanContext?.clanId, clanContext?.gameAccountId, dateFrom, dateTo, playerFilter, sourceFilter]);

  useEffect(() => {
    void fetchData();
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, [fetchData]);

  function handleClearFilters(): void {
    setDateFrom("");
    setDateTo("");
    setPlayerFilter("");
    setSourceFilter("");
  }

  const hasFilters = Boolean(dateFrom || dateTo || playerFilter.trim() || sourceFilter.trim());

  return (
    <>
      {/* Top Bar */}
      <div className="top-bar">
        <img src="/assets/vip/header_3.png" alt="" className="top-bar-bg" width={1200} height={56} loading="eager" />
        <div className="top-bar-inner">
          <div>
            <div className="top-bar-breadcrumb">{t("breadcrumb")}</div>
            <h1 className="top-bar-title">{t("title")}</h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <AuthActions />
          </div>
        </div>
      </div>
      <SectionHero
        title={t("heroTitle")}
        subtitle={t("heroSubtitle")}
        bannerSrc="/assets/banners/banner_doomsday_708.png"
      />

      <div className="content-inner">
      <div className="grid">
        {/* ── Filters ── */}
        <section className="panel" style={{ gridColumn: "1 / -1" }}>
          <div className="card-title" style={{ marginBottom: 12 }}>{t("filters")}</div>
          <div className="filter-bar list inline" style={{ gap: 16, alignItems: "flex-end" }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="chart-date-from">{t("from")}</label>
              <DatePicker value={dateFrom} onChange={setDateFrom} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="chart-date-to">{t("to")}</label>
              <DatePicker value={dateTo} onChange={setDateTo} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="chart-player">{t("player")}</label>
              <input
                id="chart-player"
                type="text"
                placeholder={t("playerPlaceholder")}
                value={playerFilter}
                onChange={(e) => setPlayerFilter(e.target.value)}
                style={{ padding: "8px 12px", fontSize: "0.85rem", minWidth: 160 }}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="chart-source">{t("source")}</label>
              <input
                id="chart-source"
                type="text"
                placeholder={t("sourcePlaceholder")}
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                style={{ padding: "8px 12px", fontSize: "0.85rem", minWidth: 160 }}
              />
            </div>
            {hasFilters && (
              <button
                type="button"
                className="button"
                onClick={handleClearFilters}
                style={{ alignSelf: "flex-end" }}
              >
                {t("clear")}
              </button>
            )}
          </div>
        </section>

        {/* ── Error ── */}
        {errorMessage && (
          <div className="alert error" style={{ gridColumn: "1 / -1" }}>
            {errorMessage}
          </div>
        )}

        {/* ── Loading ── */}
        {isLoading && (
          <div
            className="alert info loading"
            style={{ gridColumn: "1 / -1" }}
          >
            {t("loadingCharts")}
          </div>
        )}

        {/* ── Summary Panel ── */}
        <section className="panel" style={{ gridColumn: "span 1" }}>
          <div className="card-title">{t("summary")}</div>
          <SummaryPanel summary={chartData.summary} />
        </section>

        {/* ── Personal Score ── */}
        <section className="card" style={{ gridColumn: "span 1" }}>
          <div className="card-header">
            <div>
              <div className="card-title">{t("personalScore")}</div>
              <div className="card-subtitle">{t("personalScoreSubtitle")}</div>
            </div>
            <span className="badge">{t("badgeLine")}</span>
          </div>
          <PersonalScoreChart data={chartData.personalScore} />
        </section>

        {/* ── Clan Score Over Time ── */}
        <section className="card">
          <div className="card-header">
            <div>
              <div className="card-title">{t("clanScoreOverTime")}</div>
              <div className="card-subtitle">
                {dateFrom || dateTo
                  ? `${dateFrom || t("start")} – ${dateTo || t("now")}`
                  : t("allTime")}
              </div>
            </div>
            <span className="badge">{t("badgeLine")}</span>
          </div>
          <ScoreLineChart data={chartData.scoreOverTime} />
        </section>

        {/* ── Top Players ── */}
        <section className="card">
          <div className="card-header">
            <div>
              <div className="card-title">{t("topPlayers")}</div>
              <div className="card-subtitle">{t("byTotalScore")}</div>
            </div>
            <span className="badge">{t("badgeBar")}</span>
          </div>
          <TopPlayersBar data={chartData.topPlayers} />
        </section>

        {/* ── Chest Type Distribution ── */}
        <section className="card" style={{ gridColumn: "1 / -1" }}>
          <div className="card-header">
            <div>
              <div className="card-title">{t("chestTypes")}</div>
              <div className="card-subtitle">{t("distributionByCount")}</div>
            </div>
            <span className="badge">{t("badgePie")}</span>
          </div>
          <ChestTypePie data={chartData.chestTypes} height={320} />
        </section>
      </div>
      </div>
    </>
  );
}

export default ChartsClient;
