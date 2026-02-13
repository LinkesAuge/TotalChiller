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

export { formatLocalDateTime };
