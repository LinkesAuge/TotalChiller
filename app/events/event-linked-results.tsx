"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useSupabase } from "../hooks/use-supabase";
import useClanContext from "../hooks/use-clan-context";
import { TIMEZONE } from "@/lib/timezone";

interface EventResult {
  readonly player_name: string;
  readonly event_points: number;
  readonly game_account_id: string | null;
}

interface EventLinkedResultsProps {
  readonly eventId: string;
  readonly eventDate?: string | null;
  readonly locale?: string;
  readonly autoScrollIntoView?: boolean;
  readonly onScrollComplete?: () => void;
}

const COLLAPSED_COUNT = 10;

function formatEventDate(iso: string, locale: string): string {
  try {
    return new Date(iso).toLocaleDateString(locale === "de" ? "de-DE" : "en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: TIMEZONE,
    });
  } catch {
    return iso;
  }
}

function rankClass(rank: number): string {
  if (rank === 1) return "elr-rank top-1";
  if (rank === 2) return "elr-rank top-2";
  if (rank === 3) return "elr-rank top-3";
  return "elr-rank";
}

export default function EventLinkedResults({
  eventId,
  eventDate,
  locale = "de",
  autoScrollIntoView,
  onScrollComplete,
}: EventLinkedResultsProps): JSX.Element | null {
  const t = useTranslations("events");
  const supabase = useSupabase();
  const clanContext = useClanContext();
  const clanId = clanContext?.clanId;
  const sectionRef = useRef<HTMLDivElement>(null);
  const [results, setResults] = useState<readonly EventResult[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!clanId) {
      setResults(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    async function load(): Promise<void> {
      const { data, error } = await supabase
        .from("event_results")
        .select("player_name, event_points, game_account_id")
        .eq("linked_event_id", eventId)
        .eq("clan_id", clanId!)
        .order("event_points", { ascending: false })
        .limit(200);

      if (cancelled) return;
      if (error || !data || data.length === 0) {
        setResults(null);
      } else {
        setResults(data as unknown as EventResult[]);
      }
      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [eventId, clanId, supabase]);

  useEffect(() => {
    if (autoScrollIntoView && results && results.length > 0 && sectionRef.current) {
      requestAnimationFrame(() => {
        sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        onScrollComplete?.();
      });
    }
  }, [autoScrollIntoView, results, onScrollComplete]);

  if (loading) return null;
  if (!results || results.length === 0) return null;

  const totalPoints = results.reduce((sum, r) => sum + r.event_points, 0);
  const canCollapse = results.length > COLLAPSED_COUNT;
  const shown = collapsed ? results.slice(0, COLLAPSED_COUNT) : results;
  const hiddenCount = results.length - COLLAPSED_COUNT;

  return (
    <div ref={sectionRef} className="elr-section">
      {/* Header with title and date */}
      <div className="elr-header">
        <h4 className="elr-title">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          {t("eventResults")}
        </h4>
        {eventDate && (
          <span className="elr-date">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {formatEventDate(eventDate, locale)}
          </span>
        )}
      </div>

      {/* Summary stats bar */}
      <div className="elr-stats">
        <div className="elr-stat">
          <span className="elr-stat-value">{results.length}</span>
          <span className="elr-stat-label">{t("participants")}</span>
        </div>
        <div className="elr-stat-divider" />
        <div className="elr-stat">
          <span className="elr-stat-value">{totalPoints.toLocaleString()}</span>
          <span className="elr-stat-label">{t("totalPoints")}</span>
        </div>
      </div>

      {/* Ranking list */}
      <div className="elr-ranking">
        {shown.map((r, i) => {
          const rank = i + 1;
          return (
            <div className={`elr-row${rank <= 3 ? " elr-row-top" : ""}`} key={`${r.player_name}-${i}`}>
              <span className={rankClass(rank)}>{rank}</span>
              <span className="elr-player">{r.player_name}</span>
              <span className="elr-points">{r.event_points.toLocaleString()}</span>
            </div>
          );
        })}
        {canCollapse && (
          <button type="button" className="elr-toggle-btn" onClick={() => setCollapsed((c) => !c)}>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className={`elr-toggle-chevron${collapsed ? "" : " open"}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
            {collapsed ? `${t("expandResults")} (+${hiddenCount})` : t("collapseResults")}
          </button>
        )}
      </div>

      {/* Analytics button */}
      <Link href={`/analytics/events?event=${encodeURIComponent(eventId)}`} className="elr-analytics-btn">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="12" width="4" height="9" rx="1" />
          <rect x="10" y="7" width="4" height="14" rx="1" />
          <rect x="17" y="3" width="4" height="18" rx="1" />
        </svg>
        {t("viewAnalytics")}
      </Link>
    </div>
  );
}
