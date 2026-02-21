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
import { TIMEZONE } from "@/lib/timezone";
import { useSupabase } from "../hooks/use-supabase";
import useClanContext from "../hooks/use-clan-context";
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
  readonly eventIdsWithResults: ReadonlySet<string>;
  readonly onFocusEventResults: (eventId: string, dateKey: string) => void;
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
  /** When set, auto-expand this event and scroll to its results section. */
  readonly focusResultsEventId?: string;
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

/** Format a date key (YYYY-MM-DD) for display in the calendar toolbar. */
function formatSelectedDateLabel(dateKey: string, locale: string): string {
  const d = new Date(dateKey + "T00:00:00");
  return d.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric", timeZone: TIMEZONE });
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

/** Render tooltip content for a single event. */
function TooltipSingleEvent({ ev, locale }: { ev: DisplayEvent; locale: string }): JSX.Element {
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
}

/* ── Results preview tooltip (lazy-fetches top 3 on mount) ── */

interface ResultsPreviewData {
  readonly topPlayers: readonly { player_name: string; event_points: number }[];
  readonly totalParticipants: number;
}

function ResultsPreviewTooltip({
  eventId,
  eventTitle,
  position,
  cache,
  t,
}: {
  readonly eventId: string;
  readonly eventTitle: string;
  readonly position: { x: number; y: number };
  readonly cache: React.MutableRefObject<Map<string, ResultsPreviewData>>;
  readonly t: (key: string, values?: Record<string, string>) => string;
}): JSX.Element {
  const supabase = useSupabase();
  const clanContext = useClanContext();
  const clanId = clanContext?.clanId;
  const [preview, setPreview] = useState<ResultsPreviewData | null>(() => cache.current.get(eventId) ?? null);
  const [loading, setLoading] = useState(!preview);

  useEffect(() => {
    if (preview || !clanId) return;
    let cancelled = false;

    async function fetchPreview(): Promise<void> {
      const { data, count } = await supabase
        .from("event_results")
        .select("player_name, event_points", { count: "exact" })
        .eq("linked_event_id", eventId)
        .eq("clan_id", clanId!)
        .order("event_points", { ascending: false })
        .limit(3);

      if (cancelled) return;
      const result: ResultsPreviewData = {
        topPlayers: (data ?? []) as { player_name: string; event_points: number }[],
        totalParticipants: count ?? 0,
      };
      cache.current.set(eventId, result);
      setPreview(result);
      setLoading(false);
    }

    void fetchPreview();
    return () => {
      cancelled = true;
    };
  }, [eventId, clanId, supabase, preview, cache]);

  return (
    <div className="calendar-results-tooltip" role="tooltip" style={{ left: position.x, top: position.y }}>
      <div className="calendar-results-tooltip-inner">
        <div className="calendar-results-tooltip-title">{eventTitle}</div>
        {loading ? (
          <div className="calendar-results-tooltip-loading">{t("loadingResults")}</div>
        ) : preview && preview.topPlayers.length > 0 ? (
          <>
            <div className="calendar-results-tooltip-list">
              {preview.topPlayers.map((p, i) => (
                <div key={`${p.player_name}-${i}`} className="calendar-results-tooltip-row">
                  <span className={`calendar-results-tooltip-rank${i < 3 ? ` top-${i + 1}` : ""}`}>{i + 1}</span>
                  <span className="calendar-results-tooltip-player">{p.player_name}</span>
                  <span className="calendar-results-tooltip-points">{p.event_points.toLocaleString()}</span>
                </div>
              ))}
            </div>
            {preview.totalParticipants > 3 && (
              <div className="calendar-results-tooltip-more">
                {preview.totalParticipants} {t("participants")}
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}

/** Inline trophy icon rendered next to time labels on cells with results. */
function ResultsIcon({
  event,
  dayKey,
  t,
  onFocus,
  onHoverEnter,
  onHoverLeave,
  setResultsTooltip,
}: {
  readonly event: DisplayEvent;
  readonly dayKey: string;
  readonly t: (key: string, values?: Record<string, string>) => string;
  readonly onFocus: (eventId: string, dateKey: string) => void;
  readonly onHoverEnter: (e: React.MouseEvent, eventId: string, eventTitle: string) => void;
  readonly onHoverLeave: () => void;
  readonly setResultsTooltip: React.Dispatch<
    React.SetStateAction<{ eventId: string; eventTitle: string; x: number; y: number } | null>
  >;
}): JSX.Element {
  return (
    <span
      className="calendar-results-icon"
      title={t("resultsAvailable")}
      onClick={(e) => {
        e.stopPropagation();
        setResultsTooltip(null);
        onFocus(event.id, dayKey);
      }}
      onMouseEnter={(e) => onHoverEnter(e, event.id, event.title)}
      onMouseLeave={onHoverLeave}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <rect x="1" y="14" width="6" height="8" rx="1" />
        <rect x="9" y="6" width="6" height="16" rx="1" />
        <rect x="17" y="10" width="6" height="12" rx="1" />
      </svg>
    </span>
  );
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
  eventIdsWithResults,
  onFocusEventResults,
  canManage: _canManage,
  locale,
  t,
}: EventCalendarProps): JSX.Element {
  /* Hover tooltip state */
  const [tooltipDay, setTooltipDay] = useState<CalendarDay | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const tooltipTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Results preview tooltip state */
  const [resultsTooltip, setResultsTooltip] = useState<{
    eventId: string;
    eventTitle: string;
    x: number;
    y: number;
  } | null>(null);
  const resultsTooltipTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultsCacheRef = useRef<Map<string, ResultsPreviewData>>(new Map());

  /* Clear tooltip timeout on unmount to prevent state updates after unmount */
  useEffect(() => {
    return () => {
      if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current);
      if (resultsTooltipTimeout.current) clearTimeout(resultsTooltipTimeout.current);
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
    setResultsTooltip(null);
  }

  const handleResultsBadgeEnter = useCallback((e: React.MouseEvent, eventId: string, eventTitle: string) => {
    e.stopPropagation();
    if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current);
    if (resultsTooltipTimeout.current) clearTimeout(resultsTooltipTimeout.current);
    setTooltipDay(null);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setResultsTooltip({ eventId, eventTitle, x: rect.left + rect.width / 2, y: rect.top });
  }, []);

  const handleResultsBadgeLeave = useCallback(() => {
    resultsTooltipTimeout.current = setTimeout(() => setResultsTooltip(null), 150);
  }, []);

  return (
    <section className="card event-calendar-card">
      <div className="tooltip-head">
        <Image
          src="/assets/vip/back_tooltip_2.png"
          alt=""
          className="tooltip-head-bg"
          fill
          sizes="(max-width: 900px) 90vw, 70vw"
        />
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
                  {calendarMonth.toLocaleDateString(locale, { month: "long", year: "numeric", timeZone: TIMEZONE })}
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
                {formatSelectedDateLabel(selectedDateKey, locale)}
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
                const resultsEvent = day.events.find((e) => eventIdsWithResults.has(e.id));

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
                          <span className="calendar-split-time">
                            {cellTimeLabel(splitLeft, day.key, locale, t)}
                            {eventIdsWithResults.has(splitLeft.id) && (
                              <ResultsIcon
                                event={splitLeft}
                                dayKey={day.key}
                                t={t}
                                onFocus={onFocusEventResults}
                                onHoverEnter={handleResultsBadgeEnter}
                                onHoverLeave={handleResultsBadgeLeave}
                                setResultsTooltip={setResultsTooltip}
                              />
                            )}
                          </span>
                        </span>
                        <span className="calendar-split-info bottom">
                          <span className="calendar-split-title">{splitRight.title}</span>
                          <span className="calendar-split-time">
                            {cellTimeLabel(splitRight, day.key, locale, t)}
                            {eventIdsWithResults.has(splitRight.id) && (
                              <ResultsIcon
                                event={splitRight}
                                dayKey={day.key}
                                t={t}
                                onFocus={onFocusEventResults}
                                onHoverEnter={handleResultsBadgeEnter}
                                onHoverLeave={handleResultsBadgeLeave}
                                setResultsTooltip={setResultsTooltip}
                              />
                            )}
                          </span>
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
                          <span className="calendar-day-time">
                            <span className="calendar-day-time-text">
                              {cellTimeLabel(primaryEvent, day.key, locale, t)}
                            </span>
                            {resultsEvent && (
                              <ResultsIcon
                                event={resultsEvent}
                                dayKey={day.key}
                                t={t}
                                onFocus={onFocusEventResults}
                                onHoverEnter={handleResultsBadgeEnter}
                                onHoverLeave={handleResultsBadgeLeave}
                                setResultsTooltip={setResultsTooltip}
                              />
                            )}
                          </span>
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
      {tooltipDay && tooltipDay.events.length > 0 && !resultsTooltip && (
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
              <TooltipSingleEvent ev={tooltipDay.events[0]} locale={locale} />
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
      {/* Results preview tooltip */}
      {resultsTooltip && (
        <ResultsPreviewTooltip
          eventId={resultsTooltip.eventId}
          eventTitle={resultsTooltip.eventTitle}
          position={{ x: resultsTooltip.x, y: resultsTooltip.y }}
          cache={resultsCacheRef}
          t={t}
        />
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
  focusResultsEventId,
}: EventDayPanelProps): JSX.Element {
  const panelRef = useRef<HTMLElement>(null);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [visibleCount, setVisibleCount] = useState(DAY_PANEL_PAGE_SIZE);
  const [activeFocusResultsId, setActiveFocusResultsId] = useState("");
  const clearFocusResults = useCallback(() => setActiveFocusResultsId(""), []);

  /** Reset visible count and expansion when selected day changes or the same day is re-clicked. */
  useEffect(() => {
    const sorted = sortPinnedFirst(selectedDayEvents);
    /* Prefer the highlighted event (from deep-link) over the first event. */
    const highlightMatch = highlightEventId ? sorted.find((e) => e.id === highlightEventId)?.displayKey : undefined;
    const expandKey = highlightMatch ?? sorted[0]?.displayKey;
    setExpandedKeys(expandKey ? new Set([expandKey]) : new Set());

    /* Ensure the highlighted event is visible (it may be beyond the default page size). */
    if (highlightMatch) {
      const idx = sorted.findIndex((e) => e.displayKey === highlightMatch);
      setVisibleCount((prev) => Math.max(prev, idx + 1, DAY_PANEL_PAGE_SIZE));
    } else {
      setVisibleCount(DAY_PANEL_PAGE_SIZE);
    }
  }, [selectionNonce, selectedDayEvents, highlightEventId]);

  useEffect(() => {
    if (!focusResultsEventId) return;
    setActiveFocusResultsId(focusResultsEventId);
  }, [focusResultsEventId, selectionNonce]);

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
              focusResults={activeFocusResultsId === entry.id}
              onResultsFocused={clearFocusResults}
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
