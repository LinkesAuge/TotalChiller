import * as Sentry from "@sentry/nextjs";

/**
 * Captures an error from an API route: logs to console and reports to Sentry.
 * Use this instead of bare `console.error` in all server-side API handlers
 * so caught errors are visible in the Sentry dashboard.
 *
 * @param context - short label for where the error occurred (e.g. "POST /api/messages")
 * @param error - the caught error value
 */
export function captureApiError(context: string, error: unknown): void {
  console.error(`[${context}]`, error);
  Sentry.captureException(error instanceof Error ? error : new Error(String(error)), {
    tags: { apiContext: context },
  });
}
