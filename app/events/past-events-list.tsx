"use client";

import dynamic from "next/dynamic";
import { formatLocalDateTime } from "../../lib/date-format";
import GameButton from "../components/ui/game-button";
import type { DisplayEvent } from "./events-types";
import { formatDuration, getRecurrenceLabel } from "./events-utils";

const AppMarkdown = dynamic(() => import("@/lib/markdown/app-markdown"), {
  loading: () => <div className="skeleton h-8 rounded" />,
});

export interface PastEventsListProps {
  readonly pastEvents: readonly DisplayEvent[];
  readonly isExpanded: boolean;
  readonly onToggleExpand: () => void;
  readonly onEditEvent: (eventId: string) => void;
  readonly onDeleteEvent: (eventId: string) => void;
  readonly canManage: boolean;
  readonly locale: string;
  readonly t: (key: string, values?: Record<string, string>) => string;
}

function EventCard({
  entry,
  isPast,
  onEditEvent,
  onDeleteEvent,
  canManage,
  locale,
  t,
}: {
  readonly entry: DisplayEvent;
  readonly isPast: boolean;
  readonly onEditEvent: (eventId: string) => void;
  readonly onDeleteEvent: (eventId: string) => void;
  readonly canManage: boolean;
  readonly locale: string;
  readonly t: (key: string, values?: Record<string, string>) => string;
}): JSX.Element {
  return (
    <section
      className="card col-span-full"
      key={entry.displayKey}
      style={{
        opacity: isPast ? 0.6 : 1,
      }}
    >
      <div className="card-header">
        <div>
          <div className="card-title">{entry.title}</div>
          <div className="card-subtitle">
            {formatLocalDateTime(entry.starts_at, locale)} ({formatDuration(entry.starts_at, entry.ends_at)})
            {entry.organizer && <> &bull; {entry.organizer}</>}
            {entry.author_name && (
              <>
                {" "}
                &bull; {t("createdBy", { name: entry.author_name })}
                {entry.updated_at && entry.updated_at !== entry.created_at && (
                  <span className="past-event-edited"> ({t("edited")})</span>
                )}
              </>
            )}
          </div>
        </div>
        <div className="flex gap-1.5 items-center shrink-0">
          {entry.recurrence_type && entry.recurrence_type !== "none" && (
            <span className="badge text-[0.65rem]">{getRecurrenceLabel(entry.recurrence_type, t)}</span>
          )}
          <span className="badge">{isPast ? t("past") : t("upcoming")}</span>
        </div>
      </div>
      {entry.description && <AppMarkdown content={entry.description} />}
      {entry.location && (
        <div className="list inline mt-3">
          <span className="badge">{entry.location}</span>
        </div>
      )}
      {canManage && (
        <div className="list inline mt-3 flex-wrap">
          <button className="button" type="button" onClick={() => onEditEvent(entry.id)}>
            {t("editEvent")}
          </button>
          <GameButton variant="orange" fontSize="0.6rem" type="button" onClick={() => onDeleteEvent(entry.id)}>
            {t("deleteEvent")}
          </GameButton>
        </div>
      )}
    </section>
  );
}

export function PastEventsList({
  pastEvents,
  isExpanded,
  onToggleExpand,
  onEditEvent,
  onDeleteEvent,
  canManage,
  locale,
  t,
}: PastEventsListProps): JSX.Element {
  return (
    <>
      <div className="col-span-full flex items-center gap-3">
        <span className="card-title" style={{ color: "var(--color-text-2)" }}>
          {t("past")} ({pastEvents.length})
        </span>
        <button className="button py-1.5 px-3" type="button" onClick={onToggleExpand}>
          {isExpanded ? t("hide") : t("show")}
        </button>
      </div>
      {isExpanded &&
        pastEvents.map((entry) => (
          <EventCard
            key={entry.displayKey}
            entry={entry}
            isPast={true}
            onEditEvent={onEditEvent}
            onDeleteEvent={onDeleteEvent}
            canManage={canManage}
            locale={locale}
            t={t}
          />
        ))}
    </>
  );
}
