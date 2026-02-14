"use client";

import Image from "next/image";
import { useRef, useState, useCallback, useEffect } from "react";
import type { CalendarDay, DisplayEvent } from "./events-types";
import { EVENT_COLORS, WEEKDAY_LABELS } from "./events-types";
import { toDateString } from "@/lib/dashboard-utils";
import {
  formatDuration,
  formatDateRange,
  isMultiDayEvent,
  sortPinnedFirst,
  getShortTimeString,
  sortBannerEvents,
} from "./events-utils";
import DayPanelEventCard from "./day-panel-event-card";

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
  /** When set, auto-expand and highlight this event instead of the first one. */
  readonly highlightEventId?: string;
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

/* ── Time helpers ── */

/* shortTime is imported as getShortTimeString from events-utils */

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
    return getShortTimeString(event.starts_at, locale);
  }
  const startKey = toDateString(new Date(event.starts_at));
  const endKey = toDateString(new Date(event.ends_at));
  if (cellDateKey === startKey) {
    return t("fromTime", { time: getShortTimeString(event.starts_at, locale) });
  }
  if (cellDateKey === endKey) {
    return t("untilTime", { time: getShortTimeString(event.ends_at, locale) });
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

                /* Split banner: exactly 2 events with banners → show both side by side.
                   Left = starts sooner (or ends earlier if same start). */
                const bannerEvents = day.events.filter((e) => e.banner_url);
                const hasSplitBanner = bannerEvents.length === 2;
                let splitLeft: DisplayEvent | undefined;
                let splitRight: DisplayEvent | undefined;
                if (hasSplitBanner) {
                  const sorted = sortBannerEvents(bannerEvents);
                  splitLeft = sorted[0];
                  splitRight = sorted[1];
                }

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
                      hasSplitBanner ? "has-split-banner" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => handleDayClick(day)}
                    onMouseEnter={(e) => handleDayMouseEnter(e, day)}
                    onMouseLeave={handleDayMouseLeave}
                    style={
                      primaryBanner && !hasSplitBanner
                        ? ({ backgroundImage: `url(${primaryBanner})` } as React.CSSProperties)
                        : undefined
                    }
                  >
                    {/* Split banner: two event images stacked top/bottom */}
                    {hasSplitBanner && splitLeft?.banner_url && splitRight?.banner_url && (
                      <>
                        <span
                          className="calendar-split-top"
                          style={{ backgroundImage: `url(${splitLeft.banner_url})` }}
                        />
                        <span
                          className="calendar-split-bottom"
                          style={{ backgroundImage: `url(${splitRight.banner_url})` }}
                        />
                      </>
                    )}
                    {/* Day number badge */}
                    <span className="calendar-day-number">{day.date.getDate()}</span>
                    {/* Split mode: show title + time for both events, one per half */}
                    {hasSplitBanner && splitLeft && splitRight ? (
                      <>
                        <span className="calendar-split-info top">
                          <span className="calendar-split-title">{splitLeft.title}</span>
                          <span className="calendar-split-time">{cellTimeLabel(splitLeft, day.key, locale, t)}</span>
                        </span>
                        <span className="calendar-split-info bottom">
                          <span className="calendar-split-title">{splitRight.title}</span>
                          <span className="calendar-split-time">{cellTimeLabel(splitRight, day.key, locale, t)}</span>
                        </span>
                        {day.events.length > 2 && (
                          <span className="calendar-day-more-label">
                            {day.events.length - 2} {t("more")}…
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        {/* Single event: title + time at bottom of cell */}
                        {primaryEvent && primaryName && <span className="calendar-day-title">{primaryName}</span>}
                        {primaryEvent && (
                          <span className="calendar-day-time">{cellTimeLabel(primaryEvent, day.key, locale, t)}</span>
                        )}
                        {/* "X more…" for 3+ events without split */}
                        {day.events.length > 1 && (
                          <span className="calendar-day-more-label">
                            {day.events.length - 1} {t("more")}…
                          </span>
                        )}
                      </>
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
                          <span>{getShortTimeString(ev.starts_at, locale)}</span>
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
  highlightEventId,
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
    /* Prefer the highlighted event (from deep-link) over the first event. */
    const highlightMatch = highlightEventId ? sorted.find((e) => e.id === highlightEventId)?.displayKey : undefined;
    const expandKey = highlightMatch ?? sorted[0]?.displayKey;
    setExpandedKeys(expandKey ? new Set([expandKey]) : new Set());
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
          {visibleEvents.map((entry) => (
            <DayPanelEventCard
              key={`daypanel-${entry.displayKey}`}
              entry={entry}
              isExpanded={expandedKeys.has(entry.displayKey)}
              onToggleExpand={toggleExpand}
              onEditEvent={onEditEvent}
              onDeleteEvent={onDeleteEvent}
              onTogglePin={onTogglePin}
              canManage={canManage}
              locale={locale}
              t={t}
            />
          ))}

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
