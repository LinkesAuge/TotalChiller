"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { formatLocalDateTime } from "../../lib/date-format";
import type { DisplayEvent, EventRow } from "./events-types";
import { formatDuration, getRecurrenceLabel } from "./events-utils";

const AppMarkdown = dynamic(() => import("@/lib/markdown/app-markdown"), {
  loading: () => <div className="skeleton h-8 rounded" />,
});

export interface PastEventsListProps {
  readonly pastEvents: readonly DisplayEvent[];
  readonly sourceEvents: readonly EventRow[];
  readonly isExpanded: boolean;
  readonly onToggleExpand: () => void;
  readonly onEditEvent: (eventId: string) => void;
  readonly onDeleteEvent: (eventId: string) => void;
  readonly onSaveAsTemplate: (entry: EventRow) => void;
  readonly isSavingTemplate: boolean;
  readonly canManage: boolean;
  readonly locale: string;
  readonly t: (key: string, values?: Record<string, string>) => string;
}

function EventCard({
  entry,
  sourceEvent,
  isPast,
  onEditEvent,
  onDeleteEvent,
  onSaveAsTemplate,
  isSavingTemplate,
  canManage,
  locale,
  t,
}: {
  readonly entry: DisplayEvent;
  readonly sourceEvent: EventRow | undefined;
  readonly isPast: boolean;
  readonly onEditEvent: (eventId: string) => void;
  readonly onDeleteEvent: (eventId: string) => void;
  readonly onSaveAsTemplate: (entry: EventRow) => void;
  readonly isSavingTemplate: boolean;
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
                &bull;{" "}
                {entry.updated_at && entry.updated_at !== entry.created_at
                  ? t("editedBy", { name: entry.author_name })
                  : t("createdBy", { name: entry.author_name })}
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
          <button className="button danger" type="button" onClick={() => onDeleteEvent(entry.id)}>
            {t("deleteEvent")}
          </button>
          {sourceEvent && (
            <button
              className="button ml-auto"
              type="button"
              onClick={() => onSaveAsTemplate(sourceEvent)}
              disabled={isSavingTemplate}
            >
              {t("saveAsTemplate")}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

export function PastEventsList({
  pastEvents,
  sourceEvents,
  isExpanded,
  onToggleExpand,
  onEditEvent,
  onDeleteEvent,
  onSaveAsTemplate,
  isSavingTemplate,
  canManage,
  locale,
  t,
}: PastEventsListProps): JSX.Element {
  const sourceEventMap = useMemo(() => {
    const map = new Map<string, EventRow>();
    for (const ev of sourceEvents) map.set(ev.id, ev);
    return map;
  }, [sourceEvents]);

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
            sourceEvent={sourceEventMap.get(entry.id)}
            isPast={true}
            onEditEvent={onEditEvent}
            onDeleteEvent={onDeleteEvent}
            onSaveAsTemplate={onSaveAsTemplate}
            isSavingTemplate={isSavingTemplate}
            canManage={canManage}
            locale={locale}
            t={t}
          />
        ))}
    </>
  );
}
