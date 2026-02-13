"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useRef, useState, useCallback, useEffect } from "react";
import { formatLocalDateTime } from "../../lib/date-format";
import type { CalendarDay, DisplayEvent } from "./events-types";
import { EVENT_COLORS, WEEKDAY_LABELS } from "./events-types";
import { formatDuration, formatDateRange, isMultiDayEvent, sortPinnedFirst, toDateKey } from "./events-utils";

const AppMarkdown = dynamic(() => import("@/lib/markdown/app-markdown"), {
  loading: () => <div className="skeleton h-8 rounded" />,
});

/** How many event cards to show before requiring "show more". */
const DAY_PANEL_PAGE_SIZE = 3;

export interface EventCalendarProps {
  readonly calendarMonth: Date;
  readonly calendarDays: readonly CalendarDay[];
  readonly selectedDateKey: string;
  readonly todayKey: string;
  readonly totalEventsCount: number;
  readonly onMonthShift: (offset: number) => void;
  readonly onDateSelect: (dayKey: string, day: CalendarDay) => void;
  readonly onJumpToToday: () => void;
  readonly canManage: boolean;
  readonly locale: string;
  readonly t: (key: string, values?: Record<string, string>) => string;
}

export interface EventDayPanelProps {
  readonly selectedDateLabel: string;
  /** Incremented on every day-cell click so the panel resets even when the same day is re-selected. */
  readonly selectionNonce: number;
  readonly selectedDayEvents: readonly DisplayEvent[];
  readonly onEditEvent: (eventId: string) => void;
  readonly onDeleteEvent: (eventId: string) => void;
  readonly onTogglePin: (eventId: string, isPinned: boolean) => void;
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

/* ── Time helpers ── */

/** Format a short time string for tooltip display. */
function shortTime(isoString: string, locale: string): string {
  return new Date(isoString).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}

/**
 * Return the appropriate time label for a calendar cell based on the cell's
 * position within a multi-day event:
 *  - First day  → start time  (e.g. "12:00")
 *  - Last day   → "bis 13:00" / "until 13:00"
 *  - Middle day → "Ganztägig" / "All day"
 *  - Single-day → start time
 */
function cellTimeLabel(
  event: DisplayEvent,
  cellDateKey: string,
  locale: string,
  t: (key: string, values?: Record<string, string>) => string,
): string {
  if (!isMultiDayEvent(event.starts_at, event.ends_at)) {
    return shortTime(event.starts_at, locale);
  }
  const startKey = toDateKey(new Date(event.starts_at));
  const endKey = toDateKey(new Date(event.ends_at));
  if (cellDateKey === startKey) {
    return t("fromTime", { time: shortTime(event.starts_at, locale) });
  }
  if (cellDateKey === endKey) {
    return t("untilTime", { time: shortTime(event.ends_at, locale) });
  }
  return t("allDay");
}

/* ── Component ── */

export function EventCalendar({
  calendarMonth,
  calendarDays,
  selectedDateKey,
  todayKey: _todayKey,
  totalEventsCount,
  onMonthShift,
  onDateSelect,
  onJumpToToday,
  canManage: _canManage,
  locale,
  t,
}: EventCalendarProps): JSX.Element {
  /* Hover tooltip state */
  const [tooltipDay, setTooltipDay] = useState<CalendarDay | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const tooltipTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Clear tooltip timeout on unmount to prevent state updates after unmount */
  useEffect(() => {
    return () => {
      if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current);
    };
  }, []);

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
              <button className="calendar-today-btn selected-day-label" type="button" onClick={onJumpToToday}>
                {(() => {
                  const d = new Date(selectedDateKey + "T00:00:00");
                  return d.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });
                })()}
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
                /* Prefer pinned event for display; fall back to first event */
                const pinnedEvent = day.events.find((e) => e.is_pinned);
                const primaryEvent = pinnedEvent ?? (hasEvents ? day.events[0] : undefined);
                const primaryBanner = primaryEvent?.banner_url ?? null;
                const primaryName = primaryEvent?.title ?? null;
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
                      primaryBanner ? "has-banner" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => handleDayClick(day)}
                    onMouseEnter={(e) => handleDayMouseEnter(e, day)}
                    onMouseLeave={handleDayMouseLeave}
                    style={
                      primaryBanner ? ({ backgroundImage: `url(${primaryBanner})` } as React.CSSProperties) : undefined
                    }
                  >
                    {/* Day number badge — always has circle background for readability */}
                    <span className="calendar-day-number">{day.date.getDate()}</span>
                    {hasEvents && <span className="calendar-day-count">{day.events.length}</span>}
                    {/* Event title + time snippet at bottom of cell */}
                    {primaryEvent && primaryName && (
                      <span className="calendar-day-title">
                        {primaryName}
                        {day.events.length > 1 && <span className="calendar-day-more">+{day.events.length - 1}</span>}
                      </span>
                    )}
                    {primaryEvent && (
                      <span className="calendar-day-time">{cellTimeLabel(primaryEvent, day.key, locale, t)}</span>
                    )}
                    {/* Colored dots for events without banners */}
                    {!primaryBanner && hasEvents && (
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
          </div>
        </div>
      </div>
      {/* Hover tooltip — rendered outside calendar-body to avoid position:relative offset */}
      {tooltipDay && tooltipDay.events.length > 0 && (
        <div
          className="calendar-tooltip"
          role="tooltip"
          style={{ left: tooltipPos.x, top: tooltipPos.y }}
          onMouseEnter={() => {
            if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current);
          }}
          onMouseLeave={handleDayMouseLeave}
        >
          <div className="calendar-tooltip-inner">
            {tooltipDay.events.length === 1 && tooltipDay.events[0] ? (
              (() => {
                const ev = tooltipDay.events[0];
                return (
                  <div className="calendar-tooltip-single">
                    <div className="calendar-tooltip-title">{ev.title}</div>
                    <div className="calendar-tooltip-meta">
                      {isMultiDayEvent(ev.starts_at, ev.ends_at) ? (
                        <span>{formatDateRange(ev.starts_at, ev.ends_at, locale)}</span>
                      ) : (
                        <>
                          <span>{shortTime(ev.starts_at, locale)}</span>
                          <span>{formatDuration(ev.starts_at, ev.ends_at)}</span>
                        </>
                      )}
                    </div>
                    {ev.location && <div className="calendar-tooltip-location">{ev.location}</div>}
                    {ev.organizer && <div className="calendar-tooltip-organizer">{ev.organizer}</div>}
                  </div>
                );
              })()
            ) : (
              <div className="calendar-tooltip-multi">
                {tooltipDay.events.map((entry) => (
                  <div key={entry.displayKey} className="calendar-tooltip-item">
                    <span className="calendar-tooltip-dot" style={{ background: EVENT_COLORS[0] }} />
                    <span className="calendar-tooltip-item-title">{entry.title}</span>
                    <span className="calendar-tooltip-item-time">
                      {cellTimeLabel(entry, tooltipDay.key, locale, t)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

/* ══════════════════════════════════════════════════════════
   EventDayPanel — selected day detail (rendered separately)
   ══════════════════════════════════════════════════════════ */

/** Recurrence label helper (same logic as sidebar). */
function recurrenceLabel(type: string, t: (k: string) => string): string {
  switch (type) {
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

/** Returns weekday / day / month parts for the date badge. */
function dateBadgeParts(isoString: string, locale: string): { weekday: string; day: string; month: string } {
  const d = new Date(isoString);
  return {
    weekday: d.toLocaleDateString(locale, { weekday: "short" }),
    day: String(d.getDate()),
    month: d.toLocaleDateString(locale, { month: "short" }),
  };
}

export function EventDayPanel({
  selectedDateLabel,
  selectionNonce,
  selectedDayEvents,
  onEditEvent,
  onDeleteEvent,
  onTogglePin,
  canManage,
  locale,
  t,
}: EventDayPanelProps): JSX.Element {
  const panelRef = useRef<HTMLElement>(null);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [visibleCount, setVisibleCount] = useState(DAY_PANEL_PAGE_SIZE);
  /* Initialize to -1 so the auto-expand block fires on the first render
     (nonce starts at 0), fixing today's events staying collapsed on page load.
     Subsequent clicks always increment nonce, so re-clicking the same day
     also triggers the expansion. */
  const [prevNonce, setPrevNonce] = useState(-1);

  /** Toggle expand/collapse for a single event card. */
  function toggleExpand(displayKey: string): void {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(displayKey)) {
        next.delete(displayKey);
      } else {
        next.add(displayKey);
      }
      return next;
    });
  }

  /** Reset visible count and expansion when selected day changes or the same day is re-clicked. */
  if (prevNonce !== selectionNonce) {
    setPrevNonce(selectionNonce);
    setVisibleCount(DAY_PANEL_PAGE_SIZE);
    const sorted = sortPinnedFirst(selectedDayEvents);
    const firstKey = sorted[0]?.displayKey;
    setExpandedKeys(firstKey ? new Set([firstKey]) : new Set());
  }

  const sortedEvents = sortPinnedFirst(selectedDayEvents);
  const visibleEvents = sortedEvents.slice(0, visibleCount);
  const hasMore = sortedEvents.length > visibleCount;

  return (
    <aside ref={panelRef} className="calendar-day-panel">
      <div className="calendar-day-panel-header">
        <div className="card-title mb-0">{t("selectedDay")}</div>
        <div className="calendar-day-panel-date">{selectedDateLabel}</div>
      </div>
      {sortedEvents.length === 0 ? (
        <div className="calendar-day-empty">{t("noEventsOnDay")}</div>
      ) : (
        <div className="calendar-day-events">
          {visibleEvents.map((entry) => {
            const isExpanded = expandedKeys.has(entry.displayKey);
            const dp = dateBadgeParts(entry.starts_at, locale);
            return (
              <article
                key={`daypanel-${entry.displayKey}`}
                className={`day-panel-card${isExpanded ? " expanded" : ""}${entry.is_pinned ? " pinned" : ""}`}
              >
                {/* ── Full banner when expanded ── */}
                {isExpanded && entry.banner_url && (
                  <div className="day-panel-full-banner">
                    <img src={entry.banner_url} alt="" />
                  </div>
                )}

                {/* ── Collapsed card header (always visible) ── */}
                <div
                  className="day-panel-card-row"
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleExpand(entry.displayKey)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleExpand(entry.displayKey);
                    }
                  }}
                >
                  {/* Small banner strip only when collapsed */}
                  {!isExpanded && entry.banner_url && (
                    <div className="day-panel-card-banner">
                      <img src={entry.banner_url} alt="" />
                    </div>
                  )}
                  <div className="day-panel-card-body">
                    {/* Date badge */}
                    <div className="day-panel-date-badge">
                      <span className="day-panel-date-weekday">{dp.weekday}</span>
                      <span className="day-panel-date-day">{dp.day}</span>
                      <span className="day-panel-date-month">{dp.month}</span>
                    </div>
                    {/* Content */}
                    <div className="day-panel-card-content">
                      <div className="day-panel-card-top">
                        <span className="day-panel-card-title">{entry.title}</span>
                        <div className="day-panel-card-badges">
                          {entry.is_pinned && <span className="day-panel-pin-badge">{t("pinned")}</span>}
                          {entry.recurrence_type !== "none" && (
                            <span className="day-panel-recurrence-badge">
                              {recurrenceLabel(entry.recurrence_type, t)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="day-panel-card-meta">
                        {isMultiDayEvent(entry.starts_at, entry.ends_at) ? (
                          <span className="day-panel-meta-item">
                            <ClockIcon />
                            {formatDateRange(entry.starts_at, entry.ends_at, locale)}
                          </span>
                        ) : (
                          <span className="day-panel-meta-item">
                            <ClockIcon />
                            {shortTime(entry.starts_at, locale)}
                            <span className="day-panel-meta-dim">
                              ({formatDuration(entry.starts_at, entry.ends_at)})
                            </span>
                          </span>
                        )}
                        {entry.location && (
                          <span className="day-panel-meta-item">
                            <MapPinIcon />
                            {entry.location}
                          </span>
                        )}
                        {entry.organizer && (
                          <span className="day-panel-meta-item">
                            <UserIcon />
                            {entry.organizer}
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Action buttons + chevron */}
                    <div className="day-panel-card-actions">
                      {canManage && (
                        <>
                          <button
                            className={`day-panel-action-btn pin${entry.is_pinned ? " active" : ""}`}
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
                            className="day-panel-action-btn"
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
                            className="day-panel-action-btn danger"
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
                        </>
                      )}
                      {entry.forum_post_id && (
                        <a
                          className="day-panel-action-btn"
                          href={`/forum?post=${entry.forum_post_id}`}
                          onClick={(e) => e.stopPropagation()}
                          aria-label={t("goToThread")}
                          title={t("goToThread")}
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
                            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                          </svg>
                        </a>
                      )}
                      <span className={`day-panel-chevron${isExpanded ? " open" : ""}`}>
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
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </span>
                    </div>
                  </div>
                </div>

                {/* ── Expanded content ── */}
                {isExpanded && (
                  <div className="day-panel-expanded">
                    {entry.description && (
                      <div className="day-panel-expanded-description">
                        <AppMarkdown content={entry.description} />
                      </div>
                    )}
                    {entry.forum_post_id && (
                      <a
                        className="day-panel-discuss-btn"
                        href={`/forum?post=${entry.forum_post_id}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <svg
                          width="15"
                          height="15"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                        </svg>
                        {t("goToThread")}
                      </a>
                    )}
                    <div className="day-panel-expanded-footer">
                      {entry.author_name && (
                        <span className="day-panel-expanded-author">
                          {entry.updated_at && entry.updated_at !== entry.created_at
                            ? t("editedBy", { name: entry.author_name })
                            : t("createdBy", { name: entry.author_name })}
                          {(entry.updated_at || entry.created_at) && (
                            <span className="day-panel-expanded-date">
                              {" · "}
                              {formatLocalDateTime(entry.updated_at ?? entry.created_at, locale)}
                            </span>
                          )}
                        </span>
                      )}
                      <button
                        className="day-panel-collapse-btn"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpand(entry.displayKey);
                        }}
                      >
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
                        >
                          <polyline points="18 15 12 9 6 15" />
                        </svg>
                        {t("hide")}
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}

          {/* Show more button */}
          {hasMore && (
            <button
              className="calendar-day-show-more"
              type="button"
              onClick={() => setVisibleCount((prev) => prev + DAY_PANEL_PAGE_SIZE)}
            >
              {t("show")} ({sortedEvents.length - visibleCount} {t("more")})
            </button>
          )}
        </div>
      )}
    </aside>
  );
}
