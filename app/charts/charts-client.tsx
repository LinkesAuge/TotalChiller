"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import useClanContext from "../components/use-clan-context";
import DatePicker from "../components/date-picker";
import AuthActions from "../components/auth-actions";
import PageTopBar from "../components/page-top-bar";
import SectionHero from "../components/section-hero";
import { ScoreLineChart, TopPlayersBar, ChestTypePie, PersonalScoreChart, SummaryPanel } from "./chart-components";
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
      <PageTopBar breadcrumb={t("breadcrumb")} title={t("title")} actions={<AuthActions />} />
      <SectionHero
        title={t("heroTitle")}
        subtitle={t("heroSubtitle")}
        bannerSrc="/assets/banners/banner_doomsday_708.png"
      />

      <div className="content-inner">
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
      </div>
    </>
  );
}

export default ChartsClient;
