import { z } from "zod";

/* ── Types ── */

export type RecurrenceType = "none" | "daily" | "weekly" | "biweekly" | "monthly";

export interface EventRow {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly location: string | null;
  readonly starts_at: string;
  readonly ends_at: string;
  readonly created_at: string;
  readonly created_by: string;
  readonly organizer: string | null;
  readonly recurrence_type: RecurrenceType;
  readonly recurrence_end_date: string | null;
  readonly banner_url: string | null;
  readonly is_pinned: boolean;
  readonly forum_post_id: string | null;
  /* Joined author info */
  readonly author_name: string | null;
}

/** Display-only event: either a real DB row or a computed virtual occurrence. */
export interface DisplayEvent {
  readonly id: string;
  readonly displayKey: string;
  readonly title: string;
  readonly description: string;
  readonly location: string | null;
  readonly starts_at: string;
  readonly ends_at: string;
  readonly created_at: string;
  readonly organizer: string | null;
  readonly author_name: string | null;
  readonly recurrence_type: RecurrenceType;
  readonly recurrence_end_date: string | null;
  readonly banner_url: string | null;
  readonly is_pinned: boolean;
  readonly forum_post_id: string | null;
  readonly isVirtual: boolean;
}

export interface GameAccountOption {
  readonly id: string;
  readonly game_username: string;
}

export interface TemplateRow {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly location: string | null;
  readonly duration_hours: number;
  readonly is_open_ended: boolean;
  readonly organizer: string | null;
  readonly recurrence_type: RecurrenceType;
  readonly recurrence_end_date: string | null;
  readonly banner_url: string | null;
}

/* ── Constants ── */

export const EVENT_SCHEMA = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  location: z.string().optional(),
  startsAt: z.string().min(1),
});

export const WEEKDAY_LABELS: readonly string[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const UPCOMING_PAGE_SIZE = 8;

export const EVENT_COLORS: readonly string[] = ["#c9a34a", "#4a6ea0", "#4a9960", "#c94a3a"];

export interface CalendarDay {
  readonly date: Date;
  readonly key: string;
  readonly isCurrentMonth: boolean;
  readonly isToday: boolean;
  readonly events: readonly DisplayEvent[];
}
