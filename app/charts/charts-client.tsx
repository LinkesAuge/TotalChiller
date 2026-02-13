"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useTranslations } from "next-intl";
import useClanContext from "../hooks/use-clan-context";
import DatePicker from "../components/date-picker";
import PageShell from "../components/page-shell";
import { useChartsData } from "./use-charts-data";

const chartLoading = () => <div className="skeleton h-64 rounded-lg" />;

const ScoreLineChart = dynamic(() => import("./chart-components").then((mod) => mod.ScoreLineChart), {
  loading: chartLoading,
  ssr: false,
});

const TopPlayersBar = dynamic(() => import("./chart-components").then((mod) => mod.TopPlayersBar), {
  loading: chartLoading,
  ssr: false,
});

const ChestTypePie = dynamic(() => import("./chart-components").then((mod) => mod.ChestTypePie), {
  loading: chartLoading,
  ssr: false,
});

const PersonalScoreChart = dynamic(() => import("./chart-components").then((mod) => mod.PersonalScoreChart), {
  loading: chartLoading,
  ssr: false,
});

const SummaryPanel = dynamic(() => import("./chart-components").then((mod) => mod.SummaryPanel), {
  loading: chartLoading,
  ssr: false,
});

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

  const { chartData, isLoading, errorMessage } = useChartsData({
    clanId: clanContext?.clanId,
    gameAccountId: clanContext?.gameAccountId,
    dateFrom,
    dateTo,
    playerFilter,
    sourceFilter,
  });

  function handleClearFilters(): void {
    setDateFrom("");
    setDateTo("");
    setPlayerFilter("");
    setSourceFilter("");
  }

  const hasFilters = Boolean(dateFrom || dateTo || playerFilter.trim() || sourceFilter.trim());

  return (
    <PageShell
      breadcrumb={t("breadcrumb")}
      title={t("title")}
      heroTitle={t("heroTitle")}
      heroSubtitle={t("heroSubtitle")}
      bannerSrc="/assets/banners/banner_doomsday_708.png"
    >
      <div className="grid">
        {/* ── Filters ── */}
        <section className="panel col-span-full">
          <div className="card-title mb-3">{t("filters")}</div>
          <div className="filter-bar list inline" style={{ gap: 16, alignItems: "flex-end" }}>
            <div className="form-group mb-0">
              <label htmlFor="chart-date-from">{t("from")}</label>
              <DatePicker value={dateFrom} onChange={setDateFrom} />
            </div>
            <div className="form-group mb-0">
              <label htmlFor="chart-date-to">{t("to")}</label>
              <DatePicker value={dateTo} onChange={setDateTo} />
            </div>
            <div className="form-group mb-0">
              <label htmlFor="chart-player">{t("player")}</label>
              <input
                id="chart-player"
                type="text"
                placeholder={t("playerPlaceholder")}
                value={playerFilter}
                onChange={(e) => setPlayerFilter(e.target.value)}
                className="text-sm"
              />
            </div>
            <div className="form-group mb-0">
              <label htmlFor="chart-source">{t("source")}</label>
              <input
                id="chart-source"
                type="text"
                placeholder={t("sourcePlaceholder")}
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="text-sm"
              />
            </div>
            {hasFilters && (
              <button type="button" className="button" onClick={handleClearFilters} style={{ alignSelf: "flex-end" }}>
                {t("clear")}
              </button>
            )}
          </div>
        </section>

        {/* ── Error ── */}
        {errorMessage && <div className="alert error col-span-full">{errorMessage}</div>}

        {/* ── Loading ── */}
        {isLoading && <div className="alert info loading col-span-full">{t("loadingCharts")}</div>}

        {/* ── Summary Panel ── */}
        <section className="panel col-span-1">
          <div className="card-title">{t("summary")}</div>
          <SummaryPanel summary={chartData.summary} />
        </section>

        {/* ── Personal Score ── */}
        <section className="card col-span-1">
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
                {dateFrom || dateTo ? `${dateFrom || t("start")} – ${dateTo || t("now")}` : t("allTime")}
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
        <section className="card col-span-full">
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
    </PageShell>
  );
}

export default ChartsClient;
