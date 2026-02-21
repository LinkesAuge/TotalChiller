"use client";

import { memo, useCallback } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { formatLocalDateTime } from "../../lib/date-format";
import type { DisplayEvent } from "./events-types";
import {
  formatDuration,
  formatDateRange,
  isMultiDayEvent,
  getDateBadgeParts,
  getShortTimeString,
  getRecurrenceLabel,
} from "./events-utils";

const AppMarkdown = dynamic(() => import("@/lib/markdown/app-markdown"), {
  loading: () => <div className="skeleton h-8 rounded" />,
});
const EventLinkedResults = dynamic(() => import("./event-linked-results"), { ssr: false });

/* ── Inline SVG icons ── */

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

/* ── Props ── */

export interface DayPanelEventCardProps {
  readonly entry: DisplayEvent;
  readonly isExpanded: boolean;
  readonly onToggleExpand: (displayKey: string) => void;
  readonly onEditEvent: (eventId: string) => void;
  readonly onDeleteEvent: (eventId: string) => void;
  readonly onTogglePin: (eventId: string, isPinned: boolean) => void;
  readonly canManage: boolean;
  readonly locale: string;
  readonly t: (key: string, values?: Record<string, string>) => string;
}

/* ── Component ── */

function DayPanelEventCardInner({
  entry,
  isExpanded,
  onToggleExpand,
  onEditEvent,
  onDeleteEvent,
  onTogglePin,
  canManage,
  locale,
  t,
}: DayPanelEventCardProps): JSX.Element {
  const dp = getDateBadgeParts(entry.starts_at, locale);

  const handleToggle = useCallback(() => {
    onToggleExpand(entry.displayKey);
  }, [onToggleExpand, entry.displayKey]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onToggleExpand(entry.displayKey);
      }
    },
    [onToggleExpand, entry.displayKey],
  );

  const handlePin = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onTogglePin(entry.id, entry.is_pinned);
    },
    [onTogglePin, entry.id, entry.is_pinned],
  );

  const handleEdit = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onEditEvent(entry.id);
    },
    [onEditEvent, entry.id],
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDeleteEvent(entry.id);
    },
    [onDeleteEvent, entry.id],
  );

  const handleCollapse = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggleExpand(entry.displayKey);
    },
    [onToggleExpand, entry.displayKey],
  );

  const stopPropagation = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <article
      data-event-id={entry.id}
      className={`day-panel-card${isExpanded ? " expanded" : ""}${entry.is_pinned ? " pinned" : ""}`}
    >
      {/* ── Full banner when expanded ── */}
      {isExpanded && entry.banner_url && (
        <div className="day-panel-full-banner">
          <Image src={entry.banner_url} alt={entry.title} width={708} height={123} unoptimized />
        </div>
      )}

      {/* ── Collapsed card header (always visible) ── */}
      <div className="day-panel-card-row" role="button" tabIndex={0} onClick={handleToggle} onKeyDown={handleKeyDown}>
        {/* Small banner strip only when collapsed */}
        {!isExpanded && entry.banner_url && (
          <div className="day-panel-card-banner">
            <Image src={entry.banner_url} alt={entry.title} width={708} height={123} unoptimized />
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
                  <span className="day-panel-recurrence-badge">{getRecurrenceLabel(entry.recurrence_type, t)}</span>
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
                  {getShortTimeString(entry.starts_at, locale)}
                  <span className="day-panel-meta-dim">({formatDuration(entry.starts_at, entry.ends_at)})</span>
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
                  onClick={handlePin}
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
                  onClick={handleEdit}
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
                  onClick={handleDelete}
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
                onClick={stopPropagation}
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
          <EventLinkedResults eventId={entry.id} />
          {entry.forum_post_id && (
            <a className="day-panel-discuss-btn" href={`/forum?post=${entry.forum_post_id}`} onClick={stopPropagation}>
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
                {t("createdBy", { name: entry.author_name })}
                {entry.updated_at && entry.updated_at !== entry.created_at && (
                  <span className="day-panel-expanded-edited"> ({t("edited")})</span>
                )}
                {(entry.updated_at || entry.created_at) && (
                  <span className="day-panel-expanded-date">
                    {" · "}
                    {formatLocalDateTime(entry.updated_at ?? entry.created_at, locale)}
                  </span>
                )}
              </span>
            )}
            <button className="day-panel-collapse-btn" type="button" onClick={handleCollapse}>
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
}

/** Memoized day-panel event card. Skips re-renders when props are stable. */
const DayPanelEventCard = memo(DayPanelEventCardInner);
export default DayPanelEventCard;
