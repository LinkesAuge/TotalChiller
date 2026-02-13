"use client";

import { EventCalendar, EventDayPanel } from "./event-calendar";
import { UpcomingEventsSidebar } from "./upcoming-events-sidebar";
import DataState from "../components/data-state";
import type { UseEventsResult } from "./use-events";
import { UPCOMING_PAGE_SIZE } from "./events-types";

export interface EventsListProps {
  readonly eventsState: UseEventsResult;
}

/**
 * Container component for the main events display: calendar, day panel,
 * and upcoming events sidebar. Wraps everything in DataState for loading/empty handling.
 */
export function EventsList({ eventsState }: EventsListProps): JSX.Element {
  const {
    events,
    isLoading,
    calendarMonth,
    calendarDays,
    selectedDateKey,
    selectedDateLabel,
    selectedDayEvents,
    todayKey,
    dateSelectNonce,
    upcomingEvents,
    upcomingPage,
    setUpcomingPage,
    shiftCalendarMonth,
    handleDateSelect,
    jumpToToday,
    handleEditEventById,
    requestDeleteEvent,
    handleTogglePin,
    handleSelectUpcomingEvent,
    canManage,
    locale,
    t,
  } = eventsState;

  return (
    <DataState
      isLoading={isLoading}
      isEmpty={events.length === 0}
      loadingMessage={t("loadingEvents")}
      emptyMessage={t("noEvents")}
      emptySubtitle={t("createEvent")}
      className="col-span-full"
    >
      <div className="events-two-col col-span-full">
        <div className="events-calendar-column">
          <EventCalendar
            calendarMonth={calendarMonth}
            calendarDays={calendarDays}
            selectedDateKey={selectedDateKey}
            todayKey={todayKey}
            totalEventsCount={events.length}
            onMonthShift={shiftCalendarMonth}
            onDateSelect={handleDateSelect}
            onJumpToToday={jumpToToday}
            canManage={canManage}
            locale={locale}
            t={t}
          />
          <EventDayPanel
            selectedDateLabel={selectedDateLabel}
            selectionNonce={dateSelectNonce}
            selectedDayEvents={selectedDayEvents}
            onEditEvent={handleEditEventById}
            onDeleteEvent={requestDeleteEvent}
            onTogglePin={handleTogglePin}
            canManage={canManage}
            locale={locale}
            t={t}
          />
        </div>

        <UpcomingEventsSidebar
          upcomingEvents={upcomingEvents}
          pageSize={UPCOMING_PAGE_SIZE}
          currentPage={upcomingPage}
          onPageChange={setUpcomingPage}
          onSelectEvent={handleSelectUpcomingEvent}
          onEditEvent={handleEditEventById}
          onDeleteEvent={requestDeleteEvent}
          onTogglePin={handleTogglePin}
          canManage={canManage}
          locale={locale}
          t={t}
        />
      </div>
    </DataState>
  );
}
