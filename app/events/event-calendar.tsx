"use client";

import Image from "next/image";
import { useRef } from "react";
import { formatLocalDateTime } from "../../lib/date-format";
import type { CalendarDay, DisplayEvent } from "./events-types";
import { EVENT_COLORS, WEEKDAY_LABELS } from "./events-types";
import { formatDuration } from "./events-utils";

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

  function handleDayClick(day: CalendarDay): void {
    onDateSelect(day.key, day);
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
        <Image src="/assets/vip/backs_21.png" alt="" className="event-calendar-bg" width={800} height={600} />
        <div className="event-calendar-layout">
          <div>
            <div className="calendar-toolbar">
              <div className="calendar-nav">
                <button className="button" type="button" onClick={() => onMonthShift(-1)}>
                  {t("prev")}
                </button>
                <div className="calendar-month-label">
                  {calendarMonth.toLocaleDateString(locale, { month: "long", year: "numeric" })}
                </div>
                <button className="button" type="button" onClick={() => onMonthShift(1)}>
                  {t("next")}
                </button>
              </div>
              <button className="button" type="button" onClick={onJumpToToday}>
                {t("today")}
              </button>
            </div>

            <div className="event-calendar-grid">
              {WEEKDAY_LABELS.map((weekday) => (
                <div key={weekday} className="calendar-weekday">
                  {t(`week${weekday}`)}
                </div>
              ))}
              {calendarDays.map((day) => (
                <button
                  key={day.key}
                  type="button"
                  className={[
                    "calendar-day-cell",
                    day.isCurrentMonth ? "" : "muted",
                    day.key === selectedDateKey ? "selected" : "",
                    day.isToday ? "today" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => handleDayClick(day)}
                >
                  <span className="calendar-day-number">{day.date.getDate()}</span>
                  {day.events.length > 0 && <span className="calendar-day-count">{day.events.length}</span>}
                  <span className="calendar-day-dots">
                    {day.events.slice(0, 3).map((entry, index) => (
                      <span
                        key={`${day.key}-${entry.id}`}
                        className="calendar-dot"
                        style={{
                          background: EVENT_COLORS[index % EVENT_COLORS.length],
                        }}
                      />
                    ))}
                  </span>
                </button>
              ))}
            </div>

            {/* Selected day detail (shown below calendar on compact layouts) */}
            <aside ref={dayPanelRef} className="calendar-day-panel calendar-day-panel--inline">
              <div className="card-title mb-1.5">{t("selectedDay")}</div>
              <div className="card-subtitle mt-0">{selectedDateLabel}</div>
              {selectedDayEvents.length === 0 ? (
                <div className="text-muted mt-3 text-sm">{t("noEventsOnDay")}</div>
              ) : (
                <div className="calendar-day-events">
                  {selectedDayEvents.map((entry) => (
                    <article key={`calendar-${entry.displayKey}`} className="calendar-day-event">
                      <div className="calendar-day-event-title">{entry.title}</div>
                      <div className="calendar-day-event-time">
                        {formatLocalDateTime(entry.starts_at, locale)} ({formatDuration(entry.starts_at, entry.ends_at)}
                        )
                      </div>
                      {entry.organizer && (
                        <div className="calendar-day-event-location">
                          {t("organizer")}: {entry.organizer}
                        </div>
                      )}
                      {entry.location && <div className="calendar-day-event-location">{entry.location}</div>}
                      {entry.author_name && (
                        <div className="text-[0.7rem] text-text-2 mt-0.5">
                          {t("createdBy", { name: entry.author_name })}
                        </div>
                      )}
                      {canManage && (
                        <button className="button" type="button" onClick={() => onEditEvent(entry.id)}>
                          {t("editEvent")}
                        </button>
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
