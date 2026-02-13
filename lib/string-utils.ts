/**
 * Normalizes a string for case-insensitive comparison.
 * Trims whitespace and converts to lowercase.
 */
export function normalizeString(value: string): string {
  return value.trim().toLowerCase();
}
