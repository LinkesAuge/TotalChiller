"use client";

import { formatLocalDateTime } from "../../lib/date-format";
import type { DisplayEvent } from "./events-types";
import { formatDuration, formatDateRange, isMultiDayEvent } from "./events-utils";

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

/** Returns a short weekday abbreviation and day number from a date string. */
function getDateParts(dateString: string, locale: string): { weekday: string; day: string; month: string } {
  const date = new Date(dateString);
  return {
    weekday: date.toLocaleDateString(locale, { weekday: "short" }),
    day: String(date.getDate()),
    month: date.toLocaleDateString(locale, { month: "short" }),
  };
}

/** Returns a short time string (HH:MM) from a date string. */
function getTimeString(dateString: string, locale: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}

/** Recurrence type label helper. */
function getRecurrenceLabel(recurrenceType: string, t: (key: string) => string): string {
  switch (recurrenceType) {
    case "daily":
      return t("recurrenceDailyLabel");
    case "weekly":
      return t("recurrenceWeeklyLabel");
    case "biweekly":
      return t("recurrenceBiweeklyLabel");
    case "monthly":
      return t("recurrenceMonthlyLabel");
    default:
      return "";
  }
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
            {pageEvents.map((entry) => {
              const dateParts = getDateParts(entry.starts_at, locale);
              return (
                <article
                  key={`upcoming-${entry.displayKey}`}
                  className={`upcoming-event-card${entry.banner_url ? " has-banner" : ""}`}
                  onClick={() => onSelectEvent(entry)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelectEvent(entry);
                    }
                  }}
                  style={{ cursor: "pointer" }}
                >
                  {entry.banner_url && (
                    <div className="upcoming-event-banner">
                      <img src={entry.banner_url} alt="" />
                    </div>
                  )}
                  <div className="upcoming-event-body">
                    <div className="upcoming-event-date-badge">
                      <span className="upcoming-event-date-weekday">{dateParts.weekday}</span>
                      <span className="upcoming-event-date-day">{dateParts.day}</span>
                      <span className="upcoming-event-date-month">{dateParts.month}</span>
                    </div>
                    <div className="upcoming-event-content">
                      <div className="upcoming-event-top-row">
                        <span className="upcoming-event-title">{entry.title}</span>
                        {entry.recurrence_type !== "none" && (
                          <span className="upcoming-event-recurrence">
                            {getRecurrenceLabel(entry.recurrence_type, t)}
                          </span>
                        )}
                      </div>
                      <div className="upcoming-event-meta">
                        <span className="upcoming-event-meta-item">
                          <svg
                            width="11"
                            height="11"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                          {isMultiDayEvent(entry.starts_at, entry.ends_at) ? (
                            formatDateRange(entry.starts_at, entry.ends_at, locale)
                          ) : (
                            <>
                              {getTimeString(entry.starts_at, locale)}
                              <span className="upcoming-event-duration">
                                ({formatDuration(entry.starts_at, entry.ends_at)})
                              </span>
                            </>
                          )}
                        </span>
                        {entry.location && (
                          <span className="upcoming-event-meta-item">
                            <svg
                              width="11"
                              height="11"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                              <circle cx="12" cy="10" r="3" />
                            </svg>
                            {entry.location}
                          </span>
                        )}
                        {entry.organizer && (
                          <span className="upcoming-event-meta-item">
                            <svg
                              width="11"
                              height="11"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                              <circle cx="12" cy="7" r="4" />
                            </svg>
                            {entry.organizer}
                          </span>
                        )}
                      </div>
                      {entry.author_name && (
                        <div className="upcoming-event-author">
                          {t("createdBy", { name: entry.author_name })}
                          {entry.created_at && (
                            <span className="upcoming-event-author-date">
                              {" · "}
                              {formatLocalDateTime(entry.created_at, locale)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    {canManage && (
                      <div className="upcoming-event-actions">
                        <button
                          className={`upcoming-event-pin${entry.is_pinned ? " active" : ""}`}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onTogglePin(entry.id, entry.is_pinned);
                          }}
                          aria-label={entry.is_pinned ? t("unpinEvent") : t("pinEvent")}
                          title={entry.is_pinned ? t("unpinEvent") : t("pinEvent")}
                        >
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
                            <path d="M12 2l2.09 6.26L21 9.27l-5 4.87L17.18 21 12 17.27 6.82 21 8 14.14l-5-4.87 6.91-1.01L12 2z" />
                          </svg>
                        </button>
                        <button
                          className="upcoming-event-edit"
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditEvent(entry.id);
                          }}
                          aria-label={t("editEvent")}
                          title={t("editEvent")}
                        >
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
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          className="upcoming-event-delete"
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteEvent(entry.id);
                          }}
                          aria-label={t("deleteEvent")}
                          title={t("deleteEvent")}
                        >
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
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
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
