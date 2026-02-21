"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import PageShell from "@/app/components/page-shell";
import DataState from "@/app/components/data-state";
import useClanContext from "@/app/hooks/use-clan-context";
import AnalyticsSubnav from "./analytics-subnav";

interface OverviewStats {
  readonly members_count: number;
  readonly total_power: number;
  readonly chests_this_week: number;
  readonly events_with_results: number;
}

export default function AnalyticsOverview(): JSX.Element {
  const t = useTranslations("analytics");
  const clanContext = useClanContext();
  const clanId = clanContext?.clanId;
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clanId) {
      setStats(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    async function load(): Promise<void> {
      try {
        const res = await fetch(`/api/analytics/stats?clan_id=${encodeURIComponent(clanId!)}`);
        if (!res.ok) throw new Error(`${res.status}`);
        const json = await res.json();
        if (!cancelled) setStats(json.data);
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
  }, [clanId]);

  return (
    <PageShell
      breadcrumb={t("breadcrumb")}
      title={t("title")}
      heroTitle={t("heroTitle")}
      heroSubtitle={t("heroSubtitle")}
      bannerSrc="/assets/banners/banner_gold_dragon.png"
    >
      <AnalyticsSubnav />

      <DataState
        isLoading={loading}
        error={error}
        isEmpty={!stats}
        loadingNode={<OverviewSkeleton />}
        emptyNode={<div className="py-8 text-sm text-text-muted text-center">{t("noData")}</div>}
      >
        {stats && (
          <div className="analytics-summary-grid">
            <Link href="/analytics/chests" className="analytics-summary-card">
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
              <span className="analytics-summary-card__label">{t("chestsThisWeek")}</span>
              <span className="analytics-summary-card__value">{stats.chests_this_week.toLocaleString()}</span>
              <span className="analytics-summary-card__detail">{t("chestsDetail")}</span>
            </Link>

            <Link href="/analytics/events" className="analytics-summary-card">
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
              <span className="analytics-summary-card__label">{t("eventsTracked")}</span>
              <span className="analytics-summary-card__value">{stats.events_with_results.toLocaleString()}</span>
              <span className="analytics-summary-card__detail">{t("eventsDetail")}</span>
            </Link>

            <Link href="/analytics/machtpunkte" className="analytics-summary-card">
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
              <span className="analytics-summary-card__label">{t("clanPower")}</span>
              <span className="analytics-summary-card__value">{stats.total_power.toLocaleString()}</span>
              <span className="analytics-summary-card__detail">
                {t("membersCount", { count: stats.members_count })}
              </span>
            </Link>
          </div>
        )}
      </DataState>
    </PageShell>
  );
}

function OverviewSkeleton(): JSX.Element {
  return (
    <div className="analytics-summary-grid">
      {[0, 1, 2].map((i) => (
        <div key={i} className="analytics-summary-card" style={{ minHeight: 130 }}>
          <div className="skeleton-line" style={{ width: 36, height: 36, borderRadius: 8 }} />
          <div className="skeleton-line" style={{ width: "40%", height: 12, marginTop: 6 }} />
          <div className="skeleton-line" style={{ width: "60%", height: 28, marginTop: 6 }} />
          <div className="skeleton-line" style={{ width: "70%", height: 12, marginTop: 6 }} />
        </div>
      ))}
    </div>
  );
}
