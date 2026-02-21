"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useSupabase } from "../hooks/use-supabase";
import useClanContext from "../hooks/use-clan-context";

interface EventResult {
  readonly player_name: string;
  readonly event_points: number;
  readonly game_account_id: string | null;
}

interface EventLinkedResultsProps {
  readonly eventId: string;
}

/**
 * Displays event results linked to a calendar event.
 * Fetches from the `event_results` production table.
 */
export default function EventLinkedResults({ eventId }: EventLinkedResultsProps): JSX.Element | null {
  const t = useTranslations("events");
  const supabase = useSupabase();
  const clanContext = useClanContext();
  const clanId = clanContext?.clanId;
  const [results, setResults] = useState<readonly EventResult[] | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) return null;
  if (!results || results.length === 0) return null;

  return (
    <div className="event-results-section">
      <h4 className="event-results-title">{t("eventResults")}</h4>
      <div className="table-scroll">
        <table className="event-results-table">
          <thead>
            <tr>
              <th>#</th>
              <th>{t("playerName")}</th>
              <th>{t("points")}</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r, i) => (
              <tr key={`${r.player_name}-${i}`}>
                <td className="text-muted">{i + 1}</td>
                <td>{r.player_name}</td>
                <td>{r.event_points.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 8, textAlign: "right" }}>
        <Link
          href={`/analytics/events?event=${encodeURIComponent(eventId)}`}
          className="text-[0.78rem] text-gold-2 no-underline"
          style={{ opacity: 0.85 }}
        >
          {t("viewFullResults")}
        </Link>
      </div>
    </div>
  );
}
