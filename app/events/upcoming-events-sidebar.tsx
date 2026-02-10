"use client";

import { formatLocalDateTime } from "../../lib/date-format";
import type { DisplayEvent } from "./events-types";
import { formatDuration } from "./events-utils";

export interface UpcomingEventsSidebarProps {
  readonly upcomingEvents: readonly DisplayEvent[];
  readonly upcomingLimit: number;
  readonly onShowMore: () => void;
  readonly onEditEvent: (eventId: string) => void;
  readonly canManage: boolean;
  readonly locale: string;
  readonly t: (key: string, values?: Record<string, string>) => string;
}

export function UpcomingEventsSidebar({
  upcomingEvents,
  upcomingLimit,
  onShowMore,
  onEditEvent,
  canManage,
  locale,
  t,
}: UpcomingEventsSidebarProps): JSX.Element {
  return (
    <section className="events-upcoming-sidebar">
      <div className="card-title mb-2.5">
        {t("upcoming")} ({upcomingEvents.length})
      </div>
      {upcomingEvents.length === 0 ? (
        <div className="text-muted text-sm">{t("noEvents")}</div>
      ) : (
        <div className="events-upcoming-list">
          {upcomingEvents.slice(0, upcomingLimit).map((entry) => (
            <div key={`upcoming-${entry.displayKey}`} className="events-upcoming-row">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-[0.84rem]">{entry.title}</span>
                  {entry.recurrence_type !== "none" && (
                    <span className="badge text-[0.58rem]">
                      {entry.recurrence_type === "daily"
                        ? t("recurrenceDailyLabel")
                        : entry.recurrence_type === "weekly"
                          ? t("recurrenceWeeklyLabel")
                          : entry.recurrence_type === "biweekly"
                            ? t("recurrenceBiweeklyLabel")
                            : t("recurrenceMonthlyLabel")}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-[0.72rem] text-text-2">
                  {formatLocalDateTime(entry.starts_at, locale)} ({formatDuration(entry.starts_at, entry.ends_at)})
                  {entry.location && <> &bull; {entry.location}</>}
                  {entry.organizer && <> &bull; {entry.organizer}</>}
                </div>
                {entry.author_name && (
                  <div className="mt-0.5 text-[0.66rem] text-text-2">{t("createdBy", { name: entry.author_name })}</div>
                )}
              </div>
              {canManage && (
                <button className="button py-0.5 px-2" type="button" onClick={() => onEditEvent(entry.id)}>
                  {t("editEvent")}
                </button>
              )}
            </div>
          ))}
          {upcomingEvents.length > upcomingLimit && (
            <button className="button mt-1 self-center" type="button" onClick={onShowMore}>
              {t("show")} ({upcomingEvents.length - upcomingLimit} {t("more")})
            </button>
          )}
        </div>
      )}
    </section>
  );
}
