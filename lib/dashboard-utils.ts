/**
 * Pure helper functions used by the dashboard client.
 * Extracted for testability and reuse.
 */

import { toBerlinDate } from "@/lib/timezone";

/** Returns the Berlin date string (YYYY-MM-DD) for a Date. */
export function toDateString(date: Date): string {
  return toBerlinDate(date);
}

/** Returns a relative time string (e.g. "2h ago"). */
export function formatRelativeTime(isoDate: string): string {
  const now = new Date();
  const date = new Date(isoDate);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d`;
}

/** Extract a display name from a PostgREST profile join result. */
export function extractAuthorName(
  profile: { display_name: string | null; username: string | null } | null,
): string | null {
  if (!profile) return null;
  return profile.display_name || profile.username || null;
}
