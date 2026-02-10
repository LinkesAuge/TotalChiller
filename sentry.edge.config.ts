import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  /* Only enable in production */
  enabled: process.env.NODE_ENV === "production",

  /* Environment and release for filtering in Sentry dashboard */
  environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? "development",
  release: process.env.SENTRY_RELEASE ?? process.env.VERCEL_GIT_COMMIT_SHA ?? undefined,

  /* Capture 10% of transactions for performance monitoring */
  tracesSampleRate: 0.1,

  /* Strip PII: don't send IP addresses */
  sendDefaultPii: false,

  /* Scrub sensitive data from event payloads */
  beforeSend(event) {
    if (event.request) {
      delete event.request.cookies;
      if (event.request.headers) {
        delete event.request.headers["authorization"];
        delete event.request.headers["cookie"];
      }
    }
    return event;
  },
});
