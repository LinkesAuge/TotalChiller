"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useRef, useState, useCallback } from "react";
import { formatLocalDateTime } from "../../lib/date-format";
import type { CalendarDay, DisplayEvent } from "./events-types";
import { EVENT_COLORS, WEEKDAY_LABELS } from "./events-types";
import { formatDuration } from "./events-utils";

const AppMarkdown = dynamic(() => import("@/lib/markdown/app-markdown"), {
  loading: () => <div className="skeleton h-8 rounded" />,
});

export interface EventCalendarProps {
  readonly calendarMonth: Date;
  readonly calendarDays: readonly CalendarDay[];
  readonly selectedDateKey: string;
  readonly selectedDateLabel: string;
  readonly selectedDayEvents: readonly DisplayEvent[];
  readonly todayKey: string;
  readonly totalEventsCount: number;
  readonly onMonthShift: (offset: number) => void;
  readonly onDateSelect: (dayKey: string, day: CalendarDay) => void;
  readonly onJumpToToday: () => void;
  readonly onEditEvent: (eventId: string) => void;
  readonly canManage: boolean;
  readonly locale: string;
  readonly t: (key: string, values?: Record<string, string>) => string;
}

/* ── Inline SVG icons ── */

function ChevronIcon({ direction }: { readonly direction: "left" | "right" }): JSX.Element {
  const isLeft = direction === "left";
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {isLeft ? <polyline points="15 18 9 12 15 6" /> : <polyline points="9 6 15 12 9 18" />}
    </svg>
  );
}

