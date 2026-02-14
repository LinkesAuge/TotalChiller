/** Translation function shape expected by `formatTimeAgo`. */
type TimeAgoTranslator = (key: string, values?: Record<string, number>) => string;

/**
 * Formats a date/time string using the given locale (defaults to "de-DE").
 */
function formatLocalDateTime(value: string, locale: string = "de-DE"): string {
  if (!value) {
    return "";
  }
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }
  return parsedDate.toLocaleString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/**
 * Returns a human-readable "time ago" string using the supplied translation function.
 *
 * Expected translation keys: `justNow`, `minutesAgo`, `hoursAgo`, `daysAgo`.
 * Falls back to a locale-formatted date for dates older than 7 days.
 */
function formatTimeAgo(dateString: string, t: TimeAgoTranslator, locale: string = "de-DE"): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffSeconds = Math.floor((now - then) / 1000);
  if (diffSeconds < 60) {
    return t("justNow");
  }
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return t("minutesAgo", { count: diffMinutes });
  }
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return t("hoursAgo", { count: diffHours });
  }
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return t("daysAgo", { count: diffDays });
  }
  return new Date(dateString).toLocaleDateString(locale);
}

export { formatLocalDateTime, formatTimeAgo };
export type { TimeAgoTranslator };
