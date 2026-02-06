/**
 * Formats a date/time string in German format (dd.MM.yyyy, HH:mm).
 */
function formatGermanDateTime(value: string): string {
  if (!value) {
    return "";
  }
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }
  return parsedDate.toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export default formatGermanDateTime;
