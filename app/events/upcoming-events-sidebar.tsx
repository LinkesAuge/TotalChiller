"use client";

import type { DisplayEvent } from "./events-types";
import UpcomingEventCard from "./upcoming-event-card";

export interface UpcomingEventsSidebarProps {
  readonly upcomingEvents: readonly DisplayEvent[];
  readonly pageSize: number;
  readonly currentPage: number;
  readonly onPageChange: (page: number) => void;
  readonly onSelectEvent: (event: DisplayEvent) => void;
  readonly onEditEvent: (eventId: string) => void;
  readonly onDeleteEvent: (eventId: string) => void;
  readonly onTogglePin: (eventId: string, isPinned: boolean) => void;
  readonly canManage: boolean;
  readonly locale: string;
  readonly t: (key: string, values?: Record<string, string>) => string;
}

export function UpcomingEventsSidebar({
  upcomingEvents,
  pageSize,
  currentPage,
  onPageChange,
  onSelectEvent,
  onEditEvent,
  onDeleteEvent,
  onTogglePin,
  canManage,
  locale,
  t,
}: UpcomingEventsSidebarProps): JSX.Element {
  const totalPages = Math.max(1, Math.ceil(upcomingEvents.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const pageEvents = upcomingEvents.slice(startIdx, startIdx + pageSize);

  return (
    <section className="events-upcoming-sidebar">
      <div className="upcoming-sidebar-header">
        <h3 className="upcoming-sidebar-title">{t("upcoming")}</h3>
        <span className="upcoming-sidebar-count">{upcomingEvents.length}</span>
      </div>
      {upcomingEvents.length === 0 ? (
        <div className="upcoming-empty">{t("noEvents")}</div>
      ) : (
        <>
          <div className="events-upcoming-list">
            {pageEvents.map((entry) => (
              <UpcomingEventCard
                key={`upcoming-${entry.displayKey}`}
                entry={entry}
                onSelectEvent={onSelectEvent}
                onEditEvent={onEditEvent}
                onDeleteEvent={onDeleteEvent}
                onTogglePin={onTogglePin}
                canManage={canManage}
                locale={locale}
                t={t}
              />
            ))}
          </div>
          {/* Pagination controls */}
          {totalPages > 1 && (
            <div className="upcoming-pagination">
              <button
                className="upcoming-pagination-btn"
                type="button"
                disabled={safePage <= 1}
                onClick={() => onPageChange(safePage - 1)}
                aria-label={t("prev")}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <span className="upcoming-pagination-label">
                {safePage} / {totalPages}
              </span>
              <button
                className="upcoming-pagination-btn"
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => onPageChange(safePage + 1)}
                aria-label={t("next")}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="9 6 15 12 9 18" />
                </svg>
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