function ClockIcon(): JSX.Element {
  return (
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
      className="calendar-detail-icon"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function MapPinIcon(): JSX.Element {
  return (
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
      className="calendar-detail-icon"
    >
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function UserIcon(): JSX.Element {
  return (
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
      className="calendar-detail-icon"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

/* ── Tooltip helper ── */

/** Format a short time string for tooltip display. */
function shortTime(isoString: string, locale: string): string {
  return new Date(isoString).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}

/* ── Component ── */

export function EventCalendar({
  calendarMonth,
  calendarDays,
  selectedDateKey,
  selectedDateLabel,
  selectedDayEvents,
  todayKey: _todayKey,
  totalEventsCount,
  onMonthShift,
  onDateSelect,
  onJumpToToday,
  onEditEvent,
  canManage,
  locale,
  t,
}: EventCalendarProps): JSX.Element {
  const dayPanelRef = useRef<HTMLElement>(null);

  /* Hover tooltip state */
  const [tooltipDay, setTooltipDay] = useState<CalendarDay | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const tooltipTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleDayMouseEnter = useCallback((event: React.MouseEvent, day: CalendarDay) => {
    if (day.events.length === 0) return;
    if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current);
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top });
    setTooltipDay(day);
  }, []);

  const handleDayMouseLeave = useCallback(() => {
    tooltipTimeout.current = setTimeout(() => setTooltipDay(null), 120);
  }, []);

  function handleDayClick(day: CalendarDay): void {
    onDateSelect(day.key, day);
    setTooltipDay(null);
    setTimeout(() => {
      dayPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 50);
  }

  return (
    <section className="card event-calendar-card">
      <div className="tooltip-head">
        <Image src="/assets/vip/back_tooltip_2.png" alt="" className="tooltip-head-bg" width={400} height={44} />
        <div className="tooltip-head-inner">
          <Image src="/assets/vip/batler_icons_stat_armor.png" alt={t("calendarOverview")} width={18} height={18} />
          <h3 className="card-title">{t("monthlyOverview")}</h3>
          <span className="pin-badge">
            {totalEventsCount} {t("totalEvents")}
          </span>
        </div>
      </div>
      <div className="event-calendar-body">
        <div className="event-calendar-layout">
          <div>
            <div className="calendar-toolbar">
              <div className="calendar-nav">
                <button
                  className="calendar-nav-arrow"
                  type="button"
                  onClick={() => onMonthShift(-1)}
                  aria-label={t("prev")}
                  title={t("prev")}
                >
                  <ChevronIcon direction="left" />
                </button>
                <div className="calendar-month-label">
                  {calendarMonth.toLocaleDateString(locale, { month: "long", year: "numeric" })}
                </div>
                <button
                  className="calendar-nav-arrow"
                  type="button"
                  onClick={() => onMonthShift(1)}
                  aria-label={t("next")}
                  title={t("next")}
                >
                  <ChevronIcon direction="right" />
                </button>
              </div>
              <button className="calendar-today-btn" type="button" onClick={onJumpToToday}>
                {t("today")}
              </button>
            </div>

            <div className="event-calendar-grid">
              {WEEKDAY_LABELS.map((weekday) => (
                <div key={weekday} className="calendar-weekday">
                  {t(`week${weekday}`)}
                </div>
              ))}
              {calendarDays.map((day) => {
                const hasEvents = day.events.length > 0;
                const firstBanner = day.events.find((entry) => entry.banner_url)?.banner_url ?? null;
                const firstEvent = hasEvents ? day.events[0] : undefined;
                const firstName = firstEvent?.title ?? null;
                return (
                  <button
                    key={day.key}
                    type="button"
                    className={[
                      "calendar-day-cell",
                      day.isCurrentMonth ? "" : "muted",
                      day.key === selectedDateKey ? "selected" : "",
                      day.isToday ? "today" : "",
                      hasEvents ? "has-events" : "",
                      firstBanner ? "has-banner" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => handleDayClick(day)}
                    onMouseEnter={(e) => handleDayMouseEnter(e, day)}
                    onMouseLeave={handleDayMouseLeave}
                    style={
                      firstBanner ? ({ backgroundImage: `url(${firstBanner})` } as React.CSSProperties) : undefined
                    }
                  >
                    {/* Day number badge — always has circle background for readability */}
                    <span className="calendar-day-number">{day.date.getDate()}</span>
                    {hasEvents && <span className="calendar-day-count">{day.events.length}</span>}
                    {/* Event title snippet at bottom of cell */}
                    {firstName && (
                      <span className="calendar-day-title">
                        {firstName}
                        {day.events.length > 1 && <span className="calendar-day-more">+{day.events.length - 1}</span>}
                      </span>
                    )}
                    {/* Colored dots for events without banners */}
                    {!firstBanner && hasEvents && (
                      <span className="calendar-day-dots">
                        {day.events.slice(0, 3).map((entry, index) => (
                          <span
                            key={`${day.key}-${entry.id}`}
                            className="calendar-dot"
                            style={{ background: EVENT_COLORS[index % EVENT_COLORS.length] }}
                          />
                        ))}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Hover tooltip */}
            {tooltipDay && tooltipDay.events.length > 0 && (
              <div
                className="calendar-tooltip"
                style={{ left: tooltipPos.x, top: tooltipPos.y }}
                onMouseEnter={() => {
                  if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current);
                }}
                onMouseLeave={handleDayMouseLeave}
              >
                <div className="calendar-tooltip-inner">
                  {tooltipDay.events.length === 1 && tooltipDay.events[0] ? (
                    /* Single event: show details */
                    (() => {
                      const ev = tooltipDay.events[0];
                      return (
                        <div className="calendar-tooltip-single">
                          <div className="calendar-tooltip-title">{ev.title}</div>
                          <div className="calendar-tooltip-meta">
                            <span>{shortTime(ev.starts_at, locale)}</span>
                            <span>{formatDuration(ev.starts_at, ev.ends_at)}</span>
                          </div>
                          {ev.location && <div className="calendar-tooltip-location">{ev.location}</div>}
                          {ev.organizer && <div className="calendar-tooltip-organizer">{ev.organizer}</div>}
                        </div>
                      );
                    })()
                  ) : (
                    /* Multiple events: list titles */
                    <div className="calendar-tooltip-multi">
                      {tooltipDay.events.map((entry) => (
                        <div key={entry.displayKey} className="calendar-tooltip-item">
                          <span className="calendar-tooltip-dot" style={{ background: EVENT_COLORS[0] }} />
                          <span className="calendar-tooltip-item-title">{entry.title}</span>
                          <span className="calendar-tooltip-item-time">{shortTime(entry.starts_at, locale)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Selected day detail panel below calendar */}
            <aside ref={dayPanelRef} className="calendar-day-panel calendar-day-panel--inline">
              <div className="calendar-day-panel-header">
                <div className="card-title mb-0">{t("selectedDay")}</div>
                <div className="calendar-day-panel-date">{selectedDateLabel}</div>
              </div>
              {selectedDayEvents.length === 0 ? (
                <div className="calendar-day-empty">{t("noEventsOnDay")}</div>
              ) : (
                <div className="calendar-day-events">
                  {selectedDayEvents.map((entry) => (
                    <article key={`calendar-${entry.displayKey}`} className="calendar-day-event">
                      {entry.banner_url && (
                        <div className="calendar-event-banner">
                          <img src={entry.banner_url} alt="" />
                        </div>
                      )}
                      <div className="calendar-day-event-header">
                        <div className="calendar-day-event-title">{entry.title}</div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {entry.recurrence_type && entry.recurrence_type !== "none" && (
                            <span className="badge text-[0.6rem]">
                              {entry.recurrence_type === "daily"
                                ? t("recurrenceDailyLabel")
                                : entry.recurrence_type === "weekly"
                                  ? t("recurrenceWeeklyLabel")
                                  : entry.recurrence_type === "biweekly"
                                    ? t("recurrenceBiweeklyLabel")
                                    : t("recurrenceMonthlyLabel")}
                            </span>
                          )}
                          {canManage && (
                            <button
                              className="calendar-day-event-edit"
                              type="button"
                              onClick={() => onEditEvent(entry.id)}
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
                          )}
                        </div>
                      </div>
                      <div className="calendar-day-event-details">
                        <div className="calendar-day-event-detail">
                          <ClockIcon />
                          <span>
                            {formatLocalDateTime(entry.starts_at, locale)} (
                            {formatDuration(entry.starts_at, entry.ends_at)})
                          </span>
                        </div>
                        {entry.organizer && (
                          <div className="calendar-day-event-detail">
                            <UserIcon />
                            <span>{entry.organizer}</span>
                          </div>
                        )}
                        {entry.location && (
                          <div className="calendar-day-event-detail">
                            <MapPinIcon />
                            <span>{entry.location}</span>
                          </div>
                        )}
                      </div>
                      {entry.description && (
                        <div className="calendar-day-event-description">
                          <AppMarkdown content={entry.description} />
                        </div>
                      )}
                      {entry.author_name && (
                        <div className="calendar-day-event-author">
                          {t("createdBy", { name: entry.author_name })}
                          {entry.created_at && (
                            <span className="calendar-day-event-date">
                              {" · "}
                              {formatLocalDateTime(entry.created_at, locale)}
                            </span>
                          )}
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </aside>
          </div>
        </div>
      </div>
    </section>
  );
}
